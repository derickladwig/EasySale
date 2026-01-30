// Accounting Integration Service
// Generates journal entries from approved invoices

use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::{Utc, NaiveDate};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AccountingIntegrationService {
    pool: SqlitePool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JournalEntryData {
    pub date: NaiveDate,
    pub description: String,
    pub entries: Vec<JournalLine>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JournalLine {
    pub account: String,
    pub debit: f64,
    pub credit: f64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JournalResult {
    pub entry_id: String,
    pub total_debits: f64,
    pub total_credits: f64,
    pub balanced: bool,
}

#[derive(Debug)]
pub enum AccountingError {
    DatabaseError(String),
    ValidationError(String),
    UnbalancedEntry(String),
    AccountNotFound(String),
}

impl std::fmt::Display for AccountingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AccountingError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            AccountingError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            AccountingError::UnbalancedEntry(msg) => write!(f, "Unbalanced entry: {}", msg),
            AccountingError::AccountNotFound(msg) => write!(f, "Account not found: {}", msg),
        }
    }
}

impl std::error::Error for AccountingError {}

impl AccountingIntegrationService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Generate journal entry for vendor bill
    pub async fn generate_bill_entry(
        &self,
        case_id: &str,
        vendor_name: &str,
        subtotal: f64,
        tax: f64,
        total: f64,
        date: NaiveDate,
        tenant_id: &str,
    ) -> Result<JournalResult, AccountingError> {
        // Create journal entry lines
        let mut entries = Vec::new();

        // Debit: Inventory/Expense account
        entries.push(JournalLine {
            account: "5000".to_string(), // Cost of Goods Sold / Inventory
            debit: subtotal,
            credit: 0.0,
            description: format!("Inventory purchase from {}", vendor_name),
        });

        // Debit: Tax expense (if applicable)
        if tax > 0.0 {
            entries.push(JournalLine {
                account: "6100".to_string(), // Tax Expense
                debit: tax,
                credit: 0.0,
                description: "Sales tax on purchase".to_string(),
            });
        }

        // Credit: Accounts Payable
        entries.push(JournalLine {
            account: "2000".to_string(), // Accounts Payable
            debit: 0.0,
            credit: total,
            description: format!("Payable to {}", vendor_name),
        });

        let entry_data = JournalEntryData {
            date,
            description: format!("Vendor bill from {} (OCR Case: {})", vendor_name, case_id),
            entries,
        };

        self.create_journal_entry(entry_data, tenant_id).await
    }

    /// Create journal entry
    pub async fn create_journal_entry(
        &self,
        entry: JournalEntryData,
        tenant_id: &str,
    ) -> Result<JournalResult, AccountingError> {
        // Validate entry
        Self::validate_entry(&entry)?;

        // Check if balanced
        let (total_debits, total_credits) = Self::calculate_totals(&entry);
        if !Self::is_balanced(total_debits, total_credits) {
            return Err(AccountingError::UnbalancedEntry(
                format!("Debits ({total_debits}) != Credits ({total_credits})")
            ));
        }

        // Start transaction
        let mut tx = self.pool.begin().await
            .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;

        // Create journal entry header
        let entry_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let entry_date_str = entry.date.to_string();

        sqlx::query(
            r#"
            INSERT INTO journal_entries (
                id, tenant_id, entry_date, description,
                total_debits, total_credits, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&entry_id)
        .bind(tenant_id)
        .bind(&entry_date_str)
        .bind(&entry.description)
        .bind(total_debits)
        .bind(total_credits)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;

        // Create journal entry lines
        for line in &entry.entries {
            let line_id = Uuid::new_v4().to_string();

            // Verify account exists
            self.verify_account(&line.account, tenant_id, &mut tx).await?;

            sqlx::query(
                r#"
                INSERT INTO journal_entry_lines (
                    id, entry_id, tenant_id, account,
                    debit, credit, description, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&line_id)
            .bind(&entry_id)
            .bind(tenant_id)
            .bind(&line.account)
            .bind(line.debit)
            .bind(line.credit)
            .bind(&line.description)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;
        }

        // Commit transaction
        tx.commit().await
            .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;

        Ok(JournalResult {
            entry_id,
            total_debits,
            total_credits,
            balanced: true,
        })
    }

    /// Validate journal entry
    fn validate_entry(entry: &JournalEntryData) -> Result<(), AccountingError> {
        if entry.entries.is_empty() {
            return Err(AccountingError::ValidationError("Entry must have at least one line".to_string()));
        }

        for line in &entry.entries {
            if line.account.is_empty() {
                return Err(AccountingError::ValidationError("Account is required".to_string()));
            }
            if line.debit < 0.0 || line.credit < 0.0 {
                return Err(AccountingError::ValidationError("Amounts cannot be negative".to_string()));
            }
            if line.debit > 0.0 && line.credit > 0.0 {
                return Err(AccountingError::ValidationError("Line cannot have both debit and credit".to_string()));
            }
        }

        Ok(())
    }

    /// Calculate totals
    fn calculate_totals(entry: &JournalEntryData) -> (f64, f64) {
        let total_debits: f64 = entry.entries.iter().map(|l| l.debit).sum();
        let total_credits: f64 = entry.entries.iter().map(|l| l.credit).sum();
        (total_debits, total_credits)
    }

    /// Check if entry is balanced
    fn is_balanced(debits: f64, credits: f64) -> bool {
        (debits - credits).abs() < 0.01 // Allow 1 cent tolerance
    }

    /// Verify account exists
    async fn verify_account(
        &self,
        account: &str,
        tenant_id: &str,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> Result<(), AccountingError> {
        let result = sqlx::query(
            r#"
            SELECT COUNT(*) as count
            FROM chart_of_accounts
            WHERE account_number = ? AND tenant_id = ?
            "#
        )
        .bind(account)
        .bind(tenant_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;

        let count: i32 = result.try_get("count").unwrap_or(0);
        if count == 0 {
            return Err(AccountingError::AccountNotFound(
                format!("Account {} not found", account)
            ));
        }

        Ok(())
    }

    /// Rollback journal entry
    pub async fn rollback_entry(
        &self,
        entry_id: &str,
        tenant_id: &str,
    ) -> Result<(), AccountingError> {
        // Start transaction
        let mut tx = self.pool.begin().await
            .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;

        // Delete entry lines
        sqlx::query(
            r#"
            DELETE FROM journal_entry_lines
            WHERE entry_id = ? AND tenant_id = ?
            "#
        )
        .bind(entry_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;

        // Delete entry header
        sqlx::query(
            r#"
            DELETE FROM journal_entries
            WHERE id = ? AND tenant_id = ?
            "#
        )
        .bind(entry_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;

        // Commit transaction
        tx.commit().await
            .map_err(|e| AccountingError::DatabaseError(e.to_string()))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_calculate_totals() {
        let entry = JournalEntryData {
            date: NaiveDate::from_ymd_opt(2026, 1, 25).unwrap(),
            description: "Test".to_string(),
            entries: vec![
                JournalLine {
                    account: "1000".to_string(),
                    debit: 100.0,
                    credit: 0.0,
                    description: "Debit".to_string(),
                },
                JournalLine {
                    account: "2000".to_string(),
                    debit: 0.0,
                    credit: 100.0,
                    description: "Credit".to_string(),
                },
            ],
        };

        let (debits, credits) = AccountingIntegrationService::calculate_totals(&entry);
        assert_eq!(debits, 100.0);
        assert_eq!(credits, 100.0);
        assert!(AccountingIntegrationService::is_balanced(debits, credits));
    }

    #[tokio::test]
    async fn test_validate_entry() {
        // Valid entry
        let valid = JournalEntryData {
            date: NaiveDate::from_ymd_opt(2026, 1, 25).unwrap(),
            description: "Test".to_string(),
            entries: vec![
                JournalLine {
                    account: "1000".to_string(),
                    debit: 100.0,
                    credit: 0.0,
                    description: "Test".to_string(),
                },
            ],
        };
        assert!(AccountingIntegrationService::validate_entry(&valid).is_ok());

        // Invalid: empty entries
        let invalid_empty = JournalEntryData {
            date: NaiveDate::from_ymd_opt(2026, 1, 25).unwrap(),
            description: "Test".to_string(),
            entries: vec![],
        };
        assert!(AccountingIntegrationService::validate_entry(&invalid_empty).is_err());

        // Invalid: both debit and credit
        let invalid_both = JournalEntryData {
            date: NaiveDate::from_ymd_opt(2026, 1, 25).unwrap(),
            description: "Test".to_string(),
            entries: vec![
                JournalLine {
                    account: "1000".to_string(),
                    debit: 100.0,
                    credit: 100.0, // Wrong!
                    description: "Test".to_string(),
                },
            ],
        };
        assert!(AccountingIntegrationService::validate_entry(&invalid_both).is_err());
    }
}

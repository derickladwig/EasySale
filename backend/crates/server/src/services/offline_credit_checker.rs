use sqlx::SqlitePool;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

use crate::models::CreditAccount;

/// Offline credit limit checker
/// Uses last synchronized balance to check credit limits when offline
pub struct OfflineCreditChecker {
    pool: SqlitePool,
}

impl OfflineCreditChecker {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Check if a charge can be made against a credit account
    /// When offline, uses last synchronized balance and flags for verification on sync
    pub async fn can_charge(
        &self,
        account_id: &str,
        amount: &str,
        is_offline: bool,
    ) -> Result<(bool, Option<String>), Box<dyn std::error::Error>> {
        // Get credit account
        let account = sqlx::query_as::<_, CreditAccount>(
            r#"SELECT * FROM credit_accounts WHERE id = ?"#
        )
        .bind(account_id)
        .fetch_optional(&self.pool)
        .await?;

        let account = match account {
            Some(a) => a,
            None => return Ok((false, Some("Credit account not found".to_string()))),
        };

        // Parse amount
        let amount_val: f64 = amount.parse()?;
        let credit_limit = account.credit_limit;
        let balance = account.current_balance;

        // Calculate available credit
        let available_credit = credit_limit - balance;

        // Check if charge exceeds available credit
        if amount_val > available_credit {
            return Ok((
                false,
                Some(format!(
                    "Insufficient credit. Available: {:.2}, Requested: {:.2}",
                    available_credit, amount_val
                )),
            ));
        }

        // If offline, flag the transaction for verification on sync
        if is_offline {
            self.flag_for_verification(account_id, amount).await?;
            return Ok((
                true,
                Some("Transaction approved offline. Will be verified on sync.".to_string()),
            ));
        }

        Ok((true, None))
    }

    /// Flag a transaction for verification when sync occurs
    async fn flag_for_verification(
        &self,
        account_id: &str,
        amount: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO offline_credit_verifications (id, account_id, amount, created_at, verification_status)
            VALUES (?, ?, ?, ?, 'pending')
            "#
        )
        .bind(&id)
        .bind(account_id)
        .bind(amount)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Verify offline transactions after sync
    pub async fn verify_offline_transactions(
        &self,
        account_id: &str,
    ) -> Result<Vec<OfflineVerificationResult>, Box<dyn std::error::Error>> {
        // Get pending verifications
        #[derive(sqlx::FromRow)]
        struct VerificationRow {
            id: String,
            amount: String,
            created_at: String,
        }

        let verifications = sqlx::query_as::<_, VerificationRow>(
            r#"
            SELECT id, amount, created_at
            FROM offline_credit_verifications
            WHERE account_id = ? AND verification_status = 'pending'
            ORDER BY created_at ASC
            "#
        )
        .bind(account_id)
        .fetch_all(&self.pool)
        .await?;

        let mut results = Vec::new();

        for verification in verifications {
            let amount = &verification.amount;

            // Re-check credit limit with current balance
            let (can_charge, message) = self.can_charge(account_id, amount, false).await?;

            let status = if can_charge { "verified" } else { "failed" };

            // Update verification status
            sqlx::query(
                r#"
                UPDATE offline_credit_verifications
                SET verification_status = ?, verified_at = ?
                WHERE id = ?
                "#
            )
            .bind(status)
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&verification.id)
            .execute(&self.pool)
            .await?;

            results.push(OfflineVerificationResult {
                verification_id: verification.id,
                amount: amount.to_string(),
                status: status.to_string(),
                message,
                created_at: verification.created_at,
            });
        }

        Ok(results)
    }

    /// Get pending verifications for an account
    pub async fn get_pending_verifications(
        &self,
        account_id: &str,
    ) -> Result<i32, Box<dyn std::error::Error>> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM offline_credit_verifications
            WHERE account_id = ? AND verification_status = 'pending'
            "#
        )
        .bind(account_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(count as i32)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineVerificationResult {
    pub verification_id: String,
    pub amount: String,
    pub status: String,
    pub message: Option<String>,
    #[allow(dead_code)] // Audit field for future reporting
    pub created_at: String,
}

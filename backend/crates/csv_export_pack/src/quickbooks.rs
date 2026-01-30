//! `QuickBooks` CSV exporter

use csv::Writer;
use accounting_snapshots::AccountingSnapshot;
use crate::exporter::CsvExporter;
use crate::errors::{ExportError, ExportResult};

/// `QuickBooks` CSV exporter
pub struct QuickBooksExporter;

impl QuickBooksExporter {
    /// Create a new `QuickBooks` exporter
    #[must_use] 
    pub const fn new() -> Self {
        Self
    }
    
    /// Format date for `QuickBooks` (YYYY-MM-DD)
    fn format_date(date: &chrono::DateTime<chrono::Utc>) -> String {
        date.format("%Y-%m-%d").to_string()
    }
    
    /// Format decimal with 2 decimal places
    fn format_decimal(value: &rust_decimal::Decimal) -> String {
        format!("{value:.2}")
    }
}

impl Default for QuickBooksExporter {
    fn default() -> Self {
        Self::new()
    }
}

impl CsvExporter for QuickBooksExporter {
    fn export_sales_receipts(&self, snapshots: &[AccountingSnapshot]) -> ExportResult<String> {
        let mut wtr = Writer::from_writer(vec![]);
        
        // Write header (authoritative QuickBooks template)
        wtr.write_record([
            "*InvoiceNo",
            "*Customer",
            "*InvoiceDate",
            "*DueDate",
            "Ship Date",
            "Quantity",
            "*Item(Product/Service)",
            "ItemDescription",
            "*Rate",
            "*Amount",
            "Taxable",
            "*TaxAmount",
            "CustomerMsg",
        ])?;
        
        // Write data rows
        for snapshot in snapshots {
            for line in &snapshot.lines {
                wtr.write_record([
                    &snapshot.transaction_id.to_string(),
                    "Customer", // TODO: Get from snapshot metadata
                    &Self::format_date(&snapshot.finalized_at),
                    &Self::format_date(&snapshot.finalized_at),
                    "", // Ship date (optional)
                    &Self::format_decimal(&line.quantity),
                    &line.product_id,
                    &line.description,
                    &Self::format_decimal(&line.unit_price),
                    &Self::format_decimal(&line.line_total),
                    "Y", // Taxable
                    &Self::format_decimal(&line.tax_amount),
                    "Thank you", // Customer message
                ])?;
            }
        }
        
        let data = wtr.into_inner()
            .map_err(|e| ExportError::IoError(e.into_error()))?;
        
        String::from_utf8(data)
            .map_err(|e| ExportError::InvalidData(e.to_string()))
    }
    
    fn export_invoices(&self, snapshots: &[AccountingSnapshot]) -> ExportResult<String> {
        let mut wtr = Writer::from_writer(vec![]);
        
        // Write header (authoritative QuickBooks template)
        wtr.write_record([
            "*InvoiceNo",
            "*Customer",
            "*InvoiceDate",
            "*DueDate",
            "Terms",
            "Location",
            "Memo",
            "*Item(Product/Service)",
            "ItemDescription",
            "ItemQuantity",
            "ItemRate",
            "ItemAmount",
            "ItemTaxCode",
            "ItemTaxAmount",
        ])?;
        
        // Write data rows
        for snapshot in snapshots {
            for line in &snapshot.lines {
                wtr.write_record([
                    &snapshot.transaction_id.to_string(),
                    "Customer", // TODO: Get from snapshot metadata
                    &Self::format_date(&snapshot.finalized_at),
                    &Self::format_date(&snapshot.finalized_at),
                    "Net 30", // Terms
                    "Main Store", // Location
                    "Purchase", // Memo
                    &line.product_id,
                    &line.description,
                    &Self::format_decimal(&line.quantity),
                    &Self::format_decimal(&line.unit_price),
                    &Self::format_decimal(&line.line_total),
                    "TAX", // Tax code
                    &Self::format_decimal(&line.tax_amount),
                ])?;
            }
        }
        
        let data = wtr.into_inner()
            .map_err(|e| ExportError::IoError(e.into_error()))?;
        
        String::from_utf8(data)
            .map_err(|e| ExportError::InvalidData(e.to_string()))
    }
    
    fn export_credit_memos(&self, snapshots: &[AccountingSnapshot]) -> ExportResult<String> {
        let mut wtr = Writer::from_writer(vec![]);
        
        // Write header (authoritative QuickBooks template)
        wtr.write_record([
            "*CreditMemoNo",
            "*Customer",
            "*CreditMemoDate",
            "*Item(Product/Service)",
            "ItemDescription",
            "ItemQuantity",
            "ItemRate",
            "ItemAmount",
            "ItemTaxCode",
            "ItemTaxAmount",
            "Memo",
        ])?;
        
        // Write data rows
        for snapshot in snapshots {
            for line in &snapshot.lines {
                wtr.write_record([
                    &snapshot.transaction_id.to_string(),
                    "Customer", // TODO: Get from snapshot metadata
                    &Self::format_date(&snapshot.finalized_at),
                    &line.product_id,
                    &line.description,
                    &Self::format_decimal(&line.quantity),
                    &Self::format_decimal(&line.unit_price),
                    &Self::format_decimal(&line.line_total),
                    "TAX", // Tax code
                    &Self::format_decimal(&line.tax_amount),
                    "Return - damaged item", // Memo
                ])?;
            }
        }
        
        let data = wtr.into_inner()
            .map_err(|e| ExportError::IoError(e.into_error()))?;
        
        String::from_utf8(data)
            .map_err(|e| ExportError::InvalidData(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use accounting_snapshots::{AccountingSnapshot, SnapshotLine, Payment};
    use chrono::Utc;
    use uuid::Uuid;
    use rust_decimal_macros::dec;
    
    fn create_test_snapshot() -> AccountingSnapshot {
        AccountingSnapshot::new(
            Uuid::new_v4(),
            Utc::now(),
            dec!(100.00),
            dec!(8.00),
            dec!(0.00),
            dec!(108.00),
            vec![Payment {
                method: "cash".to_string(),
                amount: dec!(108.00),
            }],
            vec![SnapshotLine::new(
                "PROD-001".to_string(),
                "Test Product".to_string(),
                dec!(2.0),
                dec!(50.00),
                dec!(100.00),
                dec!(8.00),
            )],
        )
    }
    
    #[test]
    fn test_sales_receipt_header() {
        let exporter = QuickBooksExporter::new();
        let csv = exporter.export_sales_receipts(&[create_test_snapshot()]).unwrap();
        let header = csv.lines().next().unwrap();
        
        assert_eq!(
            header,
            "*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Ship Date,Quantity,*Item(Product/Service),ItemDescription,*Rate,*Amount,Taxable,*TaxAmount,CustomerMsg"
        );
    }
    
    #[test]
    fn test_invoice_header() {
        let exporter = QuickBooksExporter::new();
        let csv = exporter.export_invoices(&[create_test_snapshot()]).unwrap();
        let header = csv.lines().next().unwrap();
        
        assert_eq!(
            header,
            "*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Terms,Location,Memo,*Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode,ItemTaxAmount"
        );
    }
    
    #[test]
    fn test_credit_memo_header() {
        let exporter = QuickBooksExporter::new();
        let csv = exporter.export_credit_memos(&[create_test_snapshot()]).unwrap();
        let header = csv.lines().next().unwrap();
        
        assert_eq!(
            header,
            "*CreditMemoNo,*Customer,*CreditMemoDate,*Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode,ItemTaxAmount,Memo"
        );
    }
}

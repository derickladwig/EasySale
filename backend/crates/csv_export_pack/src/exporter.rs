//! CSV exporter trait

use accounting_snapshots::AccountingSnapshot;
use crate::errors::ExportResult;

/// CSV exporter trait
pub trait CsvExporter {
    /// Export sales receipts to CSV
    fn export_sales_receipts(&self, snapshots: &[AccountingSnapshot]) -> ExportResult<String>;
    
    /// Export invoices to CSV
    fn export_invoices(&self, snapshots: &[AccountingSnapshot]) -> ExportResult<String>;
    
    /// Export credit memos to CSV
    fn export_credit_memos(&self, snapshots: &[AccountingSnapshot]) -> ExportResult<String>;
}

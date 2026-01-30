//! ZIP packaging for multi-file exports

use std::io::Write;
use zip::write::{FileOptions, ZipWriter};
use crate::errors::ExportResult;

/// ZIP packager for exports
pub struct ZipPackager;

impl ZipPackager {
    /// Create a new ZIP packager
    #[must_use] 
    pub const fn new() -> Self {
        Self
    }
    
    /// Package multiple CSV files into a ZIP archive
    pub fn package_exports(
        &self,
        files: Vec<(String, String)>, // (filename, content) pairs
    ) -> ExportResult<Vec<u8>> {
        let mut zip_buffer = Vec::new();
        {
            let mut zip = ZipWriter::new(std::io::Cursor::new(&mut zip_buffer));
            
            let options = FileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated)
                .unix_permissions(0o644);
            
            // Add manifest file
            let manifest = Self::create_manifest(&files);
            zip.start_file("MANIFEST.txt", options)?;
            zip.write_all(manifest.as_bytes())?;
            
            // Add import order documentation
            let import_order = Self::create_import_order();
            zip.start_file("IMPORT_ORDER.txt", options)?;
            zip.write_all(import_order.as_bytes())?;
            
            // Add CSV files
            for (filename, content) in files {
                zip.start_file(&filename, options)?;
                zip.write_all(content.as_bytes())?;
            }
            
            zip.finish()?;
        } // zip is dropped here, releasing the borrow
        
        Ok(zip_buffer)
    }
    
    fn create_manifest(files: &[(String, String)]) -> String {
        let mut manifest = String::from("Export Manifest\n");
        manifest.push_str("===============\n\n");
        manifest.push_str(&format!("Generated: {}\n", chrono::Utc::now().to_rfc3339()));
        manifest.push_str(&format!("File count: {}\n\n", files.len()));
        manifest.push_str("Files:\n");
        
        for (filename, content) in files {
            let line_count = content.lines().count();
            manifest.push_str(&format!("  - {filename} ({line_count} lines)\n"));
        }
        
        manifest
    }
    
    fn create_import_order() -> String {
        String::from(
            "QuickBooks Import Order\n\
             =======================\n\n\
             Import files in this order to maintain referential integrity:\n\n\
             1. customers.csv (if present)\n\
             2. products.csv (if present)\n\
             3. invoices.csv\n\
             4. sales_receipts.csv\n\
             5. credit_memos.csv\n\n\
             Note: Ensure all referenced customers and products exist before\n\
             importing transactions.\n"
        )
    }
}

impl Default for ZipPackager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_package_exports() {
        let packager = ZipPackager::new();
        let files = vec![
            ("test1.csv".to_string(), "header1,header2\nvalue1,value2\n".to_string()),
            ("test2.csv".to_string(), "header3,header4\nvalue3,value4\n".to_string()),
        ];
        
        let result = packager.package_exports(files);
        assert!(result.is_ok());
        
        let zip_data = result.unwrap();
        assert!(!zip_data.is_empty());
    }
}

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Golden set test case
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoldenCase {
    pub id: String,
    pub invoice_path: PathBuf,
    pub ground_truth: GroundTruth,
    pub metadata: CaseMetadata,
}

/// Ground truth for invoice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroundTruth {
    pub invoice_number: String,
    pub invoice_date: String,
    pub vendor_name: String,
    pub vendor_address: Option<String>,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    pub line_items: Vec<LineItemGroundTruth>,
}

/// Line item ground truth
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItemGroundTruth {
    pub sku: String,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub line_total: f64,
}

/// Case metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseMetadata {
    pub category: CaseCategory,
    pub difficulty: Difficulty,
    pub notes: Option<String>,
}

/// Case category
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CaseCategory {
    Clean,
    Rotated,
    Noisy,
    MultiPage,
    Handwritten,
    EdgeCase,
}

/// Difficulty level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

/// Golden set loader
pub struct GoldenSetLoader {
    fixtures_dir: PathBuf,
    ground_truth_dir: PathBuf,
}

impl GoldenSetLoader {
    /// Create new loader
    pub fn new() -> Self {
        let fixtures_dir = PathBuf::from("tests/fixtures/invoices");
        let ground_truth_dir = PathBuf::from("tests/fixtures/ground_truth");
        
        Self {
            fixtures_dir,
            ground_truth_dir,
        }
    }
    
    /// Load all golden cases
    pub fn load_all(&self) -> Result<Vec<GoldenCase>, LoadError> {
        let mut cases = Vec::new();
        
        // Read ground truth directory
        let entries = std::fs::read_dir(&self.ground_truth_dir)
            .map_err(|e| LoadError::IoError(e.to_string()))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| LoadError::IoError(e.to_string()))?;
            let path = entry.path();
            
            // Skip non-JSON files
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            
            // Load ground truth
            let ground_truth = self.load_ground_truth(&path)?;
            
            // Find corresponding invoice file
            let id = path.file_stem()
                .and_then(|s| s.to_str())
                .ok_or_else(|| LoadError::InvalidPath(path.clone()))?
                .to_string();
            
            let invoice_path = self.find_invoice_file(&id)?;
            
            // Create case with default metadata
            let case = GoldenCase {
                id: id.clone(),
                invoice_path,
                ground_truth,
                metadata: CaseMetadata {
                    category: CaseCategory::Clean,
                    difficulty: Difficulty::Medium,
                    notes: None,
                },
            };
            
            cases.push(case);
        }
        
        Ok(cases)
    }
    
    /// Load ground truth from JSON file
    fn load_ground_truth(&self, path: &PathBuf) -> Result<GroundTruth, LoadError> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| LoadError::IoError(e.to_string()))?;
        
        let ground_truth: GroundTruth = serde_json::from_str(&content)
            .map_err(|e| LoadError::ParseError(e.to_string()))?;
        
        Ok(ground_truth)
    }
    
    /// Find invoice file by ID
    fn find_invoice_file(&self, id: &str) -> Result<PathBuf, LoadError> {
        // Try common extensions
        let extensions = ["pdf", "jpg", "jpeg", "png", "tiff"];
        
        for ext in &extensions {
            let path = self.fixtures_dir.join(format!("{}.{}", id, ext));
            if path.exists() {
                return Ok(path);
            }
        }
        
        Err(LoadError::InvoiceNotFound(id.to_string()))
    }
}

impl Default for GoldenSetLoader {
    fn default() -> Self {
        Self::new()
    }
}

/// Load error
#[derive(Debug)]
pub enum LoadError {
    IoError(String),
    ParseError(String),
    InvalidPath(PathBuf),
    InvoiceNotFound(String),
}

impl std::fmt::Display for LoadError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LoadError::IoError(msg) => write!(f, "IO error: {}", msg),
            LoadError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            LoadError::InvalidPath(path) => write!(f, "Invalid path: {:?}", path),
            LoadError::InvoiceNotFound(id) => write!(f, "Invoice not found: {}", id),
        }
    }
}

impl std::error::Error for LoadError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_golden_case_structure() {
        let ground_truth = GroundTruth {
            invoice_number: "INV-001".to_string(),
            invoice_date: "2024-01-15".to_string(),
            vendor_name: "Acme Corp".to_string(),
            vendor_address: None,
            subtotal: 100.0,
            tax: 5.0,
            total: 105.0,
            line_items: vec![],
        };
        
        let case = GoldenCase {
            id: "test-001".to_string(),
            invoice_path: PathBuf::from("test.pdf"),
            ground_truth,
            metadata: CaseMetadata {
                category: CaseCategory::Clean,
                difficulty: Difficulty::Easy,
                notes: None,
            },
        };
        
        assert_eq!(case.id, "test-001");
        assert_eq!(case.metadata.category, CaseCategory::Clean);
    }

    #[test]
    fn test_ground_truth_serialization() {
        let ground_truth = GroundTruth {
            invoice_number: "INV-001".to_string(),
            invoice_date: "2024-01-15".to_string(),
            vendor_name: "Acme Corp".to_string(),
            vendor_address: Some("123 Main St".to_string()),
            subtotal: 100.0,
            tax: 5.0,
            total: 105.0,
            line_items: vec![
                LineItemGroundTruth {
                    sku: "WIDGET-001".to_string(),
                    description: "Widget".to_string(),
                    quantity: 10.0,
                    unit_price: 10.0,
                    line_total: 100.0,
                },
            ],
        };
        
        let json = serde_json::to_string(&ground_truth).unwrap();
        let deserialized: GroundTruth = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.invoice_number, "INV-001");
        assert_eq!(deserialized.line_items.len(), 1);
    }
}

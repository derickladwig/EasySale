//! Generic CSV exporters for products, customers, inventory

use csv::Writer;
use crate::errors::{ExportError, ExportResult};

/// Product data for export
#[derive(Debug)]
pub struct ProductExport {
    pub sku: String,
    pub name: String,
    pub description: String,
    pub cost: f64,
    pub price: f64,
    pub quantity: f64,
    pub category: String,
}

/// Customer data for export
#[derive(Debug)]
pub struct CustomerExport {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address: String,
    pub city: String,
    pub state: String,
    pub zip: String,
}

/// Inventory data for export
#[derive(Debug)]
pub struct InventoryExport {
    pub sku: String,
    pub name: String,
    pub quantity: f64,
    pub location: String,
    pub last_updated: String,
}

/// Generic exporter for non-QuickBooks exports
pub struct GenericExporter {
    products: Vec<ProductExport>,
    customers: Vec<CustomerExport>,
    inventory: Vec<InventoryExport>,
}

impl GenericExporter {
    /// Create a new generic exporter
    #[must_use] 
    pub const fn new() -> Self {
        Self {
            products: Vec::new(),
            customers: Vec::new(),
            inventory: Vec::new(),
        }
    }
    
    /// Create exporter with product data
    #[must_use]
    pub fn with_products(mut self, products: Vec<ProductExport>) -> Self {
        self.products = products;
        self
    }
    
    /// Create exporter with customer data
    #[must_use]
    pub fn with_customers(mut self, customers: Vec<CustomerExport>) -> Self {
        self.customers = customers;
        self
    }
    
    /// Create exporter with inventory data
    #[must_use]
    pub fn with_inventory(mut self, inventory: Vec<InventoryExport>) -> Self {
        self.inventory = inventory;
        self
    }
    
    /// Export products to CSV
    pub fn export_products(&self) -> ExportResult<String> {
        let mut wtr = Writer::from_writer(vec![]);
        
        // Write header
        wtr.write_record([
            "SKU",
            "Name",
            "Description",
            "Cost",
            "Price",
            "Quantity",
            "Category",
        ])?;
        
        // Write product data
        for product in &self.products {
            wtr.write_record([
                &product.sku,
                &product.name,
                &product.description,
                &format!("{:.2}", product.cost),
                &format!("{:.2}", product.price),
                &format!("{:.2}", product.quantity),
                &product.category,
            ])?;
        }
        
        let data = wtr.into_inner()
            .map_err(|e| ExportError::IoError(e.into_error()))?;
        
        String::from_utf8(data)
            .map_err(|e| ExportError::InvalidData(e.to_string()))
    }
    
    /// Export customers to CSV
    pub fn export_customers(&self) -> ExportResult<String> {
        let mut wtr = Writer::from_writer(vec![]);
        
        // Write header
        wtr.write_record([
            "ID",
            "Name",
            "Email",
            "Phone",
            "Address",
            "City",
            "State",
            "Zip",
        ])?;
        
        // Write customer data
        for customer in &self.customers {
            wtr.write_record([
                &customer.id,
                &customer.name,
                &customer.email,
                &customer.phone,
                &customer.address,
                &customer.city,
                &customer.state,
                &customer.zip,
            ])?;
        }
        
        let data = wtr.into_inner()
            .map_err(|e| ExportError::IoError(e.into_error()))?;
        
        String::from_utf8(data)
            .map_err(|e| ExportError::InvalidData(e.to_string()))
    }
    
    /// Export inventory to CSV
    pub fn export_inventory(&self) -> ExportResult<String> {
        let mut wtr = Writer::from_writer(vec![]);
        
        // Write header
        wtr.write_record([
            "SKU",
            "Name",
            "Quantity",
            "Location",
            "Last Updated",
        ])?;
        
        // Write inventory data
        for item in &self.inventory {
            wtr.write_record([
                &item.sku,
                &item.name,
                &format!("{:.2}", item.quantity),
                &item.location,
                &item.last_updated,
            ])?;
        }
        
        let data = wtr.into_inner()
            .map_err(|e| ExportError::IoError(e.into_error()))?;
        
        String::from_utf8(data)
            .map_err(|e| ExportError::InvalidData(e.to_string()))
    }
}

impl Default for GenericExporter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_export_products_with_data() {
        let products = vec![
            ProductExport {
                sku: "SKU001".to_string(),
                name: "Test Product".to_string(),
                description: "A test product".to_string(),
                cost: 10.00,
                price: 19.99,
                quantity: 100.0,
                category: "General".to_string(),
            },
        ];
        
        let exporter = GenericExporter::new().with_products(products);
        let csv = exporter.export_products().unwrap();
        
        assert!(csv.contains("SKU,Name,Description,Cost,Price,Quantity,Category"));
        assert!(csv.contains("SKU001"));
        assert!(csv.contains("Test Product"));
        assert!(csv.contains("19.99"));
    }
    
    #[test]
    fn test_export_customers_with_data() {
        let customers = vec![
            CustomerExport {
                id: "CUST001".to_string(),
                name: "John Doe".to_string(),
                email: "john@example.com".to_string(),
                phone: "555-1234".to_string(),
                address: "123 Main St".to_string(),
                city: "Anytown".to_string(),
                state: "CA".to_string(),
                zip: "90210".to_string(),
            },
        ];
        
        let exporter = GenericExporter::new().with_customers(customers);
        let csv = exporter.export_customers().unwrap();
        
        assert!(csv.contains("ID,Name,Email,Phone,Address,City,State,Zip"));
        assert!(csv.contains("CUST001"));
        assert!(csv.contains("John Doe"));
        assert!(csv.contains("john@example.com"));
    }
    
    #[test]
    fn test_export_inventory_with_data() {
        let inventory = vec![
            InventoryExport {
                sku: "SKU001".to_string(),
                name: "Test Product".to_string(),
                quantity: 50.0,
                location: "Warehouse A".to_string(),
                last_updated: "2026-01-30".to_string(),
            },
        ];
        
        let exporter = GenericExporter::new().with_inventory(inventory);
        let csv = exporter.export_inventory().unwrap();
        
        assert!(csv.contains("SKU,Name,Quantity,Location,Last Updated"));
        assert!(csv.contains("SKU001"));
        assert!(csv.contains("50.00"));
        assert!(csv.contains("Warehouse A"));
    }
    
    #[test]
    fn test_export_empty_data() {
        let exporter = GenericExporter::new();
        
        // Should return CSV with headers only
        let products_csv = exporter.export_products().unwrap();
        assert!(products_csv.contains("SKU,Name,Description,Cost,Price,Quantity,Category"));
        
        let customers_csv = exporter.export_customers().unwrap();
        assert!(customers_csv.contains("ID,Name,Email,Phone,Address,City,State,Zip"));
        
        let inventory_csv = exporter.export_inventory().unwrap();
        assert!(inventory_csv.contains("SKU,Name,Quantity,Location,Last Updated"));
    }
}

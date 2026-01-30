use crate::models::{Product, ProductResponse, ValidationError};
use rand::Rng;
use sqlx::SqlitePool;

/// Barcode service for barcode generation and validation
/// Supports UPC-A, EAN-13, Code 128, and QR codes
pub struct BarcodeService {
    pool: SqlitePool,
}

impl BarcodeService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Generate a unique barcode
    /// Generates Code 128 format barcode and validates uniqueness
    pub async fn generate_barcode(
        &self,
        tenant_id: &str,
        barcode_type: Option<&str>,
    ) -> Result<String, Vec<ValidationError>> {
        let format = barcode_type.unwrap_or("CODE128");

        // Generate barcode based on format
        let barcode = match format.to_uppercase().as_str() {
            "UPC-A" | "UPCA" => Self::generate_upc_a(),
            "EAN-13" | "EAN13" => Self::generate_ean_13(),
            "CODE128" | "CODE-128" => Self::generate_code_128(),
            _ => Self::generate_code_128(), // Default to Code 128
        };

        // Validate uniqueness
        let mut attempts = 0;
        let mut unique_barcode = barcode.clone();

        while attempts < 10 {
            if self.is_barcode_unique(&unique_barcode, tenant_id).await? {
                return Ok(unique_barcode);
            }

            // Generate new barcode if collision
            unique_barcode = match format.to_uppercase().as_str() {
                "UPC-A" | "UPCA" => Self::generate_upc_a(),
                "EAN-13" | "EAN13" => Self::generate_ean_13(),
                "CODE128" | "CODE-128" => Self::generate_code_128(),
                _ => Self::generate_code_128(),
            };

            attempts += 1;
        }

        Err(vec![ValidationError {
            field: "barcode".to_string(),
            message: "Failed to generate unique barcode after 10 attempts".to_string(), code: None
        }])
    }

    /// Validate barcode format and uniqueness
    pub async fn validate_barcode(
        &self,
        barcode: &str,
        barcode_type: &str,
        tenant_id: &str,
        exclude_product_id: Option<&str>,
    ) -> Result<(), Vec<ValidationError>> {
        // Validate format
        Self::validate_format(barcode, barcode_type)?;

        // Validate uniqueness
        if !self.is_barcode_unique_excluding(barcode, tenant_id, exclude_product_id).await? {
            return Err(vec![ValidationError {
                field: "barcode".to_string(),
                message: format!("Barcode '{}' already exists", barcode), code: None
            }]);
        }

        Ok(())
    }

    /// Lookup product by barcode (fast < 100ms)
    pub async fn lookup_by_barcode(
        &self,
        barcode: &str,
        tenant_id: &str,
    ) -> Result<Option<ProductResponse>, Vec<ValidationError>> {
        let product = sqlx::query_as::<_, Product>(
            "SELECT * FROM products 
             WHERE barcode = ? AND tenant_id = ? AND is_active = 1
             LIMIT 1"
        )
        .bind(barcode)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "barcode".to_string(),
                message: format!("Barcode lookup failed: {}", e), code: None
            }]
        })?;

        Ok(product.map(ProductResponse::from))
    }

    /// Validate barcode format
    fn validate_format(barcode: &str, barcode_type: &str) -> Result<(), Vec<ValidationError>> {
        let format = barcode_type.to_uppercase();

        match format.as_str() {
            "UPC-A" | "UPCA" => {
                if !Self::is_valid_upc_a(barcode) {
                    return Err(vec![ValidationError {
                        field: "barcode".to_string(),
                        message: "Invalid UPC-A format. Must be 12 digits.".to_string(), code: None}]);
                }
            }
            "EAN-13" | "EAN13" => {
                if !Self::is_valid_ean_13(barcode) {
                    return Err(vec![ValidationError {
                        field: "barcode".to_string(),
                        message: "Invalid EAN-13 format. Must be 13 digits.".to_string(), code: None}]);
                }
            }
            "CODE128" | "CODE-128" => {
                if !Self::is_valid_code_128(barcode) {
                    return Err(vec![ValidationError {
                        field: "barcode".to_string(),
                        message: "Invalid Code 128 format. Must be alphanumeric.".to_string(), code: None}]);
                }
            }
            "QR" | "QRCODE" => {
                // QR codes can contain any data, just check it's not empty
                if barcode.is_empty() {
                    return Err(vec![ValidationError {
                        field: "barcode".to_string(),
                        message: "QR code cannot be empty".to_string(), code: None}]);
                }
            }
            _ => {
                return Err(vec![ValidationError {
                    field: "barcode_type".to_string(),
                    message: format!("Unsupported barcode type: {}", barcode_type), code: None
                }]);
            }
        }

        Ok(())
    }

    // Barcode generation methods

    /// Generate UPC-A barcode (12 digits)
    fn generate_upc_a() -> String {
        let mut rng = rand::thread_rng();
        
        // Generate 11 random digits
        let mut digits: Vec<u8> = (0..11).map(|_| rng.gen_range(0..10)).collect();
        
        // Calculate check digit
        let check_digit = Self::calculate_upc_check_digit(&digits);
        digits.push(check_digit);
        
        digits.iter().map(|d| d.to_string()).collect::<String>()
    }

    /// Generate EAN-13 barcode (13 digits)
    fn generate_ean_13() -> String {
        let mut rng = rand::thread_rng();
        
        // Generate 12 random digits
        let mut digits: Vec<u8> = (0..12).map(|_| rng.gen_range(0..10)).collect();
        
        // Calculate check digit
        let check_digit = Self::calculate_ean_check_digit(&digits);
        digits.push(check_digit);
        
        digits.iter().map(|d| d.to_string()).collect::<String>()
    }

    /// Generate Code 128 barcode (alphanumeric)
    fn generate_code_128() -> String {
        let mut rng = rand::thread_rng();
        let length = 12; // Standard length
        
        let chars: Vec<char> = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().collect();
        
        (0..length)
            .map(|_| chars[rng.gen_range(0..chars.len())])
            .collect()
    }

    // Barcode validation methods

    /// Validate UPC-A format
    fn is_valid_upc_a(barcode: &str) -> bool {
        if barcode.len() != 12 {
            return false;
        }

        let digits: Vec<u8> = barcode
            .chars()
            .filter_map(|c| c.to_digit(10).map(|d| u8::try_from(d)))
            .filter_map(|r| r.ok())
            .collect();

        if digits.len() != 12 {
            return false;
        }

        let check_digit = digits[11];
        let calculated = Self::calculate_upc_check_digit(&digits[..11]);

        check_digit == calculated
    }

    /// Validate EAN-13 format
    fn is_valid_ean_13(barcode: &str) -> bool {
        if barcode.len() != 13 {
            return false;
        }

        let digits: Vec<u8> = barcode
            .chars()
            .filter_map(|c| c.to_digit(10).map(|d| u8::try_from(d)))
            .filter_map(|r| r.ok())
            .collect();

        if digits.len() != 13 {
            return false;
        }

        let check_digit = digits[12];
        let calculated = Self::calculate_ean_check_digit(&digits[..12]);

        check_digit == calculated
    }

    /// Validate Code 128 format
    fn is_valid_code_128(barcode: &str) -> bool {
        if barcode.is_empty() || barcode.len() > 80 {
            return false;
        }

        // Code 128 supports ASCII characters 0-127
        barcode.chars().all(|c| c.is_ascii())
    }

    // Check digit calculation methods

    /// Calculate UPC-A check digit
    fn calculate_upc_check_digit(digits: &[u8]) -> u8 {
        let mut sum = 0;
        
        for (i, &digit) in digits.iter().enumerate() {
            if i % 2 == 0 {
                sum += digit * 3;
            } else {
                sum += digit;
            }
        }
        
        let remainder = sum % 10;
        if remainder == 0 {
            0
        } else {
            10 - remainder
        }
    }

    /// Calculate EAN-13 check digit
    fn calculate_ean_check_digit(digits: &[u8]) -> u8 {
        let mut sum = 0;
        
        for (i, &digit) in digits.iter().enumerate() {
            if i % 2 == 0 {
                sum += digit;
            } else {
                sum += digit * 3;
            }
        }
        
        let remainder = sum % 10;
        if remainder == 0 {
            0
        } else {
            10 - remainder
        }
    }

    // Database helper methods

    /// Check if barcode is unique
    async fn is_barcode_unique(
        &self,
        barcode: &str,
        tenant_id: &str,
    ) -> Result<bool, Vec<ValidationError>> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM products WHERE barcode = ? AND tenant_id = ?"
        )
        .bind(barcode)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "barcode".to_string(),
                message: format!("Failed to check barcode uniqueness: {}", e), code: None
            }]
        })?;

        Ok(count.0 == 0)
    }

    /// Check if barcode is unique excluding a specific product
    async fn is_barcode_unique_excluding(
        &self,
        barcode: &str,
        tenant_id: &str,
        exclude_product_id: Option<&str>,
    ) -> Result<bool, Vec<ValidationError>> {
        let query = if let Some(product_id) = exclude_product_id {
            sqlx::query_as(
                "SELECT COUNT(*) FROM products 
                 WHERE barcode = ? AND tenant_id = ? AND id != ?"
            )
            .bind(barcode)
            .bind(tenant_id)
            .bind(product_id)
        } else {
            sqlx::query_as(
                "SELECT COUNT(*) FROM products WHERE barcode = ? AND tenant_id = ?"
            )
            .bind(barcode)
            .bind(tenant_id)
        };

        let count: (i64,) = query
            .fetch_one(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "barcode".to_string(),
                    message: format!("Failed to check barcode uniqueness: {}", e), code: None
                }]
            })?;

        Ok(count.0 == 0)
    }

    /// Get all products with a specific barcode type
    pub async fn get_products_by_barcode_type(
        &self,
        barcode_type: &str,
        tenant_id: &str,
    ) -> Result<Vec<ProductResponse>, Vec<ValidationError>> {
        let products = sqlx::query_as::<_, Product>(
            "SELECT * FROM products 
             WHERE barcode_type = ? AND tenant_id = ? AND is_active = 1
             ORDER BY name ASC"
        )
        .bind(barcode_type)
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to fetch products: {}", e), code: None
            }]
        })?;

        Ok(products.into_iter().map(ProductResponse::from).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_upc_a_validation() {
        // Valid UPC-A
        assert!(BarcodeService::is_valid_upc_a("012345678905"));
        
        // Invalid length
        assert!(!BarcodeService::is_valid_upc_a("12345"));
        
        // Invalid characters
        assert!(!BarcodeService::is_valid_upc_a("01234567890A"));
    }

    #[tokio::test]
    async fn test_ean_13_validation() {
        // Valid EAN-13
        assert!(BarcodeService::is_valid_ean_13("5901234123457"));
        
        // Invalid length
        assert!(!BarcodeService::is_valid_ean_13("123456"));
        
        // Invalid characters
        assert!(!BarcodeService::is_valid_ean_13("590123412345A"));
    }

    #[tokio::test]
    async fn test_code_128_validation() {
        // Valid Code 128
        assert!(BarcodeService::is_valid_code_128("ABC123XYZ"));
        assert!(BarcodeService::is_valid_code_128("0123456789"));
        
        // Empty
        assert!(!BarcodeService::is_valid_code_128(""));
        
        // Too long
        assert!(!BarcodeService::is_valid_code_128(&"A".repeat(81)));
    }

    #[tokio::test]
    async fn test_upc_check_digit() {
        let digits = vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        let check = BarcodeService::calculate_upc_check_digit(&digits);
        assert_eq!(check, 5);
    }

    #[tokio::test]
    async fn test_ean_check_digit() {
        let digits = vec![5, 9, 0, 1, 2, 3, 4, 1, 2, 3, 4, 5];
        let check = BarcodeService::calculate_ean_check_digit(&digits);
        assert_eq!(check, 7);
    }
}

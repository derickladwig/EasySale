use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use tokio::fs as async_fs;
use tokio::io::AsyncWriteExt;

/// Service for file storage operations
/// Handles vendor bill document storage with tenant isolation
#[allow(dead_code)] // File storage service
pub struct FileService {
    base_path: PathBuf,
}

impl FileService {
    pub fn new(base_path: impl Into<PathBuf>) -> Self {
        Self {
            base_path: base_path.into(),
        }
    }

    /// Save a vendor bill file
    /// Requirements: 1.2, 1.3, 11.2
    /// 
    /// Returns: (file_path, file_hash, file_size)
    pub async fn save_bill_file(
        &self,
        tenant_id: &str,
        bill_id: &str,
        file_data: &[u8],
        extension: &str,
    ) -> Result<(String, String, i64), std::io::Error> {
        // Calculate SHA256 hash
        let mut hasher = Sha256::new();
        hasher.update(file_data);
        let hash = format!("{:x}", hasher.finalize());

        // Check for duplicate hash (caller should handle this)
        let file_size = file_data.len() as i64;

        // Create directory structure: data/uploads/vendor-bills/{tenant_id}/
        let dir_path = self.base_path
            .join("vendor-bills")
            .join(tenant_id);
        
        async_fs::create_dir_all(&dir_path).await?;

        // Save file: {bill_id}.{ext}
        let filename = format!("{}.{}", bill_id, extension);
        let file_path = dir_path.join(&filename);
        
        let mut file = async_fs::File::create(&file_path).await?;
        file.write_all(file_data).await?;

        // Return relative path from base
        let relative_path = format!("vendor-bills/{}/{}", tenant_id, filename);

        Ok((relative_path, hash, file_size))
    }

    /// Get a vendor bill file
    /// Requirements: 1.5, 19.1
    pub async fn get_bill_file(
        &self,
        file_path: &str,
        tenant_id: &str,
    ) -> Result<Vec<u8>, std::io::Error> {
        // Verify tenant_id matches path for security
        if !file_path.starts_with(&format!("vendor-bills/{}/", tenant_id)) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Tenant ID mismatch",
            ));
        }

        let full_path = self.base_path.join(file_path);
        async_fs::read(&full_path).await
    }

    /// Delete a vendor bill file (soft delete - caller marks in database)
    /// Requirements: 1.5
    pub async fn delete_bill_file(
        &self,
        file_path: &str,
        tenant_id: &str,
        hard_delete: bool,
    ) -> Result<(), std::io::Error> {
        // Verify tenant_id matches path for security
        if !file_path.starts_with(&format!("vendor-bills/{}/", tenant_id)) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Tenant ID mismatch",
            ));
        }

        if hard_delete {
            let full_path = self.base_path.join(file_path);
            async_fs::remove_file(&full_path).await?;
        }

        Ok(())
    }

    /// Check if file with hash already exists
    /// Requirements: 11.2
    pub fn check_duplicate_hash(
        &self,
        tenant_id: &str,
        hash: &str,
    ) -> Result<Option<String>, std::io::Error> {
        let dir_path = self.base_path
            .join("vendor-bills")
            .join(tenant_id);

        if !dir_path.exists() {
            return Ok(None);
        }

        // Scan directory for files and check their hashes
        // This is a simple implementation; in production, you'd query the database
        for entry in fs::read_dir(dir_path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
                let file_hash = Self::calculate_file_hash(&path)?;
                if file_hash == hash {
                    let relative_path = format!(
                        "vendor-bills/{}/{}",
                        tenant_id,
                        path.file_name().unwrap().to_string_lossy()
                    );
                    return Ok(Some(relative_path));
                }
            }
        }

        Ok(None)
    }

    /// Calculate SHA256 hash of a file
    fn calculate_file_hash(path: &Path) -> Result<String, std::io::Error> {
        let mut file = fs::File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0; 8192];

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    /// Get file extension from mime type
    pub fn extension_from_mime(mime_type: &str) -> &str {
        match mime_type {
            "application/pdf" => "pdf",
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/tiff" => "tiff",
            _ => "bin",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_save_and_get_bill_file() {
        let temp_dir = TempDir::new().unwrap();
        let service = FileService::new(temp_dir.path());

        let tenant_id = "test-tenant";
        let bill_id = "bill-123";
        let file_data = b"Test invoice content";
        let extension = "pdf";

        // Save file
        let (path, _hash, size) = service
            .save_bill_file(tenant_id, bill_id, file_data, extension)
            .await
            .unwrap();

        assert_eq!(size, file_data.len() as i64);
        assert!(path.contains(tenant_id));
        assert!(path.contains(bill_id));

        // Get file
        let retrieved = service.get_bill_file(&path, tenant_id).await.unwrap();
        assert_eq!(retrieved, file_data);

        // Test tenant isolation
        let result = service.get_bill_file(&path, "wrong-tenant").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_delete_bill_file() {
        let temp_dir = TempDir::new().unwrap();
        let service = FileService::new(temp_dir.path());

        let tenant_id = "test-tenant";
        let bill_id = "bill-123";
        let file_data = b"Test invoice content";
        let extension = "pdf";

        // Save file
        let (path, _, _) = service
            .save_bill_file(tenant_id, bill_id, file_data, extension)
            .await
            .unwrap();

        // Hard delete
        service.delete_bill_file(&path, tenant_id, true).await.unwrap();

        // Verify deleted
        let result = service.get_bill_file(&path, tenant_id).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_extension_from_mime() {
        assert_eq!(FileService::extension_from_mime("application/pdf"), "pdf");
        assert_eq!(FileService::extension_from_mime("image/jpeg"), "jpg");
        assert_eq!(FileService::extension_from_mime("image/png"), "png");
        assert_eq!(FileService::extension_from_mime("image/tiff"), "tiff");
        assert_eq!(FileService::extension_from_mime("unknown"), "bin");
    }

    #[tokio::test]
    async fn test_file_hash_calculation() {
        let temp_dir = TempDir::new().unwrap();
        let service = FileService::new(temp_dir.path());

        let tenant_id = "test-tenant";
        let _bill_id = "bill-123";
        let file_data = b"Test invoice content";
        let extension = "pdf";

        // Save file twice with same content
        let (_path1, hash1, _) = service
            .save_bill_file(tenant_id, "bill-1", file_data, extension)
            .await
            .unwrap();

        let (_path2, hash2, _) = service
            .save_bill_file(tenant_id, "bill-2", file_data, extension)
            .await
            .unwrap();

        // Hashes should be identical
        assert_eq!(hash1, hash2);
    }
}

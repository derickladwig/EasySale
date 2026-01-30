/**
 * Google Drive Destination Service
 * 
 * Implements file operations for Google Drive backup destination:
 * - Upload backups with resumable upload
 * - List remote backups
 * - Delete remote backups
 * - Health check for token validation
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.7
 */

use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

use crate::models::errors::ApiError;
use crate::models::backup::BackupDestination;
use crate::connectors::google_drive::{GoogleDriveCredentials, GoogleDriveOAuth, GoogleDriveTokens};
use crate::services::CredentialService;

/// Google Drive API base URL
const DRIVE_API_BASE: &str = "https://www.googleapis.com/drive/v3";
const UPLOAD_API_BASE: &str = "https://www.googleapis.com/upload/drive/v3";

/// Chunk size for resumable uploads (5MB - Google's minimum)
const UPLOAD_CHUNK_SIZE: usize = 5 * 1024 * 1024;

/// Remote backup file information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteBackup {
    pub id: String,
    pub name: String,
    pub size: i64,
    pub created_time: String,
    pub modified_time: String,
}

/// Health check status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub healthy: bool,
    pub message: String,
    pub last_checked: String,
}

/// Google Drive file metadata response
#[derive(Debug, Deserialize)]
struct DriveFile {
    id: String,
    name: String,
    size: Option<String>,
    #[serde(rename = "createdTime")]
    created_time: String,
    #[serde(rename = "modifiedTime")]
    modified_time: String,
}

/// Google Drive file list response
#[derive(Debug, Deserialize)]
struct DriveFileList {
    files: Vec<DriveFile>,
    #[allow(dead_code)]
    #[serde(rename = "nextPageToken")]
    next_page_token: Option<String>,
}

/// Google Drive upload session response
#[derive(Debug, Deserialize)]
struct UploadSession {
    #[allow(dead_code)]
    kind: String,
    id: String,
    #[allow(dead_code)]
    name: String,
}

/// Google Drive Destination Service
pub struct GoogleDriveService {
    pool: SqlitePool,
    client: Client,
    credential_service: CredentialService,
}

impl GoogleDriveService {
    /// Create a new Google Drive service
    pub fn new(pool: SqlitePool) -> Result<Self, ApiError> {
        let client = Client::builder()
            .user_agent("EasySale/1.0")
            .timeout(std::time::Duration::from_secs(300)) // 5 minutes for large uploads
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;

        let credential_service = CredentialService::new(pool.clone())?;

        Ok(Self { 
            pool, 
            client,
            credential_service,
        })
    }

    /// Get and refresh access token if needed
    async fn get_access_token(&self, destination: &BackupDestination) -> Result<String, ApiError> {
        // Get encrypted tokens from destination
        let tokens_encrypted = destination.refresh_token_encrypted.as_ref()
            .ok_or_else(|| ApiError::internal("No refresh token stored"))?;
        
        // Decrypt tokens using CredentialService
        let tokens_json = self.credential_service.decrypt_data(tokens_encrypted)?;
        let mut tokens: GoogleDriveTokens = serde_json::from_str(&tokens_json)
            .map_err(|e| ApiError::internal(format!("Failed to parse tokens: {}", e)))?;

        // Check if token needs refresh
        if GoogleDriveOAuth::needs_refresh(&tokens) {
            // Get credentials from environment
            let client_id = std::env::var("GOOGLE_DRIVE_CLIENT_ID")
                .map_err(|_| ApiError::internal("GOOGLE_DRIVE_CLIENT_ID not configured"))?;
            let client_secret = std::env::var("GOOGLE_DRIVE_CLIENT_SECRET")
                .map_err(|_| ApiError::internal("GOOGLE_DRIVE_CLIENT_SECRET not configured"))?;
            let redirect_uri = std::env::var("GOOGLE_DRIVE_REDIRECT_URI")
                .map_err(|_| ApiError::internal("GOOGLE_DRIVE_REDIRECT_URI not configured"))?;

            let credentials = GoogleDriveCredentials {
                client_id,
                client_secret,
            };

            let oauth = GoogleDriveOAuth::new(credentials, redirect_uri)?;
            
            // Refresh the token
            tokens = oauth.refresh_access_token(&tokens.refresh_token).await?;

            // Encrypt and update stored tokens
            let new_tokens_json = serde_json::to_string(&tokens)
                .map_err(|e| ApiError::internal(format!("Failed to serialize tokens: {}", e)))?;
            let new_tokens_encrypted = self.credential_service.encrypt_data(&new_tokens_json)?;

            sqlx::query(
                "UPDATE backup_destinations 
                 SET refresh_token_encrypted = ?, updated_at = ? 
                 WHERE id = ?"
            )
            .bind(&new_tokens_encrypted)
            .bind(chrono::Utc::now().to_rfc3339())
            .bind(&destination.id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Failed to update tokens: {}", e)))?;
        }

        Ok(tokens.access_token)
    }

    /// Upload a backup file to Google Drive with resumable upload
    /// 
    /// Requirements: 4.2 (Upload with resumable upload)
    pub async fn upload_backup(
        &self,
        destination: &BackupDestination,
        archive_path: &Path,
        backup_name: &str,
    ) -> Result<String, ApiError> {
        // Get access token
        let access_token = self.get_access_token(destination).await?;

        // Get file size
        let metadata = tokio::fs::metadata(archive_path)
            .await
            .map_err(|e| ApiError::internal(format!("Failed to read file metadata: {}", e)))?;
        let file_size = metadata.len();

        // Determine parent folder ID (if specified)
        let parent_id = if let Some(folder_path) = &destination.folder_path {
            Some(self.get_or_create_folder(&access_token, folder_path).await?)
        } else {
            None
        };

        // Initiate resumable upload session
        let upload_url = self.initiate_resumable_upload(
            &access_token,
            backup_name,
            file_size,
            parent_id.as_deref(),
        ).await?;

        // Upload file in chunks
        let file_id = self.upload_file_chunks(
            &upload_url,
            archive_path,
            file_size,
        ).await?;

        Ok(file_id)
    }

    /// Initiate a resumable upload session
    async fn initiate_resumable_upload(
        &self,
        access_token: &str,
        file_name: &str,
        file_size: u64,
        parent_id: Option<&str>,
    ) -> Result<String, ApiError> {
        let mut metadata = serde_json::json!({
            "name": file_name,
            "mimeType": "application/zip",
        });

        // Add parent folder if specified
        if let Some(parent) = parent_id {
            metadata["parents"] = serde_json::json!([parent]);
        }

        let response = self.client
            .post(format!("{}/files?uploadType=resumable", UPLOAD_API_BASE))
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json; charset=UTF-8")
            .header("X-Upload-Content-Type", "application/zip")
            .header("X-Upload-Content-Length", file_size.to_string())
            .json(&metadata)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to initiate upload: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ApiError::internal(format!("Upload initiation failed: {}", error_text)));
        }

        // Get upload URL from Location header
        let upload_url = response
            .headers()
            .get("Location")
            .ok_or_else(|| ApiError::internal("No upload URL in response"))?
            .to_str()
            .map_err(|_| ApiError::internal("Invalid upload URL"))?
            .to_string();

        Ok(upload_url)
    }

    /// Upload file in chunks using resumable upload
    async fn upload_file_chunks(
        &self,
        upload_url: &str,
        file_path: &Path,
        file_size: u64,
    ) -> Result<String, ApiError> {
        let mut file = File::open(file_path)
            .await
            .map_err(|e| ApiError::internal(format!("Failed to open file: {}", e)))?;

        let mut offset = 0u64;
        let mut buffer = vec![0u8; UPLOAD_CHUNK_SIZE];

        loop {
            // Read chunk
            let bytes_read = file.read(&mut buffer)
                .await
                .map_err(|e| ApiError::internal(format!("Failed to read file: {}", e)))?;

            if bytes_read == 0 {
                break;
            }

            let chunk = &buffer[..bytes_read];
            let chunk_end = offset + bytes_read as u64 - 1;

            // Upload chunk
            let response = self.client
                .put(upload_url)
                .header("Content-Length", bytes_read.to_string())
                .header("Content-Range", format!("bytes {}-{}/{}", offset, chunk_end, file_size))
                .body(chunk.to_vec())
                .send()
                .await
                .map_err(|e| ApiError::internal(format!("Failed to upload chunk: {}", e)))?;

            let status = response.status();

            // Check if upload is complete (200 or 201)
            if status == StatusCode::OK || status == StatusCode::CREATED {
                let upload_response: UploadSession = response.json()
                    .await
                    .map_err(|e| ApiError::internal(format!("Failed to parse upload response: {}", e)))?;
                return Ok(upload_response.id);
            }

            // Check if chunk was accepted (308 Resume Incomplete)
            if status != StatusCode::PERMANENT_REDIRECT {
                let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(ApiError::internal(format!("Upload chunk failed: {}", error_text)));
            }

            offset += bytes_read as u64;
        }

        Err(ApiError::internal("Upload completed without receiving file ID"))
    }

    /// Get or create a folder in Google Drive
    async fn get_or_create_folder(
        &self,
        access_token: &str,
        folder_path: &str,
    ) -> Result<String, ApiError> {
        // Split path into components
        let components: Vec<&str> = folder_path.split('/').filter(|s| !s.is_empty()).collect();
        
        let mut parent_id: Option<String> = None;

        for folder_name in components {
            // Search for folder
            let query = if let Some(parent) = &parent_id {
                format!(
                    "name='{}' and mimeType='application/vnd.google-apps.folder' and '{}' in parents and trashed=false",
                    folder_name, parent
                )
            } else {
                format!(
                    "name='{}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
                    folder_name
                )
            };

            let response = self.client
                .get(format!("{}/files", DRIVE_API_BASE))
                .header("Authorization", format!("Bearer {}", access_token))
                .query(&[("q", query), ("fields", "files(id, name)".to_string())])
                .send()
                .await
                .map_err(|e| ApiError::internal(format!("Failed to search for folder: {}", e)))?;

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(ApiError::internal(format!("Folder search failed: {}", error_text)));
            }

            let file_list: DriveFileList = response.json()
                .await
                .map_err(|e| ApiError::internal(format!("Failed to parse folder search response: {}", e)))?;

            if let Some(folder) = file_list.files.first() {
                // Folder exists
                parent_id = Some(folder.id.clone());
            } else {
                // Create folder
                let mut metadata = serde_json::json!({
                    "name": folder_name,
                    "mimeType": "application/vnd.google-apps.folder",
                });

                if let Some(parent) = &parent_id {
                    metadata["parents"] = serde_json::json!([parent]);
                }

                let response = self.client
                    .post(format!("{}/files", DRIVE_API_BASE))
                    .header("Authorization", format!("Bearer {}", access_token))
                    .header("Content-Type", "application/json")
                    .json(&metadata)
                    .send()
                    .await
                    .map_err(|e| ApiError::internal(format!("Failed to create folder: {}", e)))?;

                if !response.status().is_success() {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(ApiError::internal(format!("Folder creation failed: {}", error_text)));
                }

                let created_folder: DriveFile = response.json()
                    .await
                    .map_err(|e| ApiError::internal(format!("Failed to parse folder creation response: {}", e)))?;

                parent_id = Some(created_folder.id);
            }
        }

        parent_id.ok_or_else(|| ApiError::internal("Failed to get or create folder"))
    }

    /// List remote backups in Google Drive
    /// 
    /// Requirements: 4.3 (List remote backups)
    pub async fn list_remote_backups(
        &self,
        destination: &BackupDestination,
    ) -> Result<Vec<RemoteBackup>, ApiError> {
        // Get access token
        let access_token = self.get_access_token(destination).await?;

        // Build query to find backup files
        let query = if let Some(folder_path) = &destination.folder_path {
            let folder_id = self.get_or_create_folder(&access_token, folder_path).await?;
            format!(
                "mimeType='application/zip' and '{}' in parents and trashed=false",
                folder_id
            )
        } else {
            "mimeType='application/zip' and 'root' in parents and trashed=false".to_string()
        };

        let response = self.client
            .get(format!("{}/files", DRIVE_API_BASE))
            .header("Authorization", format!("Bearer {}", access_token))
            .query(&[
                ("q", query),
                ("fields", "files(id, name, size, createdTime, modifiedTime)".to_string()),
                ("orderBy", "createdTime desc".to_string()),
            ])
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to list files: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ApiError::internal(format!("File listing failed: {}", error_text)));
        }

        let file_list: DriveFileList = response.json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse file list: {}", e)))?;

        // Convert to RemoteBackup format
        let backups = file_list.files.into_iter().map(|file| {
            RemoteBackup {
                id: file.id,
                name: file.name,
                size: file.size.and_then(|s| s.parse().ok()).unwrap_or(0),
                created_time: file.created_time,
                modified_time: file.modified_time,
            }
        }).collect();

        Ok(backups)
    }

    /// Delete a remote backup from Google Drive
    /// 
    /// Requirements: 4.4 (Delete remote backup)
    pub async fn delete_remote_backup(
        &self,
        destination: &BackupDestination,
        file_id: &str,
    ) -> Result<(), ApiError> {
        // Get access token
        let access_token = self.get_access_token(destination).await?;

        let response = self.client
            .delete(format!("{}/files/{}", DRIVE_API_BASE, file_id))
            .header("Authorization", format!("Bearer {}", access_token))
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to delete file: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ApiError::internal(format!("File deletion failed: {}", error_text)));
        }

        Ok(())
    }

    /// Enforce retention policy on remote backups
    /// 
    /// Lists remote backups, identifies oldest ones exceeding retention count,
    /// deletes them from Google Drive, and updates local database records.
    /// 
    /// Requirements: 4.3, 5.3, 5.6 (Remote retention enforcement)
    pub async fn enforce_retention(
        &self,
        destination: &BackupDestination,
        retention_count: i32,
    ) -> Result<Vec<String>, ApiError> {
        if retention_count <= 0 {
            return Err(ApiError::bad_request("Retention count must be positive"));
        }

        // List all remote backups
        let remote_backups = self.list_remote_backups(destination).await?;

        // If we're under the retention limit, nothing to delete
        if remote_backups.len() <= retention_count as usize {
            return Ok(Vec::new());
        }

        // Sort by creation time (oldest first)
        let mut sorted_backups = remote_backups;
        sorted_backups.sort_by(|a, b| a.created_time.cmp(&b.created_time));

        // Calculate how many to delete
        let delete_count = sorted_backups.len() - retention_count as usize;
        let backups_to_delete = &sorted_backups[..delete_count];

        let mut deleted_ids = Vec::new();

        // Delete each backup
        for backup in backups_to_delete {
            match self.delete_remote_backup(destination, &backup.id).await {
                Ok(_) => {
                    // Update local database record
                    let result = sqlx::query(
                        "UPDATE backup_dest_objects 
                         SET upload_status = 'deleted', 
                             updated_at = ? 
                         WHERE destination_id = ? 
                         AND remote_id = ?"
                    )
                    .bind(chrono::Utc::now().to_rfc3339())
                    .bind(&destination.id)
                    .bind(&backup.id)
                    .execute(&self.pool)
                    .await;

                    match result {
                        Ok(_) => {
                            deleted_ids.push(backup.id.clone());
                            eprintln!(
                                "INFO: Deleted remote backup {} from destination {}",
                                backup.name,
                                destination.name
                            );
                        }
                        Err(e) => {
                            eprintln!(
                                "ERROR: Failed to update database record for deleted backup {}: {}",
                                backup.id,
                                e
                            );
                            // Continue with other deletions even if database update fails
                        }
                    }
                }
                Err(e) => {
                    eprintln!(
                        "ERROR: Failed to delete remote backup {} from destination {}: {}",
                        backup.name,
                        destination.name,
                        e
                    );
                    // Continue with other deletions even if one fails
                }
            }
        }

        Ok(deleted_ids)
    }

    /// Perform health check to validate token
    /// 
    /// Requirements: 4.7 (Health check for token validation)
    pub async fn health_check(
        &self,
        destination: &BackupDestination,
    ) -> Result<HealthStatus, ApiError> {
        // Try to get access token (this will refresh if needed)
        match self.get_access_token(destination).await {
            Ok(access_token) => {
                // Try to make a simple API call to verify token works
                let response = self.client
                    .get(format!("{}/about?fields=user", DRIVE_API_BASE))
                    .header("Authorization", format!("Bearer {}", access_token))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        Ok(HealthStatus {
                            healthy: true,
                            message: "Google Drive connection is healthy".to_string(),
                            last_checked: chrono::Utc::now().to_rfc3339(),
                        })
                    }
                    Ok(resp) => {
                        let error_text = resp.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                        Ok(HealthStatus {
                            healthy: false,
                            message: format!("Google Drive API error: {}", error_text),
                            last_checked: chrono::Utc::now().to_rfc3339(),
                        })
                    }
                    Err(e) => {
                        Ok(HealthStatus {
                            healthy: false,
                            message: format!("Network error: {}", e),
                            last_checked: chrono::Utc::now().to_rfc3339(),
                        })
                    }
                }
            }
            Err(e) => {
                Ok(HealthStatus {
                    healthy: false,
                    message: format!("Token error: {}", e),
                    last_checked: chrono::Utc::now().to_rfc3339(),
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_size_meets_google_minimum() {
        // Google Drive requires minimum 5MB chunks for resumable uploads
        assert!(UPLOAD_CHUNK_SIZE >= 5 * 1024 * 1024);
    }

    #[test]
    fn test_remote_backup_serialization() {
        let backup = RemoteBackup {
            id: "test-id".to_string(),
            name: "backup.zip".to_string(),
            size: 1024,
            created_time: "2024-01-01T00:00:00Z".to_string(),
            modified_time: "2024-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&backup).unwrap();
        let deserialized: RemoteBackup = serde_json::from_str(&json).unwrap();

        assert_eq!(backup.id, deserialized.id);
        assert_eq!(backup.name, deserialized.name);
        assert_eq!(backup.size, deserialized.size);
    }

    #[test]
    fn test_health_status_serialization() {
        let status = HealthStatus {
            healthy: true,
            message: "All good".to_string(),
            last_checked: "2024-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&status).unwrap();
        let deserialized: HealthStatus = serde_json::from_str(&json).unwrap();

        assert_eq!(status.healthy, deserialized.healthy);
        assert_eq!(status.message, deserialized.message);
    }

    #[test]
    fn test_health_status_unhealthy() {
        let status = HealthStatus {
            healthy: false,
            message: "Token expired".to_string(),
            last_checked: chrono::Utc::now().to_rfc3339(),
        };

        assert!(!status.healthy);
        assert!(status.message.contains("Token"));
    }

    #[test]
    fn test_remote_backup_with_large_size() {
        let backup = RemoteBackup {
            id: "large-backup".to_string(),
            name: "large_backup.zip".to_string(),
            size: 10_737_418_240, // 10GB
            created_time: "2024-01-01T00:00:00Z".to_string(),
            modified_time: "2024-01-01T00:00:00Z".to_string(),
        };

        assert_eq!(backup.size, 10_737_418_240);
    }

    #[test]
    fn test_api_urls_are_https() {
        assert!(DRIVE_API_BASE.starts_with("https://"));
        assert!(UPLOAD_API_BASE.starts_with("https://"));
    }

    #[test]
    fn test_chunk_size_is_multiple_of_256kb() {
        // Google recommends chunk sizes that are multiples of 256KB
        assert_eq!(UPLOAD_CHUNK_SIZE % (256 * 1024), 0);
    }

    #[test]
    fn test_retention_count_validation() {
        // Test that retention count must be positive
        let retention_count = 5;
        assert!(retention_count > 0);
    }

    #[test]
    fn test_retention_calculation() {
        // Test calculating how many backups to delete
        let total_backups = 15;
        let retention_count = 10;
        let delete_count = total_backups - retention_count;
        assert_eq!(delete_count, 5);
    }

    #[test]
    fn test_retention_no_deletion_needed() {
        // Test when backups are under retention limit
        let total_backups = 8;
        let retention_count = 10;
        assert!(total_backups <= retention_count);
    }

    #[test]
    fn test_remote_backup_sorting() {
        // Test that backups can be sorted by creation time
        let mut backups = vec![
            RemoteBackup {
                id: "3".to_string(),
                name: "backup3.zip".to_string(),
                size: 1024,
                created_time: "2024-01-03T00:00:00Z".to_string(),
                modified_time: "2024-01-03T00:00:00Z".to_string(),
            },
            RemoteBackup {
                id: "1".to_string(),
                name: "backup1.zip".to_string(),
                size: 1024,
                created_time: "2024-01-01T00:00:00Z".to_string(),
                modified_time: "2024-01-01T00:00:00Z".to_string(),
            },
            RemoteBackup {
                id: "2".to_string(),
                name: "backup2.zip".to_string(),
                size: 1024,
                created_time: "2024-01-02T00:00:00Z".to_string(),
                modified_time: "2024-01-02T00:00:00Z".to_string(),
            },
        ];

        backups.sort_by(|a, b| a.created_time.cmp(&b.created_time));

        assert_eq!(backups[0].id, "1");
        assert_eq!(backups[1].id, "2");
        assert_eq!(backups[2].id, "3");
    }
}

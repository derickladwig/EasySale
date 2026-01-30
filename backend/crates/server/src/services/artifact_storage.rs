// Artifact storage service with deterministic hashing and TTL cache
// Provides caching for OCR pipeline artifacts with LRU eviction

use crate::models::Artifact;
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use thiserror::Error;

/// Errors that can occur during artifact storage operations
#[derive(Debug, Error)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Artifact not found: {0}")]
    NotFound(String),

    #[error("Cache full: {current} bytes used, {max} bytes max")]
    CacheFull { current: u64, max: u64 },

    #[error("Invalid artifact ID: {0}")]
    InvalidArtifactId(String),
}

/// Configuration for artifact storage
#[derive(Debug, Clone)]
pub struct StorageConfig {
    /// Directory for cache storage
    pub cache_dir: PathBuf,
    /// TTL for cached artifacts in hours (default: 24)
    pub ttl_hours: u64,
    /// Maximum cache size in bytes (default: 10GB)
    pub max_cache_size: u64,
    /// Whether to preserve original input artifacts (default: true)
    pub preserve_originals: bool,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            cache_dir: PathBuf::from("./data/artifact_cache"),
            ttl_hours: 24,
            max_cache_size: 10 * 1024 * 1024 * 1024, // 10GB
            preserve_originals: true,
        }
    }
}

/// Metadata for cached artifacts
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ArtifactMetadata {
    artifact_id: String,
    artifact_hash: String,
    stored_at: DateTime<Utc>,
    last_accessed: DateTime<Utc>,
    size_bytes: u64,
    is_original: bool,
}

/// Artifact storage service
pub struct ArtifactStorage {
    config: StorageConfig,
    metadata_cache: HashMap<String, ArtifactMetadata>,
}

impl ArtifactStorage {
    /// Create a new artifact storage service
    pub fn new(config: StorageConfig) -> Result<Self, StorageError> {
        // Ensure cache directory exists
        fs::create_dir_all(&config.cache_dir)?;

        let mut storage = Self {
            config,
            metadata_cache: HashMap::new(),
        };

        // Load existing metadata
        storage.load_metadata()?;

        Ok(storage)
    }

    /// Store an artifact and return its deterministic hash key
    pub fn store(&mut self, artifact: &Artifact) -> Result<String, StorageError> {
        // Calculate deterministic hash for the artifact
        let artifact_hash = Self::calculate_artifact_hash(artifact)?;

        // Check if artifact already exists
        if let Some(metadata) = self.metadata_cache.get(&artifact_hash) {
            // Update last accessed time
            let mut updated_metadata = metadata.clone();
            updated_metadata.last_accessed = Utc::now();
            self.metadata_cache
                .insert(artifact_hash.clone(), updated_metadata);
            self.save_metadata()?;
            return Ok(artifact_hash);
        }

        // Serialize artifact
        let artifact_json = serde_json::to_string_pretty(artifact)?;
        let artifact_bytes = artifact_json.as_bytes();
        let size_bytes = artifact_bytes.len() as u64;

        // Check if we need to evict artifacts
        self.ensure_cache_space(size_bytes)?;

        // Determine if this is an original input artifact
        let is_original = matches!(artifact, Artifact::Input(_));

        // Write artifact to disk
        let artifact_path = self.get_artifact_path(&artifact_hash);
        let mut file = fs::File::create(&artifact_path)?;
        file.write_all(artifact_bytes)?;

        // Create metadata
        let metadata = ArtifactMetadata {
            artifact_id: Self::extract_artifact_id(artifact),
            artifact_hash: artifact_hash.clone(),
            stored_at: Utc::now(),
            last_accessed: Utc::now(),
            size_bytes,
            is_original,
        };

        // Store metadata
        self.metadata_cache.insert(artifact_hash.clone(), metadata);
        self.save_metadata()?;

        Ok(artifact_hash)
    }

    /// Retrieve an artifact by its hash key
    pub fn retrieve(&mut self, artifact_hash: &str) -> Result<Artifact, StorageError> {
        // Check if artifact exists in metadata
        let metadata = self
            .metadata_cache
            .get(artifact_hash)
            .ok_or_else(|| StorageError::NotFound(artifact_hash.to_string()))?
            .clone();

        // Read artifact from disk
        let artifact_path = self.get_artifact_path(artifact_hash);
        let mut file = fs::File::open(&artifact_path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;

        // Deserialize artifact
        let artifact: Artifact = serde_json::from_str(&contents)?;

        // Update last accessed time
        let mut updated_metadata = metadata;
        updated_metadata.last_accessed = Utc::now();
        self.metadata_cache
            .insert(artifact_hash.to_string(), updated_metadata);
        self.save_metadata()?;

        Ok(artifact)
    }

    /// Cleanup expired artifacts (respects TTL and preserve_originals setting)
    pub fn cleanup_expired(&mut self) -> Result<usize, StorageError> {
        let now = Utc::now();
        let ttl_duration = Duration::hours(self.config.ttl_hours as i64);
        let mut removed_count = 0;

        // Find expired artifacts
        let expired_hashes: Vec<String> = self
            .metadata_cache
            .iter()
            .filter(|(_, metadata)| {
                // Never delete original inputs if preserve_originals is true
                if self.config.preserve_originals && metadata.is_original {
                    return false;
                }

                // Check if artifact has expired
                let age = now.signed_duration_since(metadata.stored_at);
                age > ttl_duration
            })
            .map(|(hash, _)| hash.clone())
            .collect();

        // Remove expired artifacts
        for hash in expired_hashes {
            self.remove_artifact(&hash)?;
            removed_count += 1;
        }

        Ok(removed_count)
    }

    /// Get the current cache size in bytes
    pub fn get_cache_size(&self) -> u64 {
        self.metadata_cache
            .values()
            .map(|m| m.size_bytes)
            .sum()
    }

    /// Get the number of cached artifacts
    pub fn get_artifact_count(&self) -> usize {
        self.metadata_cache.len()
    }

    /// Calculate deterministic hash for an artifact
    fn calculate_artifact_hash(artifact: &Artifact) -> Result<String, StorageError> {
        // Serialize artifact to JSON for hashing
        let artifact_json = serde_json::to_string(artifact)?;

        // Calculate SHA-256 hash
        let mut hasher = Sha256::new();
        hasher.update(artifact_json.as_bytes());
        let hash = format!("{:x}", hasher.finalize());

        Ok(hash)
    }

    /// Extract artifact ID from an artifact
    fn extract_artifact_id(artifact: &Artifact) -> String {
        match artifact {
            Artifact::Input(a) => a.artifact_id.clone(),
            Artifact::Page(a) => a.artifact_id.clone(),
            Artifact::Variant(a) => a.artifact_id.clone(),
            Artifact::Zone(a) => a.artifact_id.clone(),
            Artifact::Ocr(a) => a.artifact_id.clone(),
            Artifact::Candidate(a) => a.artifact_id.clone(),
            Artifact::Decision(a) => a.artifact_id.clone(),
        }
    }

    /// Get the file path for an artifact hash
    fn get_artifact_path(&self, artifact_hash: &str) -> PathBuf {
        // Use first 2 characters of hash for subdirectory (sharding)
        let subdir = &artifact_hash[..2.min(artifact_hash.len())];
        let artifact_dir = self.config.cache_dir.join(subdir);

        // Ensure subdirectory exists
        let _ = fs::create_dir_all(&artifact_dir);

        artifact_dir.join(format!("{}.json", artifact_hash))
    }

    /// Get the metadata file path
    fn get_metadata_path(&self) -> PathBuf {
        self.config.cache_dir.join("metadata.json")
    }

    /// Load metadata from disk
    fn load_metadata(&mut self) -> Result<(), StorageError> {
        let metadata_path = self.get_metadata_path();

        if !metadata_path.exists() {
            return Ok(());
        }

        let mut file = fs::File::open(&metadata_path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;

        let metadata: HashMap<String, ArtifactMetadata> = serde_json::from_str(&contents)?;
        self.metadata_cache = metadata;

        Ok(())
    }

    /// Save metadata to disk
    fn save_metadata(&self) -> Result<(), StorageError> {
        let metadata_path = self.get_metadata_path();
        let metadata_json = serde_json::to_string_pretty(&self.metadata_cache)?;

        let mut file = fs::File::create(&metadata_path)?;
        file.write_all(metadata_json.as_bytes())?;

        Ok(())
    }

    /// Ensure there's enough space in the cache for a new artifact
    fn ensure_cache_space(&mut self, required_bytes: u64) -> Result<(), StorageError> {
        let current_size = self.get_cache_size();

        // Check if we have enough space
        if current_size + required_bytes <= self.config.max_cache_size {
            return Ok(());
        }

        // Need to evict artifacts using LRU strategy
        let mut evictable_artifacts: Vec<(String, DateTime<Utc>, u64)> = self
            .metadata_cache
            .iter()
            .filter(|(_, metadata)| {
                // Don't evict original inputs if preserve_originals is true
                !(self.config.preserve_originals && metadata.is_original)
            })
            .map(|(hash, metadata)| {
                (
                    hash.clone(),
                    metadata.last_accessed,
                    metadata.size_bytes,
                )
            })
            .collect();

        // Sort by last accessed time (oldest first)
        evictable_artifacts.sort_by_key(|(_, last_accessed, _)| *last_accessed);

        // Evict artifacts until we have enough space
        let mut freed_bytes = 0u64;
        let target_free = required_bytes + (current_size - self.config.max_cache_size);

        for (hash, _, size) in evictable_artifacts {
            if freed_bytes >= target_free {
                break;
            }

            self.remove_artifact(&hash)?;
            freed_bytes += size;
        }

        // Check if we freed enough space
        let new_size = self.get_cache_size();
        if new_size + required_bytes > self.config.max_cache_size {
            return Err(StorageError::CacheFull {
                current: new_size,
                max: self.config.max_cache_size,
            });
        }

        Ok(())
    }

    /// Remove an artifact from cache
    fn remove_artifact(&mut self, artifact_hash: &str) -> Result<(), StorageError> {
        // Remove from metadata
        self.metadata_cache.remove(artifact_hash);

        // Remove file from disk
        let artifact_path = self.get_artifact_path(artifact_hash);
        if artifact_path.exists() {
            fs::remove_file(&artifact_path)?;
        }

        // Save updated metadata
        self.save_metadata()?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{InputArtifact, PageArtifact};
    use tempfile::TempDir;

    fn create_test_config() -> (StorageConfig, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let config = StorageConfig {
            cache_dir: temp_dir.path().to_path_buf(),
            ttl_hours: 24,
            max_cache_size: 1024 * 1024, // 1MB for tests
            preserve_originals: true,
        };
        (config, temp_dir)
    }

    fn create_test_input_artifact() -> Artifact {
        Artifact::Input(InputArtifact::new(
            "input-001".to_string(),
            "/path/to/file.pdf".to_string(),
            "abc123".to_string(),
            1024,
            "application/pdf".to_string(),
        ))
    }

    fn create_test_page_artifact() -> Artifact {
        Artifact::Page(PageArtifact::new(
            "page-001".to_string(),
            "input-001".to_string(),
            1,
            300,
            0,
            0.95,
            "/path/to/page1.png".to_string(),
            Some("PDF text content".to_string()),
        ))
    }

    #[test]
    fn test_storage_creation() {
        let (config, _temp_dir) = create_test_config();
        let storage = ArtifactStorage::new(config);
        assert!(storage.is_ok());
    }

    #[test]
    fn test_store_and_retrieve_artifact() {
        let (config, _temp_dir) = create_test_config();
        let mut storage = ArtifactStorage::new(config).unwrap();

        let artifact = create_test_input_artifact();
        let hash = storage.store(&artifact).unwrap();

        assert!(!hash.is_empty());
        assert_eq!(hash.len(), 64); // SHA-256 produces 64 hex characters

        let retrieved = storage.retrieve(&hash).unwrap();
        match (artifact, retrieved) {
            (Artifact::Input(original), Artifact::Input(retrieved)) => {
                assert_eq!(original.artifact_id, retrieved.artifact_id);
                assert_eq!(original.file_path, retrieved.file_path);
                assert_eq!(original.file_hash, retrieved.file_hash);
            }
            _ => panic!("Artifact type mismatch"),
        }
    }

    #[test]
    fn test_deterministic_hashing() {
        let (config, _temp_dir) = create_test_config();
        let mut storage = ArtifactStorage::new(config).unwrap();

        let artifact = create_test_input_artifact();

        // Store the same artifact twice
        let hash1 = storage.store(&artifact).unwrap();
        let hash2 = storage.store(&artifact).unwrap();

        // Hashes should be identical
        assert_eq!(hash1, hash2);

        // Should only have one artifact in cache
        assert_eq!(storage.get_artifact_count(), 1);
    }

    #[test]
    fn test_retrieve_nonexistent_artifact() {
        let (config, _temp_dir) = create_test_config();
        let mut storage = ArtifactStorage::new(config).unwrap();

        let result = storage.retrieve("nonexistent_hash");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), StorageError::NotFound(_)));
    }

    #[test]
    fn test_cache_size_tracking() {
        let (config, _temp_dir) = create_test_config();
        let mut storage = ArtifactStorage::new(config).unwrap();

        let initial_size = storage.get_cache_size();
        assert_eq!(initial_size, 0);

        let artifact = create_test_input_artifact();
        storage.store(&artifact).unwrap();

        let new_size = storage.get_cache_size();
        assert!(new_size > 0);
    }

    #[test]
    fn test_artifact_count() {
        let (config, _temp_dir) = create_test_config();
        let mut storage = ArtifactStorage::new(config).unwrap();

        assert_eq!(storage.get_artifact_count(), 0);

        let artifact1 = create_test_input_artifact();
        storage.store(&artifact1).unwrap();
        assert_eq!(storage.get_artifact_count(), 1);

        let artifact2 = create_test_page_artifact();
        storage.store(&artifact2).unwrap();
        assert_eq!(storage.get_artifact_count(), 2);
    }

    #[test]
    fn test_lru_eviction() {
        let (mut config, _temp_dir) = create_test_config();
        config.max_cache_size = 2000; // Very small cache
        config.preserve_originals = false; // Allow eviction of all artifacts

        let mut storage = ArtifactStorage::new(config).unwrap();

        // Store multiple artifacts
        let artifact1 = create_test_input_artifact();
        let hash1 = storage.store(&artifact1).unwrap();

        let artifact2 = create_test_page_artifact();
        let hash2 = storage.store(&artifact2).unwrap();

        // Access artifact1 to make it more recently used
        storage.retrieve(&hash1).unwrap();

        // Store a large artifact that requires eviction
        let artifact3 = create_test_page_artifact();
        storage.store(&artifact3).unwrap();

        // artifact2 should have been evicted (least recently used)
        let result = storage.retrieve(&hash2);
        assert!(result.is_err());

        // artifact1 should still be present
        let result = storage.retrieve(&hash1);
        assert!(result.is_ok());
    }

    #[test]
    fn test_preserve_originals() {
        let (mut config, _temp_dir) = create_test_config();
        config.max_cache_size = 2000; // Very small cache
        config.preserve_originals = true; // Preserve original inputs

        let mut storage = ArtifactStorage::new(config).unwrap();

        // Store an original input artifact
        let input_artifact = create_test_input_artifact();
        let input_hash = storage.store(&input_artifact).unwrap();

        // Store multiple page artifacts to fill cache
        for i in 0..5 {
            let page_artifact = Artifact::Page(PageArtifact::new(
                format!("page-{:03}", i),
                "input-001".to_string(),
                i as u32,
                300,
                0,
                0.95,
                format!("/path/to/page{}.png", i),
                None,
            ));
            let _ = storage.store(&page_artifact);
        }

        // Original input should still be present despite cache pressure
        let result = storage.retrieve(&input_hash);
        assert!(result.is_ok());
    }

    #[test]
    fn test_cleanup_expired() {
        let (mut config, _temp_dir) = create_test_config();
        config.ttl_hours = 0; // Immediate expiration for testing
        config.preserve_originals = false; // Allow cleanup of all artifacts

        let mut storage = ArtifactStorage::new(config).unwrap();

        // Store some artifacts
        let artifact1 = create_test_page_artifact();
        storage.store(&artifact1).unwrap();

        let artifact2 = create_test_page_artifact();
        storage.store(&artifact2).unwrap();

        assert_eq!(storage.get_artifact_count(), 2);

        // Cleanup expired artifacts
        let removed = storage.cleanup_expired().unwrap();
        assert_eq!(removed, 2);
        assert_eq!(storage.get_artifact_count(), 0);
    }

    #[test]
    fn test_cleanup_preserves_originals() {
        let (mut config, _temp_dir) = create_test_config();
        config.ttl_hours = 0; // Immediate expiration for testing
        config.preserve_originals = true; // Preserve originals

        let mut storage = ArtifactStorage::new(config).unwrap();

        // Store an original input artifact
        let input_artifact = create_test_input_artifact();
        storage.store(&input_artifact).unwrap();

        // Store a page artifact
        let page_artifact = create_test_page_artifact();
        storage.store(&page_artifact).unwrap();

        assert_eq!(storage.get_artifact_count(), 2);

        // Cleanup expired artifacts
        let removed = storage.cleanup_expired().unwrap();

        // Only the page artifact should be removed
        assert_eq!(removed, 1);
        assert_eq!(storage.get_artifact_count(), 1);
    }

    #[test]
    fn test_metadata_persistence() {
        let (config, temp_dir) = create_test_config();

        // Create storage and store an artifact
        {
            let mut storage = ArtifactStorage::new(config.clone()).unwrap();
            let artifact = create_test_input_artifact();
            storage.store(&artifact).unwrap();
            assert_eq!(storage.get_artifact_count(), 1);
        }

        // Create new storage instance (should load metadata)
        {
            let storage = ArtifactStorage::new(config).unwrap();
            assert_eq!(storage.get_artifact_count(), 1);
        }
    }

    #[test]
    fn test_cache_full_error() {
        let (mut config, _temp_dir) = create_test_config();
        config.max_cache_size = 100; // Very small cache
        config.preserve_originals = true; // Prevent eviction

        let mut storage = ArtifactStorage::new(config).unwrap();

        // Store an artifact that fills the cache
        let artifact1 = create_test_input_artifact();
        storage.store(&artifact1).unwrap();

        // Try to store another artifact (should fail)
        let artifact2 = create_test_input_artifact();
        let result = storage.store(&artifact2);

        // Should get cache full error
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), StorageError::CacheFull { .. }));
    }

    #[test]
    fn test_last_accessed_update() {
        let (config, _temp_dir) = create_test_config();
        let mut storage = ArtifactStorage::new(config).unwrap();

        let artifact = create_test_input_artifact();
        let hash = storage.store(&artifact).unwrap();

        // Get initial last accessed time
        let initial_metadata = storage.metadata_cache.get(&hash).unwrap().clone();
        let initial_accessed = initial_metadata.last_accessed;

        // Wait a bit and retrieve
        std::thread::sleep(std::time::Duration::from_millis(10));
        storage.retrieve(&hash).unwrap();

        // Check that last accessed time was updated
        let updated_metadata = storage.metadata_cache.get(&hash).unwrap();
        assert!(updated_metadata.last_accessed > initial_accessed);
    }

    #[test]
    fn test_sharded_storage() {
        let (config, temp_dir) = create_test_config();
        let mut storage = ArtifactStorage::new(config).unwrap();

        // Store multiple artifacts
        for i in 0..10 {
            let artifact = Artifact::Page(PageArtifact::new(
                format!("page-{:03}", i),
                "input-001".to_string(),
                i as u32,
                300,
                0,
                0.95,
                format!("/path/to/page{}.png", i),
                None,
            ));
            storage.store(&artifact).unwrap();
        }

        // Check that subdirectories were created (sharding)
        let cache_dir = temp_dir.path();
        let subdirs: Vec<_> = fs::read_dir(cache_dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .collect();

        // Should have at least one subdirectory (likely more due to hash distribution)
        assert!(!subdirs.is_empty());
    }
}

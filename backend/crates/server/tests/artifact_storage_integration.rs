// Integration tests for artifact storage service
// These tests verify the artifact storage functionality in isolation

use EasySale_server::models::{Artifact, InputArtifact, PageArtifact};
use EasySale_server::services::{ArtifactStorage, StorageConfig};
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
fn test_artifact_storage_basic_operations() {
    let (config, _temp_dir) = create_test_config();
    let mut storage = ArtifactStorage::new(config).unwrap();

    // Store an artifact
    let artifact = create_test_input_artifact();
    let hash = storage.store(&artifact).unwrap();

    assert!(!hash.is_empty());
    assert_eq!(hash.len(), 64); // SHA-256 produces 64 hex characters

    // Retrieve the artifact
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
fn test_metadata_persistence() {
    let (config, _temp_dir) = create_test_config();

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

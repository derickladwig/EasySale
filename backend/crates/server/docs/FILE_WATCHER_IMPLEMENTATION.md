# Configuration File Watcher Implementation

## Overview

The configuration file watcher provides automatic detection and reloading of configuration files without requiring server restarts. This is part of the Configuration Hot-Reload feature (P3-1).

## Implementation Details

### File: `backend/crates/server/src/config/file_watcher.rs`

The file watcher module provides the following components:

#### 1. ConfigFileWatcher

Main struct that manages file system watching and event processing.

**Key Features:**
- Watches the `configs/` directory recursively
- Detects changes to JSON configuration files
- Filters out non-configuration files (schema.json, etc.)
- Runs in background without blocking
- Integrates with ConfigLoader for automatic reloads

**Usage:**
```rust
use std::sync::Arc;
use crate::config::{ConfigLoader, ConfigFileWatcher};

// Create config loader
let config_loader = Arc::new(ConfigLoader::new("configs", 300, true));

// Create file watcher
let (watcher, event_rx) = ConfigFileWatcher::new(
    config_loader.clone(),
    "configs"
)?;

// Start processing events in background
tokio::spawn(async move {
    ConfigFileWatcher::process_events(config_loader, event_rx).await;
});
```

#### 2. ConfigChangeEvent

Represents a configuration file change event.

**Fields:**
- `path: PathBuf` - Path to the changed file
- `kind: ConfigChangeKind` - Type of change (Created, Modified, Deleted)
- `tenant_id: Option<String>` - Extracted tenant ID from filename

#### 3. ConfigChangeKind

Enum representing the type of configuration change.

**Variants:**
- `Created` - Configuration file was created
- `Modified` - Configuration file was modified
- `Deleted` - Configuration file was deleted

## Event Processing

The file watcher processes events as follows:

### 1. File System Events

The watcher uses the `notify` crate to monitor file system changes:
- Polls every 2 seconds for changes
- Compares file contents to detect real changes
- Filters events to only process JSON files

### 2. Tenant ID Extraction

Tenant IDs are extracted from file paths:
- `configs/private/tenant1.json` → `tenant1`
- `configs/examples/tenant2.json` → `tenant2`
- `configs/default.json` → `default`
- `configs/schema.json` → `None` (skipped)

### 3. Configuration Reload

When a configuration file changes:

**Created:**
- Logs the creation event
- Attempts to load the new configuration
- Adds to cache if valid

**Modified:**
- Logs the modification event
- Calls `ConfigLoader::reload_config()` to bypass cache
- Updates cache with new configuration

**Deleted:**
- Logs the deletion event
- Does NOT remove from cache (prevents breaking running operations)
- Cache will naturally expire based on TTL

## Error Handling

The file watcher handles errors gracefully:

1. **File System Errors:**
   - Logged but don't crash the watcher
   - Watcher continues monitoring other files

2. **Configuration Load Errors:**
   - Logged with tenant ID and error details
   - Invalid configurations don't affect cached versions
   - Server continues running with last known good config

3. **Channel Errors:**
   - Logged if event channel fails
   - Indicates watcher shutdown

## Testing

The module includes comprehensive tests:

### Unit Tests

1. **test_extract_tenant_id**
   - Verifies tenant ID extraction from various paths
   - Tests private/, examples/, and root directories
   - Ensures schema.json is skipped

2. **test_file_watcher_creation**
   - Verifies watcher can be created successfully
   - Tests with temporary directory

3. **test_file_modification_detection**
   - Creates a config file
   - Modifies it
   - Verifies modification event is detected

4. **test_file_deletion_detection**
   - Creates a config file
   - Deletes it
   - Verifies deletion event is detected

### Running Tests

```bash
# Run all file watcher tests
cargo test --package easysale-server --lib config::file_watcher::tests

# Run specific test
cargo test --package easysale-server --lib config::file_watcher::tests::test_extract_tenant_id
```

## Integration with ConfigLoader

The file watcher integrates seamlessly with the existing ConfigLoader:

1. **Shared ConfigLoader Instance:**
   - File watcher receives Arc<ConfigLoader>
   - Uses same cache and validation logic

2. **Hot-Reload Mode:**
   - ConfigLoader already has `hot_reload` flag
   - File watcher complements this with active monitoring

3. **Cache Management:**
   - File watcher triggers cache invalidation
   - ConfigLoader handles actual reload logic

## Performance Considerations

1. **Polling Interval:**
   - Set to 2 seconds to balance responsiveness and CPU usage
   - Can be adjusted via NotifyConfig

2. **Content Comparison:**
   - Enabled to avoid spurious events
   - Only triggers on actual content changes

3. **Async Processing:**
   - Events processed asynchronously
   - Doesn't block main server thread

4. **Memory Usage:**
   - Minimal overhead (just event channel)
   - No additional caching beyond ConfigLoader

## Dependencies

Added to workspace dependencies:
```toml
# backend/Cargo.toml
notify = "6.1"
```

Added to server dependencies:
```toml
# backend/crates/server/Cargo.toml
notify = { workspace = true }
```

## Logging

The file watcher provides comprehensive logging:

- **INFO:** Watcher start/stop, successful reloads
- **DEBUG:** Individual file events with tenant IDs
- **WARN:** Configuration deletions, processor shutdown
- **ERROR:** Load failures, file system errors

Example log output:
```
INFO  Configuration file watcher started for directory: configs
DEBUG Configuration file modified detected: configs/private/tenant1.json (tenant: Some("tenant1"))
INFO  Successfully reloaded configuration for tenant: tenant1
```

## Next Steps

To complete the Configuration Hot-Reload feature:

1. **Task 3.1.2:** Implement configuration reload without restart
   - Integrate file watcher with main server
   - Add reload handlers for different config sections

2. **Task 3.1.3:** Implement WebSocket notification to frontend
   - Send config change events to connected clients
   - Frontend can refresh configuration

3. **Task 3.1.4:** Implement frontend configuration update without refresh
   - Frontend receives WebSocket events
   - Updates UI without page reload

## Acceptance Criteria

✅ **Configuration changes detected automatically**
- File watcher monitors configs/ directory
- Detects create, modify, and delete events
- Filters to only JSON configuration files

✅ **File watcher runs in background without blocking**
- Uses async/await for non-blocking operation
- Processes events in separate task
- Doesn't impact server performance

✅ **Changes trigger appropriate reload handlers**
- Integrates with ConfigLoader
- Calls reload_config() on modifications
- Handles errors gracefully

✅ **Error handling prevents crashes**
- File system errors logged but don't crash watcher
- Invalid configurations don't affect running server
- Channel errors handled gracefully

## Files Created/Modified

### Created:
- `backend/crates/server/src/config/file_watcher.rs` - Main implementation
- `backend/crates/server/docs/FILE_WATCHER_IMPLEMENTATION.md` - This document
- `backend/crates/server/test_file_watcher.rs` - Standalone verification

### Modified:
- `backend/Cargo.toml` - Added notify dependency
- `backend/crates/server/Cargo.toml` - Added notify dependency
- `backend/crates/server/src/config/mod.rs` - Exported file_watcher module
- `backend/crates/server/src/services/notification_trigger_service.rs` - Fixed async test

## Summary

The file watcher implementation provides a robust foundation for configuration hot-reload. It:

- ✅ Monitors configuration files automatically
- ✅ Detects all types of changes (create, modify, delete)
- ✅ Extracts tenant IDs correctly
- ✅ Integrates with existing ConfigLoader
- ✅ Handles errors gracefully
- ✅ Includes comprehensive tests
- ✅ Provides detailed logging
- ✅ Runs efficiently in background

The implementation is ready for integration with the main server and can be extended with WebSocket notifications for real-time frontend updates.

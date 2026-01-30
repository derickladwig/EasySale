use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncQueueItem {
    pub id: String,
    pub tenant_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub payload: String,
    pub sync_status: String,
    pub retry_count: i32,
    pub last_retry_at: Option<String>,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub store_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSyncQueueItem {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub payload: String,
    pub store_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncLog {
    pub id: String,
    pub tenant_id: String,
    pub sync_queue_id: Option<String>,
    pub operation: String,
    pub entity_type: String,
    pub entity_id: String,
    pub source_store_id: String,
    pub target_store_id: Option<String>,
    pub sync_status: String,
    pub conflict_resolution: Option<String>,
    pub error_message: Option<String>,
    pub synced_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncState {
    pub store_id: String,
    pub tenant_id: String,
    pub last_sync_at: String,
    pub last_sync_version: i64,
    pub sync_enabled: bool,
    pub sync_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncConflict {
    pub id: String,
    pub tenant_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub local_version: String,
    pub remote_version: String,
    pub local_updated_at: String,
    pub remote_updated_at: String,
    pub local_store_id: String,
    pub remote_store_id: String,
    pub resolution_status: String,
    pub resolved_by: Option<String>,
    pub resolved_at: Option<String>,
    pub resolution_notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: String,
    pub tenant_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub user_id: Option<String>,
    pub employee_id: Option<String>,
    pub changes: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_offline: bool,
    pub created_at: String,
    pub store_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuditLog {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub user_id: Option<String>,
    pub employee_id: Option<String>,
    pub changes: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_offline: bool,
    pub store_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStats {
    pub pending_count: i32,
    pub failed_count: i32,
    pub last_sync_at: Option<String>,
    pub is_online: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictResolution {
    pub conflict_id: String,
    pub resolution: String,  // 'use_local', 'use_remote', 'merge'
    pub resolved_by: String,
    pub notes: Option<String>,
}

/**
 * Backup domain types
 *
 * Type definitions for backup jobs, settings, and related entities.
 */

export type BackupType = 'db_incremental' | 'db_full' | 'file' | 'full';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface BackupJob {
  id: string;
  backup_type: BackupType;
  status: BackupStatus;
  started_at: string | null;
  completed_at: string | null;
  size_bytes: number | null;
  checksum: string | null;
  archive_path: string | null;
  error_message: string | null;
  snapshot_method: string | null;
  files_included: number;
  files_changed: number;
  files_deleted: number;
  backup_chain_id: string | null;
  is_base_backup: boolean;
  incremental_number: number;
  created_at: string;
}

export interface BackupSettings {
  id: number;

  // Database backup settings
  db_backup_enabled: boolean;
  db_incremental_schedule: string;
  db_full_schedule: string;
  db_retention_daily: number;
  db_retention_weekly: number;
  db_retention_monthly: number;
  db_max_incrementals: number;

  // File backup settings
  file_backup_enabled: boolean;
  file_schedule: string;
  file_retention_count: number;
  file_include_paths: string;
  file_exclude_patterns: string;

  // Full backup settings
  full_backup_enabled: boolean;
  full_schedule: string;
  full_retention_count: number;

  // General settings
  backup_directory: string;
  compression_enabled: boolean;
  auto_upload_enabled: boolean;

  updated_at: string;
  updated_by: string | null;
}

export interface BackupOverview {
  last_db_backup: BackupJob | null;
  last_file_backup: BackupJob | null;
  last_full_backup: BackupJob | null;
  total_backups: number;
  total_size_bytes: number;
  settings: BackupSettings;
}

export interface CreateBackupRequest {
  backup_type: BackupType;
  store_id: string;
  created_by?: string;
}

export interface BackupListFilters {
  backup_type?: BackupType;
  status?: BackupStatus;
  start_date?: string;
  end_date?: string;
}

export interface RetentionEnforcementResult {
  message: string;
  deleted_count: number;
  deleted_ids: string[];
}

// ============================================================================
// RESTORE TYPES
// ============================================================================

export type RestoreType = 'full' | 'database_only' | 'files_only';
export type RestoreStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface RestoreJob {
  id: string;
  backup_job_id: string;
  restore_type: RestoreType;
  status: RestoreStatus;
  started_at: string | null;
  completed_at: string | null;
  files_restored: number;
  error_message: string | null;
  restore_point: string | null;
  pre_restore_snapshot_id: string | null;
  created_at: string;
  created_by: string;
}

export interface RestoreBackupRequest {
  restore_type: RestoreType;
  create_snapshot?: boolean; // Default: true
  strict_delete?: boolean; // Default: false
  created_by: string;
}

export interface RollbackInstructions {
  instructions: string;
}

// ============================================================================
// GOOGLE DRIVE DESTINATION TYPES
// ============================================================================

export type DestinationType = 'google_drive' | 's3' | 'ftp';
export type DestinationStatus = 'connected' | 'disconnected' | 'error';

export interface BackupDestination {
  id: string;
  name: string;
  type: DestinationType;
  enabled: boolean;
  folder_id: string | null;
  retention_count: number;
  last_upload_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleDriveConnectionStatus {
  connected: boolean;
  folder_id: string | null;
  folder_name: string | null;
  last_upload_at: string | null;
  last_error: string | null;
  total_uploads: number;
  total_size_bytes: number;
}

export interface GoogleDriveAuthUrl {
  auth_url: string;
}

export interface GoogleDriveConnectRequest {
  auth_code: string;
  folder_name?: string;
}

export interface GoogleDriveConfigRequest {
  folder_id?: string;
  retention_count?: number;
  enabled?: boolean;
}

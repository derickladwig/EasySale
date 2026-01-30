/**
 * Backup API client
 *
 * API methods for backup management operations.
 */

import apiClient from '../../common/utils/apiClient';
import type {
  BackupJob,
  BackupSettings,
  BackupOverview,
  CreateBackupRequest,
  BackupListFilters,
  RetentionEnforcementResult,
} from './types';

/**
 * Get backup overview with summary statistics
 */
export async function getBackupOverview(storeId: string = 'store-1'): Promise<BackupOverview> {
  return apiClient.get<BackupOverview>(`/backups/overview?store_id=${storeId}`);
}

/**
 * List all backups with optional filters
 */
export async function listBackups(
  storeId: string = 'store-1',
  filters?: BackupListFilters
): Promise<BackupJob[]> {
  const params = new URLSearchParams({ store_id: storeId });

  if (filters?.backup_type) {
    params.append('backup_type', filters.backup_type);
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.start_date) {
    params.append('start_date', filters.start_date);
  }
  if (filters?.end_date) {
    params.append('end_date', filters.end_date);
  }

  return apiClient.get<BackupJob[]>(`/backups/list?${params.toString()}`);
}

/**
 * Get backup by ID
 */
export async function getBackup(backupId: string, storeId: string = 'store-1'): Promise<BackupJob> {
  return apiClient.get<BackupJob>(`/backups/${backupId}?store_id=${storeId}`);
}

/**
 * Create a new backup
 */
export async function createBackup(request: CreateBackupRequest): Promise<BackupJob> {
  return apiClient.post<BackupJob>('/backups/run', request);
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string, storeId: string = 'store-1'): Promise<void> {
  await apiClient.delete(`/backups/${backupId}?store_id=${storeId}`);
}

/**
 * Get backup settings
 */
export async function getBackupSettings(): Promise<BackupSettings> {
  return apiClient.get<BackupSettings>('/backups/settings');
}

/**
 * Update backup settings
 */
export async function updateBackupSettings(settings: BackupSettings): Promise<void> {
  await apiClient.put('/backups/settings', settings);
}

/**
 * Manually enforce retention policies
 */
export async function enforceRetention(): Promise<RetentionEnforcementResult> {
  return apiClient.post<RetentionEnforcementResult>('/backups/retention/enforce');
}

/**
 * Download a backup archive
 */
export function getBackupDownloadUrl(backupId: string, storeId: string = 'store-1'): string {
  return `/api/backups/${backupId}/download?store_id=${storeId}`;
}

// ============================================================================
// RESTORE API METHODS
// ============================================================================

import type { RestoreJob, RestoreBackupRequest, RollbackInstructions } from './types';

/**
 * Restore a backup
 */
export async function restoreBackup(
  backupId: string,
  request: RestoreBackupRequest,
  storeId: string = 'store-1'
): Promise<RestoreJob> {
  return apiClient.post<RestoreJob>(`/backups/${backupId}/restore?store_id=${storeId}`, request);
}

/**
 * Get restore job by ID
 */
export async function getRestoreJob(jobId: string): Promise<RestoreJob> {
  return apiClient.get<RestoreJob>(`/backups/restore-jobs/${jobId}`);
}

/**
 * List all restore jobs
 */
export async function listRestoreJobs(): Promise<RestoreJob[]> {
  return apiClient.get<RestoreJob[]>('/backups/restore-jobs');
}

/**
 * Get rollback instructions for a failed restore
 */
export async function getRollbackInstructions(jobId: string): Promise<RollbackInstructions> {
  return apiClient.get<RollbackInstructions>(
    `/backups/restore-jobs/${jobId}/rollback-instructions`
  );
}

// ============================================================================
// GOOGLE DRIVE DESTINATION API METHODS
// ============================================================================

import type {
  BackupDestination,
  GoogleDriveConnectionStatus,
  GoogleDriveAuthUrl,
  GoogleDriveConnectRequest,
  GoogleDriveConfigRequest,
} from './types';

/**
 * Get Google Drive OAuth authorization URL
 */
export async function getGoogleDriveAuthUrl(): Promise<GoogleDriveAuthUrl> {
  return apiClient.get<GoogleDriveAuthUrl>('/backups/destinations/gdrive/auth-url');
}

/**
 * Connect Google Drive with authorization code
 */
export async function connectGoogleDrive(
  request: GoogleDriveConnectRequest
): Promise<BackupDestination> {
  return apiClient.post<BackupDestination>('/backups/destinations/gdrive/connect', request);
}

/**
 * Get Google Drive connection status
 */
export async function getGoogleDriveStatus(): Promise<GoogleDriveConnectionStatus> {
  return apiClient.get<GoogleDriveConnectionStatus>('/backups/destinations/gdrive/status');
}

/**
 * Update Google Drive configuration
 */
export async function updateGoogleDriveConfig(
  request: GoogleDriveConfigRequest
): Promise<BackupDestination> {
  return apiClient.put<BackupDestination>('/backups/destinations/gdrive/config', request);
}

/**
 * Disconnect Google Drive
 */
export async function disconnectGoogleDrive(): Promise<void> {
  await apiClient.delete('/backups/destinations/gdrive/disconnect');
}

/**
 * List all backup destinations
 */
export async function listDestinations(): Promise<BackupDestination[]> {
  return apiClient.get<BackupDestination[]>('/backups/destinations');
}


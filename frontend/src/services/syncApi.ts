import axios from 'axios';

// Determine API base URL dynamically
// Use relative URLs to go through Vite proxy (dev) or nginx proxy (prod)
// This ensures cookies are sent correctly (same-origin requests)
function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Use relative URLs - works in both dev (Vite proxy) and prod (nginx proxy)
  return '';
}

/**
 * Get CSRF token from cookie for state-changing requests
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with httpOnly cookie support
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include httpOnly cookies for authentication
});

// Add CSRF token to state-changing requests
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Types
export interface SyncTriggerRequest {
  mode: 'full' | 'incremental';
  dryRun?: boolean;
  filters?: Record<string, unknown>;
  ids?: string[];
  idempotencyKey?: string;
}

export interface SyncStatus {
  syncId: string;
  entity: string;
  mode: 'full' | 'incremental';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsFailed: number;
  errors?: string[];
}

export interface FailedRecord {
  id: number;
  entity: string;
  sourceId: string;
  errorMessage: string;
  retryCount: number;
  createdAt: string;
}

export interface SyncSchedule {
  id: number;
  entity: string;
  cronExpression: string;
  mode: 'full' | 'incremental';
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

/**
 * Connection status as returned by the backend API.
 * Note: Backend uses snake_case (is_connected, last_check, error_message)
 */
export interface BackendConnectionStatus {
  platform: string;
  is_connected: boolean;
  last_check: string;
  error_message?: string;
}

/**
 * Connection status normalized for frontend use.
 * Validates: Requirements 10.1, 10.2
 */
export interface ConnectionStatus {
  platform: 'woocommerce' | 'quickbooks' | 'supabase' | string;
  connected: boolean;
  lastSync?: string;
  error?: string;
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  recordsProcessed: number;
  recordsFailed: number;
  avgSyncDuration: number;
}

export interface SyncHistoryEntry {
  id: number;
  syncId: string;
  entity: string;
  operation: string;
  status: string;
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DryRunResult {
  entity: string;
  recordsToProcess: number;
  estimatedDuration: number;
  changes: Array<{
    operation: string;
    sourceId: string;
    targetId?: string;
    changes: Record<string, unknown>;
  }>;
}

export interface BulkOperationConfirmation {
  token: string;
  entity: string;
  operation: string;
  recordCount: number;
  expiresAt: string;
}

// Integration credential types
export interface WooCommerceCredentials {
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
}

export interface QuickBooksCredentials {
  realm_id: string;
}

export interface StripeCredentials {
  api_key: string;
  location_id: string;
}

export interface SquareCredentials {
  access_token: string;
  location_id: string;
}

export type IntegrationCredentials = 
  | { platform: 'woocommerce'; credentials: WooCommerceCredentials }
  | { platform: 'quickbooks'; credentials: QuickBooksCredentials }
  | { platform: 'stripe'; credentials: StripeCredentials }
  | { platform: 'square'; credentials: SquareCredentials };

export interface IntegrationStatusResponse {
  platform: string;
  is_connected: boolean;
  last_check: string;
  error_message?: string;
}

export interface QuickBooksAuthUrlResponse {
  auth_url: string;
  state: string;
}

// ============================================================================
// TASK-009 & TASK-010: Sync Direction and Delete Policy Types
// ============================================================================

/**
 * Sync direction options
 */
export type SyncDirection = 'pull' | 'push' | 'bidirectional' | 'disabled';

/**
 * Delete policy options
 */
export type DeletePolicy = 'local_only' | 'archive_remote' | 'delete_remote';

/**
 * Sync direction configuration
 */
export interface SyncDirectionConfig {
  global_direction: SyncDirection;
  entity_overrides: Record<string, SyncDirection>;
}

/**
 * Delete policy configuration
 */
export interface DeletePolicyConfig {
  global_policy: DeletePolicy;
  entity_overrides: Record<string, DeletePolicy>;
}

// API Functions
export const syncApi = {
  // Trigger sync
  triggerSync: async (entity: string, request: SyncTriggerRequest): Promise<SyncStatus> => {
    const response = await api.post(`/api/sync/${entity}`, request);
    // Transform snake_case backend response to camelCase frontend format
    const data = response.data;
    return {
      syncId: data.sync_id || data.syncId,
      entity: data.entity,
      mode: data.mode,
      status: data.status === 'queued' ? 'pending' : data.status,
      startedAt: data.started_at || data.startedAt,
      completedAt: data.completed_at || data.completedAt,
      recordsProcessed: data.records_processed || data.recordsProcessed || 0,
      recordsFailed: data.records_failed || data.recordsFailed || 0,
      errors: data.errors,
    };
  },

  // Get sync status
  getSyncStatus: async (): Promise<SyncStatus[]> => {
    const response = await api.get('/api/sync/status');
    // Transform snake_case backend response to camelCase frontend format
    const data = response.data;
    const syncRuns = data.sync_runs || data.syncRuns || data || [];
    return syncRuns.map((run: Record<string, unknown>) => ({
      syncId: run.sync_id || run.syncId || '',
      entity: run.entity_type || run.entity || '',
      mode: run.mode || 'incremental',
      status: run.status || 'pending',
      startedAt: run.started_at || run.startedAt || '',
      completedAt: run.ended_at || run.completedAt,
      recordsProcessed: Number(run.records_completed || run.recordsProcessed || 0),
      recordsFailed: Number(run.records_failed || run.recordsFailed || 0),
      errors: run.errors as string[] | undefined,
    }));
  },

  // Get specific sync details
  getSyncDetails: async (syncId: string): Promise<SyncStatus> => {
    const response = await api.get(`/api/sync/status/${syncId}`);
    return response.data;
  },

  // Get failed records
  getFailedRecords: async (): Promise<FailedRecord[]> => {
    const response = await api.get('/api/sync/failures');
    return response.data;
  },

  // Retry failed records
  retryFailedRecords: async (ids?: number[]): Promise<void> => {
    await api.post('/api/sync/retry', { ids });
  },

  // Retry single failed record
  retrySingleRecord: async (id: number): Promise<void> => {
    await api.post(`/api/sync/failures/${id}/retry`);
  },

  // Get schedules
  getSchedules: async (): Promise<SyncSchedule[]> => {
    const response = await api.get('/api/sync/schedules');
    return response.data;
  },

  // Create schedule
  createSchedule: async (schedule: Omit<SyncSchedule, 'id'>): Promise<SyncSchedule> => {
    const response = await api.post('/api/sync/schedules', schedule);
    return response.data;
  },

  // Update schedule
  updateSchedule: async (id: number, schedule: Partial<SyncSchedule>): Promise<SyncSchedule> => {
    const response = await api.put(`/api/sync/schedules/${id}`, schedule);
    return response.data;
  },

  // Delete schedule
  deleteSchedule: async (id: number): Promise<void> => {
    await api.delete(`/api/sync/schedules/${id}`);
  },

  // Get connection status
  // Transforms backend response (is_connected, last_check) to frontend format (connected, lastSync)
  // Validates: Requirements 10.1, 10.2
  getConnectionStatus: async (): Promise<ConnectionStatus[]> => {
    const response = await api.get('/api/integrations/connections');
    const backendData = response.data as { connections: BackendConnectionStatus[] };
    
    // Transform backend format to frontend format
    return backendData.connections.map((conn: BackendConnectionStatus) => ({
      platform: conn.platform as ConnectionStatus['platform'],
      connected: conn.is_connected,
      lastSync: conn.last_check,
      error: conn.error_message,
    }));
  },

  // Test connection
  testConnection: async (platform: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/integrations/${platform}/test`);
    return response.data;
  },

  // Get sync history (Epic 5 - Task 14.2)
  getSyncHistory: async (params?: {
    entity?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: SyncHistoryEntry[]; total: number }> => {
    const response = await api.get('/api/sync/history', { params });
    return response.data;
  },

  // Get sync metrics (Epic 5 - Task 14.4)
  getSyncMetrics: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<SyncMetrics> => {
    const response = await api.get('/api/sync/metrics', { params });
    return response.data;
  },

  // Dry run sync (Epic 4 - Task 12)
  dryRunSync: async (
    entity: string,
    request: Omit<SyncTriggerRequest, 'dryRun'>
  ): Promise<DryRunResult> => {
    const response = await api.post(`/api/sync/dry-run/${entity}`, request);
    return response.data;
  },

  // Request bulk operation confirmation (Epic 4 - Task 13)
  requestBulkConfirmation: async (
    entity: string,
    operation: string,
    recordCount: number
  ): Promise<BulkOperationConfirmation> => {
    const response = await api.post('/api/sync/bulk/request-confirmation', {
      entity,
      operation,
      recordCount,
    });
    return response.data;
  },

  // Confirm bulk operation (Epic 4 - Task 13)
  confirmBulkOperation: async (token: string): Promise<void> => {
    await api.post(`/api/sync/confirm/${token}`);
  },

  // Get integration health (Epic 5 - Task 14.5)
  getIntegrationHealth: async (): Promise<{
    status: string;
    connections: Array<{
      platform: string;
      healthy: boolean;
      lastCheck: string;
      error?: string;
    }>;
  }> => {
    const response = await api.get('/api/integrations/health');
    return response.data;
  },

  // ============================================================================
  // Integration Connect/Disconnect/Config Methods (Task 16.3)
  // ============================================================================

  /**
   * Store WooCommerce credentials and connect the integration
   * Validates: Requirements 10.1, 10.2
   */
  connectWooCommerce: async (credentials: WooCommerceCredentials): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/integrations/woocommerce/credentials', credentials);
    return response.data;
  },

  /**
   * Disconnect WooCommerce integration
   * Validates: Requirements 10.1, 10.2
   */
  disconnectWooCommerce: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/api/integrations/woocommerce/credentials');
    return response.data;
  },

  /**
   * Get WooCommerce connection status
   */
  getWooCommerceStatus: async (): Promise<IntegrationStatusResponse> => {
    const response = await api.get('/api/integrations/woocommerce/status');
    return response.data;
  },

  /**
   * Get QuickBooks OAuth authorization URL
   * Validates: Requirements 10.1, 10.2
   */
  getQuickBooksAuthUrl: async (): Promise<QuickBooksAuthUrlResponse> => {
    const response = await api.post('/api/integrations/quickbooks/auth-url');
    return response.data;
  },

  /**
   * Disconnect QuickBooks integration
   * Validates: Requirements 10.1, 10.2
   */
  disconnectQuickBooks: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/api/integrations/quickbooks/credentials');
    return response.data;
  },

  /**
   * Get QuickBooks connection status
   */
  getQuickBooksStatus: async (): Promise<IntegrationStatusResponse> => {
    const response = await api.get('/api/integrations/quickbooks/status');
    return response.data;
  },

  /**
   * Check if backend endpoint exists for an integration
   * Returns true if the endpoint responds (even with error), false if 404
   * Validates: Requirements 10.1, 10.2 - capability-on + backend-missing = bug state
   */
  checkBackendAvailability: async (platform: string): Promise<boolean> => {
    try {
      // Try to get status - if endpoint exists, it will respond
      await api.get(`/api/integrations/${platform}/status`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      // Other errors (401, 500, etc.) mean the endpoint exists
      return true;
    }
  },

  /**
   * Get all integration statuses with backend availability check
   * Validates: Requirements 10.1, 10.2
   */
  getIntegrationStatuses: async (): Promise<{
    integrations: Array<{
      platform: string;
      status: IntegrationStatusResponse;
      backendAvailable: boolean;
    }>;
  }> => {
    const platforms = ['woocommerce', 'quickbooks', 'supabase'];
    const results = await Promise.all(
      platforms.map(async (platform) => {
        try {
          const response = await api.get(`/api/integrations/${platform}/status`);
          return {
            platform,
            status: response.data,
            backendAvailable: true,
          };
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            return {
              platform,
              status: {
                platform,
                is_connected: false,
                last_check: new Date().toISOString(),
                error_message: 'Backend endpoint not available',
              },
              backendAvailable: false,
            };
          }
          // Other errors mean backend exists but returned error
          return {
            platform,
            status: {
              platform,
              is_connected: false,
              last_check: new Date().toISOString(),
              error_message: axios.isAxiosError(error) ? error.message : 'Unknown error',
            },
            backendAvailable: true,
          };
        }
      })
    );
    return { integrations: results };
  },

  // ============================================================================
  // TASK-009 & TASK-010: Sync Direction and Delete Policy API
  // ============================================================================

  /**
   * Get sync direction configuration
   */
  getSyncDirection: async (): Promise<SyncDirectionConfig> => {
    const response = await api.get('/api/sync/direction');
    return response.data;
  },

  /**
   * Update sync direction configuration
   */
  updateSyncDirection: async (config: SyncDirectionConfig): Promise<{ success: boolean; message: string }> => {
    const response = await api.put('/api/sync/direction', config);
    return response.data;
  },

  /**
   * Get delete policy configuration
   */
  getDeletePolicy: async (): Promise<DeletePolicyConfig> => {
    const response = await api.get('/api/sync/delete-policy');
    return response.data;
  },

  /**
   * Update delete policy configuration
   */
  updateDeletePolicy: async (config: DeletePolicyConfig): Promise<{ success: boolean; message: string }> => {
    const response = await api.put('/api/sync/delete-policy', config);
    return response.data;
  },

  /**
   * Get effective sync direction for a specific entity
   */
  getEntitySyncDirection: async (entityType: string): Promise<{ entity_type: string; direction: SyncDirection }> => {
    const response = await api.get(`/api/sync/direction/${entityType}`);
    return response.data;
  },

  /**
   * Get effective delete policy for a specific entity
   */
  getEntityDeletePolicy: async (entityType: string): Promise<{ entity_type: string; policy: DeletePolicy }> => {
    const response = await api.get(`/api/sync/delete-policy/${entityType}`);
    return response.data;
  },

  // ============================================================================
  // Stripe Integration API (Task 14.1)
  // ============================================================================

  /**
   * Get Stripe OAuth authorization URL
   */
  getStripeAuthUrl: async (): Promise<{ auth_url: string; state: string }> => {
    const response = await api.post('/api/integrations/stripe/auth-url');
    return response.data;
  },

  /**
   * Get Stripe connection status
   */
  getStripeStatus: async (): Promise<IntegrationStatusResponse> => {
    const response = await api.get('/api/integrations/stripe/status');
    return response.data;
  },

  /**
   * Get Stripe account summary
   */
  getStripeSummary: async (): Promise<{
    business_name?: string;
    country?: string;
    default_currency?: string;
    account_id_masked: string;
  }> => {
    const response = await api.get('/api/integrations/stripe/summary');
    return response.data;
  },

  /**
   * Test Stripe connection
   */
  testStripeConnection: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/integrations/stripe/test');
    return response.data;
  },

  /**
   * Disconnect Stripe integration
   */
  disconnectStripe: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/api/integrations/stripe/disconnect');
    return response.data;
  },

  /**
   * Get Stripe integration logs
   */
  getStripeLogs: async (): Promise<{ logs: Array<{
    id: string;
    level: string;
    event: string;
    message: string;
    details: string;
    timestamp: string;
  }> }> => {
    const response = await api.get('/api/integrations/stripe/logs');
    return response.data;
  },

  // ============================================================================
  // Square Integration API (Task 14.2)
  // ============================================================================

  /**
   * Connect Square with API credentials
   */
  connectSquare: async (credentials: SquareCredentials): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/integrations/square/credentials', credentials);
    return response.data;
  },

  /**
   * Get Square connection status
   */
  getSquareStatus: async (): Promise<IntegrationStatusResponse> => {
    const response = await api.get('/api/integrations/square/status');
    return response.data;
  },

  /**
   * Get Square location summary
   */
  getSquareSummary: async (): Promise<{
    location_name?: string;
    address?: string;
    capabilities: string[];
  }> => {
    const response = await api.get('/api/integrations/square/summary');
    return response.data;
  },

  /**
   * Test Square connection
   */
  testSquareConnection: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/integrations/square/test');
    return response.data;
  },

  /**
   * Disconnect Square integration
   */
  disconnectSquare: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/api/integrations/square/disconnect');
    return response.data;
  },

  /**
   * Get Square integration logs
   */
  getSquareLogs: async (): Promise<{ logs: Array<{
    id: string;
    level: string;
    event: string;
    message: string;
    details: string;
    timestamp: string;
  }> }> => {
    const response = await api.get('/api/integrations/square/logs');
    return response.data;
  },

  // ============================================================================
  // Clover Integration API (Task 14.3)
  // ============================================================================

  /**
   * Get Clover OAuth authorization URL
   */
  getCloverAuthUrl: async (): Promise<{ auth_url: string; state: string }> => {
    const response = await api.post('/api/integrations/clover/auth-url');
    return response.data;
  },

  /**
   * Get Clover connection status
   */
  getCloverStatus: async (): Promise<IntegrationStatusResponse> => {
    const response = await api.get('/api/integrations/clover/status');
    return response.data;
  },

  /**
   * Get Clover merchant summary
   */
  getCloverSummary: async (): Promise<{
    merchant_name?: string;
    address?: string;
  }> => {
    const response = await api.get('/api/integrations/clover/summary');
    return response.data;
  },

  /**
   * Test Clover connection
   */
  testCloverConnection: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/integrations/clover/test');
    return response.data;
  },

  /**
   * Disconnect Clover integration
   */
  disconnectClover: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/api/integrations/clover/disconnect');
    return response.data;
  },

  /**
   * Get Clover integration logs
   */
  getCloverLogs: async (): Promise<{ logs: Array<{
    id: string;
    level: string;
    event: string;
    message: string;
    details: string;
    timestamp: string;
  }> }> => {
    const response = await api.get('/api/integrations/clover/logs');
    return response.data;
  },

  // ============================================================================
  // Supabase Summary API (Task 14.4)
  // ============================================================================

  /**
   * Get Supabase integration summary
   */
  getSupabaseSummary: async (): Promise<{
    project_name?: string;
    last_sync_at?: string;
    pending_queue_count: number;
  }> => {
    const response = await api.get('/api/integrations/supabase/summary');
    return response.data;
  },

  // ============================================================================
  // Data Manager API (Task 14.5)
  // ============================================================================

  /**
   * Seed demo data
   */
  seedData: async (dataType: string, count?: number): Promise<{
    batch_id: string;
    status: string;
    message: string;
    records_affected: number;
  }> => {
    const response = await api.post('/api/data-manager/seed', { data_type: dataType, count });
    return response.data;
  },

  /**
   * Upload CSV data
   */
  uploadData: async (entityType: string, csvData: string): Promise<{
    batch_id: string;
    status: string;
    message: string;
    records_affected: number;
  }> => {
    const response = await api.post('/api/data-manager/upload', { entity_type: entityType, csv_data: csvData });
    return response.data;
  },

  /**
   * Get all data batches
   */
  getDataBatches: async (): Promise<{
    batches: Array<{
      id: string;
      batch_type: string;
      entity_type: string;
      status: string;
      records_count: number;
      created_at: string;
      completed_at?: string;
    }>;
  }> => {
    const response = await api.get('/api/data-manager/batches');
    return response.data;
  },

  /**
   * Get batch status by ID
   */
  getBatchStatus: async (batchId: string): Promise<{
    id: string;
    batch_type: string;
    entity_type: string;
    status: string;
    records_count: number;
    error_message?: string;
    created_at: string;
    completed_at?: string;
  }> => {
    const response = await api.get(`/api/data-manager/batches/${batchId}`);
    return response.data;
  },

  /**
   * Purge batch by ID
   */
  purgeBatch: async (batchId: string): Promise<{
    batch_id: string;
    status: string;
    message: string;
    records_affected: number;
  }> => {
    const response = await api.delete(`/api/data-manager/batches/${batchId}`);
    return response.data;
  },

  // ============================================================================
  // Payments API (Task 25)
  // ============================================================================

  /**
   * Create a Stripe Checkout Session
   * Requirements: 12.1, 12.2
   */
  createCheckoutSession: async (request: {
    order_id: string;
    amount_cents: number;
    currency: string;
    description: string;
    success_url: string;
    cancel_url: string;
  }): Promise<{
    payment_id: string;
    session_id: string;
    checkout_url: string;
    status: string;
  }> => {
    const response = await api.post('/api/payments/checkout-session', request);
    return response.data;
  },

  /**
   * Get payment status by order ID
   * Requirements: 12.8
   */
  getPaymentStatus: async (orderId: string): Promise<{
    payment_id: string;
    order_id: string;
    provider: string;
    amount_cents: number;
    currency: string;
    status: string;
    checkout_url?: string;
    created_at: string;
    completed_at?: string;
  }> => {
    const response = await api.get(`/api/payments/orders/${orderId}/payment`);
    return response.data;
  },

  // ============================================================================
  // Notification Settings API
  // ============================================================================

  /**
   * Get notification configurations
   */
  getNotificationConfigs: async (): Promise<Array<{
    id: string;
    tenant_id: string;
    notification_type: 'email' | 'slack' | 'webhook';
    enabled: boolean;
    config: unknown;
    filters: {
      min_severity: string;
      connectors?: string[];
      entity_types?: string[];
      error_types?: string[];
    };
  }>> => {
    const response = await api.get('/api/notifications/config');
    return response.data || [];
  },

  /**
   * Create notification configuration
   */
  createNotificationConfig: async (config: unknown): Promise<{ id: string; success: boolean }> => {
    const response = await api.post('/api/notifications/config', config);
    return { id: response.data.id, success: true };
  },

  /**
   * Delete notification configuration
   */
  deleteNotificationConfig: async (id: string): Promise<{ success: boolean }> => {
    await api.delete(`/api/notifications/config/${id}`);
    return { success: true };
  },

  /**
   * Test notification configuration
   */
  testNotificationConfig: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/notifications/config/${id}/test`);
    return response.data;
  },

  /**
   * Get notification history
   */
  getNotificationHistory: async (): Promise<Array<{
    id: string;
    event_type: string;
    severity: string;
    title: string;
    message: string;
    sent_at: string;
    success: boolean;
    error_message?: string;
  }>> => {
    const response = await api.get('/api/notifications/history');
    return response.data.history || [];
  },

  // ============================================================================
  // Circuit Breaker Status API (Phase 6 - Task 7.2)
  // ============================================================================

  /**
   * Get circuit breaker status for all connectors
   */
  getCircuitBreakerStatus: async (): Promise<{
    connectors: Array<{
      connector_id: string;
      state: string;
      is_open: boolean;
    }>;
  }> => {
    const response = await api.get('/api/sync/circuit-breaker/status');
    return response.data;
  },

  // ============================================================================
  // Failed Records Extended API (Sync Monitoring UI - Task 1.2)
  // ============================================================================

  /**
   * Get detailed information for a single failed record including payload
   * Validates: Requirements 4.3, 12.4
   */
  getFailedRecordDetails: async (id: number): Promise<{
    id: number;
    entity: string;
    sourceId: string;
    errorMessage: string;
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: string;
    lastAttemptAt: string;
    createdAt: string;
    payload?: unknown;
    retryHistory?: Array<{
      attemptedAt: string;
      errorMessage: string;
    }>;
  }> => {
    const response = await api.get(`/api/sync/failures/${id}`);
    return response.data;
  },

  /**
   * Acknowledge (ignore) a single failed record - removes from active queue without retry
   * Validates: Requirements 12.3
   */
  acknowledgeFailedRecord: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/sync/failures/${id}/acknowledge`);
    return response.data;
  },

  /**
   * Acknowledge (ignore) multiple failed records in bulk
   * Validates: Requirements 12.3
   */
  acknowledgeFailedRecords: async (ids: number[]): Promise<{ success: boolean; message: string; count: number }> => {
    const response = await api.post('/api/sync/failures/acknowledge', { ids });
    return response.data;
  },
};

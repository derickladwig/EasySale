/**
 * useSystemStatus Hook
 * 
 * Provides real-time system status including database connectivity,
 * sync status, and store/station information.
 * 
 * Sources data from:
 * 1. /api/health/status endpoint (database, sync)
 * 2. ConfigProvider branding context (store, station)
 */

import { useQuery } from '@tanstack/react-query';
import { useConfig } from '../../config/ConfigProvider';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database?: {
      status: 'up' | 'down';
    };
    sync?: {
      status: 'online' | 'offline' | 'syncing';
      lastSync?: string;
    };
    external_services?: {
      status: 'up' | 'down';
    };
  };
  timestamp: string;
}

type DatabaseStatus = 'connected' | 'disconnected' | 'checking';
type SyncStatus = 'online' | 'offline' | 'syncing' | 'checking';

interface SystemStatus {
  database: DatabaseStatus;
  sync: SyncStatus;
  lastSyncTime: Date | null;
  storeName: string;
  stationId: string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch health status from backend API
 */
async function fetchHealthStatus(): Promise<HealthStatus> {
  const response = await fetch('/api/health/status');
  if (!response.ok) {
    throw new Error('Failed to fetch health status');
  }
  return response.json();
}

/**
 * Hook to get real-time system status
 */
export function useSystemStatus(): SystemStatus {
  const { branding } = useConfig();
  
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health-status'],
    queryFn: fetchHealthStatus,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
    retry: 2,
  });

  // Derive database status
  let database: DatabaseStatus = 'checking';
  if (!isLoading && health) {
    database = health.components?.database?.status === 'up' ? 'connected' : 'disconnected';
  } else if (error) {
    database = 'disconnected';
  }

  // Derive sync status
  let sync: SyncStatus = 'checking';
  if (!isLoading && health) {
    const syncComponent = health.components?.sync;
    if (syncComponent?.status) {
      sync = syncComponent.status;
    } else {
      // Infer from overall health
      sync = health.status === 'healthy' ? 'online' : 'offline';
    }
  } else if (error) {
    sync = 'offline';
  }

  // Parse last sync time
  let lastSyncTime: Date | null = null;
  if (health?.components?.sync?.lastSync) {
    lastSyncTime = new Date(health.components.sync.lastSync);
  }

  return {
    database,
    sync,
    lastSyncTime,
    storeName: branding?.store?.name ?? 'Store',
    stationId: branding?.store?.station ?? 'POS',
    isLoading,
    error: error as Error | null,
  };
}

export type { SystemStatus, DatabaseStatus, SyncStatus, HealthStatus };

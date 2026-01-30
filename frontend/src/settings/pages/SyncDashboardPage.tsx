import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Activity, Eye } from 'lucide-react';
import { syncApi, ConnectionStatus, SyncStatus } from '../../services/syncApi';
import { SyncHistory } from '../components/SyncHistory';
import { FailedRecordsQueue } from '../components/FailedRecordsQueue';
import { SyncScheduleManager } from '../components/SyncScheduleManager';
import { SyncDetailsModal, useSyncDetailsModal } from '../components/SyncDetailsModal';

export const SyncDashboardPage: React.FC = () => {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [recentSyncs, setRecentSyncs] = useState<SyncStatus[]>([]);
  const [metrics, setMetrics] = useState<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    recordsProcessed: number;
    recordsFailed: number;
    avgSyncDuration: number;
  } | null>(null);
  const [health, setHealth] = useState<{
    status: string;
    connections: Array<{
      platform: string;
      healthy: boolean;
      lastCheck: string;
      error?: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Sync details modal hook
  const { selectedSyncId, openDetails, closeDetails, isOpen: isDetailsOpen } = useSyncDetailsModal();

  const loadData = useCallback(async () => {
    try {
      const [connectionsData, syncsData, metricsData, healthData] = await Promise.all([
        syncApi.getConnectionStatus(),
        syncApi.getSyncStatus(),
        syncApi.getSyncMetrics(),
        syncApi.getIntegrationHealth(),
      ]);
      setConnections(connectionsData);
      setRecentSyncs(syncsData.slice(0, 5)); // Last 5 syncs
      setMetrics(metricsData);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load sync data:', error);
      toast.error('Failed to load sync data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTriggerSync = async (entity: string) => {
    try {
      await syncApi.triggerSync(entity, { mode: 'incremental' });
      toast.success(`${entity} sync triggered`);
      setTimeout(loadData, 2000); // Refresh after 2 seconds
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      toast.error('Failed to trigger sync');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-error-400" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-primary-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-text-disabled" />;
    }
  };

  const getConnectionStatusColor = (connected: boolean) => {
    return connected ? 'text-success-400' : 'text-error-400';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Sync Dashboard</h1>
            <p className="text-text-secondary mt-2">Monitor data synchronization across platforms</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Metrics Overview */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <div className="p-4">
                <div className="text-sm text-text-tertiary">Total Syncs</div>
                <div className="text-2xl font-bold text-text-primary mt-1">{metrics.totalSyncs}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-sm text-text-tertiary">Successful</div>
                <div className="text-2xl font-bold text-success-400 mt-1">
                  {metrics.successfulSyncs}
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-sm text-text-tertiary">Failed</div>
                <div className="text-2xl font-bold text-error-400 mt-1">{metrics.failedSyncs}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-sm text-text-tertiary">Records Processed</div>
                <div className="text-2xl font-bold text-text-primary mt-1">
                  {metrics.recordsProcessed.toLocaleString()}
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-sm text-text-tertiary">Avg Duration</div>
                <div className="text-2xl font-bold text-text-primary mt-1">
                  {Math.round(metrics.avgSyncDuration / 1000)}s
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* System Health */}
        {health && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-text-primary">System Health</h2>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    health.status === 'healthy'
                      ? 'bg-success-500/20 text-success-400'
                      : 'bg-error-500/20 text-error-400'
                  }`}
                >
                  {health.status}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {health.connections.map((conn) => (
                  <div
                    key={conn.platform}
                    className="p-3 bg-surface-base rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-text-primary capitalize">{conn.platform}</div>
                      <div className="text-xs text-text-tertiary mt-1">
                        Last check: {new Date(conn.lastCheck).toLocaleTimeString()}
                      </div>
                      {conn.error && (
                        <div className="text-xs text-error-400 mt-1">{conn.error}</div>
                      )}
                    </div>
                    {conn.healthy ? (
                      <CheckCircle className="w-5 h-5 text-success-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-error-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Connection Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {connections.map((connection) => (
            <Card key={connection.platform}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-primary-400" />
                    <h3 className="text-lg font-semibold text-text-primary capitalize">
                      {connection.platform}
                    </h3>
                  </div>
                  <div className={getConnectionStatusColor(connection.connected)}>
                    {connection.connected ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Status:</span>
                    <span className={connection.connected ? 'text-success-400' : 'text-error-400'}>
                      {connection.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {connection.lastSync && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Last Sync:</span>
                      <span className="text-text-secondary">
                        {new Date(connection.lastSync).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {connection.error && (
                    <div className="mt-2 p-2 bg-error-500/10 border border-error-500/20 rounded text-error-400 text-xs">
                      {connection.error}
                    </div>
                  )}
                </div>

                {connection.connected && (
                  <Button
                    onClick={() => handleTriggerSync(connection.platform)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                  >
                    Sync Now
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Sync Activity */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Sync Activity</h2>
            {recentSyncs.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">No recent sync activity</div>
            ) : (
              <div className="space-y-3">
                {recentSyncs.map((sync) => (
                  <div
                    key={sync.syncId}
                    className="flex items-center justify-between p-4 bg-surface-base rounded-lg cursor-pointer hover:bg-surface-elevated transition-colors"
                    onClick={() => openDetails(sync.syncId)}
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(sync.status)}
                      <div>
                        <div className="font-medium text-text-primary capitalize">
                          {sync.entity} Sync
                        </div>
                        <div className="text-sm text-text-tertiary">
                          {sync.mode === 'full' ? 'Full' : 'Incremental'} •{' '}
                          {new Date(sync.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-text-secondary">{sync.recordsProcessed} processed</div>
                        {sync.recordsFailed > 0 && (
                          <div className="text-sm text-error-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {sync.recordsFailed} failed
                          </div>
                        )}
                      </div>
                      <Eye className="w-4 h-4 text-text-tertiary" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Sync Schedule Manager */}
        <SyncScheduleManager />

        {/* Sync History */}
        <SyncHistory />

        {/* Failed Records Queue */}
        <FailedRecordsQueue />
      </div>
      
      {/* Sync Details Modal */}
      {isDetailsOpen && selectedSyncId && (
        <SyncDetailsModal syncId={selectedSyncId} onClose={closeDetails} />
      )}
    </div>
  );
};

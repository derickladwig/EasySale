/**
 * Security Dashboard Page
 *
 * Admin page for monitoring and managing security:
 * - Security statistics and metrics
 * - Security events with filtering
 * - IP blocking management
 * - Active sessions with force logout
 * - Security alerts
 *
 * Ported from POS project's security dashboard.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  Activity,
  RefreshCw,
  Ban,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
} from 'lucide-react';

// Types
interface SecurityDashboard {
  total_events_24h: number;
  failed_logins_24h: number;
  blocked_ips_count: number;
  active_sessions_count: number;
  unacknowledged_alerts: number;
  events_by_severity: Record<string, number>;
  events_by_type: Record<string, number>;
  rate_limit_stats: RateLimitStats;
  recent_events: SecurityEvent[];
  top_blocked_ips: BlockedIp[];
}

interface RateLimitStats {
  total_requests: number;
  blocked_requests: number;
  unique_identifiers: number;
  active_violations: number;
  blocked_identifiers: number;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  source_ip: string;
  user_id?: string;
  username?: string;
  endpoint?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

interface BlockedIp {
  ip: string;
  reason: string;
  blocked_at: string;
  expires_at?: string;
  is_permanent: boolean;
  blocked_by?: string;
}

interface ActiveSession {
  token_hash: string;
  user_id: string;
  username?: string;
  ip_address: string;
  user_agent?: string;
  created_at: string;
  last_activity: string;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

// API functions
const securityApi = {
  getDashboard: async (): Promise<SecurityDashboard> => {
    const response = await fetch('/api/security/dashboard', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
  },

  getEvents: async (filters: Record<string, string>): Promise<SecurityEvent[]> => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/security/events?${params}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  getBlockedIps: async (): Promise<BlockedIp[]> => {
    const response = await fetch('/api/security/blocked-ips', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch blocked IPs');
    return response.json();
  },

  blockIp: async (data: { ip: string; reason: string; duration_secs?: number; permanent?: boolean }) => {
    const response = await fetch('/api/security/block-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to block IP');
    return response.json();
  },

  unblockIp: async (ip: string) => {
    const response = await fetch('/api/security/unblock-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ip }),
    });
    if (!response.ok) throw new Error('Failed to unblock IP');
    return response.json();
  },

  getSessions: async (): Promise<ActiveSession[]> => {
    const response = await fetch('/api/security/sessions', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  forceLogout: async (userId: string, reason?: string) => {
    const response = await fetch(`/api/security/force-logout/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to force logout');
    return response.json();
  },

  getAlerts: async (unacknowledgedOnly = false): Promise<SecurityAlert[]> => {
    const response = await fetch(`/api/security/alerts?unacknowledged_only=${unacknowledgedOnly}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return response.json();
  },

  acknowledgeAlert: async (alertId: string, notes?: string) => {
    const response = await fetch(`/api/security/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) throw new Error('Failed to acknowledge alert');
    return response.json();
  },
};

// Severity badge component
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = {
    low: 'bg-surface-secondary text-text-secondary',
    medium: 'bg-warning-100 text-warning-800',
    high: 'bg-warning-200 text-warning-900',
    critical: 'bg-error-100 text-error-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[severity] || colors.low}`}>
      {severity.toUpperCase()}
    </span>
  );
};

// Stats card component
const StatsCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'error' | 'warning' | 'success';
}> = ({ title, value, icon, color = 'primary' }) => {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    error: 'bg-error-50 text-error-600',
    warning: 'bg-warning-50 text-warning-600',
    success: 'bg-success-50 text-success-600',
  };

  return (
    <div className="bg-surface-primary rounded-lg p-4 border border-border-primary">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Main component
export const SecurityDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'blocked' | 'sessions' | 'alerts'>('overview');
  const [eventFilters, setEventFilters] = useState<Record<string, string>>({});
  const [blockIpModal, setBlockIpModal] = useState(false);
  const [newBlockIp, setNewBlockIp] = useState({ ip: '', reason: '', permanent: false, duration: 3600 });

  // Queries
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: securityApi.getDashboard,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['security-events', eventFilters],
    queryFn: () => securityApi.getEvents(eventFilters),
    enabled: activeTab === 'events',
  });

  const { data: blockedIps, isLoading: blockedLoading, refetch: refetchBlocked } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: securityApi.getBlockedIps,
    enabled: activeTab === 'blocked' || activeTab === 'overview',
  });

  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: securityApi.getSessions,
    enabled: activeTab === 'sessions',
  });

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: () => securityApi.getAlerts(false),
    enabled: activeTab === 'alerts' || activeTab === 'overview',
  });

  // Mutations
  const blockIpMutation = useMutation({
    mutationFn: securityApi.blockIp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] });
      setBlockIpModal(false);
      setNewBlockIp({ ip: '', reason: '', permanent: false, duration: 3600 });
    },
  });

  const unblockIpMutation = useMutation({
    mutationFn: securityApi.unblockIp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] });
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      securityApi.forceLogout(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
      securityApi.acknowledgeAlert(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] });
    },
  });

  const handleRefresh = useCallback(() => {
    refetchDashboard();
    if (activeTab === 'blocked') refetchBlocked();
    if (activeTab === 'sessions') refetchSessions();
    if (activeTab === 'alerts') refetchAlerts();
  }, [activeTab, refetchDashboard, refetchBlocked, refetchSessions, refetchAlerts]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-brand-primary" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Security Dashboard</h1>
            <p className="text-text-secondary">Monitor and manage security events</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Events (24h)"
          value={dashboard?.total_events_24h || 0}
          icon={<Activity className="w-5 h-5" />}
          color="primary"
        />
        <StatsCard
          title="Failed Logins"
          value={dashboard?.failed_logins_24h || 0}
          icon={<XCircle className="w-5 h-5" />}
          color="error"
        />
        <StatsCard
          title="Blocked IPs"
          value={dashboard?.blocked_ips_count || 0}
          icon={<Ban className="w-5 h-5" />}
          color="warning"
        />
        <StatsCard
          title="Active Sessions"
          value={dashboard?.active_sessions_count || 0}
          icon={<Users className="w-5 h-5" />}
          color="success"
        />
        <StatsCard
          title="Pending Alerts"
          value={dashboard?.unacknowledged_alerts || 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={dashboard?.unacknowledged_alerts ? 'error' : 'success'}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border-primary">
        <nav className="flex gap-4">
          {(['overview', 'events', 'blocked', 'sessions', 'alerts'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-surface-primary rounded-lg border border-border-primary">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Recent Events */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Events</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Time</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Type</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Severity</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Source IP</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.recent_events.slice(0, 10).map((event) => (
                      <tr key={event.id} className="border-b border-border-secondary">
                        <td className="py-2 px-3 text-sm text-text-secondary">
                          {formatTimestamp(event.timestamp)}
                        </td>
                        <td className="py-2 px-3 text-sm text-text-primary">{event.event_type}</td>
                        <td className="py-2 px-3">
                          <SeverityBadge severity={event.severity} />
                        </td>
                        <td className="py-2 px-3 text-sm font-mono text-text-primary">{event.source_ip}</td>
                        <td className="py-2 px-3 text-sm text-text-secondary">{event.username || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rate Limit Stats */}
            {dashboard?.rate_limit_stats && (
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Rate Limiting</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <p className="text-sm text-text-secondary">Total Requests</p>
                    <p className="text-xl font-semibold text-text-primary">
                      {dashboard.rate_limit_stats.total_requests.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <p className="text-sm text-text-secondary">Blocked</p>
                    <p className="text-xl font-semibold text-error-500">
                      {dashboard.rate_limit_stats.blocked_requests.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <p className="text-sm text-text-secondary">Unique IPs</p>
                    <p className="text-xl font-semibold text-text-primary">
                      {dashboard.rate_limit_stats.unique_identifiers}
                    </p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <p className="text-sm text-text-secondary">Violations</p>
                    <p className="text-xl font-semibold text-warning-500">
                      {dashboard.rate_limit_stats.active_violations}
                    </p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <p className="text-sm text-text-secondary">Blocked IDs</p>
                    <p className="text-xl font-semibold text-error-500">
                      {dashboard.rate_limit_stats.blocked_identifiers}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Filter className="w-5 h-5 text-text-secondary" />
              <select
                className="px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                value={eventFilters.severity || ''}
                onChange={(e) => setEventFilters({ ...eventFilters, severity: e.target.value })}
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <select
                className="px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                value={eventFilters.event_type || ''}
                onChange={(e) => setEventFilters({ ...eventFilters, event_type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="failed_login">Failed Login</option>
                <option value="rate_limited">Rate Limited</option>
                <option value="blocked_ip">Blocked IP</option>
                <option value="brute_force_detected">Brute Force</option>
              </select>
            </div>

            {eventsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Time</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Type</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Severity</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Source IP</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">User</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Endpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events?.map((event) => (
                      <tr key={event.id} className="border-b border-border-secondary hover:bg-surface-secondary">
                        <td className="py-2 px-3 text-sm text-text-secondary">
                          {formatTimestamp(event.timestamp)}
                        </td>
                        <td className="py-2 px-3 text-sm text-text-primary">{event.event_type}</td>
                        <td className="py-2 px-3">
                          <SeverityBadge severity={event.severity} />
                        </td>
                        <td className="py-2 px-3 text-sm font-mono text-text-primary">{event.source_ip}</td>
                        <td className="py-2 px-3 text-sm text-text-secondary">{event.username || '-'}</td>
                        <td className="py-2 px-3 text-sm text-text-secondary">{event.endpoint || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Blocked IPs Tab */}
        {activeTab === 'blocked' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Blocked IP Addresses</h3>
              <button
                onClick={() => setBlockIpModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-error-600 hover:bg-error-700 text-white rounded-lg transition-colors"
              >
                <Ban className="w-4 h-4" />
                Block IP
              </button>
            </div>

            {blockedLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : blockedIps?.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <Lock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No blocked IP addresses</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">IP Address</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Reason</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Blocked At</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Expires</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedIps?.map((blocked) => (
                      <tr key={blocked.ip} className="border-b border-border-secondary">
                        <td className="py-2 px-3 text-sm font-mono text-text-primary">{blocked.ip}</td>
                        <td className="py-2 px-3 text-sm text-text-secondary">{blocked.reason}</td>
                        <td className="py-2 px-3 text-sm text-text-secondary">
                          {formatTimestamp(blocked.blocked_at)}
                        </td>
                        <td className="py-2 px-3 text-sm text-text-secondary">
                          {blocked.is_permanent ? (
                            <span className="text-error-500">Permanent</span>
                          ) : blocked.expires_at ? (
                            formatTimestamp(blocked.expires_at)
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => unblockIpMutation.mutate(blocked.ip)}
                            disabled={unblockIpMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-success-600 hover:bg-success-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            <Unlock className="w-3 h-3" />
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Active Sessions</h3>

            {sessionsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : sessions?.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No active sessions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">User</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">IP Address</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Created</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Last Activity</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions?.map((session) => (
                      <tr key={session.token_hash} className="border-b border-border-secondary">
                        <td className="py-2 px-3 text-sm text-text-primary">
                          {session.username || session.user_id}
                        </td>
                        <td className="py-2 px-3 text-sm font-mono text-text-secondary">{session.ip_address}</td>
                        <td className="py-2 px-3 text-sm text-text-secondary">
                          {formatTimestamp(session.created_at)}
                        </td>
                        <td className="py-2 px-3 text-sm text-text-secondary">
                          {formatTimestamp(session.last_activity)}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() =>
                              forceLogoutMutation.mutate({
                                userId: session.user_id,
                                reason: 'Administrative action',
                              })
                            }
                            disabled={forceLogoutMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-error-600 hover:bg-error-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            <LogOut className="w-3 h-3" />
                            Force Logout
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Security Alerts</h3>

            {alertsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : alerts?.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50 text-success-500" />
                <p>No security alerts</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts?.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.acknowledged
                        ? 'bg-surface-secondary border-border-secondary'
                        : 'bg-error-50 border-error-200 dark:bg-error-900/20 dark:border-error-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={`w-5 h-5 mt-0.5 ${
                            alert.acknowledged ? 'text-text-secondary' : 'text-error-500'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">{alert.alert_type}</span>
                            <SeverityBadge severity={alert.severity} />
                          </div>
                          <p className="text-sm text-text-secondary mt-1">{alert.message}</p>
                          <p className="text-xs text-text-tertiary mt-2">
                            {formatTimestamp(alert.created_at)}
                          </p>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlertMutation.mutate({ alertId: alert.id })}
                          disabled={acknowledgeAlertMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-success-600 hover:bg-success-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Acknowledge
                        </button>
                      )}
                    </div>
                    {alert.acknowledged && (
                      <p className="text-xs text-text-tertiary mt-2">
                        Acknowledged by {alert.acknowledged_by} at{' '}
                        {alert.acknowledged_at ? formatTimestamp(alert.acknowledged_at) : '-'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Block IP Modal */}
      {blockIpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-primary rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Block IP Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">IP Address</label>
                <input
                  type="text"
                  value={newBlockIp.ip}
                  onChange={(e) => setNewBlockIp({ ...newBlockIp, ip: e.target.value })}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Reason</label>
                <input
                  type="text"
                  value={newBlockIp.reason}
                  onChange={(e) => setNewBlockIp({ ...newBlockIp, reason: e.target.value })}
                  placeholder="Suspicious activity"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={newBlockIp.permanent}
                  onChange={(e) => setNewBlockIp({ ...newBlockIp, permanent: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="permanent" className="text-sm text-text-secondary">
                  Permanent block
                </label>
              </div>
              {!newBlockIp.permanent && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={newBlockIp.duration}
                    onChange={(e) => setNewBlockIp({ ...newBlockIp, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setBlockIpModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  blockIpMutation.mutate({
                    ip: newBlockIp.ip,
                    reason: newBlockIp.reason,
                    permanent: newBlockIp.permanent,
                    duration_secs: newBlockIp.permanent ? undefined : newBlockIp.duration,
                  })
                }
                disabled={!newBlockIp.ip || !newBlockIp.reason || blockIpMutation.isPending}
                className="px-4 py-2 bg-error-600 hover:bg-error-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Block IP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboardPage;

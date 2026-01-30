import { useState, useEffect } from 'react';
import { apiClient } from '@common/utils';

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  user_id: string | null;
  changes: Record<string, any> | null;
  is_offline: boolean;
  created_at: string;
  store_id: string;
}

export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  store_id?: string;
  operation?: string;
  start_date?: string;
  end_date?: string;
  offline_only?: boolean;
  limit?: number;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
}

export function useAuditLog(filters?: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query string
      const params = new URLSearchParams();
      if (filters?.entity_type) params.append('entity_type', filters.entity_type);
      if (filters?.entity_id) params.append('entity_id', filters.entity_id);
      if (filters?.user_id) params.append('user_id', filters.user_id);
      if (filters?.store_id) params.append('store_id', filters.store_id);
      if (filters?.operation) params.append('operation', filters.operation);
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.offline_only !== undefined)
        params.append('offline_only', String(filters.offline_only));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const queryString = params.toString();
      const url = `/api/audit-logs${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<AuditLogResponse>(url);
      setLogs(response.logs);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      // Build query string
      const params = new URLSearchParams();
      if (filters?.entity_type) params.append('entity_type', filters.entity_type);
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.store_id) params.append('store_id', filters.store_id);

      const queryString = params.toString();
      const url = `/api/audit-logs/export${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audit logs');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [JSON.stringify(filters)]);

  return {
    logs,
    total,
    isLoading,
    error,
    refetch: fetchLogs,
    exportLogs,
  };
}

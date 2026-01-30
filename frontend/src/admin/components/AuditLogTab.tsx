import { useState } from 'react';
import { SettingsPageShell, SettingsTable, ColumnDef } from '.';
import { Download } from 'lucide-react';
import { useAuditLog, AuditLogEntry } from '../hooks';
import { Badge } from '@common/components/atoms';

export function AuditLogTab() {
  const [filters, setFilters] = useState({
    entity_type: undefined as string | undefined,
    operation: undefined as string | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
  });

  const { logs, total, isLoading, error, exportLogs } = useAuditLog(filters);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'created_at',
      label: 'Timestamp',
      sortable: true,
      width: '180px',
      render: (row: AuditLogEntry) => (
        <span className="text-sm text-secondary-700">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: 'entity_type',
      label: 'Entity Type',
      sortable: true,
      width: '120px',
      render: (row: AuditLogEntry) => (
        <Badge variant="default" size="sm">
          {row.entity_type}
        </Badge>
      ),
    },
    {
      key: 'operation',
      label: 'Action',
      sortable: true,
      width: '100px',
      render: (row: AuditLogEntry) => {
        const variant =
          row.operation === 'create'
            ? 'success'
            : row.operation === 'update'
              ? 'warning'
              : row.operation === 'delete'
                ? 'error'
                : 'default';

        return (
          <Badge variant={variant} size="sm">
            {row.operation}
          </Badge>
        );
      },
    },
    {
      key: 'entity_id',
      label: 'Entity ID',
      sortable: false,
      width: '150px',
      render: (row: AuditLogEntry) => (
        <span className="text-sm text-secondary-600 font-mono truncate">{row.entity_id}</span>
      ),
    },
    {
      key: 'user_id',
      label: 'User',
      sortable: true,
      width: '150px',
      render: (row: AuditLogEntry) => (
        <span className="text-sm text-secondary-700">{row.user_id || 'System'}</span>
      ),
    },
    {
      key: 'is_offline',
      label: 'Status',
      sortable: true,
      width: '100px',
      render: (row: AuditLogEntry) =>
        row.is_offline ? (
          <Badge variant="warning" size="sm">
            Offline
          </Badge>
        ) : (
          <Badge variant="success" size="sm">
            Online
          </Badge>
        ),
    },
    {
      key: 'changes',
      label: 'Changes',
      sortable: false,
      render: (row: AuditLogEntry) => {
        if (!row.changes) {
          return <span className="text-sm text-secondary-400">No changes</span>;
        }

        const changeCount = Object.keys(row.changes).length;
        return (
          <span className="text-sm text-secondary-600">
            {changeCount} field{changeCount !== 1 ? 's' : ''} changed
          </span>
        );
      },
    },
  ];

  const filterChips = [
    {
      label: 'All Types',
      active: !filters.entity_type,
      onClick: () => setFilters({ ...filters, entity_type: undefined }),
    },
    {
      label: 'Users',
      active: filters.entity_type === 'user',
      onClick: () => setFilters({ ...filters, entity_type: 'user' }),
    },
    {
      label: 'Stores',
      active: filters.entity_type === 'store',
      onClick: () => setFilters({ ...filters, entity_type: 'store' }),
    },
    {
      label: 'Stations',
      active: filters.entity_type === 'station',
      onClick: () => setFilters({ ...filters, entity_type: 'station' }),
    },
    {
      label: 'Settings',
      active: filters.entity_type === 'setting',
      onClick: () => setFilters({ ...filters, entity_type: 'setting' }),
    },
  ];

  const operationFilters = [
    {
      label: 'All Actions',
      active: !filters.operation,
      onClick: () => setFilters({ ...filters, operation: undefined }),
    },
    {
      label: 'Created',
      active: filters.operation === 'create',
      onClick: () => setFilters({ ...filters, operation: 'create' }),
    },
    {
      label: 'Updated',
      active: filters.operation === 'update',
      onClick: () => setFilters({ ...filters, operation: 'update' }),
    },
    {
      label: 'Deleted',
      active: filters.operation === 'delete',
      onClick: () => setFilters({ ...filters, operation: 'delete' }),
    },
  ];

  return (
    <SettingsPageShell
      title="Audit Log"
      subtitle="Track all changes to users, roles, stores, stations, and settings"
      scope="global"
      filters={[...filterChips, ...operationFilters]}
      primaryAction={{
        label: 'Export CSV',
        onClick: exportLogs,
        icon: Download,
      }}
    >
      {error && (
        <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-secondary-600">
          Showing {logs.length} of {total} audit log entries
        </p>
      </div>

      <SettingsTable
        data={logs}
        columns={columns}
        getRowId={(row: AuditLogEntry) => row.id}
        isLoading={isLoading}
        emptyState={{
          title: 'No audit logs found',
          description: 'No changes have been recorded yet, or your filters returned no results.',
        }}
      />
    </SettingsPageShell>
  );
}

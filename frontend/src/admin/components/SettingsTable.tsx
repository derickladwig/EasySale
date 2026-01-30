import { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';
import { Button } from '@common/components/atoms';

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  width?: string;
}

export interface BulkAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'danger';
  requiresConfirmation?: boolean;
}

export interface EmptyState {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface SettingsTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  bulkActions?: BulkAction[];
  emptyState?: EmptyState;
  isLoading?: boolean;
  virtualized?: boolean;
  getRowId: (row: T) => string;
}

type SortDirection = 'asc' | 'desc' | null;

export function SettingsTable<T>({
  data,
  columns,
  onRowClick,
  bulkActions = [],
  emptyState,
  isLoading = false,
  getRowId,
}: SettingsTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(getRowId)));
    }
  };

  // Handle select single row
  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle sort
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = [...data];
  if (sortColumn && sortDirection) {
    sortedData.sort((a, b) => {
      const aValue = (a as any)[sortColumn];
      const bValue = (b as any)[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0 && emptyState) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Inbox className="w-12 h-12 text-secondary-400 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">{emptyState.title}</h3>
        <p className="text-sm text-secondary-600 mb-4 max-w-md">{emptyState.description}</p>
        {emptyState.action && (
          <Button onClick={emptyState.action.onClick} variant="primary">
            {emptyState.action.label}
          </Button>
        )}
      </div>
    );
  }

  const allSelected = selectedIds.size === data.length && data.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && bulkActions.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <span className="text-sm font-medium text-primary-900">
            {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
          </span>
          <div className="flex gap-2">
            {bulkActions.map((action, index) => (
              <Button
                key={index}
                onClick={() => action.onClick(Array.from(selectedIds))}
                variant={action.variant === 'danger' ? 'danger' : 'secondary'}
                size="sm"
              >
                {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-secondary-200 rounded-lg">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              {/* Bulk selection checkbox */}
              {bulkActions.length > 0 && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                  />
                </th>
              )}

              {/* Column headers */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-secondary-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <>
                        {sortDirection === 'asc' && <ChevronUp className="w-4 h-4" />}
                        {sortDirection === 'desc' && <ChevronDown className="w-4 h-4" />}
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface-base divide-y divide-border">
            {sortedData.map((row) => {
              const rowId = getRowId(row);
              const isSelected = selectedIds.has(rowId);

              return (
                <tr
                  key={rowId}
                  className={`hover:bg-secondary-50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${isSelected ? 'bg-primary-50' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {/* Bulk selection checkbox */}
                  {bulkActions.length > 0 && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowId)}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                      />
                    </td>
                  )}

                  {/* Data cells */}
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-secondary-900">
                      {column.render ? column.render(row) : (row as any)[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

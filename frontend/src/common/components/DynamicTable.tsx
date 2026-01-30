import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from './atoms/Button';
import { Input } from './atoms/Input';

// ============================================================================
// Types
// ============================================================================

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'custom';
export type SortDirection = 'asc' | 'desc' | null;
export type Alignment = 'left' | 'center' | 'right';

export interface ColumnSchema<T = Record<string, unknown>> {
  key: string;
  label: string;
  type?: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: Alignment;

  // Custom rendering
  render?: (value: unknown, row: T, index: number) => React.ReactNode;

  // Custom formatting
  format?: (value: unknown) => string;

  // Custom sorting
  sortFn?: (a: T, b: T) => number;

  // Custom filtering
  filterFn?: (row: T, filterValue: string) => boolean;

  // Hide on mobile
  hideOnMobile?: boolean;
}

export interface TableSchema<T = Record<string, unknown>> {
  columns: ColumnSchema<T>[];
  keyField: string; // Field to use as unique key for rows
}

export interface DynamicTableProps<T = Record<string, unknown>> {
  schema: TableSchema<T>;
  data: T[];

  // Pagination
  pageSize?: number;
  showPagination?: boolean;

  // Search
  searchable?: boolean;
  searchPlaceholder?: string;

  // Selection
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;

  // Row actions
  onRowClick?: (row: T, index: number) => void;

  // Empty state
  emptyMessage?: string;

  // Loading state
  isLoading?: boolean;

  // Styling
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;

  // Mobile
  mobileCardView?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DynamicTable<T = any>({
  schema,
  data,
  pageSize = 10,
  showPagination = true,
  searchable = true,
  searchPlaceholder = 'Search...',
  selectable = false,
  onSelectionChange,
  onRowClick,
  emptyMessage = 'No data available',
  isLoading = false,
  striped = true,
  hoverable = true,
  compact = false,
  mobileCardView = true,
}: DynamicTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Filtering
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    return data.filter((row) => {
      // Search across all filterable columns
      return schema.columns.some((column) => {
        if (column.filterable === false) return false;

        const value = (row as any)[column.key];

        // Custom filter function
        if (column.filterFn) {
          return column.filterFn(row, searchQuery);
        }

        // Default string search
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  }, [data, searchQuery, schema.columns]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    const column = schema.columns.find((col) => col.key === sortColumn);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      // Custom sort function
      if (column.sortFn) {
        return sortDirection === 'asc' ? column.sortFn(a, b) : column.sortFn(b, a);
      }

      const aValue = (a as any)[column.key];
      const bValue = (b as any)[column.key];

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Type-specific sorting
      let comparison = 0;
      switch (column.type) {
        case 'number':
        case 'currency':
          comparison = Number(aValue) - Number(bValue);
          break;
        case 'date':
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
          break;
        case 'boolean':
          comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
          break;
        default:
          comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, schema.columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  // Reset to first page when data changes
  // Using a ref to track previous length to avoid unnecessary resets
  const prevLengthRef = React.useRef(sortedData.length);
  React.useEffect(() => {
    if (prevLengthRef.current !== sortedData.length) {
      setCurrentPage(1);
      prevLengthRef.current = sortedData.length;
    }
  }, [sortedData.length]);

  // Sorting handler
  const handleSort = (columnKey: string) => {
    const column = schema.columns.find((col) => col.key === columnKey);
    if (!column || column.sortable === false) return;

    if (sortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = new Set(paginatedData.map((row) => String((row as any)[schema.keyField])));
      setSelectedRows(allKeys);
      onSelectionChange?.(paginatedData);
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (row: T, checked: boolean) => {
    const key = String((row as any)[schema.keyField]);
    const newSelected = new Set(selectedRows);

    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }

    setSelectedRows(newSelected);

    const selectedData = data.filter((r) => newSelected.has(String((r as any)[schema.keyField])));
    onSelectionChange?.(selectedData);
  };

  // Format cell value
  const formatValue = (value: unknown, column: ColumnSchema<T>): string => {
    if (value === null || value === undefined) return '-';

    // Custom format function
    if (column.format) {
      return column.format(value);
    }

    // Type-specific formatting
    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Number(value));
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(value));
      case 'date':
        return value ? new Date(value as string | number | Date).toLocaleDateString() : '';
      case 'boolean':
        return value ? '✓' : '✗';
      default:
        return String(value);
    }
  };

  // Render cell
  const renderCell = (row: T, column: ColumnSchema<T>, index: number) => {
    const value = (row as any)[column.key];

    // Custom render function
    if (column.render) {
      return column.render(value, row, index);
    }

    return formatValue(value, column);
  };

  // Get alignment class
  const getAlignmentClass = (align?: Alignment) => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchable && (
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={18} />}
            />
          </div>
          <div className="text-sm text-text-secondary">
            {sortedData.length} {sortedData.length === 1 ? 'result' : 'results'}
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div
        className={`overflow-x-auto rounded-lg border border-border ${mobileCardView ? 'hidden md:block' : ''}`}
      >
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-background text-primary-600"
                  />
                </th>
              )}
              {schema.columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-sm font-semibold text-text-primary ${getAlignmentClass(column.align)} ${
                    column.sortable !== false
                      ? 'cursor-pointer select-none hover:bg-surface-hover'
                      : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable !== false && (
                      <span className="text-text-secondary">
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )
                        ) : (
                          <ChevronsUpDown size={16} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={schema.columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-text-secondary"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowKey = String((row as any)[schema.keyField]);
                const isSelected = selectedRows.has(rowKey);

                return (
                  <tr
                    key={rowKey}
                    className={`border-b border-border ${
                      striped && index % 2 === 1 ? 'bg-surface/50' : ''
                    } ${hoverable ? 'hover:bg-surface-hover' : ''} ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${isSelected ? 'bg-primary-500/10' : ''}`}
                    onClick={() => onRowClick?.(row, index)}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(row, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-border bg-background text-primary-600"
                        />
                      </td>
                    )}
                    {schema.columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-text-primary ${getAlignmentClass(
                          column.align
                        )}`}
                      >
                        {renderCell(row, column, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView && (
        <div className="md:hidden space-y-4">
          {paginatedData.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">{emptyMessage}</div>
          ) : (
            paginatedData.map((row, index) => {
              const rowKey = String((row as any)[schema.keyField]);
              const isSelected = selectedRows.has(rowKey);

              return (
                <div
                  key={rowKey}
                  className={`bg-surface border border-border rounded-lg p-4 ${
                    hoverable ? 'hover:bg-surface-hover' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {selectable && (
                    <div className="mb-3 pb-3 border-b border-border">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(row, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-border bg-background text-primary-600"
                        />
                        <span className="text-sm text-text-secondary">Select</span>
                      </label>
                    </div>
                  )}
                  <div className="space-y-2">
                    {schema.columns
                      .filter((col) => !col.hideOnMobile)
                      .map((column) => (
                        <div key={column.key} className="flex justify-between items-start gap-4">
                          <span className="text-sm font-medium text-text-secondary">
                            {column.label}:
                          </span>
                          <span className="text-sm text-text-primary text-right">
                            {renderCell(row, column, index)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

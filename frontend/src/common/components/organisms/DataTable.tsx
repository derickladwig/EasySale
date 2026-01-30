import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import { cn } from '../../utils/classNames';

export interface Column<T> {
  /** Key of the data property to display */
  key: keyof T;

  /** Column header text */
  header: string;

  /** Optional width (CSS value) */
  width?: string;

  /** Whether the column is sortable */
  sortable?: boolean;

  /** Custom render function for the cell */
  render?: (value: any, row: T) => React.ReactNode;

  /** Whether to show this column on mobile (card layout) */
  showOnMobile?: boolean;

  /** Priority for mobile display (lower numbers shown first) */
  mobilePriority?: number;
}

/**
 * Card Row Component for Mobile
 * Displays data in a card layout on mobile devices (Requirement 9.8)
 */
function CardRow<T extends Record<string, any>>({
  row,
  columns,
  selected,
  onSelect,
  onClick,
}: {
  row: T;
  columns: Column<T>[];
  selected: boolean;
  onSelect?: (checked: boolean) => void;
  onClick?: () => void;
}) {
  // Sort columns by mobile priority
  const mobileColumns = columns
    .filter((col) => col.showOnMobile !== false)
    .sort((a, b) => (a.mobilePriority || 999) - (b.mobilePriority || 999));

  return (
    <div
      className={cn(
        'bg-background-secondary border border-border-light rounded-lg p-4 mb-3 transition-all duration-200',
        selected && 'bg-primary-500/20 border-primary-500',
        onClick && 'cursor-pointer hover:border-primary-500/50'
      )}
      onClick={onClick}
    >
      {onSelect && (
        <div className="mb-3 pb-3 border-b border-border-light">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-border-DEFAULT text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-text-secondary">Select</span>
          </label>
        </div>
      )}
      <div className="space-y-2">
        {mobileColumns.map((column) => {
          const value = row[column.key];
          const content = column.render ? column.render(value, row) : value;

          return (
            <div key={String(column.key)} className="flex justify-between items-start gap-4">
              <span className="text-sm font-medium text-text-tertiary min-w-[100px]">
                {column.header}:
              </span>
              <span className="text-sm text-text-primary text-right flex-1">{content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Skeleton Row Component
 * Displays animated skeleton placeholders while data is loading
 */
function SkeletonRow({ columnCount }: { columnCount: number }) {
  return (
    <tr className="border-b border-border-light">
      {Array.from({ length: columnCount }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <div className="h-4 bg-background-tertiary rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Empty State Component
 * Displays a helpful message when no data is available
 */
function EmptyState({
  message,
  icon,
  action,
}: {
  message: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon ? (
        <div className="mb-4 text-text-tertiary">{icon}</div>
      ) : (
        <Icon icon={Inbox} size="xl" className="mb-4 text-text-tertiary" />
      )}
      <p className="text-text-secondary text-center mb-4">{message}</p>
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];

  /** Data rows */
  data: T[];

  /** Loading state */
  loading?: boolean;

  /** Message to show when data is empty */
  emptyMessage?: string;

  /** Optional icon or illustration for empty state */
  emptyIcon?: React.ReactNode;

  /** Optional action button for empty state */
  emptyAction?: {
    label: string;
    onClick: () => void;
  };

  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;

  /** Currently selected rows */
  selectedRows?: T[];

  /** Callback when selection changes */
  onSelectionChange?: (rows: T[]) => void;

  /** Currently sorted column */
  sortColumn?: keyof T;

  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Callback when sort changes */
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;

  /** Enable sticky header for long tables */
  stickyHeader?: boolean;

  /** Number of skeleton rows to show when loading */
  skeletonRows?: number;

  /** Additional CSS classes */
  className?: string;

  /** Enable mobile card layout (default: true) */
  mobileCardLayout?: boolean;
}

/**
 * DataTable Component
 *
 * A feature-rich data table with sorting, row selection, loading states, empty states, sticky headers,
 * and responsive mobile card layout. Supports custom cell rendering and row click handlers.
 *
 * **Mobile Responsiveness (Requirement 9.8):**
 * - Automatically transforms to card layout on mobile devices (< 768px)
 * - Cards display columns based on `showOnMobile` and `mobilePriority` settings
 * - Maintains all functionality (selection, sorting, etc.) in card layout
 *
 * **Visual Enhancements:**
 * - Selected rows highlighted with blue background (Requirement 9.9)
 * - Animated sort indicators with smooth transitions (Requirement 9.10)
 * - Alternating row colors for better readability (Requirement 9.1)
 * - Hover states on rows (Requirement 9.2)
 *
 * @example
 * // Basic table
 * <DataTable
 *   columns={[
 *     { key: 'name', header: 'Name', showOnMobile: true, mobilePriority: 1 },
 *     { key: 'email', header: 'Email', showOnMobile: true, mobilePriority: 2 },
 *   ]}
 *   data={users}
 * />
 *
 * @example
 * // With sorting and animated indicators
 * <DataTable
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'price', header: 'Price', sortable: true },
 *   ]}
 *   data={products}
 *   sortColumn={sortColumn}
 *   sortDirection={sortDirection}
 *   onSort={handleSort}
 * />
 *
 * @example
 * // With row selection and blue highlight
 * <DataTable
 *   columns={columns}
 *   data={items}
 *   selectedRows={selected}
 *   onSelectionChange={setSelected}
 * />
 *
 * @example
 * // With loading state
 * <DataTable
 *   columns={columns}
 *   data={items}
 *   loading={isLoading}
 *   skeletonRows={10}
 * />
 *
 * @example
 * // With empty state and action
 * <DataTable
 *   columns={columns}
 *   data={[]}
 *   emptyMessage="No products found"
 *   emptyIcon={<Package size={48} />}
 *   emptyAction={{ label: 'Add Product', onClick: handleAddProduct }}
 * />
 *
 * @example
 * // With sticky header for long tables
 * <DataTable
 *   columns={columns}
 *   data={largeDataset}
 *   stickyHeader
 * />
 *
 * @example
 * // Disable mobile card layout
 * <DataTable
 *   columns={columns}
 *   data={items}
 *   mobileCardLayout={false}
 * />
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  emptyAction,
  onRowClick,
  selectedRows = [],
  onSelectionChange,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  stickyHeader = false,
  skeletonRows = 5,
  className,
  mobileCardLayout = true,
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;

    const newDirection = sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  };

  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;

    if (e.target.checked) {
      onSelectionChange(data);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (row: T, checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      onSelectionChange([...selectedRows, row]);
    } else {
      onSelectionChange(selectedRows.filter((r) => r !== row));
    }
  };

  const isRowSelected = (row: T) => selectedRows.includes(row);
  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && !allSelected;

  // Calculate total column count including selection column
  const totalColumnCount = columns.length + (onSelectionChange ? 1 : 0);

  return (
    <>
      {/* Mobile Card Layout (Requirement 9.8) */}
      {mobileCardLayout && (
        <div className={cn('md:hidden', className)}>
          {/* Loading state */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: skeletonRows }).map((_, index) => (
                <div
                  key={`skeleton-card-${index}`}
                  className="bg-background-secondary border border-border-light rounded-lg p-4 space-y-2"
                >
                  <div className="h-4 bg-background-tertiary rounded animate-pulse" />
                  <div className="h-4 bg-background-tertiary rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-background-tertiary rounded animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && data.length === 0 && (
            <EmptyState message={emptyMessage} icon={emptyIcon} action={emptyAction} />
          )}

          {/* Data cards */}
          {!loading &&
            data.map((row, rowIndex) => {
              const selected = isRowSelected(row);

              return (
                <CardRow
                  key={rowIndex}
                  row={row}
                  columns={columns}
                  selected={selected}
                  onSelect={onSelectionChange ? (checked) => handleSelectRow(row, checked) : undefined}
                  onClick={onRowClick ? () => handleRowClick(row) : undefined}
                />
              );
            })}
        </div>
      )}

      {/* Desktop Table Layout */}
      <div className={cn('w-full overflow-x-auto', mobileCardLayout ? 'hidden md:block' : '', className)}>
        <table className="w-full border-collapse">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="border-b border-border-DEFAULT bg-background-secondary">
              {onSelectionChange && (
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-border-DEFAULT text-primary-500 focus:ring-primary-500"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-semibold text-text-primary',
                    column.sortable && 'cursor-pointer select-none hover:text-primary-500 transition-colors duration-200'
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && (
                      <div className="relative w-4 h-4">
                        {/* Animated sort indicator (Requirement 9.10) */}
                        <Icon
                          icon={ChevronUp}
                          size="xs"
                          className={cn(
                            'absolute inset-0 transition-all duration-300 ease-in-out',
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-primary-500 opacity-100 scale-110'
                              : 'text-text-tertiary opacity-30 scale-100'
                          )}
                        />
                        <Icon
                          icon={ChevronDown}
                          size="xs"
                          className={cn(
                            'absolute inset-0 transition-all duration-300 ease-in-out',
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-primary-500 opacity-100 scale-110'
                              : 'text-text-tertiary opacity-30 scale-100'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Loading state with skeleton rows (Requirement 9.5) */}
            {loading && (
              <>
                {Array.from({ length: skeletonRows }).map((_, index) => (
                  <SkeletonRow key={`skeleton-${index}`} columnCount={totalColumnCount} />
                ))}
              </>
            )}

            {/* Empty state with helpful message (Requirement 9.6) */}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={totalColumnCount}>
                  <EmptyState message={emptyMessage} icon={emptyIcon} action={emptyAction} />
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading &&
              data.map((row, rowIndex) => {
                const selected = isRowSelected(row);
                const hovered = hoveredRow === rowIndex;
                const isEvenRow = rowIndex % 2 === 0;

                return (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'border-b border-border-light transition-colors duration-200',
                      // Alternating row colors (Requirement 9.1)
                      isEvenRow ? 'bg-background-primary' : 'bg-background-secondary',
                      // Row hover state (Requirement 9.2)
                      hovered && !selected && 'bg-background-tertiary',
                      // Selected row state with blue background (Requirement 9.9)
                      selected && 'bg-primary-500/20 border-primary-500',
                      onRowClick && 'cursor-pointer'
                    )}
                    onMouseEnter={() => setHoveredRow(rowIndex)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => handleRowClick(row)}
                  >
                    {onSelectionChange && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(row, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-border-DEFAULT text-primary-500 focus:ring-primary-500"
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      const value = row[column.key];
                      const content = column.render ? column.render(value, row) : value;

                      return (
                        <td key={String(column.key)} className="px-4 py-3 text-sm text-text-secondary">
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </>
  );
}

DataTable.displayName = 'DataTable';

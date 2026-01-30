import React, { useRef } from 'react';
import { useVirtualization } from '../../hooks/useVirtualization';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (item: T, index: number) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  containerHeight?: number;
  emptyMessage?: string;
  onRowClick?: (item: T, index: number) => void;
}

export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 48,
  containerHeight = 600,
  emptyMessage = 'No data available',
  onRowClick,
}: VirtualizedTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { virtualItems, totalHeight } = useVirtualization(data.length, {
    itemHeight: rowHeight,
    containerHeight,
    overscan: 5,
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-surface-base border-b border-border">
        <div className="flex">
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider"
              style={{ width: column.width || 'auto', flex: column.width ? undefined : 1 }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={scrollRef}
        className="overflow-auto bg-background-primary"
        style={{ height: containerHeight }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {virtualItems.map(({ index, start }) => {
            const item = data[index];
            return (
              <div
                key={index}
                className={`absolute left-0 right-0 flex border-b border-border ${
                  onRowClick ? 'cursor-pointer hover:bg-surface-base' : ''
                }`}
                style={{
                  top: start,
                  height: rowHeight,
                }}
                onClick={() => onRowClick?.(item, index)}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="px-4 py-3 text-sm text-text-secondary flex items-center"
                    style={{ width: column.width || 'auto', flex: column.width ? undefined : 1 }}
                  >
                    {column.render(item, index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

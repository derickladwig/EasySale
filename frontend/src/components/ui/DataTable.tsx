import React from 'react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string;
  className?: string;
}

/**
 * DataTable component with consistent styling and states.
 * - Row hover styling
 * - Column alignment support
 * - Empty, loading, and error states
 * - Uses --row-h-* tokens for row heights
 * - Works correctly in both light and dark themes
 */
export function DataTable<T>({ 
  data, 
  columns, 
  keyExtractor, 
  emptyMessage = 'No data available',
  loading,
  error,
  className 
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`${styles.stateContainer} ${className || ''}`} data-testid="table-loading">
        <div className={styles.stateContent}>Loading...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`${styles.stateContainer} ${styles.errorState} ${className || ''}`} data-testid="table-error">
        <div className={styles.stateContent}>{error}</div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className={`${styles.stateContainer} ${className || ''}`} data-testid="table-empty">
        <div className={styles.stateContent}>{emptyMessage}</div>
      </div>
    );
  }
  
  return (
    <div className={`${styles.tableWrapper} ${className || ''}`}>
      <table className={styles.table} data-testid="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th 
                key={col.key} 
                className={styles[`align-${col.align || 'left'}`]}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={keyExtractor(item)} className={styles.row}>
              {columns.map(col => (
                <td 
                  key={col.key} 
                  className={styles[`align-${col.align || 'left'}`]}
                >
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

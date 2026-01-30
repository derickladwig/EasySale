import React from 'react';
import styles from './Toolbar.module.css';

export interface ToolbarProps {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Toolbar component with consistent layout: search left, filters right, actions far right.
 * Uses design tokens for all styling.
 */
export function Toolbar({ 
  search, 
  filters, 
  actions,
  className 
}: ToolbarProps) {
  return (
    <div className={`${styles.toolbar} ${className || ''}`} data-testid="toolbar">
      {search && <div className={styles.search}>{search}</div>}
      <div className={styles.rightSection}>
        {filters && <div className={styles.filters}>{filters}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}

import React from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState component for displaying friendly messages when no data is available.
 * Uses design tokens for all styling.
 */
export function EmptyState({ 
  title,
  message, 
  icon,
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={`${styles.emptyState} ${className || ''}`} data-testid="empty-state">
      {icon && <div className={styles.icon}>{icon}</div>}
      {title && <h3 className={styles.title}>{title}</h3>}
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

import React from 'react';
import styles from './InlineAlert.module.css';

export interface InlineAlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * InlineAlert component for displaying contextual messages.
 * Uses design tokens for all styling.
 */
export function InlineAlert({ 
  variant = 'info',
  title,
  children,
  className 
}: InlineAlertProps) {
  return (
    <div 
      className={`${styles.alert} ${styles[variant]} ${className || ''}`}
      role="alert"
      data-testid="inline-alert"
    >
      {title && <div className={styles.title}>{title}</div>}
      <div className={styles.content}>{children}</div>
    </div>
  );
}

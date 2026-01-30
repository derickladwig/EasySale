import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

/**
 * Badge component for status indicators and labels.
 * Uses design tokens for all styling.
 */
export function Badge({ 
  variant = 'default',
  size = 'md',
  children,
  className 
}: BadgeProps) {
  return (
    <span 
      className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className || ''}`}
      data-testid="badge"
    >
      {children}
    </span>
  );
}

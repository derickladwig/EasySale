import React from 'react';
import styles from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: string;
  actions?: React.ReactNode;
  helperText?: string;
  className?: string;
}

/**
 * SectionHeader component for consistent section titles with actions.
 * Uses design tokens for all styling.
 */
export function SectionHeader({ 
  title, 
  actions, 
  helperText,
  className 
}: SectionHeaderProps) {
  return (
    <div className={`${styles.sectionHeader} ${className || ''}`} data-testid="section-header">
      <div className={styles.titleRow}>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>{title}</h2>
          {helperText && <p className={styles.helperText}>{helperText}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}

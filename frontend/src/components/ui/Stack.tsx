import React from 'react';
import styles from './Stack.module.css';

export interface StackProps {
  children: React.ReactNode;
  gap?: '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

/**
 * Stack component for vertical layout with consistent spacing.
 * Uses design tokens for all spacing values.
 */
export function Stack({ 
  children, 
  gap = '4', 
  align = 'stretch',
  className 
}: StackProps) {
  return (
    <div 
      className={`${styles.stack} ${styles[`gap-${gap}`]} ${styles[`align-${align}`]} ${className || ''}`}
      data-testid="stack"
    >
      {children}
    </div>
  );
}

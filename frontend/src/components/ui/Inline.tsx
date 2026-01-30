import React from 'react';
import styles from './Inline.module.css';

export interface InlineProps {
  children: React.ReactNode;
  gap?: '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16';
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}

/**
 * Inline component for horizontal layout with consistent spacing.
 * Uses design tokens for all spacing values.
 */
export function Inline({ 
  children, 
  gap = '4', 
  align = 'center',
  justify = 'start',
  wrap = false,
  className 
}: InlineProps) {
  return (
    <div 
      className={`${styles.inline} ${styles[`gap-${gap}`]} ${styles[`align-${align}`]} ${styles[`justify-${justify}`]} ${wrap ? styles.wrap : ''} ${className || ''}`}
      data-testid="inline"
    >
      {children}
    </div>
  );
}

import React from 'react';
import styles from './Grid.module.css';

export interface GridProps {
  children: React.ReactNode;
  columns?: '1' | '2' | '3' | '4' | '6' | '12' | 'auto-fit' | 'auto-fill';
  gap?: '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16';
  minColumnWidth?: string;
  className?: string;
}

/**
 * Grid component for grid layout with consistent spacing.
 * Uses design tokens for all spacing values.
 */
export function Grid({ 
  children, 
  columns = '1', 
  gap = '4',
  minColumnWidth = '250px',
  className 
}: GridProps) {
  const gridStyle: React.CSSProperties = {};
  
  if (columns === 'auto-fit' || columns === 'auto-fill') {
    gridStyle.gridTemplateColumns = `repeat(${columns}, minmax(${minColumnWidth}, 1fr))`;
  }
  
  return (
    <div 
      className={`${styles.grid} ${styles[`gap-${gap}`]} ${columns !== 'auto-fit' && columns !== 'auto-fill' ? styles[`columns-${columns}`] : ''} ${className || ''}`}
      style={gridStyle}
      data-testid="grid"
    >
      {children}
    </div>
  );
}

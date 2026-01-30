import React from 'react';
import styles from './Card.module.css';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Card component with consistent padding and borders.
 * Uses design tokens for all styling.
 * Works correctly in both light and dark themes.
 */
export function Card({ 
  children, 
  variant = 'default', 
  padding = 'md',
  className 
}: CardProps) {
  return (
    <div 
      className={`${styles.card} ${styles[variant]} ${styles[`padding-${padding}`]} ${className || ''}`}
      data-testid="card"
    >
      {children}
    </div>
  );
}

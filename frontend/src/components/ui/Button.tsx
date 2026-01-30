import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

/**
 * Button component with consistent styling and accessibility features.
 * - Minimum 40px height for accessibility
 * - Visible focus ring with --ring-2 thickness
 * - Disabled state styling
 * - Uses design tokens for all styling
 * - Works correctly in both light and dark themes
 */
export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children,
  className,
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className || ''}`}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  );
}

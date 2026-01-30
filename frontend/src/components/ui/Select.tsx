import React from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

/**
 * Select component with consistent styling and accessibility features.
 * - Visible focus ring with --ring-2 thickness
 * - Disabled state styling
 * - Error state with message
 * - Helper text support
 * - Uses design tokens for all styling
 * - Works correctly in both light and dark themes
 */
export function Select({ 
  label, 
  error, 
  helperText,
  options,
  placeholder,
  className,
  id,
  ...props 
}: SelectProps) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;
  
  return (
    <div className={`${styles.selectWrapper} ${className || ''}`} data-testid="select-wrapper">
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <select 
        id={selectId}
        className={`${styles.select} ${hasError ? styles.error : ''}`}
        data-testid="select"
        aria-invalid={hasError}
        aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span 
          id={`${selectId}-error`}
          className={styles.errorText}
          data-testid="select-error"
          role="alert"
        >
          {error}
        </span>
      )}
      {helperText && !error && (
        <span 
          id={`${selectId}-helper`}
          className={styles.helperText}
          data-testid="select-helper"
        >
          {helperText}
        </span>
      )}
    </div>
  );
}

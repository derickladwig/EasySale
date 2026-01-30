import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  showPasswordToggle?: boolean;
}

/**
 * Input component with consistent styling and accessibility features.
 * - Visible focus ring with --ring-2 thickness
 * - Disabled state styling
 * - Error state with message
 * - Helper text support
 * - Password show/hide toggle
 * - Uses design tokens for all styling
 * - Works correctly in both light and dark themes
 */
export function Input({ 
  label, 
  error, 
  helperText,
  className,
  id,
  type,
  showPasswordToggle = true,
  ...props 
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  
  // Determine actual input type
  const inputType = isPassword && showPassword ? 'text' : type;
  
  return (
    <div className={`${styles.inputWrapper} ${className || ''}`} data-testid="input-wrapper">
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputContainer}>
        <input 
          id={inputId}
          type={inputType}
          className={`${styles.input} ${hasError ? styles.error : ''} ${isPassword && showPasswordToggle ? styles.inputWithToggle : ''}`}
          data-testid="input"
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props} 
        />
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.passwordToggle}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className={styles.toggleIcon} />
            ) : (
              <Eye className={styles.toggleIcon} />
            )}
          </button>
        )}
      </div>
      {error && (
        <span 
          id={`${inputId}-error`}
          className={styles.errorText}
          data-testid="input-error"
          role="alert"
        >
          {error}
        </span>
      )}
      {helperText && !error && (
        <span 
          id={`${inputId}-helper`}
          className={styles.helperText}
          data-testid="input-helper"
        >
          {helperText}
        </span>
      )}
    </div>
  );
}

import React from 'react';
import { Input, InputProps } from '../atoms/Input';
import { cn } from '../../utils/classNames';

export interface FormFieldProps extends Omit<InputProps, 'error' | 'helperText'> {
  /** Field label */
  label: string;

  /** Whether the field is required */
  required?: boolean;

  /** Helper text to display below the input */
  helperText?: string;

  /** Error message to display (overrides helperText) */
  error?: string;

  /** Additional CSS classes for the container */
  containerClassName?: string;
}

/**
 * FormField Component
 *
 * A complete form field combining label, input, helper text, and error message.
 * Provides consistent styling and accessibility for form inputs.
 *
 * @example
 * // Basic form field
 * <FormField
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 * />
 *
 * @example
 * // Required field with helper text
 * <FormField
 *   label="Password"
 *   type="password"
 *   required
 *   helperText="Must be at least 8 characters"
 * />
 *
 * @example
 * // Field with error
 * <FormField
 *   label="Username"
 *   type="text"
 *   error="Username is already taken"
 * />
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, required = false, helperText, error, containerClassName, id, ...inputProps }, ref) => {
    // Generate a unique ID if not provided
    const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = !!error;

    return (
      <div className={cn('w-full', containerClassName)}>
        <label htmlFor={fieldId} className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
          {required && (
            <span className="text-error-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>

        <Input
          ref={ref}
          id={fieldId}
          variant={hasError ? 'error' : 'default'}
          error={error}
          helperText={!hasError ? helperText : undefined}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
          }
          {...inputProps}
        />
      </div>
    );
  }
);

FormField.displayName = 'FormField';

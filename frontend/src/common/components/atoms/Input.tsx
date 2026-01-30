import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { inputVariants } from '../../utils/variants';
import { cn } from '../../utils/classNames';

export type InputType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'search'
  | 'tel'
  | 'url'
  | 'date'
  | 'datetime-local'
  | 'time';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'error' | 'success';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input type */
  type?: InputType;

  /** Visual style variant */
  variant?: InputVariant;

  /** Size of the input */
  size?: InputSize;

  /** Label text */
  label?: string;

  /** Helper text displayed below input */
  helperText?: string;

  /** Error message (sets variant to error) */
  error?: string;

  /** Icon to display on the left side */
  leftIcon?: React.ReactNode;

  /** Icon to display on the right side */
  rightIcon?: React.ReactNode;

  /** Full width input */
  fullWidth?: boolean;

  /** Show character count (requires maxLength prop) */
  showCharacterCount?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Input Component
 *
 * A versatile input component with multiple types, sizes, and states.
 * Supports labels, helper text, error messages, and icons.
 * Includes enhanced visual feedback with focus, error, success, and disabled states.
 *
 * @example
 * // Basic input
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 * />
 *
 * @example
 * // Input with error
 * <Input
 *   label="Password"
 *   type="password"
 *   error="Password must be at least 8 characters"
 * />
 *
 * @example
 * // Input with success state
 * <Input
 *   label="Username"
 *   type="text"
 *   variant="success"
 *   value="john_doe"
 * />
 *
 * @example
 * // Input with icon
 * <Input
 *   label="Search"
 *   type="search"
 *   leftIcon={<Icon name="search" />}
 *   placeholder="Search products..."
 * />
 *
 * @example
 * // Input with character count
 * <Input
 *   label="Description"
 *   type="text"
 *   maxLength={100}
 *   showCharacterCount
 *   placeholder="Enter description..."
 * />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      variant = 'default',
      size = 'md',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      fullWidth = false,
      showCharacterCount = false,
      className,
      disabled,
      id,
      required,
      maxLength,
      value,
      ...props
    },
    ref
  ) => {
    // Use error variant if error message provided
    const effectiveVariant = error ? 'error' : variant;

    // Generate unique ID if not provided
    const inputId = id || `input-${React.useId()}`;

    // Calculate character count
    const currentLength = value ? String(value).length : 0;
    const showCount = showCharacterCount && maxLength !== undefined;

    // Determine if we should show validation icons
    const showSuccessIcon = effectiveVariant === 'success' && !rightIcon;
    const showErrorIcon = effectiveVariant === 'error' && !rightIcon;

    // Determine the right icon to display
    const displayRightIcon = showSuccessIcon ? (
      <CheckCircle className="w-5 h-5 text-success-DEFAULT" />
    ) : showErrorIcon ? (
      <AlertCircle className="w-5 h-5 text-error-DEFAULT" />
    ) : rightIcon;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label 
            htmlFor={inputId} 
            className={cn(
              'text-sm font-medium text-text-primary',
              disabled && 'text-text-disabled'
            )}
          >
            {label}
            {required && <span className="text-error-DEFAULT ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2',
              disabled ? 'text-text-disabled' : 'text-text-secondary'
            )}>
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            value={value}
            className={cn(
              inputVariants({ variant: effectiveVariant as any, size: size as any, disabled }),
              leftIcon && 'pl-10',
              (rightIcon || showSuccessIcon || showErrorIcon) && 'pr-10',
              fullWidth && 'w-full',
              // Add shake animation on error (Requirement 8.8)
              error && 'animate-shake',
              className
            )}
            {...props}
          />

          {displayRightIcon && (
            <div className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              disabled ? 'text-text-disabled' : 'text-text-secondary'
            )}>
              {displayRightIcon}
            </div>
          )}
        </div>

        {(helperText || error || showCount) && (
          <div className="flex items-start justify-between gap-2">
            {(helperText || error) && (
              <p className={cn(
                'text-sm flex items-center gap-1',
                error ? 'text-error-DEFAULT' : 'text-text-secondary'
              )}>
                {error && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {error || helperText}
              </p>
            )}
            
            {showCount && (
              <p className={cn(
                'text-sm text-text-tertiary whitespace-nowrap',
                currentLength > maxLength! && 'text-error-DEFAULT'
              )}>
                {currentLength}/{maxLength}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

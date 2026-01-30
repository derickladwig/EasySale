import React from 'react';
import { buttonVariants } from '../../utils/variants';
import { cn } from '../../utils/classNames';
import { devLog } from '../../utils/devLog';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;

  /** Size of the button */
  size?: ButtonSize;

  /** Loading state - shows spinner and disables button */
  loading?: boolean;

  /** Icon to display on the left side */
  leftIcon?: React.ReactNode;

  /** Icon to display on the right side */
  rightIcon?: React.ReactNode;

  /** Full width button */
  fullWidth?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Button content */
  children?: React.ReactNode;

  /** ARIA label for accessibility (required for icon-only buttons) */
  'aria-label'?: string;
}

/**
 * Button Component
 *
 * A versatile button component with multiple variants, sizes, and states.
 * Supports loading states, icons, icon-only buttons, and full-width layouts.
 *
 * Requirements:
 * - 7.6: Support icon-only, text-only, and icon+text variants
 * - 18.4: Provide ARIA labels for icon-only buttons
 *
 * @example
 * // Primary button
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * @example
 * // Button with left icon
 * <Button variant="secondary" leftIcon={<Icon name="plus" />}>
 *   Add Item
 * </Button>
 *
 * @example
 * // Button with right icon
 * <Button variant="secondary" rightIcon={<Icon name="arrow-right" />}>
 *   Next
 * </Button>
 *
 * @example
 * // Icon-only button (requires aria-label for accessibility)
 * <Button variant="ghost" leftIcon={<Icon name="settings" />} aria-label="Settings" />
 *
 * @example
 * // Loading button
 * <Button variant="primary" loading>
 *   Saving...
 * </Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    
    // Determine if this is an icon-only button (Requirement 7.6)
    const isIconOnly = !children && (leftIcon || rightIcon);
    
    // Warn in development if icon-only button lacks aria-label (Requirement 18.4)
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && isIconOnly && !props['aria-label']) {
      devLog.warn(
        'Button: Icon-only buttons should have an aria-label for accessibility. ' +
        'Please add an aria-label prop to describe the button action.'
      );
    }

    /**
     * Handle button click with haptic feedback for touch devices
     * Requirement 7.9: Provide haptic feedback on touch devices
     */
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Provide haptic feedback on touch devices if available
      if ('vibrate' in navigator && !isDisabled) {
        // Short vibration (10ms) for tactile feedback
        navigator.vibrate(10);
      }
      
      // Call the original onClick handler if provided
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          buttonVariants({ variant: variant as any, size: size as any, disabled: isDisabled }),
          fullWidth && 'w-full',
          // Icon-only buttons get square/circular styling with equal padding (Requirement 7.6)
          isIconOnly && 'aspect-square p-0',
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Left icon with proper spacing (Requirement 7.6) */}
        {!loading && leftIcon && (
          <span className={cn(children && 'mr-2 -ml-1')}>
            {leftIcon}
          </span>
        )}

        {/* Button text content */}
        {children}

        {/* Right icon with proper spacing (Requirement 7.6) */}
        {!loading && rightIcon && (
          <span className={cn(children && 'ml-2 -mr-1')}>
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

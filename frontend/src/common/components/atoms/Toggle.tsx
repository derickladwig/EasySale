import React from 'react';
import { cn } from '../../utils/classNames';

export interface ToggleProps {
  /**
   * Whether the toggle is checked
   */
  checked: boolean;
  /**
   * Callback when toggle state changes
   */
  onChange: (checked: boolean) => void;
  /**
   * Label text for the toggle
   */
  label?: string;
  /**
   * Description text shown below the label
   */
  description?: string;
  /**
   * Whether the toggle is disabled
   */
  disabled?: boolean;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * ID for the input element
   */
  id?: string;
}

/**
 * Toggle component for boolean settings
 * 
 * Provides a visual switch interface for enabling/disabling features or settings.
 * Supports labels, descriptions, and different sizes.
 * 
 * @example
 * ```tsx
 * <Toggle
 *   checked={enabled}
 *   onChange={setEnabled}
 *   label="Enable Feature"
 *   description="Turn this feature on or off"
 * />
 * ```
 */
export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
  id,
}) => {
  const sizeClasses = {
    sm: {
      switch: 'w-9 h-5',
      thumb: 'h-4 w-4 after:h-4 after:w-4',
      translate: 'peer-checked:after:translate-x-4',
    },
    md: {
      switch: 'w-11 h-6',
      thumb: 'h-5 w-5 after:h-5 after:w-5',
      translate: 'peer-checked:after:translate-x-5',
    },
    lg: {
      switch: 'w-14 h-7',
      thumb: 'h-6 w-6 after:h-6 after:w-6',
      translate: 'peer-checked:after:translate-x-7',
    },
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  // If no label or description, render just the switch
  if (!label && !description) {
    return (
      <label className={cn('relative inline-flex items-center cursor-pointer', className)}>
        <input
          id={toggleId}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={cn(
            sizeClasses[size].switch,
            'bg-background-tertiary rounded-full peer',
            'peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20',
            'peer-checked:bg-primary-500',
            'transition-colors duration-200',
            disabled && 'opacity-50 cursor-not-allowed',
            sizeClasses[size].thumb,
            sizeClasses[size].translate,
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
            'after:bg-white after:border-border after:border after:rounded-full',
            'after:transition-all'
          )}
        />
      </label>
    );
  }

  // Render with label and/or description
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex-1">
        {label && (
          <label
            htmlFor={toggleId}
            className={cn(
              'block font-medium text-text-primary',
              size === 'sm' && 'text-sm',
              size === 'md' && 'text-base',
              size === 'lg' && 'text-lg',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
          >
            {label}
          </label>
        )}
        {description && (
          <p
            className={cn(
              'text-text-tertiary mt-1',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base',
              disabled && 'opacity-50'
            )}
          >
            {description}
          </p>
        )}
      </div>
      <label className={cn('relative inline-flex items-center', !disabled && 'cursor-pointer')}>
        <input
          id={toggleId}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={cn(
            sizeClasses[size].switch,
            'bg-background-tertiary rounded-full peer',
            'peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20',
            'peer-checked:bg-primary-500',
            'transition-colors duration-200',
            disabled && 'opacity-50 cursor-not-allowed',
            sizeClasses[size].thumb,
            sizeClasses[size].translate,
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
            'after:bg-white after:border-border after:border after:rounded-full',
            'after:transition-all'
          )}
        />
      </label>
    </div>
  );
};

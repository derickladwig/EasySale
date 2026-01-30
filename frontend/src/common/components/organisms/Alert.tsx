import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import { cn } from '../../utils/classNames';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  /** Alert variant */
  variant: AlertVariant;

  /** Alert title */
  title: string;

  /** Optional alert description */
  description?: string;

  /** Whether the alert can be dismissed */
  dismissible?: boolean;

  /** Callback when alert is dismissed */
  onDismiss?: () => void;

  /** Additional CSS classes */
  className?: string;
}

// Variant configurations
const variantConfig: Record<
  AlertVariant,
  {
    icon: typeof CheckCircle;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    textColor: string;
  }
> = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-success-900/20',
    borderColor: 'border-success-500',
    iconColor: 'text-success-500',
    textColor: 'text-success-100',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-error-900/20',
    borderColor: 'border-error-500',
    iconColor: 'text-error-500',
    textColor: 'text-error-100',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-warning-900/20',
    borderColor: 'border-warning-500',
    iconColor: 'text-warning-500',
    textColor: 'text-warning-100',
  },
  info: {
    icon: Info,
    bgColor: 'bg-info-900/20',
    borderColor: 'border-info-500',
    iconColor: 'text-info-500',
    textColor: 'text-info-100',
  },
};

/**
 * Alert Component
 *
 * A prominent notification component for displaying important messages.
 * Supports different variants and optional dismissal.
 *
 * @example
 * // Basic alert
 * <Alert
 *   variant="success"
 *   title="Success!"
 * />
 *
 * @example
 * // With description and dismissible
 * <Alert
 *   variant="error"
 *   title="Error occurred"
 *   description="Please check your input and try again"
 *   dismissible
 *   onDismiss={handleDismiss}
 * />
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant, title, description, dismissible = false, onDismiss, className }, ref) => {
    const config = variantConfig[variant];
    const IconComponent = config.icon;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border-l-4',
          config.bgColor,
          config.borderColor,
          className
        )}
      >
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          <Icon icon={IconComponent} size="md" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn('text-sm font-semibold mb-1', config.textColor)}>{title}</h3>
          {description && (
            <p className={cn('text-sm', config.textColor, 'opacity-90')}>{description}</p>
          )}
        </div>

        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 -mt-1 -mr-1',
              config.textColor,
              'hover:opacity-100 opacity-70'
            )}
            aria-label="Dismiss alert"
          >
            <Icon icon={X} size="sm" />
          </Button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

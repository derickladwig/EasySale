import React from 'react';
import { LucideIcon, Inbox, Search, AlertCircle } from 'lucide-react';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import { cn } from '../../utils/classNames';

export type EmptyStateVariant = 'default' | 'search' | 'error';

export interface EmptyStateProps {
  /** Empty state variant */
  variant?: EmptyStateVariant;

  /** Custom icon (overrides variant icon) */
  icon?: LucideIcon;

  /** Title text */
  title: string;

  /** Description text */
  description?: string;

  /** Action button text */
  actionText?: string;

  /** Action button click handler */
  onAction?: () => void;

  /** Additional CSS classes */
  className?: string;
}

// Variant configurations
const variantConfig: Record<EmptyStateVariant, { icon: LucideIcon; iconColor: string }> = {
  default: {
    icon: Inbox,
    iconColor: 'text-text-tertiary',
  },
  search: {
    icon: Search,
    iconColor: 'text-text-tertiary',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-error-500',
  },
};

/**
 * EmptyState Component
 *
 * A component for displaying empty states with optional actions.
 * Supports different variants for different contexts (no data, no results, error).
 *
 * @example
 * // Basic empty state
 * <EmptyState
 *   title="No items found"
 *   description="Get started by adding your first item"
 * />
 *
 * @example
 * // With action button
 * <EmptyState
 *   title="No customers yet"
 *   description="Start by adding your first customer"
 *   actionText="Add Customer"
 *   onAction={handleAddCustomer}
 * />
 *
 * @example
 * // Search variant
 * <EmptyState
 *   variant="search"
 *   title="No results found"
 *   description="Try adjusting your search terms"
 * />
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { variant = 'default', icon: customIcon, title, description, actionText, onAction, className },
    ref
  ) => {
    const config = variantConfig[variant];
    const IconComponent = customIcon || config.icon;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center',
          'text-center p-8',
          'min-h-[300px]',
          className
        )}
      >
        <div className={cn('mb-4', config.iconColor)}>
          <Icon icon={IconComponent} size="xl" aria-hidden="true" />
        </div>

        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>

        {description && <p className="text-sm text-text-secondary mb-6 max-w-md">{description}</p>}

        {actionText && onAction && (
          <Button onClick={onAction} variant="primary">
            {actionText}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

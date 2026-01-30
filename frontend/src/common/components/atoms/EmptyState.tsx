import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/classNames';
import { Button, ButtonProps } from './Button';
import { Icon } from './Icon';

export type EmptyStateVariant = 'default' | 'no-results' | 'error';

export interface EmptyStateProps {
  /** Icon to display (Lucide icon component) */
  icon: LucideIcon;

  /** Main heading text */
  heading: string;

  /** Description text providing context */
  description: string;

  /** Primary action button configuration */
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
    leftIcon?: React.ReactNode;
  };

  /** Visual variant of the empty state */
  variant?: EmptyStateVariant;

  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState Component
 *
 * Displays a helpful empty state when there's no data to show.
 * Includes an icon, heading, description, and optional action button.
 *
 * Requirements:
 * - 13.1: Display a relevant icon or illustration
 * - 13.2: Include a clear heading explaining the situation
 * - 13.3: Provide helpful description text
 * - 13.4: Offer a primary action button when applicable
 * - 13.5: Use muted colors to avoid drawing too much attention
 * - 13.6: Center content vertically and horizontally
 * - 13.7: Adapt to container size responsively
 *
 * @example
 * // Basic empty state
 * <EmptyState
 *   icon={Package}
 *   heading="No products found"
 *   description="Get started by adding your first product to the inventory."
 *   action={{
 *     label: "Add Product",
 *     onClick: handleAddProduct
 *   }}
 * />
 *
 * @example
 * // No results empty state
 * <EmptyState
 *   variant="no-results"
 *   icon={Search}
 *   heading="No results found"
 *   description="Try adjusting your search or filter criteria."
 * />
 *
 * @example
 * // Error empty state
 * <EmptyState
 *   variant="error"
 *   icon={AlertCircle}
 *   heading="Failed to load data"
 *   description="An error occurred while loading the data. Please try again."
 *   action={{
 *     label: "Retry",
 *     onClick: handleRetry,
 *     variant: "primary"
 *   }}
 * />
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      heading,
      description,
      action,
      variant = 'default',
      className,
    },
    ref
  ) => {
    // Determine icon color based on variant (Requirement 13.5: Use muted colors)
    const iconColor = {
      default: 'text-text-tertiary',
      'no-results': 'text-text-tertiary',
      error: 'text-error-DEFAULT',
    }[variant];

    return (
      <div
        ref={ref}
        className={cn(
          // Requirement 13.6: Center content vertically and horizontally
          'flex flex-col items-center justify-center',
          // Requirement 13.7: Adapt to container size responsively
          'min-h-[300px] p-8 text-center',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {/* Icon (Requirement 13.1: Display a relevant icon or illustration) */}
        <div className="mb-4">
          <Icon
            icon={icon}
            size="xl"
            className={cn(iconColor, 'opacity-60')}
            aria-hidden="true"
          />
        </div>

        {/* Heading (Requirement 13.2: Include a clear heading explaining the situation) */}
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          {heading}
        </h3>

        {/* Description (Requirement 13.3: Provide helpful description text) */}
        <p className="text-base text-text-secondary max-w-md mb-6">
          {description}
        </p>

        {/* Action Button (Requirement 13.4: Offer a primary action button when applicable) */}
        {action && (
          <Button
            variant={action.variant || 'primary'}
            onClick={action.onClick}
            leftIcon={action.leftIcon}
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

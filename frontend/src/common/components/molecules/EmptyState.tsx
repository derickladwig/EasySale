import React from 'react';
import { Button } from '../atoms/Button';
import { cn } from '../../utils/classNames';

export interface EmptyStateAction {
  /** Label text for the action button */
  label: string;

  /** Click handler for the action */
  onClick: () => void;

  /** Optional icon to display in the button */
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  /** Main title text */
  title: string;

  /** Optional description text providing more context */
  description?: string;

  /** Primary action button configuration */
  primaryAction?: EmptyStateAction;

  /** Optional secondary action button configuration */
  secondaryAction?: EmptyStateAction;

  /** Optional icon or illustration to display above the title */
  icon?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState Component
 *
 * Displays a helpful message when no data is available, following the Empty State Contract
 * for POS-friendly UX. Shows clear messaging with actionable buttons to guide users.
 *
 * Features:
 * - Clear title and optional description
 * - Primary and optional secondary action buttons
 * - Optional icon or illustration
 * - Keyboard accessible (Enter triggers primary action)
 * - Consistent styling across the application
 *
 * @example
 * // Basic empty state
 * <EmptyState
 *   title="No inventory found"
 *   description="Start by scanning items to receive or import your inventory"
 *   primaryAction={{ label: "Scan to receive", onClick: handleScan }}
 * />
 *
 * @example
 * // Empty state with icon and secondary action
 * <EmptyState
 *   title="No customers found"
 *   description="Create your first customer to get started"
 *   icon={<Icon icon={Users} size="xl" />}
 *   primaryAction={{ label: "Create customer", onClick: handleCreate }}
 *   secondaryAction={{ label: "Import customers", onClick: handleImport }}
 * />
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ title, description, primaryAction, secondaryAction, icon, className }, ref) => {
    // Handle keyboard events for accessibility
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Enter key triggers primary action if available
      if (event.key === 'Enter' && primaryAction) {
        event.preventDefault();
        primaryAction.onClick();
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center',
          'min-h-[400px] p-8 text-center',
          className
        )}
        onKeyDown={handleKeyDown}
        tabIndex={primaryAction ? 0 : undefined}
        role="status"
        aria-live="polite"
      >
        {/* Icon/Illustration */}
        {icon && (
          <div className="mb-6 text-text-tertiary" aria-hidden="true">
            {icon}
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-semibold text-text-secondary mb-2">{title}</h2>

        {/* Description */}
        {description && <p className="text-base text-text-tertiary mb-8 max-w-md">{description}</p>}

        {/* Action Buttons */}
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            {primaryAction && (
              <Button
                variant="primary"
                size="lg"
                onClick={primaryAction.onClick}
                leftIcon={primaryAction.icon}
                className="min-w-[200px]"
              >
                {primaryAction.label}
              </Button>
            )}

            {secondaryAction && (
              <Button
                variant="outline"
                size="lg"
                onClick={secondaryAction.onClick}
                leftIcon={secondaryAction.icon}
                className="min-w-[200px]"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

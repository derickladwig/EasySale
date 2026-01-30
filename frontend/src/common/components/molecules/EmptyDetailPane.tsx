import React from 'react';
import { cn } from '../../utils/classNames';

export interface KeyboardShortcut {
  /** The keyboard key or combination (e.g., "F3", "Ctrl+N", "Enter") */
  key: string;

  /** Description of what the shortcut does */
  description: string;
}

export interface EmptyDetailPaneProps {
  /** Main message to display */
  message: string;

  /** Optional array of keyboard shortcuts to display */
  shortcuts?: KeyboardShortcut[];

  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyDetailPane Component
 *
 * Displays a helpful message in the detail pane of list/detail layouts when no item is selected.
 * Shows keyboard shortcuts to help users navigate efficiently.
 *
 * Features:
 * - Clear messaging when no item is selected
 * - Keyboard shortcut hints for efficient navigation
 * - Accessible format with proper ARIA labels
 * - Consistent styling for list/detail layouts
 *
 * @example
 * // Basic empty detail pane
 * <EmptyDetailPane
 *   message="Select a customer to view details"
 * />
 *
 * @example
 * // With keyboard shortcuts
 * <EmptyDetailPane
 *   message="Select a product from the list"
 *   shortcuts={[
 *     { key: "F3", description: "Search products" },
 *     { key: "Ctrl+N", description: "Create new product" },
 *     { key: "↑↓", description: "Navigate list" }
 *   ]}
 * />
 */
export const EmptyDetailPane = React.forwardRef<HTMLDivElement, EmptyDetailPaneProps>(
  ({ message, shortcuts, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center',
          'h-full p-8 text-center',
          'bg-surface-base',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {/* Main message */}
        <p className="text-lg font-medium text-text-secondary mb-6">{message}</p>

        {/* Keyboard shortcuts */}
        {shortcuts && shortcuts.length > 0 && (
          <div className="space-y-3 w-full max-w-xs">
            <p className="text-sm text-text-tertiary uppercase tracking-wider font-medium mb-4">
              Keyboard Shortcuts
            </p>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-text-tertiary">{shortcut.description}</span>
                  <kbd
                    className={cn(
                      'px-2 py-1 rounded',
                      'bg-surface-elevated border border-border',
                      'text-text-secondary font-mono text-xs',
                      'shadow-sm'
                    )}
                    aria-label={`Press ${shortcut.key}`}
                  >
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

EmptyDetailPane.displayName = 'EmptyDetailPane';

import React from 'react';
import { Icon } from '../atoms/Icon';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Panel component for right-side context panels
 *
 * Features:
 * - Fixed right-side positioning
 * - Header with title and close button
 * - Body content area
 * - Optional footer
 * - Collapsible behavior
 * - Multiple width options
 * - Dark theme styling
 * - Slide-in animation
 */
export const Panel: React.FC<PanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  width = 'md',
  className = '',
}) => {
  const widthClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[32rem]',
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden"
          style={{ zIndex: 'var(--z-overlay-backdrop)' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        className={`
          fixed top-16 right-0 bottom-0 bg-background-primary border-l border-border
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          ${isCollapsed ? 'w-12' : widthClasses[width]}
          ${className}
        `}
        style={{ zIndex: 'var(--z-modal)' }}
        aria-label={title || 'Context panel'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          {!isCollapsed && (
            <>
              {title && <h2 className="text-lg font-semibold text-text-primary truncate">{title}</h2>}
              <div className="flex items-center gap-2">
                {collapsible && onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="p-1 text-text-secondary hover:text-white transition-colors"
                    aria-label="Collapse panel"
                  >
                    <Icon icon={ChevronRight} size="sm" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 text-text-secondary hover:text-white transition-colors"
                  aria-label="Close panel"
                >
                  <Icon icon={X} size="sm" />
                </button>
              </div>
            </>
          )}

          {isCollapsed && collapsible && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 text-text-secondary hover:text-white transition-colors mx-auto"
              aria-label="Expand panel"
            >
              <Icon icon={ChevronLeft} size="sm" />
            </button>
          )}
        </div>

        {/* Body */}
        {!isCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>

            {/* Footer */}
            {footer && <div className="px-4 py-3 border-t border-border">{footer}</div>}
          </>
        )}
      </aside>
    </>
  );
};

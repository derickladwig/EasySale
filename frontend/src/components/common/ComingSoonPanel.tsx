/**
 * ComingSoonPanel - Display panel for features that are not yet available
 * 
 * Used when a user clicks on a tab or nav item marked as 'comingSoon'.
 * Shows a friendly message without navigating to an empty page.
 */

import React from 'react';
import { Clock, Bell, ArrowLeft } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface ComingSoonPanelProps {
  /** Feature name */
  featureName: string;
  /** Optional description */
  description?: string;
  /** Optional expected availability */
  expectedDate?: string;
  /** Whether to show notification signup */
  showNotifyOption?: boolean;
  /** Callback when user wants to go back */
  onBack?: () => void;
  /** Callback when user wants to be notified */
  onNotify?: () => void;
  /** Visual variant */
  variant?: 'inline' | 'modal' | 'fullPage';
}

// ============================================
// Main Component
// ============================================

export const ComingSoonPanel: React.FC<ComingSoonPanelProps> = ({
  featureName,
  description,
  expectedDate,
  showNotifyOption = false,
  onBack,
  onNotify,
  variant = 'inline',
}) => {
  const containerClasses = {
    inline: 'p-6 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg border border-secondary-200 dark:border-secondary-700',
    modal: 'p-8 bg-white dark:bg-secondary-900 rounded-xl shadow-xl max-w-md mx-auto',
    fullPage: 'flex-1 flex items-center justify-center p-8',
  };

  const content = (
    <div className={`text-center ${variant === 'fullPage' ? 'max-w-md' : ''}`}>
      {/* Icon */}
      <div className="mx-auto w-16 h-16 rounded-full bg-info-100 dark:bg-info-900/30 flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-info-600 dark:text-info-400" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-text-primary dark:text-white mb-2">
        {featureName}
      </h3>

      {/* Status Badge */}
      <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 mb-4">
        Coming Soon
      </span>

      {/* Description */}
      {description && (
        <p className="text-text-secondary dark:text-secondary-400 mb-4">
          {description}
        </p>
      )}

      {/* Expected Date */}
      {expectedDate && (
        <p className="text-sm text-text-tertiary dark:text-secondary-500 mb-6">
          Expected: {expectedDate}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        )}
        {showNotifyOption && onNotify && (
          <button
            onClick={onNotify}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-accent-foreground bg-accent rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Bell className="w-4 h-4" />
            Notify Me
          </button>
        )}
      </div>
    </div>
  );

  if (variant === 'fullPage') {
    return (
      <div className={containerClasses[variant]}>
        {content}
      </div>
    );
  }

  return (
    <div className={containerClasses[variant]}>
      {content}
    </div>
  );
};

// ============================================
// Modal Wrapper
// ============================================

export interface ComingSoonModalProps extends ComingSoonPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  onClose,
  ...panelProps
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        style={{ zIndex: 'var(--z-modal-backdrop)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="relative" style={{ zIndex: 'var(--z-modal)' }}>
        <ComingSoonPanel 
          {...panelProps} 
          variant="modal" 
          onBack={onClose}
        />
      </div>
    </div>
  );
};

export default ComingSoonPanel;

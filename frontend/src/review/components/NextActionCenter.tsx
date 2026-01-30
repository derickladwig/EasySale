import React from 'react';
import { AlertCircle, CheckCircle, Clock, Upload } from 'lucide-react';
import { DocumentStats } from '../hooks/useReviewApi';

interface NextActionCenterProps {
  stats: DocumentStats;
  onAction: (action: 'reviewFailed' | 'reviewCases' | 'checkProcessing' | 'upload') => void;
}

interface ActionItem {
  priority: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: 'reviewFailed' | 'reviewCases' | 'checkProcessing' | 'upload';
  actionLabel: string;
  variant: 'error' | 'warning' | 'info' | 'success';
}

export const NextActionCenter: React.FC<NextActionCenterProps> = ({ stats, onAction }) => {
  // Determine the highest priority action based on queue state
  const getNextActions = (): ActionItem[] => {
    const actions: ActionItem[] = [];

    // Priority 1: Failed cases (highest priority)
    if (stats.failed > 0) {
      actions.push({
        priority: 1,
        icon: <AlertCircle className="w-5 h-5" />,
        title: 'Failed Documents Need Attention',
        description: `${stats.failed} document${stats.failed !== 1 ? 's' : ''} failed processing and need to be reviewed or retried.`,
        action: 'reviewFailed',
        actionLabel: 'Review Failed',
        variant: 'error',
      });
    }

    // Priority 2: Cases needing review
    if (stats.needsReview > 0) {
      actions.push({
        priority: 2,
        icon: <CheckCircle className="w-5 h-5" />,
        title: 'Cases Ready for Review',
        description: `${stats.needsReview} case${stats.needsReview !== 1 ? 's' : ''} ${stats.needsReview !== 1 ? 'are' : 'is'} waiting for review and approval.`,
        action: 'reviewCases',
        actionLabel: 'Start Reviewing',
        variant: 'warning',
      });
    }

    // Priority 3: Processing cases
    if (stats.processing > 0) {
      actions.push({
        priority: 3,
        icon: <Clock className="w-5 h-5" />,
        title: 'Documents Processing',
        description: `${stats.processing} document${stats.processing !== 1 ? 's' : ''} ${stats.processing !== 1 ? 'are' : 'is'} currently being processed.`,
        action: 'checkProcessing',
        actionLabel: 'View Status',
        variant: 'info',
      });
    }

    // Priority 4: Upload new documents (default when queue is empty or all handled)
    if (stats.failed === 0 && stats.needsReview === 0 && stats.processing === 0) {
      actions.push({
        priority: 4,
        icon: <Upload className="w-5 h-5" />,
        title: 'All Caught Up!',
        description: 'No pending cases. Upload new documents to get started.',
        action: 'upload',
        actionLabel: 'Upload Documents',
        variant: 'success',
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  };

  const actions = getNextActions();
  const primaryAction = actions[0];

  if (!primaryAction) {
    return null;
  }

  const variantStyles = {
    error: {
      bg: 'bg-error-900/20',
      border: 'border-error-500/30',
      iconColor: 'text-error-400',
      titleColor: 'text-error-300',
      descColor: 'text-error-400/80',
      buttonBg: 'bg-error-600 hover:bg-error-700',
      buttonText: 'text-white',
    },
    warning: {
      bg: 'bg-warning-900/20',
      border: 'border-warning-500/30',
      iconColor: 'text-warning-400',
      titleColor: 'text-warning-300',
      descColor: 'text-warning-400/80',
      buttonBg: 'bg-warning-600 hover:bg-warning-700',
      buttonText: 'text-white',
    },
    info: {
      bg: 'bg-primary-900/20',
      border: 'border-primary-500/30',
      iconColor: 'text-primary-400',
      titleColor: 'text-primary-300',
      descColor: 'text-primary-400/80',
      buttonBg: 'bg-primary-600 hover:bg-primary-700',
      buttonText: 'text-white',
    },
    success: {
      bg: 'bg-success-900/20',
      border: 'border-success-500/30',
      iconColor: 'text-success-400',
      titleColor: 'text-success-300',
      descColor: 'text-success-400/80',
      buttonBg: 'bg-success-600 hover:bg-success-700',
      buttonText: 'text-white',
    },
  };

  const styles = variantStyles[primaryAction.variant];

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${styles.iconColor}`}>
          {primaryAction.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${styles.titleColor} mb-1`}>
            {primaryAction.title}
          </h3>
          <p className={`text-sm ${styles.descColor} mb-3`}>
            {primaryAction.description}
          </p>
          <button
            onClick={() => onAction(primaryAction.action)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${styles.buttonBg} ${styles.buttonText}`}
          >
            {primaryAction.actionLabel}
          </button>
        </div>
      </div>

      {/* Show secondary actions if available */}
      {actions.length > 1 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-text-tertiary mb-2">Also available:</p>
          <div className="flex flex-wrap gap-2">
            {actions.slice(1).map((action, index) => (
              <button
                key={index}
                onClick={() => onAction(action.action)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-surface-elevated text-text-secondary hover:bg-surface-overlay hover:text-white transition-colors"
              >
                {action.actionLabel}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

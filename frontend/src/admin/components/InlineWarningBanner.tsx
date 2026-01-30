import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@common/components/atoms';

export interface InlineWarningBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function InlineWarningBanner({
  message,
  actionLabel,
  onAction,
  dismissible = false,
  onDismiss,
}: InlineWarningBannerProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-warning-50 border border-warning-200 rounded-lg">
      <div className="flex items-start gap-3 flex-1">
        <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-warning-800">{message}</p>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="secondary" size="sm">
            {actionLabel}
          </Button>
        )}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-warning-600 hover:text-warning-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

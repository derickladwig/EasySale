import React from 'react';
import { WifiOff, X } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface OfflineBannerProps {
  /** Whether the banner is visible */
  isVisible?: boolean;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Custom message to display */
  message?: string;
  /** Whether to show the close button */
  showClose?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * OfflineBanner Component
 *
 * Displays a prominent banner when the application is offline.
 * Requirement 14.8: Display offline banner when offline
 *
 * @example
 * // Basic offline banner
 * <OfflineBanner isVisible={isOffline} />
 *
 * @example
 * // With custom message and close button
 * <OfflineBanner 
 *   isVisible={isOffline} 
 *   message="Connection lost. Working in offline mode."
 *   showClose
 *   onClose={() => setShowBanner(false)}
 * />
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isVisible = false,
  onClose,
  message = 'You are currently offline. Changes will be synced when connection is restored.',
  showClose = false,
  className,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-toast',
        'bg-status-offline text-white',
        'px-4 py-3 shadow-lg',
        'animate-slide-in-from-top',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WifiOff size={20} className="flex-shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Close offline banner"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

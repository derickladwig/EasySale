/**
 * LoadingContainer Component
 *
 * A container component that manages loading, error, and content states.
 * Provides smooth transitions and appropriate feedback for async operations.
 *
 * Requirements:
 * - 12.7: Display loading text for long operations
 * - 12.8: Fade in content when loading completes
 * - 12.9: Display error state on failure
 * - 12.10: Handle error state display appropriately
 *
 * @example
 * // Basic usage with loading state
 * <LoadingContainer isLoading={isLoading}>
 *   <YourContent />
 * </LoadingContainer>
 *
 * @example
 * // With error state
 * <LoadingContainer
 *   isLoading={isLoading}
 *   error={error}
 *   onRetry={handleRetry}
 * >
 *   <YourContent />
 * </LoadingContainer>
 *
 * @example
 * // With custom loading text for long operations
 * <LoadingContainer
 *   isLoading={isLoading}
 *   loadingText="Processing your request..."
 *   showLoadingTextDelay={2000}
 * >
 *   <YourContent />
 * </LoadingContainer>
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/classNames';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from '../atoms/Button';

export interface LoadingContainerProps {
  /** Whether content is currently loading */
  isLoading: boolean;

  /** Error object or message if loading failed */
  error?: Error | string | null;

  /** Content to display when loaded */
  children: React.ReactNode;

  /** Optional loading text to display */
  loadingText?: string;

  /** Delay in ms before showing loading text (for long operations) */
  showLoadingTextDelay?: number;

  /** Optional error title */
  errorTitle?: string;

  /** Optional error message override */
  errorMessage?: string;

  /** Callback when retry button is clicked */
  onRetry?: () => void;

  /** Whether to show retry button on error */
  showRetry?: boolean;

  /** Minimum height for the container */
  minHeight?: string | number;

  /** Additional CSS classes */
  className?: string;

  /** Spinner size */
  spinnerSize?: 'sm' | 'md' | 'lg';

  /** Spinner variant */
  spinnerVariant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

/**
 * LoadingContainer Component
 *
 * Manages loading, error, and content display states with smooth transitions.
 */
export const LoadingContainer: React.FC<LoadingContainerProps> = ({
  isLoading,
  error,
  children,
  loadingText = 'Loading...',
  showLoadingTextDelay = 2000,
  errorTitle = 'Error',
  errorMessage,
  onRetry,
  showRetry = true,
  minHeight = '200px',
  className,
  spinnerSize = 'lg',
  spinnerVariant = 'primary',
}) => {
  const [showLoadingText, setShowLoadingText] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  // Show loading text after delay for long operations (Requirement 12.7)
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingText(true);
      }, showLoadingTextDelay);

      return () => {
        clearTimeout(timer);
        setShowLoadingText(false);
      };
    } else {
      setShowLoadingText(false);
    }
  }, [isLoading, showLoadingTextDelay]);

  // Fade in content when loading completes (Requirement 12.8)
  useEffect(() => {
    if (!isLoading && !error) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setContentVisible(true);
      }, 50);

      return () => clearTimeout(timer);
    } else {
      setContentVisible(false);
    }
  }, [isLoading, error]);

  // Get error message
  const getErrorMessage = (): string => {
    if (errorMessage) return errorMessage;
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred. Please try again.';
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center w-full',
          className
        )}
        style={{ minHeight }}
      >
        <LoadingSpinner
          size={spinnerSize}
          variant={spinnerVariant}
          text={showLoadingText ? loadingText : undefined}
          centered
        />
      </div>
    );
  }

  // Error state (Requirements 12.9, 12.10)
  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center w-full p-6',
          className
        )}
        style={{ minHeight }}
      >
        <div className="flex flex-col items-center text-center max-w-md space-y-4">
          {/* Error icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-error-DEFAULT/10">
            <AlertCircle className="w-8 h-8 text-error-DEFAULT" />
          </div>

          {/* Error title */}
          <h3 className="text-lg font-semibold text-text-primary">
            {errorTitle}
          </h3>

          {/* Error message */}
          <p className="text-sm text-text-secondary">
            {getErrorMessage()}
          </p>

          {/* Retry button */}
          {showRetry && onRetry && (
            <Button
              variant="outline"
              size="md"
              onClick={onRetry}
              leftIcon={<RefreshCw size={16} />}

            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Content state with fade-in animation (Requirement 12.8)
  return (
    <div
      className={cn(
        'w-full transition-opacity duration-300',
        contentVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
};

export default LoadingContainer;

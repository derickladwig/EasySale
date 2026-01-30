/**
 * ErrorState Component
 * 
 * Displays error messages with optional technical details and retry action.
 * Provides consistent error handling across all pages.
 * 
 * Requirements: 16.3, 16.5
 */

import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorStateProps {
  /** User-friendly error message */
  message: string;
  /** Optional technical details (collapsible) */
  details?: string;
  /** Retry action callback */
  onRetry: () => void;
  /** Optional custom className */
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message, 
  details, 
  onRetry,
  className = '' 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="text-error-400 mb-4">
        <AlertCircle className="w-16 h-16" />
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
      
      <p className="text-error-400 mb-4 max-w-md">{message}</p>
      
      {details && (
        <div className="mb-6 w-full max-w-2xl">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-secondary mx-auto mb-2 transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide technical details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show technical details
              </>
            )}
          </button>
          
          {showDetails && (
            <pre className="mt-2 p-4 bg-surface-base rounded text-xs text-text-secondary overflow-auto text-left max-h-64 border border-border">
              {details}
            </pre>
          )}
        </div>
      )}
      
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
};

import { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Helper function to safely get error message
const getErrorMessage = (error: Error | null): string => {
  if (!error) {
    return 'An unexpected error occurred';
  }
  
  // Check for React-specific error codes
  const message = error.message || '';
  
  // React error #520: Rendered more hooks than during the previous render
  if (message.includes('520') || message.includes('more hooks')) {
    return 'A rendering error occurred. This may be due to a component update issue. Please refresh the page.';
  }
  
  // React error #300: Objects are not valid as a React child
  if (message.includes('300') || message.includes('Objects are not valid as a React child')) {
    return 'A display error occurred. Some data could not be rendered properly. Please refresh the page.';
  }
  
  // Return the original message for other errors
  return message;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    logError('ErrorBoundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-4 dark:bg-background">
          <div className="max-w-md w-full bg-surface-elevated rounded-lg shadow-lg p-6 dark:bg-surface border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-error-500/20 rounded-full flex items-center justify-center">
                <span className="text-error-500 text-2xl">⚠</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
                <p className="text-sm text-text-secondary">An unexpected error occurred</p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-4 p-3 bg-surface rounded border border-border">
                <p className="text-sm font-mono text-text-secondary">{getErrorMessage(this.state.error)}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-surface-elevated text-text-primary rounded hover:bg-surface border border-border transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

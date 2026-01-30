/**
 * Error Callout Component
 *
 * Displays error messages with inline and callout modes.
 * Supports action buttons (Retry, Diagnostics) and different severity levels.
 *
 * Validates Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { useLoginTheme } from '../theme/LoginThemeProvider';

// ============================================================================
// Types
// ============================================================================

type ErrorSeverity = 'error' | 'warning' | 'info';
type ErrorPresentation = 'inline' | 'callout';

interface ErrorCalloutProps {
  message: string;
  details?: string;
  severity?: ErrorSeverity;
  presentation?: ErrorPresentation;
  showRetry?: boolean;
  showDiagnostics?: boolean;
  isOffline?: boolean;
  onRetry?: () => void;
  onDiagnostics?: () => void;
}

// ============================================================================
// Error Callout Component
// ============================================================================

export function ErrorCallout({
  message,
  details,
  severity = 'error',
  presentation = 'inline',
  showRetry = false,
  showDiagnostics = false,
  isOffline = false,
  onRetry,
  onDiagnostics,
}: ErrorCalloutProps) {
  const { config } = useLoginTheme();
  const { tokens } = config;

  // Determine severity color
  const getSeverityColor = () => {
    switch (severity) {
      case 'error':
        return tokens.colors.status.error;
      case 'warning':
        return tokens.colors.status.warning;
      case 'info':
        return tokens.colors.status.info;
      default:
        return tokens.colors.status.error;
    }
  };

  const severityColor = getSeverityColor();

  // Determine presentation styles
  const isInline = presentation === 'inline';
  const containerStyles: React.CSSProperties = isInline
    ? {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.scale.sm,
        padding: `${tokens.spacing.scale.sm} ${tokens.spacing.scale.md}`,
        backgroundColor: `${severityColor}15`, // 15 = ~8% opacity in hex
        border: `1px solid ${severityColor}`,
        borderRadius: tokens.radius.input,
        fontSize: tokens.typography.fontSize.sm,
      }
    : {
        padding: tokens.spacing.scale.lg,
        backgroundColor: tokens.colors.surface.secondary,
        border: `2px solid ${severityColor}`,
        borderRadius: tokens.radius.card,
        boxShadow: tokens.shadows.elevation.md,
      };

  return (
    <div
      className={`error-callout error-callout--${presentation} error-callout--${severity}`}
      style={containerStyles}
      role="alert"
      aria-live="polite"
      data-testid="error-callout"
      data-presentation={presentation}
      data-severity={severity}
    >
      {/* Offline Indicator */}
      {isOffline && (
        <div
          className="error-callout__offline-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.scale.xs,
            marginBottom: isInline ? 0 : tokens.spacing.scale.sm,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.status.warning,
          }}
          data-testid="offline-indicator"
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: tokens.colors.status.warning,
            }}
          />
          <span>Offline</span>
        </div>
      )}

      {/* Error Icon */}
      <div
        className="error-callout__icon"
        style={{
          flexShrink: 0,
          width: isInline ? '16px' : '24px',
          height: isInline ? '16px' : '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: severityColor,
          fontWeight: tokens.typography.fontWeight.bold,
        }}
        data-testid="error-icon"
      >
        {severity === 'error' && '✕'}
        {severity === 'warning' && '⚠'}
        {severity === 'info' && 'ℹ'}
      </div>

      {/* Error Content */}
      <div
        className="error-callout__content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.scale.xs,
        }}
      >
        {/* Error Message */}
        <div
          className="error-callout__message"
          style={{
            fontSize: isInline ? tokens.typography.fontSize.sm : tokens.typography.fontSize.base,
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.text.primary,
          }}
          data-testid="error-message"
        >
          {message}
        </div>

        {/* Error Details */}
        {details && (
          <div
            className="error-callout__details"
            style={{
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.text.secondary,
              fontFamily: tokens.typography.fontFamily.monospace,
            }}
            data-testid="error-details"
          >
            {details}
          </div>
        )}

        {/* Action Buttons */}
        {(showRetry || showDiagnostics) && (
          <div
            className="error-callout__actions"
            style={{
              display: 'flex',
              gap: tokens.spacing.scale.sm,
              marginTop: tokens.spacing.scale.xs,
            }}
            data-testid="error-actions"
          >
            {showRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="error-callout__action-button error-callout__action-button--retry"
                style={{
                  padding: `${tokens.spacing.scale.xs} ${tokens.spacing.scale.md}`,
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  color: tokens.colors.text.inverse,
                  backgroundColor: severityColor,
                  border: 'none',
                  borderRadius: tokens.radius.button,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                }}
                data-testid="retry-button"
              >
                Retry
              </button>
            )}

            {showDiagnostics && (
              <button
                type="button"
                onClick={onDiagnostics}
                className="error-callout__action-button error-callout__action-button--diagnostics"
                style={{
                  padding: `${tokens.spacing.scale.xs} ${tokens.spacing.scale.md}`,
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  color: severityColor,
                  backgroundColor: 'transparent',
                  border: `1px solid ${severityColor}`,
                  borderRadius: tokens.radius.button,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                data-testid="diagnostics-button"
              >
                Diagnostics
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .error-callout__action-button:hover {
          opacity: 0.9;
        }

        .error-callout__action-button:active {
          opacity: 0.8;
        }

        .error-callout__action-button--diagnostics:hover {
          background-color: ${severityColor}15;
        }

        .error-callout__action-button:focus-visible {
          outline: 2px solid ${tokens.colors.border.focus};
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { ErrorCalloutProps, ErrorSeverity, ErrorPresentation };

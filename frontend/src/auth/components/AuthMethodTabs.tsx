/**
 * Auth Method Tabs Component
 *
 * Tab switcher for authentication methods (PIN / Password / Badge).
 * Shows/hides tabs based on configuration.
 *
 * Validates Requirements 5.4
 */

import type { AuthMethod } from '../theme/types';

// ============================================================================
// Auth Method Tabs Component
// ============================================================================

interface AuthMethodTabsProps {
  methods: AuthMethod[];
  currentMethod: AuthMethod;
  onMethodChange: (method: AuthMethod) => void;
  disabled?: boolean;
}

export function AuthMethodTabs({
  methods,
  currentMethod,
  onMethodChange,
  disabled = false,
}: AuthMethodTabsProps) {
  // Don't render if only one method is available
  if (methods.length <= 1) {
    return null;
  }

  const getMethodLabel = (method: AuthMethod): string => {
    switch (method) {
      case 'password':
        return 'Password';
      case 'pin':
        return 'PIN';
      case 'badge':
        return 'Badge';
      default:
        return method;
    }
  };

  return (
    <div
      className="auth-method-tabs"
      role="tablist"
      aria-label="Authentication methods"
      data-testid="auth-method-tabs"
    >
      {methods.map((method) => (
        <button
          key={method}
          type="button"
          role="tab"
          aria-selected={currentMethod === method}
          aria-controls={`auth-panel-${method}`}
          onClick={() => onMethodChange(method)}
          disabled={disabled}
          className={`auth-method-tabs__tab ${currentMethod === method ? 'auth-method-tabs__tab--active' : ''}`}
          data-testid={`auth-method-tab-${method}`}
        >
          {getMethodLabel(method)}
        </button>
      ))}

      <style>{`
        .auth-method-tabs {
          display: flex;
          gap: var(--login-space-xs, 0.25rem);
          margin-bottom: var(--login-space-md, 1rem);
          border-bottom: 1px solid var(--login-border-default, #334155);
        }

        .auth-method-tabs__tab {
          flex: 1;
          padding: var(--login-space-sm, 0.5rem) var(--login-space-md, 1rem);
          font-size: var(--login-text-sm, 0.875rem);
          font-weight: var(--login-font-medium, 500);
          color: var(--login-text-secondary, #cbd5e1);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .auth-method-tabs__tab:hover:not(:disabled) {
          color: var(--login-text-primary, #f8fafc);
          background: rgba(255, 255, 255, 0.05);
        }

        .auth-method-tabs__tab--active {
          color: var(--login-accent-primary, #14b8a6);
          border-bottom-color: var(--login-accent-primary, #14b8a6);
        }

        .auth-method-tabs__tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-method-tabs__tab:focus-visible {
          outline: 2px solid var(--login-border-focus, #60a5fa);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { AuthMethodTabsProps };

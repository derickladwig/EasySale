/**
 * Demo Accounts Accordion Component
 *
 * Displays demo accounts in a collapsible section.
 * Shows only when demo accounts are configured.
 *
 * Validates Requirements 5.7
 */

import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface DemoAccount {
  username: string;
  password: string;
  role: string;
  description?: string;
}

interface DemoAccountsAccordionProps {
  accounts: DemoAccount[];
  onAccountSelect?: (account: DemoAccount) => void;
  disabled?: boolean;
}

// ============================================================================
// Demo Accounts Accordion Component
// ============================================================================

export function DemoAccountsAccordion({
  accounts,
  onAccountSelect,
  disabled = false,
}: DemoAccountsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no accounts provided
  if (!accounts || accounts.length === 0) {
    return null;
  }

  const handleAccountClick = (account: DemoAccount) => {
    if (!disabled && onAccountSelect) {
      onAccountSelect(account);
    }
  };

  return (
    <div className="demo-accounts-accordion" data-testid="demo-accounts-accordion">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className="demo-accounts-accordion__toggle"
        aria-expanded={isExpanded}
        aria-controls="demo-accounts-list"
        data-testid="demo-accounts-toggle"
      >
        <span className="demo-accounts-accordion__toggle-text">Demo Accounts</span>
        <span className="demo-accounts-accordion__toggle-icon">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div
          id="demo-accounts-list"
          className="demo-accounts-accordion__content"
          data-testid="demo-accounts-list"
        >
          {accounts.map((account, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleAccountClick(account)}
              disabled={disabled}
              className="demo-accounts-accordion__account"
              data-testid={`demo-account-${index}`}
            >
              <div className="demo-accounts-accordion__account-header">
                <span className="demo-accounts-accordion__account-username">
                  {account.username}
                </span>
                <span className="demo-accounts-accordion__account-role">{account.role}</span>
              </div>
              {account.description && (
                <div className="demo-accounts-accordion__account-description">
                  {account.description}
                </div>
              )}
              <div className="demo-accounts-accordion__account-password">
                Password: {account.password}
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .demo-accounts-accordion {
          margin-top: var(--login-space-lg, 1.5rem);
          border: 1px solid var(--login-border-default, #334155);
          border-radius: var(--login-radius-input, 4px);
          overflow: hidden;
        }

        .demo-accounts-accordion__toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--login-space-sm, 0.5rem) var(--login-space-md, 1rem);
          font-size: var(--login-text-sm, 0.875rem);
          font-weight: var(--login-font-medium, 500);
          color: var(--login-text-secondary, #cbd5e1);
          background-color: rgba(255, 255, 255, 0.03);
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .demo-accounts-accordion__toggle:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.05);
        }

        .demo-accounts-accordion__toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .demo-accounts-accordion__toggle-icon {
          font-size: var(--login-text-xs, 0.75rem);
          transition: transform 0.2s ease;
        }

        .demo-accounts-accordion__content {
          display: flex;
          flex-direction: column;
          gap: var(--login-space-xs, 0.25rem);
          padding: var(--login-space-sm, 0.5rem);
          background-color: rgba(0, 0, 0, 0.2);
        }

        .demo-accounts-accordion__account {
          display: flex;
          flex-direction: column;
          gap: var(--login-space-xs, 0.25rem);
          padding: var(--login-space-sm, 0.5rem) var(--login-space-md, 1rem);
          text-align: left;
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--login-border-default, #334155);
          border-radius: var(--login-radius-input, 4px);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .demo-accounts-accordion__account:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.05);
          border-color: var(--login-accent-primary, #14b8a6);
        }

        .demo-accounts-accordion__account:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .demo-accounts-accordion__account-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .demo-accounts-accordion__account-username {
          font-size: var(--login-text-sm, 0.875rem);
          font-weight: var(--login-font-semibold, 600);
          color: var(--login-text-primary, #f8fafc);
        }

        .demo-accounts-accordion__account-role {
          font-size: var(--login-text-xs, 0.75rem);
          font-weight: var(--login-font-medium, 500);
          color: var(--login-accent-primary, #14b8a6);
          padding: 2px 8px;
          background-color: rgba(20, 184, 166, 0.1);
          border-radius: var(--login-radius-pill, 9999px);
        }

        .demo-accounts-accordion__account-description {
          font-size: var(--login-text-xs, 0.75rem);
          color: var(--login-text-secondary, #cbd5e1);
        }

        .demo-accounts-accordion__account-password {
          font-size: var(--login-text-xs, 0.75rem);
          font-family: var(--login-font-monospace, monospace);
          color: var(--login-text-tertiary, #94a3b8);
        }

        .demo-accounts-accordion__toggle:focus-visible,
        .demo-accounts-accordion__account:focus-visible {
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

export type { DemoAccount, DemoAccountsAccordionProps };

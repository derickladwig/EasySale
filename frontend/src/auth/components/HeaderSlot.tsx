/**
 * Header Slot Component
 *
 * Displays company logo, name, environment selector, and optional help/settings icons.
 *
 * Validates Requirements 9.1, 9.2, 9.6
 */

import { useLoginTheme } from '../theme/LoginThemeProvider';
import { LogoWithFallback } from '@common/components/atoms/LogoWithFallback';

// ============================================================================
// Types
// ============================================================================

type Environment = 'demo' | 'production';

interface HeaderSlotProps {
  companyName: string;
  logoUrl?: string;
  shortName?: string;
  icon?: string;
  currentEnvironment?: Environment;
  showEnvironmentSelector?: boolean;
  showHelpIcon?: boolean;
  showSettingsIcon?: boolean;
  onEnvironmentChange?: (environment: Environment) => void;
  onHelpClick?: () => void;
  onSettingsClick?: () => void;
}

// ============================================================================
// Header Slot Component
// ============================================================================

export function HeaderSlot({
  companyName,
  logoUrl,
  shortName,
  icon,
  currentEnvironment = 'production',
  showEnvironmentSelector = false,
  showHelpIcon = false,
  showSettingsIcon = false,
  onEnvironmentChange,
  onHelpClick,
  onSettingsClick,
}: HeaderSlotProps) {
  const { config } = useLoginTheme();
  const { tokens } = config;

  return (
    <header
      className="header-slot"
      data-testid="header-slot"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${tokens.spacing.scale.md} ${tokens.spacing.scale.lg}`,
        backgroundColor: tokens.colors.surface.primary,
        borderBottom: `1px solid ${tokens.colors.border.default}`,
      }}
    >
      {/* Left: Logo and Company Name */}
      <div
        className="header-slot__branding"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.scale.md,
        }}
        data-testid="header-branding"
      >
        <LogoWithFallback
          logoUrl={logoUrl}
          companyName={companyName}
          shortName={shortName}
          icon={icon}
          size="md"
          imgClassName="header-slot__logo"
          testId="header-logo"
        />
        <h1
          className="header-slot__company-name"
          style={{
            margin: 0,
            fontSize: tokens.typography.fontSize.lg,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.primary,
          }}
          data-testid="header-company-name"
        >
          {companyName}
        </h1>
      </div>

      {/* Right: Environment Selector and Icons */}
      <div
        className="header-slot__actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.scale.md,
        }}
        data-testid="header-actions"
      >
        {/* Environment Selector */}
        {showEnvironmentSelector && (
          <div className="header-slot__environment-selector" data-testid="environment-selector">
            <select
              value={currentEnvironment}
              onChange={(e) => onEnvironmentChange?.(e.target.value as Environment)}
              className="header-slot__environment-select"
              style={{
                padding: `${tokens.spacing.scale.xs} ${tokens.spacing.scale.sm}`,
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.text.primary,
                backgroundColor: tokens.colors.surface.secondary,
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.radius.pill,
                cursor: 'pointer',
                outline: 'none',
              }}
              data-testid="environment-select"
              aria-label="Select environment"
            >
              <option value="demo">Demo</option>
              <option value="production">Production</option>
            </select>
          </div>
        )}

        {/* Help Icon */}
        {showHelpIcon && (
          <button
            type="button"
            onClick={onHelpClick}
            className="header-slot__icon-button header-slot__icon-button--help"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              padding: 0,
              fontSize: tokens.typography.fontSize.lg,
              color: tokens.colors.text.secondary,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: tokens.radius.button,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
            data-testid="help-button"
            aria-label="Help"
          >
            ?
          </button>
        )}

        {/* Settings Icon */}
        {showSettingsIcon && (
          <button
            type="button"
            onClick={onSettingsClick}
            className="header-slot__icon-button header-slot__icon-button--settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              padding: 0,
              fontSize: tokens.typography.fontSize.lg,
              color: tokens.colors.text.secondary,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: tokens.radius.button,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
            data-testid="settings-button"
            aria-label="Settings"
          >
            ⚙
          </button>
        )}
      </div>

      <style>{`
        .header-slot__environment-select:hover {
          background-color: ${tokens.colors.surface.tertiary};
        }

        .header-slot__environment-select:focus {
          border-color: ${tokens.colors.border.focus};
          box-shadow: 0 0 0 2px ${tokens.colors.border.focus}33;
        }

        .header-slot__icon-button:hover {
          background-color: ${tokens.colors.surface.secondary};
          color: ${tokens.colors.text.primary};
        }

        .header-slot__icon-button:active {
          background-color: ${tokens.colors.surface.tertiary};
        }

        .header-slot__icon-button:focus-visible {
          outline: 2px solid ${tokens.colors.border.focus};
          outline-offset: 2px;
        }
      `}</style>
    </header>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { HeaderSlotProps, Environment };

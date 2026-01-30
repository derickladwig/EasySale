/**
 * Auth Card Component
 *
 * Authentication card with configurable elevation, blur, radius, padding.
 * Supports glassmorphism styling, credential inputs, and submit button.
 *
 * Validates Requirements 5.1, 5.2, 5.3
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useLoginTheme } from '../theme/LoginThemeProvider';
import { AuthMethodTabs } from './AuthMethodTabs';
import { StoreStationPicker } from './StoreStationPicker';
import { DeviceIdentityRow } from './DeviceIdentityRow';
import { DemoAccountsAccordion, type DemoAccount } from './DemoAccountsAccordion';
import { useStores } from '../../admin/hooks/useStores';
import { useStations } from '../../admin/hooks/useStations';
import type { Credentials, AuthMethod } from '../theme/types';

// ============================================================================
// Auth Card Component
// ============================================================================

interface AuthCardProps {
  onSubmit?: (credentials: Credentials) => void;
  isLoading?: boolean;
  error?: string | null;
  fieldErrors?: {
    username?: string;
    password?: string;
    pin?: string;
    badgeId?: string;
    storeId?: string;
    stationId?: string;
  };
  demoAccounts?: DemoAccount[];
}

export function AuthCard({
  onSubmit,
  isLoading = false,
  error = null,
  fieldErrors = {},
  demoAccounts = [],
}: AuthCardProps) {
  const { config } = useLoginTheme();
  const { authCard } = config.components;
  const { tokens } = config;

  // Ref for username input to enable auto-focus (Requirement 2.10)
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const [credentials, setCredentials] = useState<Credentials>({
    method: authCard.methods[0] || 'password',
    username: '',
    password: '',
    pin: '',
    badgeId: '',
    storeId: '',
    stationId: '',
    rememberStation: false,
  });

  // Track current authentication method
  const [currentMethod, setCurrentMethod] = useState<AuthMethod>(authCard.methods[0] || 'password');

  // Fetch stores and stations for device name display
  const { stores } = useStores();
  const { stations } = useStations(credentials.storeId || undefined);

  // Derive device name from selected store and station
  const deviceName = useMemo(() => {
    const selectedStore = stores.find((s) => s.id === credentials.storeId);
    const selectedStation = stations.find((s) => s.id === credentials.stationId);

    if (selectedStation && selectedStore) {
      return `${selectedStation.name} - ${selectedStore.name}`;
    }
    if (selectedStation) {
      return selectedStation.name;
    }
    if (selectedStore) {
      return selectedStore.name;
    }
    return 'Select store and station';
  }, [stores, stations, credentials.storeId, credentials.stationId]);

  // Auto-focus username field on load (Requirement 2.10)
  useEffect(() => {
    if (currentMethod === 'password' && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [currentMethod]);

  const handleMethodChange = (method: AuthMethod) => {
    setCurrentMethod(method);
    setCredentials((prev) => ({ ...prev, method }));
  };

  const handleDemoAccountSelect = (account: DemoAccount) => {
    setCredentials((prev) => ({
      ...prev,
      username: account.username,
      password: account.password,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && !isLoading) {
      onSubmit(credentials);
    }
  };

  const handleInputChange = (field: keyof Credentials, value: string | boolean) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  // Build card styles based on configuration
  const cardStyles: React.CSSProperties = {
    backgroundColor: authCard.glassmorphism
      ? `var(--color-surface-primary, ${tokens.colors.surface.primary})`
      : tokens.colors.surface.primary,
    backdropFilter:
      authCard.glassmorphism && tokens.blur.enabled
        ? `var(--blur-backdrop-${authCard.elevation}, ${tokens.blur.backdrop.md})`
        : 'none',
    boxShadow:
      authCard.elevation !== 'none'
        ? `var(--shadow-elevation-${authCard.elevation}, ${tokens.shadows.elevation[authCard.elevation]})`
        : 'none',
    borderRadius: `var(--radius-card, ${tokens.radius.card})`,
    padding: `var(--spacing-${tokens.spacing.density === 'compact' ? 'md' : tokens.spacing.density === 'spacious' ? 'xxl' : 'xl'}, ${tokens.spacing.scale.xl})`,
  };

  return (
    <div
      className={authCard.glassmorphism ? 'auth-card auth-card--glass' : 'auth-card'}
      style={cardStyles}
      data-testid="auth-card"
    >
      {/* Headline */}
      <h1
        className="auth-card__headline"
        style={{
          fontSize: `var(--font-size-xxl, ${tokens.typography.fontSize.xxl})`,
          fontWeight: tokens.typography.fontWeight.bold,
          color: `var(--color-text-primary, ${tokens.colors.text.primary})`,
          marginBottom: `var(--spacing-lg, ${tokens.spacing.scale.lg})`,
        }}
      >
        Sign In
      </h1>

      {/* Error display */}
      {error && (
        <div
          className="auth-card__error"
          style={{
            backgroundColor: `var(--color-status-error, ${tokens.colors.status.error})`,
            color: tokens.colors.text.inverse,
            padding: `var(--spacing-sm, ${tokens.spacing.scale.sm}) var(--spacing-md, ${tokens.spacing.scale.md})`,
            borderRadius: `var(--radius-input, ${tokens.radius.input})`,
            marginBottom: `var(--spacing-md, ${tokens.spacing.scale.md})`,
            fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
          }}
          data-testid="auth-error"
        >
          {error}
        </div>
      )}

      {/* Auth form */}
      <form onSubmit={handleSubmit} className="auth-card__form">
        {/* Method tabs (only shown if multiple methods configured) */}
        <AuthMethodTabs
          methods={authCard.methods}
          currentMethod={currentMethod}
          onMethodChange={handleMethodChange}
          disabled={isLoading}
        />

        {/* Store and station pickers (shown when enabled) */}
        {(authCard.showStorePicker || authCard.showStationPicker) && (
          <StoreStationPicker
            storeId={credentials.storeId ?? ''}
            stationId={credentials.stationId ?? ''}
            onStoreChange={(storeId) => handleInputChange('storeId', storeId)}
            onStationChange={(stationId) => handleInputChange('stationId', stationId)}
            disabled={isLoading}
            showStore={authCard.showStorePicker}
            showStation={authCard.showStationPicker}
          />
        )}

        {/* Device identity (shown when enabled) */}
        {authCard.showDeviceIdentity && (
          <DeviceIdentityRow
            deviceName={deviceName}
            rememberStation={credentials.rememberStation}
            onRememberStationChange={(remember) => handleInputChange('rememberStation', remember)}
            disabled={isLoading}
          />
        )}

        {/* Username input (for password method) */}
        {currentMethod === 'password' && (
          <div
            className="auth-card__field"
            style={{ marginBottom: `var(--spacing-md, ${tokens.spacing.scale.md})` }}
          >
            <label
              htmlFor="username"
              style={{
                display: 'block',
                fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                fontWeight: tokens.typography.fontWeight.medium,
                color: `var(--color-text-secondary, ${tokens.colors.text.secondary})`,
                marginBottom: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
              }}
            >
              Username
            </label>
            <input
              ref={usernameInputRef}
              id="username"
              type="text"
              autoComplete="username"
              value={credentials.username ?? ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: `var(--spacing-sm, ${tokens.spacing.scale.sm}) var(--spacing-md, ${tokens.spacing.scale.md})`,
                fontSize: `var(--font-size-base, ${tokens.typography.fontSize.base})`,
                color: `var(--color-text-primary, ${tokens.colors.text.primary})`,
                backgroundColor: tokens.colors.surface.secondary,
                border: `2px solid ${fieldErrors.username ? tokens.colors.status.error : `var(--color-border-default, ${tokens.colors.border.default})`}`,
                borderRadius: `var(--radius-input, ${tokens.radius.input})`,
                outline: 'none',
              }}
              data-testid="username-input"
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            />
            {fieldErrors.username && (
              <p
                id="username-error"
                style={{
                  marginTop: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
                  fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                  color: tokens.colors.status.error,
                }}
                data-testid="username-error"
              >
                {fieldErrors.username}
              </p>
            )}
          </div>
        )}

        {/* Password input */}
        {currentMethod === 'password' && (
          <div
            className="auth-card__field"
            style={{ marginBottom: `var(--spacing-md, ${tokens.spacing.scale.md})` }}
          >
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                fontWeight: tokens.typography.fontWeight.medium,
                color: `var(--color-text-secondary, ${tokens.colors.text.secondary})`,
                marginBottom: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={credentials.password ?? ''}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: `var(--spacing-sm, ${tokens.spacing.scale.sm}) var(--spacing-md, ${tokens.spacing.scale.md})`,
                fontSize: `var(--font-size-base, ${tokens.typography.fontSize.base})`,
                color: `var(--color-text-primary, ${tokens.colors.text.primary})`,
                backgroundColor: tokens.colors.surface.secondary,
                border: `2px solid ${fieldErrors.password ? tokens.colors.status.error : `var(--color-border-default, ${tokens.colors.border.default})`}`,
                borderRadius: `var(--radius-input, ${tokens.radius.input})`,
                outline: 'none',
              }}
              data-testid="password-input"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <p
                id="password-error"
                style={{
                  marginTop: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
                  fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                  color: tokens.colors.status.error,
                }}
                data-testid="password-error"
              >
                {fieldErrors.password}
              </p>
            )}
          </div>
        )}

        {/* PIN input */}
        {currentMethod === 'pin' && (
          <div
            className="auth-card__field"
            style={{ marginBottom: `var(--spacing-md, ${tokens.spacing.scale.md})` }}
          >
            <label
              htmlFor="pin"
              style={{
                display: 'block',
                fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                fontWeight: tokens.typography.fontWeight.medium,
                color: `var(--color-text-secondary, ${tokens.colors.text.secondary})`,
                marginBottom: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
              }}
            >
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={credentials.pin ?? ''}
              onChange={(e) => handleInputChange('pin', e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: `var(--spacing-sm, ${tokens.spacing.scale.sm}) var(--spacing-md, ${tokens.spacing.scale.md})`,
                fontSize: `var(--font-size-base, ${tokens.typography.fontSize.base})`,
                color: `var(--color-text-primary, ${tokens.colors.text.primary})`,
                backgroundColor: tokens.colors.surface.secondary,
                border: `2px solid ${fieldErrors.pin ? tokens.colors.status.error : `var(--color-border-default, ${tokens.colors.border.default})`}`,
                borderRadius: `var(--radius-input, ${tokens.radius.input})`,
                outline: 'none',
              }}
              data-testid="pin-input"
              aria-invalid={!!fieldErrors.pin}
              aria-describedby={fieldErrors.pin ? 'pin-error' : undefined}
            />
            {fieldErrors.pin && (
              <p
                id="pin-error"
                style={{
                  marginTop: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
                  fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                  color: tokens.colors.status.error,
                }}
                data-testid="pin-error"
              >
                {fieldErrors.pin}
              </p>
            )}
          </div>
        )}

        {/* Badge input */}
        {currentMethod === 'badge' && (
          <div
            className="auth-card__field"
            style={{ marginBottom: `var(--spacing-md, ${tokens.spacing.scale.md})` }}
          >
            <label
              htmlFor="badge"
              style={{
                display: 'block',
                fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                fontWeight: tokens.typography.fontWeight.medium,
                color: `var(--color-text-secondary, ${tokens.colors.text.secondary})`,
                marginBottom: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
              }}
            >
              Badge ID
            </label>
            <input
              id="badge"
              type="text"
              autoComplete="off"
              value={credentials.badgeId ?? ''}
              onChange={(e) => handleInputChange('badgeId', e.target.value)}
              disabled={isLoading}
              placeholder="Scan or enter badge ID"
              style={{
                width: '100%',
                minHeight: '48px',
                padding: `var(--spacing-sm, ${tokens.spacing.scale.sm}) var(--spacing-md, ${tokens.spacing.scale.md})`,
                fontSize: `var(--font-size-base, ${tokens.typography.fontSize.base})`,
                color: `var(--color-text-primary, ${tokens.colors.text.primary})`,
                backgroundColor: tokens.colors.surface.secondary,
                border: `2px solid ${fieldErrors.badgeId ? tokens.colors.status.error : `var(--color-border-default, ${tokens.colors.border.default})`}`,
                borderRadius: `var(--radius-input, ${tokens.radius.input})`,
                outline: 'none',
              }}
              data-testid="badge-input"
              aria-invalid={!!fieldErrors.badgeId}
              aria-describedby={fieldErrors.badgeId ? 'badge-error' : undefined}
            />
            {fieldErrors.badgeId && (
              <p
                id="badge-error"
                style={{
                  marginTop: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
                  fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                  color: tokens.colors.status.error,
                }}
                data-testid="badge-error"
              >
                {fieldErrors.badgeId}
              </p>
            )}
          </div>
        )}

        {/* Remember Me checkbox */}
        {currentMethod === 'password' && (
          <div
            className="auth-card__field"
            style={{ marginBottom: `var(--spacing-md, ${tokens.spacing.scale.md})` }}
          >
            <label
              htmlFor="remember-me"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: `var(--font-size-sm, ${tokens.typography.fontSize.sm})`,
                color: `var(--color-text-secondary, ${tokens.colors.text.secondary})`,
              }}
            >
              <input
                id="remember-me"
                type="checkbox"
                checked={credentials.rememberStation}
                onChange={(e) => handleInputChange('rememberStation', e.target.checked)}
                disabled={isLoading}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  accentColor: `var(--color-accent-primary, ${tokens.colors.accent.primary})`,
                }}
                data-testid="remember-me-checkbox"
              />
              <span>Remember Me</span>
            </label>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            minHeight: '48px',
            padding: `var(--spacing-sm, ${tokens.spacing.scale.sm}) var(--spacing-md, ${tokens.spacing.scale.md})`,
            fontSize: `var(--font-size-base, ${tokens.typography.fontSize.base})`,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.inverse,
            backgroundColor: `var(--color-accent-primary, ${tokens.colors.accent.primary})`,
            border: 'none',
            borderRadius: `var(--radius-button, ${tokens.radius.button})`,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'background-color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `var(--spacing-xs, ${tokens.spacing.scale.xs})`,
          }}
          data-testid="submit-button"
        >
          {isLoading && <Loader2 className="animate-spin" size={20} />}
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>

        {/* Demo accounts (shown when enabled and accounts provided) */}
        {authCard.showDemoAccounts && demoAccounts.length > 0 && (
          <DemoAccountsAccordion
            accounts={demoAccounts}
            onAccountSelect={handleDemoAccountSelect}
            disabled={isLoading}
          />
        )}
      </form>

      <style>{`
        .auth-card {
          position: relative;
          max-width: 400px;
          margin: 0 auto;
        }

        .auth-card--glass {
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .auth-card__form input:focus {
          border-color: var(--color-border-focus, ${tokens.colors.border.focus});
        }

        .auth-card__form button:hover:not(:disabled) {
          background-color: var(--color-accent-hover, ${tokens.colors.accent.hover});
        }

        .auth-card__form button:active:not(:disabled) {
          background-color: var(--color-accent-active, ${tokens.colors.accent.active});
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { AuthCardProps };

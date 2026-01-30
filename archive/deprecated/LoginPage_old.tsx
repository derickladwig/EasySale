/**
 * @deprecated QUARANTINED - Use LoginPageV2 instead
 * 
 * Quarantined: 2026-01-29
 * Reason: Replaced by simpler, more maintainable LoginPageV2
 * Replacement: frontend/src/auth/pages/LoginPageV2.tsx
 * 
 * This file is preserved per NO DELETES policy but should not be imported.
 * All imports should use: import { LoginPageV2 } from './LoginPageV2'
 * 
 * Original description:
 * Login Page Component - Complete integrated login page that wires together all components:
 * - LoginShell (layout)
 * - BackgroundRenderer (background)
 * - HeaderSlot (header)
 * - FooterSlot (footer)
 * - AuthCard (main authentication)
 * - SystemStatusCard (system status)
 * - ErrorCallout (error display)
 *
 * Validates Requirements: All
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@common/contexts/AuthContext';
import { useLoginTheme } from '../theme/LoginThemeProvider';
import { useConfig } from '../../config/ConfigProvider';
import { useAppInfo } from '@common/hooks/useAppInfo';
import { useSystemStatus } from '@common/hooks/useSystemStatus';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Stack } from '../../components/ui/Stack';
import { BackgroundRenderer } from '../background/BackgroundRenderer';
import { HeaderSlot } from '../components/HeaderSlot';
import { FooterSlot } from '../components/FooterSlot';
import { SystemStatusCard } from '../components/SystemStatusCard';
import { ErrorCallout } from '../components/ErrorCallout';
import { LowPowerModeProvider } from '../performance/LowPowerMode';
import { FocusIndicatorStyles } from '../accessibility/FocusIndicator';
import { ErrorBoundary } from '@common/components/ErrorBoundary';

// ============================================================================
// Constants
// ============================================================================

const REMEMBERED_USERNAME_KEY = 'easysale_remembered_username';

// ============================================================================
// Types
// ============================================================================

interface LoginPageProps {
  /**
   * Tenant ID for configuration loading
   */
  tenantId?: string;

  /**
   * Store ID for configuration loading
   */
  storeId?: string;

  /**
   * Device ID for configuration loading
   */
  deviceId?: string;

  /**
   * Callback when login is successful
   */
  onLoginSuccess?: (userId: string) => void;

  /**
   * Callback when login fails
   */
  onLoginError?: (error: Error) => void;
}

// ============================================================================
// Login Page Component
// ============================================================================

function LoginPageContent({
  tenantId,
  storeId,
  deviceId,
  onLoginSuccess,
  onLoginError,
}: LoginPageProps) {
  // Hooks
  const navigate = useNavigate();
  const { login } = useAuth();
  useLoginTheme(); // Use login theme system (config not used directly)
  const { branding, profile, presetPack } = useConfig();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEnvironment, setCurrentEnvironment] = useState<'demo' | 'production'>(
    profile === 'demo' ? 'demo' : 'production'
  );
  const [authMethod, setAuthMethod] = useState<'password' | 'pin'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [rememberUsername, setRememberUsername] = useState(false);

  // Load remembered username on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberUsername(true);
    }
  }, []);

  // Real system status from API
  const systemStatus = useSystemStatus();
  
  // Real app info for footer
  const appInfo = useAppInfo();

  // Demo accounts from preset pack (only in demo mode)
  const demoAccounts = profile === 'demo' && presetPack?.users ? presetPack.users : [];

  // Handle login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Prepare login payload based on auth method
      let loginPayload: { username: string; password: string };

      if (authMethod === 'password') {
        loginPayload = {
          username,
          password,
        };
      } else if (authMethod === 'pin') {
        loginPayload = {
          username: username || 'pin-user',
          password: pin,
        };
      } else {
        throw new Error('Authentication method not supported');
      }

      // Save or clear remembered username
      if (rememberUsername && username) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      // Use the auth context login function
      await login(loginPayload);

      // Call success callback
      onLoginSuccess?.('user-authenticated');

      // Navigate to home page after successful login
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      onLoginError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle error retry
  const handleRetry = () => {
    setError(null);
  };

  // Handle diagnostics
  const handleDiagnostics = () => {
    // Log diagnostics only in development mode
    if (import.meta.env.DEV) {
      console.log('System diagnostics:', {
        tenantId,
        storeId,
        deviceId,
        systemStatus,
      });
    }
    alert('Diagnostics logged to console');
  };

  // Handle environment change
  const handleEnvironmentChange = (environment: 'demo' | 'production') => {
    setCurrentEnvironment(environment);
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log('Environment changed to:', environment);
    }
  };

  return (
    <LowPowerModeProvider>
      <FocusIndicatorStyles />

      {/* Enhanced Login Layout using unified design system */}
      <div className="min-h-screen bg-bg-primary flex flex-col">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <BackgroundRenderer />
        </div>

        {/* Header */}
        <div className="relative z-10">
          <HeaderSlot
            companyName={branding.company.name}
            logoUrl={branding.company.logo || '/logo.svg'}
            shortName={branding.company.shortName}
            icon={branding.company.icon}
            currentEnvironment={currentEnvironment}
            showEnvironmentSelector={profile === 'dev'}
            showHelpIcon={true}
            showSettingsIcon={true}
            onEnvironmentChange={handleEnvironmentChange}
            onHelpClick={() => { /* Help modal would open here */ }}
            onSettingsClick={() => { /* Settings modal would open here */ }}
          />
        </div>

        {/* Main Content - Side by Side Layout */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-4xl">
            {/* Logo centered above cards */}
            <div className="flex justify-center mb-6">
              {branding.company.logo ? (
                <img
                  src={branding.company.logo}
                  alt={`${branding.company.name} logo`}
                  className="h-12 w-auto max-w-[160px] object-contain"
                  data-testid="login-logo"
                />
              ) : (
                <div className="h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {branding.company.shortName || branding.company.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Side by Side Cards */}
            <div className="flex flex-col lg:flex-row gap-6 items-stretch">
              {/* Login Card */}
              <div className="flex-1 min-w-0">
                <Card padding="lg" className="h-full">
                  <form onSubmit={handleLogin}>
                    <Stack gap="4">
                      <h1 className="text-2xl font-semibold text-text-primary text-center">
                        Sign In
                      </h1>

                      {/* Error Display */}
                      {error && (
                        <ErrorCallout
                          message={error}
                          severity="error"
                          presentation="callout"
                          showRetry={true}
                          showDiagnostics={true}
                          onRetry={handleRetry}
                          onDiagnostics={handleDiagnostics}
                        />
                      )}

                      {/* Auth Method Selector - Password and PIN only */}
                      <div className="flex gap-2">
                        {(['password', 'pin'] as const).map((method) => (
                          <Button
                            key={method}
                            type="button"
                            variant={authMethod === method ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setAuthMethod(method)}
                            className="flex-1"
                          >
                            {method.charAt(0).toUpperCase() + method.slice(1)}
                          </Button>
                        ))}
                      </div>

                      {/* Password Auth */}
                      {authMethod === 'password' && (
                        <>
                          <Input
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                            autoFocus
                            autoComplete="username"
                          />
                          <Input
                            type="password"
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            autoComplete="current-password"
                          />
                        </>
                      )}

                      {/* PIN Auth */}
                      {authMethod === 'pin' && (
                        <>
                          <Input
                            label="Username (Optional)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
                          />
                          <Input
                            type="password"
                            label="PIN"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Enter PIN"
                            required
                            autoFocus
                            maxLength={6}
                            autoComplete="off"
                          />
                        </>
                      )}

                      {/* Remember Username */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberUsername}
                          onChange={(e) => setRememberUsername(e.target.checked)}
                          className="w-4 h-4 rounded border-border-DEFAULT accent-primary-500"
                        />
                        <span className="text-sm text-text-secondary">Remember username</span>
                      </label>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                      </Button>

                      {/* Demo Accounts (only in demo environment) */}
                      {profile === 'demo' && demoAccounts.length > 0 && (
                        <div className="mt-4 p-3 bg-surface-elevated rounded border border-border-light">
                          <p className="text-sm text-text-secondary mb-2">Demo Accounts:</p>
                          <Stack gap="1">
                            {demoAccounts.map((account) => (
                              <button
                                key={account.username}
                                type="button"
                                onClick={() => {
                                  setUsername(account.username);
                                  setPassword(account.password);
                                  setAuthMethod('password');
                                }}
                                className="text-left text-sm text-primary-500 hover:text-primary-400 hover:underline"
                              >
                                {account.username} ({account.role})
                              </button>
                            ))}
                          </Stack>
                        </div>
                      )}
                    </Stack>
                  </form>
                </Card>
              </div>

              {/* System Status Card - Side by Side on Desktop */}
              <div className="flex-1 min-w-0 lg:max-w-sm">
                <SystemStatusCard
                  databaseStatus={systemStatus.database}
                  syncStatus={systemStatus.sync}
                  lastSyncTime={systemStatus.lastSyncTime}
                  storeName={systemStatus.storeName}
                  stationId={systemStatus.stationId}
                  variant="systemForward"
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <FooterSlot
            version={appInfo.version}
            buildId={`${appInfo.buildDate}-${appInfo.buildHash}`}
            copyright={appInfo.copyright}
          />
        </div>
      </div>
    </LowPowerModeProvider>
  );
}

// ============================================================================
// Wrapped Login Page with Error Boundary
// ============================================================================

export function LoginPage(props: LoginPageProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
          <div className="max-w-md w-full bg-surface-2 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-2xl">⚠</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Login Error</h1>
                <p className="text-sm text-text-secondary">Unable to load the login page</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-accent text-white rounded hover:bg-accent/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      <LoginPageContent {...props} />
    </ErrorBoundary>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { LoginPageProps };

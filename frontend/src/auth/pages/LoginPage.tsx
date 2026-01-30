/**
 * Login Page Component
 *
 * Modern glass-morphism login page matching the EasySale design mockup.
 * Features:
 * - Dark teal gradient background with subtle noise texture
 * - Transparent header with logo from branding config
 * - Centered glass-morphism login card with favicon badge
 * - Password/PIN toggle tabs
 * - Side-by-side status panel with real system status
 * - Transparent footer with real version/build info
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@common/contexts/AuthContext';
import { useConfig } from '../../config/ConfigProvider';
import { useAppInfo } from '@common/hooks/useAppInfo';
import { useSystemStatus } from '@common/hooks/useSystemStatus';
import { ErrorBoundary } from '@common/components/ErrorBoundary';

// ============================================================================
// Constants
// ============================================================================

const REMEMBERED_USERNAME_KEY = 'easysale_remembered_username';

// ============================================================================
// Types
// ============================================================================

interface LoginPageProps {
  tenantId?: string;
  storeId?: string;
  deviceId?: string;
  onLoginSuccess?: (userId: string) => void;
  onLoginError?: (error: Error) => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Logo Badge - displays favicon or icon above the Sign In title
 * Uses the actual image without forced background color
 */
function LogoBadge({ favicon, icon, shortName }: { favicon?: string; icon?: string; shortName: string }) {
  const src = favicon || icon;
  
  if (src) {
    return (
      <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-800/50 shadow-lg">
        <img src={src} alt="Logo" className="w-12 h-12 object-contain" />
      </div>
    );
  }
  
  // Fallback to initials with theme-aware primary color
  return (
    <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
      <span className="text-white font-bold text-2xl">{shortName}</span>
    </div>
  );
}

function AuthMethodTabs({ 
  activeMethod, 
  onMethodChange 
}: { 
  activeMethod: 'password' | 'pin';
  onMethodChange: (method: 'password' | 'pin') => void;
}) {
  return (
    <div className="flex justify-center gap-8 mb-6">
      <button
        type="button"
        onClick={() => onMethodChange('password')}
        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
          activeMethod === 'password' 
            ? 'text-primary-400' 
            : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${
          activeMethod === 'password' ? 'bg-primary-400' : 'bg-transparent'
        }`} />
        Password
      </button>
      <button
        type="button"
        onClick={() => onMethodChange('pin')}
        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
          activeMethod === 'pin' 
            ? 'text-primary-400' 
            : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${
          activeMethod === 'pin' ? 'bg-primary-400' : 'bg-transparent'
        }`} />
        PIN
      </button>
    </div>
  );
}

function StatusPanel({
  databaseStatus,
  syncStatus,
  lastSyncTime,
  storeName,
  stationId,
  isLoading,
}: {
  databaseStatus: 'connected' | 'disconnected' | 'checking';
  syncStatus: 'online' | 'offline' | 'syncing' | 'checking';
  lastSyncTime: Date | null;
  storeName: string;
  stationId: string;
  isLoading?: boolean;
}) {
  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `Last sync ${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    return `Last sync ${Math.floor(diffMin / 60)} hour${Math.floor(diffMin / 60) !== 1 ? 's' : ''} ago`;
  };

  const getDbStatusColor = () => {
    if (isLoading || databaseStatus === 'checking') return 'bg-yellow-400 animate-pulse';
    return databaseStatus === 'connected' ? 'bg-green-400' : 'bg-red-400';
  };

  const getSyncStatusColor = () => {
    if (isLoading || syncStatus === 'checking') return 'bg-yellow-400 animate-pulse';
    if (syncStatus === 'online') return 'bg-green-400';
    if (syncStatus === 'syncing') return 'bg-primary-400 animate-pulse';
    return 'bg-yellow-400';
  };

  const getDbStatusText = () => {
    if (isLoading || databaseStatus === 'checking') return 'Checking...';
    return databaseStatus === 'connected' ? 'Connected' : 'Disconnected';
  };

  const getSyncStatusText = () => {
    if (isLoading || syncStatus === 'checking') return 'Checking...';
    return syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1);
  };

  return (
    <div className="glass-panel rounded-2xl p-8 w-[240px]">
      {/* Database Status */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <div>
          <div className="text-slate-300 text-sm font-medium">Database</div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getDbStatusColor()}`} />
            <span className="text-slate-200 text-sm">{getDbStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <div className="mb-4">
        <div className="text-slate-300 text-sm font-medium mb-1">Sync Status</div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getSyncStatusColor()}`} />
          <span className="text-slate-200 text-sm">{getSyncStatusText()}</span>
        </div>
        <div className="text-slate-400 text-xs mt-1">{formatTime(lastSyncTime)}</div>
      </div>

      {/* Store */}
      <div className="mb-4">
        <div className="text-slate-400 text-xs">Store</div>
        <div className="text-slate-200 text-sm font-medium">{storeName}</div>
      </div>

      {/* Station */}
      <div>
        <div className="text-slate-400 text-xs">Station</div>
        <div className="text-slate-200 text-sm font-medium">{stationId}</div>
      </div>
    </div>
  );
}


// ============================================================================
// Main Component
// ============================================================================

function LoginPageContent({
  onLoginSuccess,
  onLoginError,
}: LoginPageProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { branding, profile, presetPack } = useConfig();
  
  // Real data from hooks
  const appInfo = useAppInfo();
  const systemStatus = useSystemStatus();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'password' | 'pin'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [rememberUsername, setRememberUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Load remembered username
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    if (saved) {
      setUsername(saved);
      setRememberUsername(true);
    }
  }, []);

  const demoAccounts = profile === 'demo' && presetPack?.users ? presetPack.users : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const loginPayload = authMethod === 'password'
        ? { username, password }
        : { username: username || 'pin-user', password: pin };

      if (rememberUsername && username) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      await login(loginPayload);
      onLoginSuccess?.('user-authenticated');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      onLoginError?.(err instanceof Error ? err : new Error(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const shortName = branding.company.shortName || branding.company.name.substring(0, 2).toUpperCase();
  
  // Get logo paths from branding config
  const headerLogo = branding.company.logoDark || branding.company.logo;
  const badgeFavicon = branding.company.favicon;
  const badgeIcon = branding.company.icon;

  return (
    <div className="login-page-v2">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a1929] via-[#0d2137] to-[#0f2942]" />
      <div className="fixed inset-0 bg-noise opacity-[0.03]" />

      {/* Header */}
      <header className="relative z-10 flex items-center px-6 py-4">
        <div className="flex items-center gap-3">
          {headerLogo ? (
            <img 
              src={headerLogo} 
              alt={branding.company.name}
              className="h-8 w-auto"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{shortName}</span>
            </div>
          )}
          <span className="text-slate-200 font-semibold text-lg">{branding.company.name}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col lg:flex-row items-stretch gap-8">
          {/* Login Card */}
          <div className="glass-panel rounded-2xl p-10 w-[420px]">
            {/* Logo Badge - uses favicon */}
            <div className="flex justify-center mb-8">
              <LogoBadge favicon={badgeFavicon} icon={badgeIcon} shortName={shortName} />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-slate-100 text-center mb-8">Sign In</h1>

            {/* Auth Method Tabs */}
            <AuthMethodTabs activeMethod={authMethod} onMethodChange={setAuthMethod} />

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {authMethod === 'password' ? (
                <>
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="login-input"
                      required
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="login-input pr-12"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">Username (Optional)</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="login-input"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">PIN</label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••••"
                      className="login-input"
                      required
                      autoFocus
                      maxLength={6}
                      autoComplete="off"
                    />
                  </div>
                </>
              )}

              {/* Remember Username */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberUsername}
                  onChange={(e) => setRememberUsername(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-slate-400 text-sm">Remember username</span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              {/* Forgot Password */}
              <div className="text-center">
                <button type="button" className="text-primary-400 hover:text-primary-300 text-sm">
                  Forgot password?
                </button>
              </div>
            </form>

            {/* Demo Accounts */}
            {profile === 'demo' && demoAccounts.length > 0 && (
              <div className="mt-6 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <p className="text-slate-400 text-xs mb-2">Demo Accounts:</p>
                <div className="space-y-1">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.username}
                      type="button"
                      onClick={() => {
                        setUsername(account.username);
                        setPassword(account.password);
                        setAuthMethod('password');
                      }}
                      className="block text-sm text-primary-400 hover:text-primary-300"
                    >
                      {account.username} ({account.role})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Panel - uses real system status */}
          <StatusPanel
            databaseStatus={systemStatus.database}
            syncStatus={systemStatus.sync}
            lastSyncTime={systemStatus.lastSyncTime}
            storeName={systemStatus.storeName}
            stationId={systemStatus.stationId}
            isLoading={systemStatus.isLoading}
          />
        </div>
      </main>

      {/* Footer - uses real version/build info */}
      <footer className="relative z-10 flex items-center justify-between px-6 py-4 text-slate-500 text-xs">
        <div>v{appInfo.version} • {appInfo.buildDate}-{appInfo.buildHash}</div>
        <div>{appInfo.copyright}</div>
      </footer>

      {/* Styles */}
      <style>{`
        .login-page-v2 {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        .glass-panel {
          background: rgba(15, 30, 50, 0.8);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(100, 150, 200, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .login-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: rgba(30, 50, 70, 0.5);
          border: 1px solid rgba(100, 150, 200, 0.2);
          border-radius: 0.5rem;
          color: #e2e8f0;
          font-size: 0.9375rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .login-input::placeholder {
          color: #64748b;
        }

        .login-input:focus {
          outline: none;
          border-color: var(--color-primary-500, #3b82f6);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary-500, #3b82f6) 20%, transparent);
        }

        .login-input:hover:not(:focus) {
          border-color: rgba(100, 150, 200, 0.3);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Export with Error Boundary
// ============================================================================

export function LoginPage(props: LoginPageProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a1929] px-4">
          <div className="max-w-md w-full bg-slate-800/80 rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-red-400 text-2xl">⚠</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">Login Error</h1>
                <p className="text-sm text-slate-400">Unable to load the login page</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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

export type { LoginPageProps };

// Legacy alias for backward compatibility
export { LoginPage as LoginPageV2 };
export type { LoginPageProps as LoginPageV2Props };

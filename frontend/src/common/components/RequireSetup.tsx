/**
 * RequireSetup Component
 * 
 * Route guard that redirects to the Setup Wizard if tenant is not configured.
 * Blocks POS flows until initial setup is complete.
 * 
 * Validates: Requirements 7.2
 * - IF no tenant is configured, THEN THE System SHALL show a Setup Wizard
 * - Block POS flows until configured
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTenantSetup } from '../contexts/TenantSetupContext';
import { Loader } from 'lucide-react';

interface RequireSetupProps {
  children: ReactNode;
  /** Custom redirect path (defaults to /setup for first-run wizard) */
  redirectTo?: string;
  /** Show loading spinner while checking setup status */
  showLoading?: boolean;
}

/**
 * RequireSetup wraps routes that should only be accessible after tenant setup.
 * 
 * Usage:
 * ```tsx
 * <Route
 *   path="/sell"
 *   element={
 *     <RequireSetup>
 *       <SellPage />
 *     </RequireSetup>
 *   }
 * />
 * ```
 */
export function RequireSetup({ 
  children, 
  redirectTo = '/setup',
  showLoading = true,
}: RequireSetupProps) {
  const { isConfigured, isLoading } = useTenantSetup();
  const location = useLocation();

  // Show loading state while checking setup status
  if (isLoading) {
    if (showLoading) {
      return (
        <div className="h-full flex items-center justify-center bg-background-primary">
          <div className="text-center">
            <Loader className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-text-tertiary text-sm">Checking setup status...</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // If not configured, redirect to setup wizard
  if (!isConfigured) {
    // Preserve the intended destination for after setup
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location, isFirstRun: true }} 
        replace 
      />
    );
  }

  // Setup complete, render children
  return <>{children}</>;
}

/**
 * Higher-order component version of RequireSetup
 * 
 * Usage:
 * ```tsx
 * const ProtectedSellPage = withSetupRequired(SellPage);
 * ```
 */
export function withSetupRequired<P extends object>(
  Component: React.ComponentType<P>,
  options?: { redirectTo?: string }
) {
  return function WrappedComponent(props: P) {
    return (
      <RequireSetup redirectTo={options?.redirectTo}>
        <Component {...props} />
      </RequireSetup>
    );
  };
}

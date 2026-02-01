import React from 'react';
import { Navigate } from 'react-router-dom';
import { useExportAvailable, useSyncAvailable } from '../../../hooks/useCapabilities';
import { AlertTriangle, Package } from 'lucide-react';

interface FeatureGuardProps {
  /** Feature to check availability for */
  feature: 'export' | 'sync';
  /** Content to render if feature is available */
  children: React.ReactNode;
  /** Optional redirect path (defaults to /feature-unavailable) */
  redirectTo?: string;
  /** Optional: show loading state instead of redirecting while checking */
  showLoading?: boolean;
}

/**
 * FeatureGuard - Protects routes based on backend capabilities
 * 
 * Checks if a feature is available in the current backend build variant
 * and either renders children or redirects to an unavailable page.
 * 
 * @example
 * ```tsx
 * <Route path="/reports" element={
 *   <FeatureGuard feature="export">
 *     <ReportsPage />
 *   </FeatureGuard>
 * } />
 * ```
 */
export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  children,
  redirectTo = '/feature-unavailable',
  showLoading = true,
}) => {
  const exportAvailable = useExportAvailable();
  const syncAvailable = useSyncAvailable();
  
  // Determine if the requested feature is available
  const isAvailable = feature === 'export' ? exportAvailable : syncAvailable;
  
  // Show loading state while checking capabilities
  if (isAvailable === undefined && showLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text-tertiary">Checking feature availability...</p>
        </div>
      </div>
    );
  }
  
  // Redirect if feature is not available
  if (isAvailable === false) {
    return <Navigate to={redirectTo} replace state={{ feature }} />;
  }
  
  // Feature is available, render children
  return <>{children}</>;
};

/**
 * FeatureUnavailablePage - Shown when user tries to access unavailable feature
 * 
 * Provides clear messaging about why the feature isn't available and
 * what build variant is needed.
 */
export const FeatureUnavailablePage: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full min-h-[600px] p-6">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning-500/20 mb-4">
            <AlertTriangle className="w-8 h-8 text-warning-400" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Feature Not Available
          </h1>
          <p className="text-text-secondary">
            This feature is not available in your current build variant.
          </p>
        </div>
        
        <div className="bg-surface-elevated border border-border rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 text-left">
            <Package className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-text-primary mb-2">Build Variants</h2>
              <ul className="text-sm text-text-secondary space-y-2">
                <li>
                  <span className="font-medium text-text-primary">Lite:</span> Core POS features only
                </li>
                <li>
                  <span className="font-medium text-text-primary">Export:</span> Core + CSV export for accounting
                </li>
                <li>
                  <span className="font-medium text-text-primary">Full:</span> All features including OCR and integrations
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-text-tertiary">
          <p>
            To access this feature, you'll need to upgrade to a build variant that includes it.
            Contact your system administrator for more information.
          </p>
        </div>
        
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-accent text-text-inverse rounded-lg hover:bg-accent/90 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default FeatureGuard;

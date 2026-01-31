/**
 * RouteGuard - Component for capability-based route protection
 * 
 * Wraps routes to enforce capability and permission checks.
 * Shows appropriate UI for different states:
 * - ready: renders children
 * - beta: renders children with beta badge
 * - comingSoon: shows ComingSoonPanel
 * - hidden: renders nothing
 * - no permission: shows access denied
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { ComingSoonPanel } from '../components/common/ComingSoonPanel';
import type { FeatureStatus } from './navConfig';

// ============================================
// Types
// ============================================

export interface RouteGuardProps {
  /** Feature name for display */
  featureName: string;
  /** Feature status */
  featureStatus: FeatureStatus;
  /** Required capability key */
  capabilityKey?: string;
  /** Required permission */
  permission?: string;
  /** User's capabilities (from context/API) */
  capabilities?: Record<string, { status: string; enabled: boolean }>;
  /** User's permissions (from context/API) */
  userPermissions?: string[];
  /** Redirect path for unauthorized access */
  redirectTo?: string;
  /** Children to render when authorized */
  children: React.ReactNode;
  /** Description for coming soon panel */
  description?: string;
}

// ============================================
// Access Denied Component
// ============================================

const AccessDenied: React.FC<{ featureName: string; redirectTo?: string }> = ({
  featureName,
  redirectTo,
}) => {
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-error-100)] dark:bg-[var(--color-error-900)]/30 flex items-center justify-center mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          Access Denied
        </h3>
        <p className="text-text-secondary">
          You don't have permission to access {featureName}.
          Please contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
};

// ============================================
// Beta Badge Wrapper
// ============================================

const BetaWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative">
      {/* Beta indicator */}
      <div className="absolute top-2 right-2 z-10">
        <span className="px-2 py-1 text-xs font-medium rounded bg-[var(--color-info-100)] dark:bg-[var(--color-info-900)]/30 text-[var(--color-info-700)] dark:text-[var(--color-info-300)]">
          Beta
        </span>
      </div>
      {children}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const RouteGuard: React.FC<RouteGuardProps> = ({
  featureName,
  featureStatus,
  capabilityKey,
  permission,
  capabilities = {},
  userPermissions = [],
  redirectTo,
  children,
  description,
}) => {
  // Check capability status if key provided
  let effectiveStatus = featureStatus;
  if (capabilityKey && capabilities[capabilityKey]) {
    const cap = capabilities[capabilityKey];
    if (cap.status === 'hidden') {
      effectiveStatus = 'hidden';
    } else if (cap.status === 'comingSoon') {
      effectiveStatus = 'comingSoon';
    } else if (cap.status === 'beta') {
      effectiveStatus = 'beta';
    }
  }

  // Check permission if required
  const hasPermission = !permission || userPermissions.includes(permission);

  // Handle different states
  switch (effectiveStatus) {
    case 'hidden':
      // Render nothing for hidden features
      return null;

    case 'comingSoon':
      return (
        <ComingSoonPanel
          featureName={featureName}
          description={description}
          variant="fullPage"
        />
      );

    case 'beta':
      if (!hasPermission) {
        return <AccessDenied featureName={featureName} redirectTo={redirectTo} />;
      }
      return <BetaWrapper>{children}</BetaWrapper>;

    case 'ready':
    default:
      if (!hasPermission) {
        return <AccessDenied featureName={featureName} redirectTo={redirectTo} />;
      }
      return <>{children}</>;
  }
};

export default RouteGuard;

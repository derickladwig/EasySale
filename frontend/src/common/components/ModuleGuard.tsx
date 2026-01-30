import { ReactNode } from 'react';
import { useModules } from '../hooks/useModules';
import { AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ModuleGuardProps {
  /** Module name to check */
  module: string;

  /** Children to render if module is enabled */
  children: ReactNode;

  /** Optional fallback to render if module is disabled */
  fallback?: ReactNode;

  /** Show default "module disabled" message if no fallback provided */
  showMessage?: boolean;

  /** Require all modules (AND logic) */
  requireAll?: string[];

  /** Require any modules (OR logic) */
  requireAny?: string[];
}

// ============================================================================
// Component
// ============================================================================

/**
 * ModuleGuard Component
 *
 * Conditionally renders children based on module availability.
 * Useful for hiding features that are disabled in the configuration.
 *
 * @example
 * // Single module check
 * <ModuleGuard module="layaway">
 *   <LayawayFeature />
 * </ModuleGuard>
 *
 * @example
 * // Multiple modules (any)
 * <ModuleGuard requireAny={['loyalty', 'giftCards']}>
 *   <RewardsSection />
 * </ModuleGuard>
 *
 * @example
 * // Multiple modules (all)
 * <ModuleGuard requireAll={['inventory', 'serialNumbers']}>
 *   <AdvancedInventory />
 * </ModuleGuard>
 *
 * @example
 * // With custom fallback
 * <ModuleGuard module="reports" fallback={<UpgradePrompt />}>
 *   <ReportsPage />
 * </ModuleGuard>
 */
export function ModuleGuard({
  module,
  children,
  fallback,
  showMessage = false,
  requireAll,
  requireAny,
}: ModuleGuardProps) {
  const { isEnabled, areAllEnabled, isAnyEnabled } = useModules();

  // Check module availability
  let isAvailable = false;

  if (requireAll && requireAll.length > 0) {
    isAvailable = areAllEnabled(requireAll);
  } else if (requireAny && requireAny.length > 0) {
    isAvailable = isAnyEnabled(requireAny);
  } else if (module) {
    isAvailable = isEnabled(module);
  }

  // Render children if available
  if (isAvailable) {
    return <>{children}</>;
  }

  // Render fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Render default message if requested
  if (showMessage) {
    const moduleName = module || requireAll?.join(', ') || requireAny?.join(', ') || 'Unknown';

    return (
      <div className="p-6 bg-warning-500/10 border border-warning-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-warning-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-semibold text-warning-400 mb-1">Module Not Available</h3>
            <p className="text-sm text-warning-400/80">
              The "{moduleName}" module is not enabled in your configuration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render nothing by default
  return null;
}

// ============================================================================
// Utility Components
// ============================================================================

/**
 * FeatureGuard Component
 *
 * Similar to ModuleGuard but checks for specific features within a module
 */
export interface FeatureGuardProps {
  module: string;
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGuard({ module, feature, children, fallback }: FeatureGuardProps) {
  const { hasFeature } = useModules();

  if (hasFeature(module, feature)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

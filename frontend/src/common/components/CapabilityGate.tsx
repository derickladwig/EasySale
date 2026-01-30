/**
 * Capability Gate Component
 * 
 * Conditionally renders children based on backend capabilities.
 * Use this to hide/show features based on the build variant.
 */

import { ReactNode } from 'react';
import { useCapabilities } from '../contexts';

interface CapabilityGateProps {
  children: ReactNode;
  /** Require accounting features (export_only or sync mode) */
  requireAccounting?: boolean;
  /** Require export features */
  requireExport?: boolean;
  /** Require sync features */
  requireSync?: boolean;
  /** Fallback content when capability is not available */
  fallback?: ReactNode;
}

export function CapabilityGate({
  children,
  requireAccounting,
  requireExport,
  requireSync,
  fallback = null,
}: CapabilityGateProps) {
  const { capabilities, loading } = useCapabilities();

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // No capabilities loaded - show fallback
  if (!capabilities) {
    return <>{fallback}</>;
  }

  // Check accounting requirement
  if (requireAccounting && capabilities.accounting_mode === 'disabled') {
    return <>{fallback}</>;
  }

  // Check export requirement
  if (requireExport && !capabilities.features.export) {
    return <>{fallback}</>;
  }

  // Check sync requirement
  if (requireSync && !capabilities.features.sync) {
    return <>{fallback}</>;
  }

  // All requirements met - render children
  return <>{children}</>;
}

/**
 * Example usage:
 * 
 * // Hide export button if export feature is not available
 * <CapabilityGate requireExport>
 *   <button onClick={handleExport}>Export to CSV</button>
 * </CapabilityGate>
 * 
 * // Hide sync settings if sync feature is not available
 * <CapabilityGate requireSync>
 *   <SyncSettingsPanel />
 * </CapabilityGate>
 * 
 * // Hide entire accounting section if accounting is disabled
 * <CapabilityGate requireAccounting>
 *   <AccountingDashboard />
 * </CapabilityGate>
 * 
 * // Show fallback message when feature is not available
 * <CapabilityGate 
 *   requireExport 
 *   fallback={<p>Export feature not available in this build</p>}
 * >
 *   <ExportPanel />
 * </CapabilityGate>
 */

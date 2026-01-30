import React, { useEffect, useState } from 'react';
import { fetchCapabilities, type Capabilities } from '../../../services/capabilities';

interface CapabilityGateProps {
  /** Require accounting features (export_only or sync mode) */
  requireAccounting?: boolean;
  /** Require export feature specifically */
  requireExport?: boolean;
  /** Require sync feature specifically */
  requireSync?: boolean;
  /** Content to render when capability is available */
  children: React.ReactNode;
  /** Optional fallback when capability is not available */
  fallback?: React.ReactNode;
  /** Optional loading state */
  loading?: React.ReactNode;
}

/**
 * CapabilityGate - Conditionally render content based on backend capabilities
 * 
 * Use this to hide/show features based on what the backend supports.
 * This prevents showing UI for features that aren't actually wired up.
 */
export const CapabilityGate: React.FC<CapabilityGateProps> = ({
  requireAccounting = false,
  requireExport = false,
  requireSync = false,
  children,
  fallback = null,
  loading = null,
}) => {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    fetchCapabilities()
      .then((caps) => {
        if (mounted) {
          setCapabilities(caps);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (!capabilities) {
    return <>{fallback}</>;
  }

  // Check required capabilities
  if (requireAccounting && capabilities.accounting_mode === 'disabled') {
    return <>{fallback}</>;
  }

  if (requireExport && !capabilities.features.export) {
    return <>{fallback}</>;
  }

  if (requireSync && !capabilities.features.sync) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default CapabilityGate;

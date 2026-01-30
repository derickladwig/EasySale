/**
 * Capabilities Context
 * 
 * Provides backend capabilities information throughout the application.
 * Queries /api/capabilities on mount and caches the result.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchCapabilities, Capabilities } from '../../services/capabilities';

interface CapabilitiesContextValue {
  capabilities: Capabilities | null;
  loading: boolean;
  error: Error | null;
}

const CapabilitiesContext = createContext<CapabilitiesContextValue | undefined>(undefined);

interface CapabilitiesProviderProps {
  children: ReactNode;
}

export function CapabilitiesProvider({ children }: CapabilitiesProviderProps) {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadCapabilities() {
      try {
        const caps = await fetchCapabilities();
        setCapabilities(caps);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load capabilities'));
      } finally {
        setLoading(false);
      }
    }

    loadCapabilities();
  }, []);

  return (
    <CapabilitiesContext.Provider value={{ capabilities, loading, error }}>
      {children}
    </CapabilitiesContext.Provider>
  );
}

export function useCapabilities() {
  const context = useContext(CapabilitiesContext);
  if (context === undefined) {
    throw new Error('useCapabilities must be used within a CapabilitiesProvider');
  }
  return context;
}

/**
 * Hook to check if accounting features are available
 */
export function useHasAccountingFeatures(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.accounting_mode !== 'disabled';
}

/**
 * Hook to check if export features are available
 */
export function useHasExportFeatures(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.features.export ?? false;
}

/**
 * Hook to check if sync features are available
 */
export function useHasSyncFeatures(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.features.sync ?? false;
}

/**
 * Hook to check if integrations features are available
 */
export function useHasIntegrations(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.features.integrations ?? false;
}

/**
 * Hook to check if payments features are available
 */
export function useHasPayments(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.features.payments ?? false;
}

/**
 * Hook to check if Stripe integration is available
 */
export function useHasStripe(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.features.stripe ?? false;
}

/**
 * Hook to check if Square integration is available
 */
export function useHasSquare(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.features.square ?? false;
}

/**
 * Hook to check if Clover integration is available
 */
export function useHasClover(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.features.clover ?? false;
}

/**
 * Hook to check if Data Manager is available
 */
export function useHasDataManager(): boolean {
  const { capabilities } = useCapabilities();
  return capabilities?.features.data_manager ?? false;
}

/**
 * Hook to get the build variant
 */
export function useBuildVariant(): string {
  const { capabilities } = useCapabilities();
  return capabilities?.features.build_variant ?? 'lite';
}

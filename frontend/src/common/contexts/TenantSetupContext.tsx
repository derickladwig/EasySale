/**
 * TenantSetupContext
 * 
 * Provides first-run detection and tenant setup state management.
 * Blocks POS flows until tenant is configured.
 * 
 * Validates: Requirements 7.2
 * - IF no tenant is configured, THEN THE System SHALL show a Setup Wizard
 * - Block POS flows until configured
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { devLog } from '../utils/devLog';

// ============================================================================
// Types
// ============================================================================

export interface TenantSetupStatus {
  /** Whether the tenant has completed initial setup */
  isConfigured: boolean;
  /** Whether setup check is in progress */
  isLoading: boolean;
  /** Error message if setup check failed */
  error: string | null;
  /** Specific setup steps that are incomplete */
  incompleteSteps: SetupStep[];
  /** When setup was last checked */
  lastChecked: number | null;
}

export interface SetupStep {
  id: string;
  label: string;
  isComplete: boolean;
  isRequired: boolean;
}

export interface TenantSetupContextType extends TenantSetupStatus {
  /** Re-check setup status from backend */
  checkSetupStatus: () => Promise<void>;
  /** Mark setup as complete (called after wizard completion) */
  markSetupComplete: () => void;
  /** Clear cached setup status */
  clearSetupCache: () => void;
}

interface SetupStatusResponse {
  is_configured: boolean;
  incomplete_steps?: {
    id: string;
    label: string;
    is_complete: boolean;
    is_required: boolean;
  }[];
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SETUP_CACHE_KEY = 'EasySale_setup_status';
const SETUP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// API base URL - use relative URLs to ensure cookies are sent (same-origin)
// Works in both dev (Vite proxy) and prod (nginx proxy)
function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Use relative URLs - ensures same-origin requests so cookies work
  return '';
}

const API_BASE_URL = getApiBaseUrl();

// ============================================================================
// Context
// ============================================================================

const TenantSetupContext = createContext<TenantSetupContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface TenantSetupProviderProps {
  children: ReactNode;
  /** Skip API check and use this value (for testing) */
  initialStatus?: Partial<TenantSetupStatus>;
}

export function TenantSetupProvider({ 
  children, 
  initialStatus 
}: TenantSetupProviderProps) {
  const [isConfigured, setIsConfigured] = useState<boolean>(
    initialStatus?.isConfigured ?? false
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    initialStatus?.isLoading ?? true
  );
  const [error, setError] = useState<string | null>(
    initialStatus?.error ?? null
  );
  const [incompleteSteps, setIncompleteSteps] = useState<SetupStep[]>(
    initialStatus?.incompleteSteps ?? []
  );
  const [lastChecked, setLastChecked] = useState<number | null>(
    initialStatus?.lastChecked ?? null
  );

  // Load cached status on mount
  useEffect(() => {
    if (initialStatus) {
      // Skip loading if initial status provided (testing)
      setIsLoading(false);
      return;
    }

    const cached = loadCachedStatus();
    if (cached) {
      setIsConfigured(cached.isConfigured);
      setIncompleteSteps(cached.incompleteSteps);
      setLastChecked(cached.lastChecked);
      setIsLoading(false);
      
      // If cached and configured, don't re-check immediately
      if (cached.isConfigured) {
        return;
      }
    }

    // Check setup status from backend
    checkSetupStatusInternal();
  }, [initialStatus]);

  const checkSetupStatusInternal = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tenant/setup-status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If endpoint doesn't exist (404), assume not configured for first-run
        if (response.status === 404) {
          devLog.info('Setup status endpoint not found, assuming first-run');
          setIsConfigured(false);
          setIncompleteSteps([
            { id: 'admin', label: 'Create First Admin', isComplete: false, isRequired: true },
            { id: 'store', label: 'Store Basics', isComplete: false, isRequired: true },
            { id: 'taxes', label: 'Taxes', isComplete: false, isRequired: true },
            { id: 'locations', label: 'Locations & Registers', isComplete: false, isRequired: true },
          ]);
          cacheStatus(false, []);
          return;
        }
        throw new Error(`Failed to check setup status: ${response.statusText}`);
      }

      const data: SetupStatusResponse = await response.json();
      
      const configured = data.is_configured;
      const steps: SetupStep[] = (data.incomplete_steps || []).map(step => ({
        id: step.id,
        label: step.label,
        isComplete: step.is_complete,
        isRequired: step.is_required,
      }));

      setIsConfigured(configured);
      setIncompleteSteps(steps);
      cacheStatus(configured, steps);

    } catch (err) {
      devLog.error('Failed to check tenant setup status:', err);
      
      // On error, try to use cached status
      const cached = loadCachedStatus();
      if (cached) {
        setIsConfigured(cached.isConfigured);
        setIncompleteSteps(cached.incompleteSteps);
        setError('Failed to verify setup status. Using cached data.');
      } else {
        // No cache, assume not configured to be safe
        setIsConfigured(false);
        setError('Failed to check setup status. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setLastChecked(Date.now());
    }
  };

  const checkSetupStatus = useCallback(async () => {
    await checkSetupStatusInternal();
  }, []);

  const markSetupComplete = useCallback(async () => {
    try {
      // Call backend to persist setup completion
      const response = await fetch(`${API_BASE_URL}/api/tenant/setup-complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        devLog.warn('Failed to persist setup completion to backend:', response.statusText);
      }
    } catch (err) {
      devLog.warn('Failed to call setup-complete endpoint:', err);
    }

    // Update local state regardless of backend call success
    setIsConfigured(true);
    setIncompleteSteps([]);
    cacheStatus(true, []);
    devLog.info('Tenant setup marked as complete');
  }, []);

  const clearSetupCache = useCallback(() => {
    try {
      localStorage.removeItem(SETUP_CACHE_KEY);
      devLog.info('Setup cache cleared');
    } catch (e) {
      devLog.warn('Failed to clear setup cache:', e);
    }
    setLastChecked(null);
    // Also reset state to trigger re-check
    setIsConfigured(false);
    setIsLoading(true);
  }, []);

  const value: TenantSetupContextType = {
    isConfigured,
    isLoading,
    error,
    incompleteSteps,
    lastChecked,
    checkSetupStatus,
    markSetupComplete,
    clearSetupCache,
  };

  return (
    <TenantSetupContext.Provider value={value}>
      {children}
    </TenantSetupContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useTenantSetup(): TenantSetupContextType {
  const context = useContext(TenantSetupContext);
  if (context === undefined) {
    throw new Error('useTenantSetup must be used within a TenantSetupProvider');
  }
  return context;
}

// ============================================================================
// Cache Helpers
// ============================================================================

function loadCachedStatus(): { 
  isConfigured: boolean; 
  incompleteSteps: SetupStep[]; 
  lastChecked: number;
} | null {
  try {
    const cached = localStorage.getItem(SETUP_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.lastChecked;

    // Return cached data if within TTL
    if (age < SETUP_CACHE_TTL) {
      return parsed;
    }

    return null;
  } catch (e) {
    devLog.warn('Failed to load cached setup status:', e);
    return null;
  }
}

function cacheStatus(isConfigured: boolean, incompleteSteps: SetupStep[]): void {
  try {
    const data = {
      isConfigured,
      incompleteSteps,
      lastChecked: Date.now(),
    };
    localStorage.setItem(SETUP_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    devLog.warn('Failed to cache setup status:', e);
  }
}

// ============================================================================
// Exports
// ============================================================================

export { TenantSetupContext };

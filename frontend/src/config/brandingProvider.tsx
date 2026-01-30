/**
 * Branding Provider
 * 
 * Single source of truth for branding configuration.
 * Loads branding from /api/config/brand after tenant resolution.
 * Caches in localStorage for offline access.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface BrandingConfig {
  company: {
    name: string;
    short_name?: string;
    tagline?: string;
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    logo_alt_text: string;
    favicon_url?: string;
    icon_url?: string;
  };
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    background: string;
    surface: string;
    text: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  terminology: {
    product: string;
    products: string;
    customer: string;
    customers: string;
    sale: string;
    sales: string;
    sku_label: string;
  };
  store?: {
    name: string;
    station?: string;
  };
  login?: {
    background?: string;
    message?: string;
    show_logo: boolean;
    layout?: string;
  };
  receipts?: {
    header?: string;
    footer?: string;
    show_logo: boolean;
  };
}

interface BrandingContextValue {
  branding: BrandingConfig | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

const BRANDING_CACHE_KEY = 'EasySale_branding_cache';
const BRANDING_CACHE_TIMESTAMP_KEY = 'EasySale_branding_cache_timestamp';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load branding from cache if available and not expired
 */
function loadFromCache(): BrandingConfig | null {
  try {
    const cached = localStorage.getItem(BRANDING_CACHE_KEY);
    const timestamp = localStorage.getItem(BRANDING_CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) {
      return null;
    }
    
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    if (cacheAge > CACHE_DURATION_MS) {
      // Cache expired
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.warn('Failed to load branding from cache:', error);
    return null;
  }
}

/**
 * Save branding to cache
 */
function saveToCache(branding: BrandingConfig): void {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
    localStorage.setItem(BRANDING_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to save branding to cache:', error);
  }
}

/**
 * Fetch branding from API
 */
async function fetchBranding(): Promise<BrandingConfig> {
  const response = await fetch('/api/config/brand');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch branding: ${response.statusText}`);
  }
  
  return response.json();
}

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingConfig | null>(() => loadFromCache());
  const [loading, setLoading] = useState<boolean>(!branding);
  const [error, setError] = useState<Error | null>(null);
  
  const loadBranding = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const brandingData = await fetchBranding();
      setBranding(brandingData);
      saveToCache(brandingData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Failed to load branding:', error);
      
      // If we have cached data, use it even if fetch failed
      const cached = loadFromCache();
      if (cached && !branding) {
        setBranding(cached);
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Only load if we don't have branding yet
    if (!branding) {
      loadBranding();
    }
  }, []);
  
  const value: BrandingContextValue = {
    branding,
    loading,
    error,
    reload: loadBranding,
  };
  
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access branding configuration
 */
export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);
  
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  
  return context;
}

/**
 * Hook to access company branding
 */
export function useCompanyBranding() {
  const { branding } = useBranding();
  return branding?.company;
}

/**
 * Hook to access theme colors
 */
export function useThemeColors() {
  const { branding } = useBranding();
  return branding?.colors;
}

/**
 * Hook to access terminology
 */
export function useTerminology() {
  const { branding } = useBranding();
  return branding?.terminology;
}

/**
 * Hook to access store branding
 */
export function useStoreBranding() {
  const { branding } = useBranding();
  return branding?.store;
}

/**
 * BrandConfig Defaults
 * 
 * EasySale-neutral branding defaults for navigation consolidation.
 * These defaults replace any CAPS-specific values and provide a generic
 * white-label starting point.
 * 
 * Validates: Requirements 6.1
 * Task: 15.1 Create BrandConfig type and defaults
 */

import type { BrandConfig } from './types';

/**
 * Default EasySale branding configuration
 * 
 * This configuration provides EasySale-neutral defaults that can be
 * customized per tenant without code changes. All values are generic
 * and suitable for any retail business type.
 */
export const defaultBrandConfig: BrandConfig = {
  // Application name displayed in header and title
  appName: 'EasySale',
  
  // Company information
  company: {
    name: 'EasySale',
    shortName: 'ES',
    icon: undefined, // Optional icon for compact displays
  },
  
  // Logo paths for light and dark themes
  // PNG/JPG preferred for compatibility
  logo: {
    light: '/assets/logos/logo-light.png',
    dark: '/assets/logos/logo-dark.png',
  },
  
  // Favicon path (optional, falls back to default)
  favicon: '/assets/icons/icon-64.png',
  
  // Theme configuration
  theme: {
    accentColor: undefined, // Optional custom accent color (hex)
    preset: 'default', // Color preset: default, blue, green, purple
    defaultAppearance: 'system', // Tenant default: light, dark, or system
  },
  
  // Store information (optional, for multi-location setups)
  store: undefined,
};

/**
 * Development mode brand configuration
 * 
 * Used in development/demo mode with clearly labeled demo values.
 * This helps distinguish dev environments from production.
 */
export const devBrandConfig: BrandConfig = {
  appName: 'EasySale',
  
  company: {
    name: 'EasySale',
    shortName: 'ES',
  },
  
  logo: {
    light: '/assets/logos/logo-light.png',
    dark: '/assets/logos/logo-dark.png',
  },
  
  favicon: '/assets/icons/icon-64.png',
  
  theme: {
    preset: 'default',
    defaultAppearance: 'dark',
  },
  
  store: {
    name: 'Demo Store',
    station: 'Register 1',
  },
};

/**
 * First-run brand configuration
 * 
 * Used when no tenant configuration exists yet.
 * Shows generic "Untitled Store" to prompt setup wizard.
 */
export const firstRunBrandConfig: BrandConfig = {
  appName: 'EasySale',
  
  company: {
    name: 'EasySale',
    shortName: 'ES',
  },
  
  logo: {
    light: '/assets/logos/logo-light.png',
    dark: '/assets/logos/logo-dark.png',
  },
  
  favicon: '/assets/icons/icon-64.png',
  
  theme: {
    preset: 'default',
    defaultAppearance: 'system',
  },
  
  store: {
    name: 'Untitled Store',
    station: 'Register 1',
  },
};

/**
 * Convert TenantConfig BrandingConfig to BrandConfig
 * 
 * This utility function converts the more complex BrandingConfig
 * from TenantConfig into the simplified BrandConfig used by
 * navigation and layout components.
 * 
 * @param brandingConfig - The branding section from TenantConfig
 * @param themeConfig - Optional theme config to extract defaultAppearance
 * @returns BrandConfig suitable for AppLayout and navigation
 */
export function toBrandConfig(
  brandingConfig: {
    company: {
      name: string;
      shortName?: string;
      logo?: string;
      logoLight?: string;
      logoDark?: string;
      favicon?: string;
      icon?: string;
    };
    store?: {
      name?: string;
      station?: string;
    };
  },
  themeConfig?: {
    mode?: 'light' | 'dark' | 'auto';
  }
): BrandConfig {
  // Map theme mode to defaultAppearance
  let defaultAppearance: 'light' | 'dark' | 'system' = 'system';
  if (themeConfig?.mode === 'light') {
    defaultAppearance = 'light';
  } else if (themeConfig?.mode === 'dark') {
    defaultAppearance = 'dark';
  } else if (themeConfig?.mode === 'auto') {
    defaultAppearance = 'system';
  }
  
  return {
    appName: brandingConfig.company.name,
    company: {
      name: brandingConfig.company.name,
      shortName: brandingConfig.company.shortName,
      icon: brandingConfig.company.icon,
    },
    logo: {
      // Prefer explicit light/dark logos, fall back to generic logo
      light: brandingConfig.company.logoLight || brandingConfig.company.logo || defaultBrandConfig.logo.light,
      dark: brandingConfig.company.logoDark || brandingConfig.company.logo || defaultBrandConfig.logo.dark,
    },
    favicon: brandingConfig.company.favicon || defaultBrandConfig.favicon,
    theme: {
      preset: 'default',
      defaultAppearance,
    },
    store: brandingConfig.store ? {
      name: brandingConfig.store.name || 'Main Store',
      station: brandingConfig.store.station || 'Register 1',
    } : undefined,
  };
}

/**
 * Get brand configuration based on runtime profile
 * 
 * Returns appropriate brand config based on the current runtime profile:
 * - dev: Development/demo configuration
 * - demo: Demo mode configuration
 * - prod: Production configuration (from tenant config or first-run)
 * 
 * @param profile - Runtime profile (dev, demo, prod)
 * @param tenantBranding - Optional tenant branding config
 * @param tenantTheme - Optional tenant theme config
 * @returns Appropriate BrandConfig for the profile
 */
export function getBrandConfigForProfile(
  profile: 'dev' | 'demo' | 'prod',
  tenantBranding?: {
    company: {
      name: string;
      shortName?: string;
      logo?: string;
      logoLight?: string;
      logoDark?: string;
      favicon?: string;
      icon?: string;
    };
    store?: {
      name?: string;
      station?: string;
    };
  },
  tenantTheme?: {
    mode?: 'light' | 'dark' | 'auto';
  }
): BrandConfig {
  // Development and demo modes use dev config
  if (profile === 'dev' || profile === 'demo') {
    return devBrandConfig;
  }
  
  // Production mode: use tenant config if available, otherwise first-run
  if (tenantBranding) {
    return toBrandConfig(tenantBranding, tenantTheme);
  }
  
  return firstRunBrandConfig;
}

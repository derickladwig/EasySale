import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { TenantConfig, CategoryConfig, NavItem, LocalizationConfig, PresetPack, BrandConfig } from './types';
import { defaultConfig } from './defaultConfig';
import { validateConfig } from './validation';
import { mergeConfigs, type StoreConfig, type UserConfig } from './configMerge';
import { applyThemeToCSS } from './themeBridge';
import { preloadBrandingAssets, resolveLogo } from './assetCache';
import { toBrandConfig, getBrandConfigForProfile } from './brandConfig';
import { devLog } from '../common/utils/devLog';
import { getRuntimeProfile } from '../common/utils/demoMode';

// ============================================================================
// Context Types
// ============================================================================

interface ConfigContextValue {
  config: TenantConfig;
  isLoading: boolean;
  error: Error | null;

  // Runtime metadata
  profile: 'dev' | 'demo' | 'prod';
  presetPack: PresetPack | null;

  // Convenience accessors
  branding: TenantConfig['branding'];
  brandConfig: BrandConfig; // Simplified branding for navigation/header
  theme: TenantConfig['theme'];
  categories: CategoryConfig[];
  navigation: NavItem[];
  modules: TenantConfig['modules'];
  localization: LocalizationConfig;

  // Helper functions
  getCategory: (id: string) => CategoryConfig | undefined;
  isModuleEnabled: (moduleName: string) => boolean;
  getModuleSettings: <T = Record<string, unknown>>(moduleName: string) => T | undefined;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  formatNumber: (num: number) => string;
  getLogo: (preferDark?: boolean) => string;

  // Config management
  reloadConfig: () => Promise<void>;
  setStoreConfig: (storeConfig: StoreConfig) => void;
  setUserConfig: (userConfig: UserConfig) => void;
}

// ============================================================================
// Context
// ============================================================================

const ConfigContext = createContext<ConfigContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

interface ConfigProviderProps {
  children: ReactNode;
  configPath?: string;
  initialConfig?: TenantConfig;
  config?: TenantConfig; // For testing - bypasses API loading
}

// ============================================================================
// Provider Component
// ============================================================================

export function ConfigProvider({
  children,
  configPath = '/api/config',
  initialConfig,
  config: providedConfig,
}: ConfigProviderProps) {
  const [config, setConfig] = useState<TenantConfig>(
    providedConfig || initialConfig || defaultConfig
  );
  const [isLoading, setIsLoading] = useState(!providedConfig && !initialConfig);
  const [error, setError] = useState<Error | null>(null);
  const [storeConfig, setStoreConfigState] = useState<StoreConfig | undefined>();
  const [userConfig, setUserConfigState] = useState<UserConfig | undefined>();
  // Use getRuntimeProfile() to determine initial profile from environment
  // This ensures prod builds show real branding, not "Demo Store"
  const [profile, setProfile] = useState<'dev' | 'demo' | 'prod'>(getRuntimeProfile);
  const [presetPack, setPresetPack] = useState<PresetPack | null>(null);

  // Clear stale CAPS config on startup (one-time migration)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('EasySale_config');
      if (cached) {
        const cachedConfig = JSON.parse(cached);
        const isCapsConfig = cachedConfig.branding?.company?.name?.toLowerCase().includes('caps') ||
                             cachedConfig.tenant?.name?.toLowerCase().includes('caps');
        if (isCapsConfig) {
          devLog.info('Clearing stale CAPS config from localStorage');
          localStorage.removeItem('EasySale_config');
          localStorage.removeItem('EasySale_config_timestamp');
          localStorage.removeItem('EasySale_config_tenant');
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Load configuration from API or file
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load from API first
      const response = await fetch(configPath, {
        credentials: 'include',
      });

      if (!response.ok) {
        // If API fails, use default config
        devLog.warn('Failed to load config from API, using default');
        const finalConfig = mergeConfigs({
          default: defaultConfig,
          store: storeConfig,
          user: userConfig,
        });
        setConfig(finalConfig);
        applyThemeToCSS(finalConfig.theme);
        return;
      }

      const loadedConfigData = await response.json();

      // Extract runtime metadata
      const runtimeProfile = loadedConfigData.profile || 'dev';
      const runtimePresetPack = loadedConfigData.presetPack || null;
      
      setProfile(runtimeProfile);
      setPresetPack(runtimePresetPack);

      // Validate configuration
      const validationResult = validateConfig(loadedConfigData);

      let tenantConfig: TenantConfig;
      if (validationResult.success && validationResult.data) {
        tenantConfig = validationResult.data;
      } else {
        // Validation failed - use defaults in production
        devLog.warn('Config validation failed, using defaults');
        tenantConfig = defaultConfig;
      }

      // Merge all configuration layers
      const mergedConfig = mergeConfigs({
        default: defaultConfig,
        tenant: tenantConfig,
        store: storeConfig,
        user: userConfig,
      });

      setConfig(mergedConfig);

      // Apply theme to CSS variables
      applyThemeToCSS(mergedConfig.theme);

      // Preload branding assets for offline use
      await preloadBrandingAssets(mergedConfig.branding);

      // Cache in localStorage for offline access
      try {
        localStorage.setItem('EasySale_config', JSON.stringify(mergedConfig));
        localStorage.setItem('EasySale_config_timestamp', Date.now().toString());
        localStorage.setItem('EasySale_config_tenant', mergedConfig.tenant?.id || 'default');
      } catch (e) {
        devLog.warn('Failed to cache config in localStorage:', e);
      }
    } catch (err) {
      devLog.error('Error loading config:', err);
      setError(err instanceof Error ? err : new Error('Failed to load configuration'));

      // Try to load from cache - but only if tenant matches
      try {
        const cached = localStorage.getItem('EasySale_config');
        const cachedTenant = localStorage.getItem('EasySale_config_tenant');
        
        // Invalidate cache if tenant doesn't match or contains CAPS-specific data
        if (cached) {
          const cachedConfig = JSON.parse(cached);
          const isCapsConfig = cachedConfig.branding?.company?.name?.toLowerCase().includes('caps') ||
                               cachedConfig.tenant?.name?.toLowerCase().includes('caps');
          
          if (isCapsConfig || (cachedTenant && cachedTenant !== 'default' && cachedTenant !== cachedConfig.tenant?.id)) {
            // Clear stale CAPS config
            devLog.info('Clearing stale CAPS config from cache');
            localStorage.removeItem('EasySale_config');
            localStorage.removeItem('EasySale_config_timestamp');
            localStorage.removeItem('EasySale_config_tenant');
          } else {
            setConfig(cachedConfig);
            applyThemeToCSS(cachedConfig.theme);
            devLog.info('Loaded config from cache');
          }
        }
      } catch {
        // Use default if cache fails
        const finalConfig = mergeConfigs({
          default: defaultConfig,
          store: storeConfig,
          user: userConfig,
        });
        setConfig(finalConfig);
        applyThemeToCSS(finalConfig.theme);
      }
    } finally {
      setIsLoading(false);
    }
  }, [configPath, storeConfig, userConfig]);

  // Load config on mount
  useEffect(() => {
    if (!providedConfig && !initialConfig) {
      loadConfig();
    }
  }, [providedConfig, initialConfig, loadConfig]);

  // Helper: Get category by ID
  const getCategory = useCallback(
    (id: string): CategoryConfig | undefined => {
      return config.categories.find((cat) => cat.id === id);
    },
    [config.categories]
  );

  // Helper: Check if module is enabled
  const isModuleEnabled = useCallback(
    (moduleName: string): boolean => {
      const module = config.modules[moduleName];
      return module?.enabled ?? false;
    },
    [config.modules]
  );

  // Helper: Get module settings
  const getModuleSettings = useCallback(
    <T = Record<string, unknown>,>(moduleName: string): T | undefined => {
      const module = config.modules[moduleName];
      return module?.settings as T | undefined;
    },
    [config.modules]
  );

  // Helper: Format currency
  const formatCurrency = useCallback(
    (amount: number): string => {
      const { currency } = config.localization;
      const symbol = currency?.symbol || '$';
      const position = currency?.position || 'before';
      const formatted = formatNumberInternal(amount, config.localization, 2);

      return position === 'before' ? `${symbol}${formatted}` : `${formatted}${symbol}`;
    },
    [config.localization]
  );

  // Helper: Format date
  const formatDate = useCallback(
    (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const format = config.localization.dateFormat || 'MM/DD/YYYY';

      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString();

      return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year)
        .replace('YY', year.slice(-2));
    },
    [config.localization.dateFormat]
  );

  // Helper: Format number
  const formatNumber = useCallback(
    (num: number): string => {
      return formatNumberInternal(num, config.localization);
    },
    [config.localization]
  );

  // Helper: Get logo with fallback
  const getLogo = useCallback(
    (preferDark?: boolean): string => {
      return resolveLogo(config.branding, { preferDark });
    },
    [config.branding]
  );

  // Config management: Set store config
  const setStoreConfig = useCallback((newStoreConfig: StoreConfig) => {
    setStoreConfigState(newStoreConfig);
    // Trigger reload to apply new config
    loadConfig();
  }, [loadConfig]);

  // Config management: Set user config
  const setUserConfig = useCallback((newUserConfig: UserConfig) => {
    setUserConfigState(newUserConfig);
    // Trigger reload to apply new config
    loadConfig();
  }, [loadConfig]);

  // Context value
  const value: ConfigContextValue = {
    config,
    isLoading,
    error,

    // Runtime metadata
    profile,
    presetPack,

    // Convenience accessors
    branding: config.branding,
    brandConfig: getBrandConfigForProfile(profile, config.branding, config.theme),
    theme: config.theme,
    categories: config.categories,
    navigation: config.navigation.main,
    modules: config.modules,
    localization: config.localization,

    // Helper functions
    getCategory,
    isModuleEnabled,
    getModuleSettings,
    formatCurrency,
    formatDate,
    formatNumber,
    getLogo,

    // Config management
    reloadConfig: loadConfig,
    setStoreConfig,
    setUserConfig,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);

  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }

  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatNumberInternal(
  num: number,
  localization: LocalizationConfig,
  decimals?: number
): string {
  const decimal = localization.numberFormat?.decimal || '.';
  const thousands = localization.numberFormat?.thousands || ',';

  const parts = num.toFixed(decimals ?? 0).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

  return parts.join(decimal);
}

// ============================================================================
// Exports
// ============================================================================

export { ConfigContext };
export type { ConfigContextValue, ConfigProviderProps };

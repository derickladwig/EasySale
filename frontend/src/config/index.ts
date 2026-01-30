/**
 * EasySale Configuration System
 *
 * This module provides the configuration infrastructure for the multi-tenant
 * white-label POS system. All UI components should use these providers and
 * hooks to access tenant-specific configuration.
 *
 * Usage:
 *
 * 1. Wrap your app with ConfigProvider and ThemeProvider:
 *
 *    import { ConfigProvider, ThemeProvider } from './config';
 *
 *    function App() {
 *      return (
 *        <ConfigProvider>
 *          <ThemeProvider>
 *            <YourApp />
 *          </ThemeProvider>
 *        </ConfigProvider>
 *      );
 *    }
 *
 * 2. Use the hooks in your components:
 *
 *    import { useConfig, useTheme } from './config';
 *
 *    function MyComponent() {
 *      const { branding, categories, isModuleEnabled } = useConfig();
 *      const { mode, getColor } = useTheme();
 *
 *      return (
 *        <div>
 *          <h1>{branding.company.name}</h1>
 *          {isModuleEnabled('loyalty') && <LoyaltyWidget />}
 *        </div>
 *      );
 *    }
 */

// Providers
export { ConfigProvider, useConfig, ConfigContext } from './ConfigProvider';
export { ThemeProvider, useTheme, ThemeContext } from './ThemeProvider';

// Default configuration
export { defaultConfig } from './defaultConfig';

// Validation
export { validateConfig, validateConfigFromJSON, isValidConfig } from './validation';

// Config merge
export { mergeConfigs, resolveTheme } from './configMerge';

// Theme bridge
export { applyThemeToCSS, removeThemeFromCSS, getCurrentThemeVariables } from './themeBridge';

// Asset cache
export {
  cacheAsset,
  cacheAssets,
  getCachedAsset,
  clearAssetCache,
  resolveLogo,
  resolveAndCacheLogo,
  preloadBrandingAssets,
  getCacheStats,
  DEFAULT_LOGO,
  DEFAULT_LOGO_DARK,
} from './assetCache';

// Brand configuration
export {
  defaultBrandConfig,
  devBrandConfig,
  firstRunBrandConfig,
  toBrandConfig,
  getBrandConfigForProfile,
} from './brandConfig';

// Types
export type {
  // Core
  TenantConfig,
  TenantInfo,

  // Branding
  BrandConfig,
  BrandingConfig,
  CompanyBranding,
  LoginBranding,
  ReceiptBranding,
  StoreBranding,

  // Theme
  ThemeConfig,
  ThemeColors,
  ColorScale,
  ThemeFonts,
  ThemeSpacing,
  ThemeBorderRadius,
  ThemeAnimations,

  // Categories
  CategoryConfig,
  AttributeConfig,
  AttributeType,
  FilterConfig,
  WizardConfig,
  WizardStep,

  // Navigation
  NavigationConfig,
  NavItem,
  QuickAction,
  SidebarConfig,
  HeaderConfig,

  // Widgets
  WidgetsConfig,
  WidgetConfig,
  WidgetType,

  // Modules
  ModulesConfig,
  ModuleConfig,

  // Localization
  LocalizationConfig,

  // Layouts
  LayoutsConfig,
  PageLayout,
  PanelConfig,

  // Wizards
  WizardsConfig,
  HierarchyConfig,
  HierarchyLevel,
  ImportMappingConfig,
  ImportFieldConfig,

  // Database
  DatabaseConfig,
  CustomTableConfig,
  CustomColumnConfig,

  // Utility
  DeepPartial,
  ConfigOverride,
} from './types';

// Provider types
export type { ConfigContextValue, ConfigProviderProps } from './ConfigProvider';
export type { ThemeContextValue, ThemeProviderProps } from './ThemeProvider';

// Validation types
export type { ValidationResult } from './validation';

// Config merge types
export type { ConfigLayers, StoreConfig, UserConfig, ThemeLocks } from './configMerge';

// Theme bridge types
export type { CSSVariableMap } from './themeBridge';

// Asset cache types
export type { AssetCacheEntry, AssetCache, LogoFallbackOptions } from './assetCache';

// Icon utilities
export { DynamicIcon, useIcon, getIcon, isValidIcon, getAvailableIcons } from './useIcon';
export type { LucideIcon } from './useIcon';

// ConfigStore
export {
  ConfigStoreSqliteAdapter,
  ConfigStoreApiAdapter,
  ConfigStoreCachedAdapter,
  createConfigStore,
} from './ConfigStore';
export type {
  IConfigStore,
  SettingScope,
  ThemeLocks as ConfigStoreThemeLocks,
  StoreThemeConfig,
  ThemePreferences,
  SettingValue,
  ResolvedConfig,
} from './ConfigStore';

// Navigation Configuration (section-based)
export {
  mainNavItems,
  adminSubNavItems,
  profileMenuItems,
  filterNavigationByPermissions,
  filterNavigationBySection,
  getAllNavigationItems,
  toNavItem,
  getMainNavAsNavItems,
} from './navigation';
export type {
  NavigationItem,
  NavigationSection,
  ProfileMenuItem,
} from './navigation';

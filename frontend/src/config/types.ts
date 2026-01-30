/**
 * EasySale Configuration Types
 *
 * These types define the structure of tenant configuration files.
 * All UI components should read from these configurations instead of hardcoded values.
 */

// ============================================================================
// Core Types
// ============================================================================

export interface TenantConfig {
  version: string;
  tenant: TenantInfo;
  branding: BrandingConfig;
  theme: ThemeConfig;
  categories: CategoryConfig[];
  navigation: NavigationConfig;
  widgets: WidgetsConfig;
  modules: ModulesConfig;
  localization: LocalizationConfig;
  layouts: LayoutsConfig;
  wizards: WizardsConfig;
  database?: DatabaseConfig;
  // Runtime metadata (added by backend)
  profile?: RuntimeProfile;
  presetPack?: PresetPack;
}

export type RuntimeProfile = 'dev' | 'demo' | 'prod';

export interface PresetPack {
  users?: DemoUser[];
  products?: unknown[];
  customers?: unknown[];
}

export interface DemoUser {
  username: string;
  password: string;
  role: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  description?: string;
}

// ============================================================================
// Branding
// ============================================================================

/**
 * BrandConfig - Simplified branding configuration for navigation consolidation
 * 
 * This is a focused interface for runtime branding that's used by AppLayout
 * and navigation components. It provides EasySale-neutral defaults and supports
 * white-label customization.
 * 
 * Validates: Requirements 6.1
 */
export interface BrandConfig {
  appName: string;
  company: {
    name: string;
    shortName?: string;
    icon?: string;
  };
  logo: {
    light: string;  // Path to light theme logo (PNG/JPG preferred)
    dark: string;   // Path to dark theme logo (PNG/JPG preferred)
  };
  favicon?: string;
  theme: {
    accentColor?: string;
    preset?: 'default' | 'blue' | 'green' | 'purple';
    defaultAppearance?: 'light' | 'dark' | 'system';  // Tenant default
  };
  store?: {
    name: string;
    station: string;
  };
}

export interface BrandingConfig {
  company: CompanyBranding;
  login?: LoginBranding;
  receipts?: ReceiptBranding;
  store?: StoreBranding;
}

export interface CompanyBranding {
  name: string;
  shortName?: string;
  tagline?: string;
  logo?: string;
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  icon?: string;
}

export interface LoginBranding {
  background?: string;
  message?: string;
  showLogo?: boolean;
  layout?: 'centered' | 'split' | 'full-screen';
}

export interface ReceiptBranding {
  header?: string;
  footer?: string;
  showLogo?: boolean;
}

export interface StoreBranding {
  name?: string;
  station?: string;
}

// ============================================================================
// Theme
// ============================================================================

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  colors: ThemeColors;
  fonts?: ThemeFonts;
  spacing?: ThemeSpacing;
  borderRadius?: ThemeBorderRadius;
  animations?: ThemeAnimations;
}

export interface ThemeColors {
  primary: ColorScale | string;
  secondary?: ColorScale | string;
  accent?: ColorScale | string;
  background: string;
  surface: string;
  text: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500: string;
  600: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;
}

export interface ThemeFonts {
  heading?: string;
  body?: string;
  mono?: string;
}

export interface ThemeSpacing {
  base?: number;
  scale?: number[];
}

export interface ThemeBorderRadius {
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

export interface ThemeAnimations {
  fast?: string;
  normal?: string;
  slow?: string;
  easing?: string;
}

// ============================================================================
// Categories
// ============================================================================

export interface CategoryConfig {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  parent?: string;
  order?: number;
  attributes: AttributeConfig[];
  searchFields?: string[];
  displayTemplate?: string;
  filters?: FilterConfig[];
  wizard?: WizardConfig;
}

export interface AttributeConfig {
  name: string;
  label?: string;
  type: AttributeType;
  required?: boolean;
  unique?: boolean;
  values?: string[];
  hierarchySource?: string;
  min?: number;
  max?: number;
  pattern?: string;
  default?: unknown;
  placeholder?: string;
  helpText?: string;
}

export type AttributeType =
  | 'text'
  | 'number'
  | 'dropdown'
  | 'multi-select'
  | 'date'
  | 'boolean'
  | 'json'
  | 'hierarchy';

export interface FilterConfig {
  field: string;
  label?: string;
  type: 'dropdown' | 'range' | 'search' | 'checkbox' | 'hierarchy';
  options?: unknown[];
}

export interface WizardConfig {
  enabled: boolean;
  steps?: WizardStep[];
}

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  fields?: string[];
  dependsOn?: string;
  filterBy?: string;
}

// ============================================================================
// Navigation
// ============================================================================

export interface NavigationConfig {
  main: NavItem[];
  quickActions?: QuickAction[];
  sidebar?: SidebarConfig;
  header?: HeaderConfig;
}

export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  route: string;
  permission?: string;
  order?: number;
  badge?: string;
  children?: NavItem[];
}

export interface QuickAction {
  label: string;
  icon?: string;
  action: string;
  permission?: string;
}

export interface SidebarConfig {
  width?: 'narrow' | 'medium' | 'wide';
  collapsible?: boolean;
  showLabels?: boolean;
}

export interface HeaderConfig {
  showSearch?: boolean;
  showNotifications?: boolean;
  showSync?: boolean;
  showUser?: boolean;
}

// ============================================================================
// Widgets
// ============================================================================

export interface WidgetsConfig {
  dashboard: WidgetConfig[];
  available?: WidgetConfig[];
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  query?: string;
  endpoint?: string;
  format?: string;
  size?: string;
  position?: { x: number; y: number };
  refreshInterval?: number;
  permission?: string;
}

export type WidgetType =
  | 'stat-card'
  | 'line-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'table'
  | 'list'
  | 'custom';

// ============================================================================
// Modules
// ============================================================================

export interface ModulesConfig {
  [moduleName: string]: ModuleConfig;
}

export interface ModuleConfig {
  enabled: boolean;
  settings?: Record<string, unknown>;
}

// ============================================================================
// Localization
// ============================================================================

export interface LocalizationConfig {
  language?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  numberFormat?: {
    decimal?: string;
    thousands?: string;
  };
  currency?: {
    code?: string;
    symbol?: string;
    position?: 'before' | 'after';
  };
  timezone?: string;
  firstDayOfWeek?: number;
  measurementUnits?: 'metric' | 'imperial';
}

// ============================================================================
// Layouts
// ============================================================================

export interface LayoutsConfig {
  sell?: PageLayout;
  lookup?: PageLayout;
  dashboard?: PageLayout;
  settings?: PageLayout;
  [key: string]: PageLayout | undefined;
}

export interface PageLayout {
  type: 'split' | 'full' | 'sidebar' | 'grid';
  panels?: PanelConfig[];
  responsive?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
}

export interface PanelConfig {
  id: string;
  type: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  collapsible?: boolean;
}

// ============================================================================
// Wizards
// ============================================================================

export interface WizardsConfig {
  hierarchies?: HierarchyConfig[];
  importMappings?: ImportMappingConfig[];
}

export interface HierarchyConfig {
  id: string;
  name: string;
  description?: string;
  levels: HierarchyLevel[];
  data?: unknown[];
}

export interface HierarchyLevel {
  id: string;
  name: string;
  placeholder?: string;
}

export interface ImportMappingConfig {
  id: string;
  name: string;
  description?: string;
  supportedFormats?: ('csv' | 'xlsx' | 'json')[];
  fields: ImportFieldConfig[];
}

export interface ImportFieldConfig {
  target: string;
  label?: string;
  required?: boolean;
  transform?: string;
}

// ============================================================================
// Database
// ============================================================================

export interface DatabaseConfig {
  customTables?: CustomTableConfig[];
  customColumns?: Record<string, CustomColumnConfig[]>;
}

export interface CustomTableConfig {
  name: string;
  columns: CustomColumnConfig[];
}

export interface CustomColumnConfig {
  name: string;
  label?: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'enum';
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  values?: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ConfigOverride = DeepPartial<TenantConfig>;

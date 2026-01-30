/**
 * Themeable Login System - Type Definitions
 *
 * These types define the structure of login theme configuration files.
 * Supports multiple visual presets (Minimal Dark Split, Glass + Waves, Ambient Photo)
 * with runtime switching and configuration-driven customization.
 */

// ============================================================================
// Core Theme Configuration
// ============================================================================

export interface LoginThemeConfig {
  name: string;
  version: string;
  layout: LayoutConfig;
  tokens: TokenConfig;
  components: ComponentConfig;
  background: BackgroundConfig;
}

// ============================================================================
// Layout Configuration
// ============================================================================

export type LayoutTemplate =
  | 'splitHeroCompactForm'
  | 'leftStatusRightAuthCard'
  | 'leftStatusRightAuthCardPhoto';

export interface LayoutConfig {
  template: LayoutTemplate;
  slots: {
    header: SlotConfig;
    left: LeftSlotConfig;
    main: MainSlotConfig;
    footer: SlotConfig;
  };
  responsive: ResponsiveConfig;
}

export interface SlotConfig {
  enabled: boolean;
  components: string[];
}

export interface LeftSlotConfig {
  variant: 'marketing' | 'status';
}

export interface MainSlotConfig {
  variant: 'compact' | 'card';
}

export interface ResponsiveConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
    kiosk: number;
  };
  stackOnMobile: boolean;
}

// ============================================================================
// Token Configuration
// ============================================================================

export interface TokenConfig {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  shadows: ShadowTokens;
  blur: BlurTokens;
  radius: RadiusTokens;
}

export interface ColorTokens {
  surface: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: {
    default: string;
    focus: string;
    error: string;
  };
  accent: {
    primary: string;
    hover: string;
    active: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface TypographyTokens {
  fontFamily: {
    primary: string;
    monospace: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface SpacingTokens {
  scale: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface ShadowTokens {
  elevation: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface BlurTokens {
  backdrop: {
    none: string;
    sm: string;
    md: string;
    lg: string;
  };
  enabled: boolean;
}

export interface RadiusTokens {
  card: string;
  input: string;
  button: string;
  pill: string;
}

// ============================================================================
// Component Configuration
// ============================================================================

export interface ComponentConfig {
  authCard: AuthCardConfig;
  statusCard: StatusCardConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  errorCallout: ErrorCalloutConfig;
}

export type AuthMethod = 'pin' | 'password' | 'badge';

export interface AuthCardConfig {
  methods: AuthMethod[];
  showStorePicker: boolean;
  showStationPicker: boolean;
  showDeviceIdentity: boolean;
  showDemoAccounts: boolean;
  glassmorphism: boolean;
  elevation: 'none' | 'sm' | 'md' | 'lg';
}

export interface StatusCardConfig {
  variant: 'systemForward' | 'locationForward';
  showDatabaseStatus: boolean;
  showSyncStatus: boolean;
  showLastSync: boolean;
  showStoreInfo: boolean;
  showStationInfo: boolean;
}

export interface HeaderConfig {
  showLogo: boolean;
  showEnvironmentSelector: boolean;
  showHelpMenu: boolean;
  logoUrl?: string;
  companyName: string;
}

export interface FooterConfig {
  showVersion: boolean;
  showBuild: boolean;
  showCopyright: boolean;
  copyrightText: string;
}

export interface ErrorCalloutConfig {
  presentation: 'inline' | 'callout';
  showRetryAction: boolean;
  showDiagnosticsAction: boolean;
}

// ============================================================================
// Background Configuration
// ============================================================================

export type BackgroundType = 'solid' | 'gradient' | 'waves' | 'photo';

export interface BackgroundConfig {
  type: BackgroundType;
  solid?: SolidBackgroundConfig;
  gradient?: GradientBackgroundConfig;
  waves?: WavesBackgroundConfig;
  photo?: PhotoBackgroundConfig;
}

export interface SolidBackgroundConfig {
  color: string;
}

export interface GradientBackgroundConfig {
  stops: ColorStop[];
}

export interface ColorStop {
  color: string;
  position: number; // 0-100
}

export interface WavesBackgroundConfig {
  baseColor: string;
  waveColor: string;
  intensity: number;
  showDotGrid: boolean;
  dotGridOpacity: number;
}

export interface PhotoOverlay {
  enabled: boolean;
  color: string;
  opacity: number;
}

export interface PhotoBackgroundConfig {
  url: string;
  lowResUrl?: string;
  placeholderColor: string;
  blur: number;
  overlay: PhotoOverlay;
}

// ============================================================================
// Runtime State Types
// ============================================================================

export interface Credentials {
  method: AuthMethod;
  username?: string;
  password?: string;
  pin?: string;
  badgeId?: string;
  storeId?: string;
  stationId?: string;
  rememberStation: boolean;
}

export interface DatabaseStatus {
  connected: boolean;
  path: string;
  size: number;
}

export interface SyncStatus {
  state: 'online' | 'offline' | 'syncing' | 'error';
  pendingOperations: number;
  lastError?: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  location: string;
}

export interface StationInfo {
  id: string;
  name: string;
  type: 'pos' | 'kiosk' | 'mobile';
}

export interface ErrorAction {
  type: 'retry' | 'diagnostics' | 'dismiss';
  label: string;
  icon?: string;
}

/**
 * Themeable Login System - Zod Schema
 *
 * Runtime validation schema for login theme configuration.
 * Ensures all configuration files are valid before application.
 */

import { z } from 'zod';

// ============================================================================
// Layout Schema
// ============================================================================

const LayoutTemplateSchema = z.enum([
  'splitHeroCompactForm',
  'leftStatusRightAuthCard',
  'leftStatusRightAuthCardPhoto',
]);

const SlotConfigSchema = z.object({
  enabled: z.boolean(),
  components: z.array(z.string()),
});

const LeftSlotConfigSchema = z.object({
  variant: z.enum(['marketing', 'status']),
});

const MainSlotConfigSchema = z.object({
  variant: z.enum(['compact', 'card']),
});

const ResponsiveConfigSchema = z.object({
  breakpoints: z.object({
    mobile: z.number().positive(),
    tablet: z.number().positive(),
    desktop: z.number().positive(),
    kiosk: z.number().positive(),
  }),
  stackOnMobile: z.boolean(),
});

const LayoutConfigSchema = z.object({
  template: LayoutTemplateSchema,
  slots: z.object({
    header: SlotConfigSchema,
    left: LeftSlotConfigSchema,
    main: MainSlotConfigSchema,
    footer: SlotConfigSchema,
  }),
  responsive: ResponsiveConfigSchema,
});

// ============================================================================
// Token Schema
// ============================================================================

const ColorTokensSchema = z.object({
  surface: z.object({
    primary: z.string(),
    secondary: z.string(),
    tertiary: z.string(),
  }),
  text: z.object({
    primary: z.string(),
    secondary: z.string(),
    tertiary: z.string(),
    inverse: z.string(),
  }),
  border: z.object({
    default: z.string(),
    focus: z.string(),
    error: z.string(),
  }),
  accent: z.object({
    primary: z.string(),
    hover: z.string(),
    active: z.string(),
  }),
  status: z.object({
    success: z.string(),
    warning: z.string(),
    error: z.string(),
    info: z.string(),
  }),
});

const TypographyTokensSchema = z.object({
  fontFamily: z.object({
    primary: z.string(),
    monospace: z.string(),
  }),
  fontSize: z.object({
    xs: z.string(),
    sm: z.string(),
    base: z.string(),
    lg: z.string(),
    xl: z.string(),
    xxl: z.string(),
  }),
  fontWeight: z.object({
    normal: z.number().int().min(100).max(900),
    medium: z.number().int().min(100).max(900),
    semibold: z.number().int().min(100).max(900),
    bold: z.number().int().min(100).max(900),
  }),
  lineHeight: z.object({
    tight: z.number().positive(),
    normal: z.number().positive(),
    relaxed: z.number().positive(),
  }),
});

const SpacingTokensSchema = z.object({
  scale: z.object({
    xs: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
    xxl: z.string(),
  }),
  density: z.enum(['compact', 'comfortable', 'spacious']),
});

const ShadowTokensSchema = z.object({
  elevation: z.object({
    none: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
  }),
});

const BlurTokensSchema = z.object({
  backdrop: z.object({
    none: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
  }),
  enabled: z.boolean(),
});

const RadiusTokensSchema = z.object({
  card: z.string(),
  input: z.string(),
  button: z.string(),
  pill: z.string(),
});

const TokenConfigSchema = z.object({
  colors: ColorTokensSchema,
  typography: TypographyTokensSchema,
  spacing: SpacingTokensSchema,
  shadows: ShadowTokensSchema,
  blur: BlurTokensSchema,
  radius: RadiusTokensSchema,
});

// ============================================================================
// Component Schema
// ============================================================================

const AuthMethodSchema = z.enum(['pin', 'password', 'badge']);

const AuthCardConfigSchema = z.object({
  methods: z.array(AuthMethodSchema),
  showStorePicker: z.boolean(),
  showStationPicker: z.boolean(),
  showDeviceIdentity: z.boolean(),
  showDemoAccounts: z.boolean(),
  glassmorphism: z.boolean(),
  elevation: z.enum(['none', 'sm', 'md', 'lg']),
});

const StatusCardConfigSchema = z.object({
  variant: z.enum(['systemForward', 'locationForward']),
  showDatabaseStatus: z.boolean(),
  showSyncStatus: z.boolean(),
  showLastSync: z.boolean(),
  showStoreInfo: z.boolean(),
  showStationInfo: z.boolean(),
});

const HeaderConfigSchema = z.object({
  showLogo: z.boolean(),
  showEnvironmentSelector: z.boolean(),
  showHelpMenu: z.boolean(),
  logoUrl: z.string().optional(),
  companyName: z.string(),
});

const FooterConfigSchema = z.object({
  showVersion: z.boolean(),
  showBuild: z.boolean(),
  showCopyright: z.boolean(),
  copyrightText: z.string(),
});

const ErrorCalloutConfigSchema = z.object({
  presentation: z.enum(['inline', 'callout']),
  showRetryAction: z.boolean(),
  showDiagnosticsAction: z.boolean(),
});

const ComponentConfigSchema = z.object({
  authCard: AuthCardConfigSchema,
  statusCard: StatusCardConfigSchema,
  header: HeaderConfigSchema,
  footer: FooterConfigSchema,
  errorCallout: ErrorCalloutConfigSchema,
});

// ============================================================================
// Background Schema
// ============================================================================

const BackgroundTypeSchema = z.enum(['solid', 'gradient', 'waves', 'photo']);

const SolidBackgroundConfigSchema = z.object({
  color: z.string(),
});

const ColorStopSchema = z.object({
  color: z.string(),
  position: z.number().min(0).max(100),
});

const GradientBackgroundConfigSchema = z.object({
  stops: z.array(ColorStopSchema).min(2),
});

const WavesBackgroundConfigSchema = z.object({
  baseColor: z.string(),
  waveColor: z.string(),
  intensity: z.number().min(0).max(1),
  showDotGrid: z.boolean(),
  dotGridOpacity: z.number().min(0).max(1),
});

const PhotoOverlaySchema = z.object({
  enabled: z.boolean(),
  color: z.string(),
  opacity: z.number().min(0).max(1),
});

const PhotoBackgroundConfigSchema = z.object({
  url: z.string(),
  lowResUrl: z.string().optional(),
  placeholderColor: z.string(),
  blur: z.number().min(0),
  overlay: PhotoOverlaySchema,
});

const BackgroundConfigSchema = z.object({
  type: BackgroundTypeSchema,
  solid: SolidBackgroundConfigSchema.optional(),
  gradient: GradientBackgroundConfigSchema.optional(),
  waves: WavesBackgroundConfigSchema.optional(),
  photo: PhotoBackgroundConfigSchema.optional(),
});

// ============================================================================
// Main Theme Configuration Schema
// ============================================================================

export const LoginThemeConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  layout: LayoutConfigSchema,
  tokens: TokenConfigSchema,
  components: ComponentConfigSchema,
  background: BackgroundConfigSchema,
});

// ============================================================================
// Validation Function
// ============================================================================

export function validateLoginThemeConfig(config: unknown) {
  return LoginThemeConfigSchema.parse(config);
}

export function validateLoginThemeConfigSafe(config: unknown) {
  return LoginThemeConfigSchema.safeParse(config);
}

// ============================================================================
// Type Exports
// ============================================================================

export type LoginThemeConfigInput = z.input<typeof LoginThemeConfigSchema>;
export type LoginThemeConfigOutput = z.output<typeof LoginThemeConfigSchema>;

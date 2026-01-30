/**
 * Configuration Validation
 *
 * Validates tenant configuration files against the schema using Zod.
 * Provides hard-fail in development and soft-fail in production.
 */

import { z } from 'zod';
import type { TenantConfig } from './types';

// ============================================================================
// Zod Schema Definitions
// ============================================================================

const ColorScaleSchema = z.union([
  z.string(),
  z.object({
    50: z.string().optional(),
    100: z.string().optional(),
    200: z.string().optional(),
    300: z.string().optional(),
    400: z.string().optional(),
    500: z.string(),
    600: z.string(),
    700: z.string().optional(),
    800: z.string().optional(),
    900: z.string().optional(),
  }),
]);

const ThemeColorsSchema = z.object({
  primary: ColorScaleSchema,
  secondary: ColorScaleSchema.optional(),
  accent: ColorScaleSchema.optional(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  success: z.string(),
  warning: z.string(),
  error: z.string(),
  info: z.string(),
});

const ThemeSchema = z.object({
  mode: z.enum(['light', 'dark', 'auto']),
  colors: ThemeColorsSchema,
  fonts: z
    .object({
      heading: z.string().optional(),
      body: z.string().optional(),
      mono: z.string().optional(),
    })
    .optional(),
  spacing: z
    .object({
      base: z.number().optional(),
      scale: z.array(z.number()).optional(),
    })
    .optional(),
  borderRadius: z
    .object({
      sm: z.string().optional(),
      md: z.string().optional(),
      lg: z.string().optional(),
      xl: z.string().optional(),
    })
    .optional(),
  animations: z
    .object({
      fast: z.string().optional(),
      normal: z.string().optional(),
      slow: z.string().optional(),
      easing: z.string().optional(),
    })
    .optional(),
});

const AttributeSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  type: z.enum([
    'text',
    'number',
    'dropdown',
    'multi-select',
    'date',
    'boolean',
    'json',
    'hierarchy',
  ]),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  values: z.array(z.string()).optional(),
  hierarchySource: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  default: z.unknown().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
});

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  parent: z.string().optional(),
  order: z.number().optional(),
  attributes: z.array(AttributeSchema),
  searchFields: z.array(z.string()).optional(),
  displayTemplate: z.string().optional(),
  filters: z.array(z.any()).optional(),
  wizard: z.any().optional(),
});

const NavItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
    route: z.string(),
    permission: z.string().optional(),
    order: z.number().optional(),
    badge: z.string().optional(),
    children: z.array(NavItemSchema).optional(),
  })
);

const NavigationSchema = z.object({
  main: z.array(NavItemSchema),
  quickActions: z.array(z.any()).optional(),
  sidebar: z.any().optional(),
  header: z.any().optional(),
});

const ModulesSchema = z.record(
  z.string(),
  z.object({
    enabled: z.boolean(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
);

const TenantConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    domain: z.string().optional(),
    description: z.string().optional(),
  }),
  branding: z.object({
    company: z.object({
      name: z.string(),
      shortName: z.string().optional(),
      tagline: z.string().optional(),
      logo: z.string().optional(),
      logoLight: z.string().optional(),
      logoDark: z.string().optional(),
      favicon: z.string().optional(),
      icon: z.string().optional(),
    }),
    login: z.any().optional(),
    receipts: z.any().optional(),
    store: z.any().optional(),
  }),
  theme: ThemeSchema.optional(),
  categories: z.array(CategorySchema),
  navigation: NavigationSchema,
  widgets: z.any().optional(),
  modules: ModulesSchema,
  localization: z.any().optional(),
  layouts: z.any().optional(),
  wizards: z.any().optional(),
  database: z.any().optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  success: boolean;
  data?: TenantConfig;
  errors?: z.ZodError;
}

/**
 * Validate tenant configuration against schema
 *
 * @param config - Configuration object to validate
 * @param mode - 'development' for hard-fail, 'production' for soft-fail
 * @returns Validation result with parsed data or errors
 */
export function validateConfig(
  config: unknown,
  mode: 'development' | 'production' = import.meta.env.MODE as 'development' | 'production'
): ValidationResult {
  try {
    const parsed = TenantConfigSchema.parse(config);
    return {
      success: true,
      data: parsed as TenantConfig,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = formatValidationErrors(error);

      if (mode === 'development') {
        // Hard fail in development
        console.error('❌ Configuration validation failed:', errorMessage);
        throw new Error(`Invalid tenant configuration:\n${errorMessage}`);
      } else {
        // Soft fail in production - log and continue with defaults
        console.warn('⚠️ Configuration validation failed, using defaults:', errorMessage);
        return {
          success: false,
          errors: error,
        };
      }
    }

    throw error;
  }
}

/**
 * Format Zod validation errors into readable message
 */
function formatValidationErrors(error: z.ZodError): string {
  return error.issues
    .map((err: z.ZodIssue) => {
      const path = err.path.join('.');
      return `  - ${path}: ${err.message}`;
    })
    .join('\n');
}

/**
 * Validate configuration from JSON string
 */
export function validateConfigFromJSON(
  json: string,
  mode?: 'development' | 'production'
): ValidationResult {
  try {
    const config = JSON.parse(json);
    return validateConfig(config, mode);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const errorMessage = `Invalid JSON: ${error.message}`;

      if (mode === 'development') {
        console.error('❌ JSON parsing failed:', errorMessage);
        throw new Error(errorMessage);
      } else {
        console.warn('⚠️ JSON parsing failed, using defaults:', errorMessage);
        return {
          success: false,
          errors: new z.ZodError([
            {
              code: 'custom',
              path: [],
              message: errorMessage,
            },
          ]),
        };
      }
    }

    throw error;
  }
}

/**
 * Check if configuration is valid without throwing
 */
export function isValidConfig(config: unknown): config is TenantConfig {
  const result = TenantConfigSchema.safeParse(config);
  return result.success;
}

// ============================================================================
// Exports
// ============================================================================

export { TenantConfigSchema };

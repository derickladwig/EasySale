/**
 * Theme JSON → CSS Variables Bridge
 *
 * Maps tenant theme configuration (JSON) to CSS custom properties (variables)
 * Injects theme colors into the DOM for runtime theming
 */

import type { ThemeConfig, ThemeColors, ColorScale } from './types';

// ============================================================================
// Types
// ============================================================================

export interface CSSVariableMap {
  [key: string]: string;
}

// ============================================================================
// Theme Bridge Functions
// ============================================================================

/**
 * Apply theme configuration to CSS variables
 *
 * Injects theme colors and other properties as CSS custom properties
 * on the document root element
 */
export function applyThemeToCSS(theme: ThemeConfig): void {
  const root = document.documentElement;
  const variables = themeToCSSVariables(theme);

  // Apply all CSS variables to root
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Apply theme mode as data attribute
  root.dataset.theme = theme.mode;
}

/**
 * Convert theme configuration to CSS variables map
 */
export function themeToCSSVariables(theme: ThemeConfig): CSSVariableMap {
  const variables: CSSVariableMap = {};

  // Map theme colors to CSS variables
  Object.assign(variables, mapThemeColors(theme.colors));

  // Map fonts
  if (theme.fonts) {
    if (theme.fonts.heading) variables['--font-heading'] = theme.fonts.heading;
    if (theme.fonts.body) variables['--font-body'] = theme.fonts.body;
    if (theme.fonts.mono) variables['--font-mono'] = theme.fonts.mono;
  }

  // Map spacing
  if (theme.spacing) {
    if (theme.spacing.base) variables['--spacing-base'] = `${theme.spacing.base}px`;
    if (theme.spacing.scale) {
      theme.spacing.scale.forEach((value, index) => {
        variables[`--spacing-${index}`] = `${value}px`;
      });
    }
  }

  // Map border radius
  if (theme.borderRadius) {
    if (theme.borderRadius.sm) variables['--radius-sm'] = theme.borderRadius.sm;
    if (theme.borderRadius.md) variables['--radius-md'] = theme.borderRadius.md;
    if (theme.borderRadius.lg) variables['--radius-lg'] = theme.borderRadius.lg;
    if (theme.borderRadius.xl) variables['--radius-xl'] = theme.borderRadius.xl;
  }

  // Map animations
  if (theme.animations) {
    if (theme.animations.fast) variables['--duration-fast'] = theme.animations.fast;
    if (theme.animations.normal) variables['--duration-normal'] = theme.animations.normal;
    if (theme.animations.slow) variables['--duration-slow'] = theme.animations.slow;
    if (theme.animations.easing) variables['--easing'] = theme.animations.easing;
  }

  return variables;
}

/**
 * Map theme colors to CSS variables
 *
 * Handles both simple color strings and color scales
 */
function mapThemeColors(colors: ThemeColors): CSSVariableMap {
  const variables: CSSVariableMap = {};

  // Map primary color
  if (colors.primary) {
    Object.assign(variables, mapColorScale('primary', colors.primary));
  }

  // Map secondary color
  if (colors.secondary) {
    Object.assign(variables, mapColorScale('secondary', colors.secondary));
  }

  // Map accent color
  if (colors.accent) {
    Object.assign(variables, mapColorScale('accent', colors.accent));
    
    // THEMESYNC[FE-0008][module=config][type=override]: Accent-to-primary mapping
    // IMPORTANT: Also map accent to primary so Tailwind's bg-primary-* classes use the accent color
    // This ensures the accent color from settings is used throughout the app.
    // This intentional override allows tenant accent colors to flow through to all primary-* utilities.
    // Source-of-truth: frontend/src/styles/themes.css (accent definitions)
    // See: audit/THEME_CONFLICT_MAP.md#FE-0008
    Object.assign(variables, mapColorScale('primary', colors.accent));
  }

  // Map semantic colors (simple strings)
  variables['--color-background'] = colors.background;
  variables['--color-surface'] = colors.surface;
  variables['--color-text'] = colors.text;
  variables['--color-success'] = colors.success;
  variables['--color-warning'] = colors.warning;
  variables['--color-error'] = colors.error;
  variables['--color-info'] = colors.info;

  // Map to semantic action tokens (for buttons, links, etc.)
  if (colors.primary) {
    const primary = normalizeColorScale(colors.primary);
    variables['--color-action-primary-bg'] = primary['500'];
    variables['--color-action-primary-hover'] = primary['600'];
    variables['--color-action-primary-fg'] = '#ffffff'; // Assume white text on primary
  }

  if (colors.secondary) {
    const secondary = normalizeColorScale(colors.secondary);
    variables['--color-action-secondary-bg'] = secondary['500'];
    variables['--color-action-secondary-hover'] = secondary['600'];
  }

  return variables;
}

/**
 * Map a color scale to CSS variables
 *
 * Handles both string colors and color scale objects
 * Generates a full scale (50-950) for Tailwind compatibility
 */
function mapColorScale(name: string, color: ColorScale | string): CSSVariableMap {
  const variables: CSSVariableMap = {};

  if (typeof color === 'string') {
    // Simple color string - generate a full scale from it
    variables[`--color-${name}-50`] = adjustBrightness(color, 90);
    variables[`--color-${name}-100`] = adjustBrightness(color, 75);
    variables[`--color-${name}-200`] = adjustBrightness(color, 55);
    variables[`--color-${name}-300`] = adjustBrightness(color, 35);
    variables[`--color-${name}-400`] = adjustBrightness(color, 15);
    variables[`--color-${name}-500`] = color;
    variables[`--color-${name}-600`] = adjustBrightness(color, -12);
    variables[`--color-${name}-700`] = adjustBrightness(color, -25);
    variables[`--color-${name}-800`] = adjustBrightness(color, -40);
    variables[`--color-${name}-900`] = adjustBrightness(color, -55);
    variables[`--color-${name}-950`] = adjustBrightness(color, -70);
  } else {
    // Color scale object - map all shades
    Object.entries(color).forEach(([shade, value]) => {
      if (value) {
        variables[`--color-${name}-${shade}`] = value;
      }
    });
  }

  return variables;
}

/**
 * Adjust color brightness by a percentage
 */
function adjustBrightness(color: string, percent: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const adjust = (value: number) => {
    const adjusted = value + (value * percent) / 100;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

/**
 * Normalize color scale to always have 500 and 600 values
 */
function normalizeColorScale(color: ColorScale | string): Record<string, string> {
  if (typeof color === 'string') {
    return {
      '500': color,
      '600': color,
    };
  }

  return {
    '50': color['50'] || color['500'],
    '100': color['100'] || color['500'],
    '200': color['200'] || color['500'],
    '300': color['300'] || color['500'],
    '400': color['400'] || color['500'],
    '500': color['500'],
    '600': color['600'],
    '700': color['700'] || color['600'],
    '800': color['800'] || color['600'],
    '900': color['900'] || color['600'],
  };
}

/**
 * Remove theme CSS variables from DOM
 *
 * Useful for cleanup or theme switching
 */
export function removeThemeFromCSS(): void {
  const root = document.documentElement;

  // Get all CSS variables that start with theme-related prefixes
  const prefixes = [
    '--color-',
    '--font-',
    '--spacing-',
    '--radius-',
    '--duration-',
    '--easing',
  ];

  // Remove all matching CSS variables
  Array.from(root.style).forEach((property) => {
    if (prefixes.some((prefix) => property.startsWith(prefix))) {
      root.style.removeProperty(property);
    }
  });

  // Remove theme data attribute
  delete root.dataset.theme;
}

/**
 * Get current theme CSS variables
 *
 * Useful for debugging or theme inspection
 */
export function getCurrentThemeVariables(): CSSVariableMap {
  const root = document.documentElement;
  const variables: CSSVariableMap = {};

  Array.from(root.style).forEach((property) => {
    if (property.startsWith('--')) {
      variables[property] = root.style.getPropertyValue(property);
    }
  });

  return variables;
}

// ============================================================================
// Exports
// ============================================================================

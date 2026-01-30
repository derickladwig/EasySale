/**
 * Contrast Checker Utility
 *
 * Validates color contrast ratios meet WCAG AA standards (4.5:1 for normal text).
 * Provides utilities for checking and adjusting colors for accessibility.
 *
 * Validates Requirements 10.4, 10.5
 */

// ============================================================================
// Types
// ============================================================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ContrastResult {
  ratio: number;
  passes: boolean;
  level: 'AAA' | 'AA' | 'Fail';
}

// ============================================================================
// Constants
// ============================================================================

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;
const WCAG_AAA_NORMAL = 7.0;
const WCAG_AAA_LARGE = 4.5;

// ============================================================================
// Color Conversion
// ============================================================================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  // Parse hex
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to relative luminance
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function getLuminance(rgb: RGB): number {
  const { r, g, b } = rgb;

  // Convert to 0-1 range
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  // Calculate luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// ============================================================================
// Contrast Calculation
// ============================================================================

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return 0;
  }

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 */
export function checkContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
  const aaaThreshold = isLargeText ? WCAG_AAA_LARGE : WCAG_AAA_NORMAL;

  let level: 'AAA' | 'AA' | 'Fail' = 'Fail';
  if (ratio >= aaaThreshold) {
    level = 'AAA';
  } else if (ratio >= threshold) {
    level = 'AA';
  }

  return {
    ratio,
    passes: ratio >= threshold,
    level,
  };
}

// ============================================================================
// Color Adjustment
// ============================================================================

/**
 * Adjust color brightness to meet contrast requirements
 */
export function adjustColorForContrast(
  foreground: string,
  background: string,
  targetRatio: number = WCAG_AA_NORMAL
): string {
  const bgRgb = hexToRgb(background);
  if (!bgRgb) {
    return foreground;
  }

  const bgLuminance = getLuminance(bgRgb);

  // Check if current foreground already meets requirements
  const currentRatio = getContrastRatio(foreground, background);
  if (currentRatio >= targetRatio) {
    return foreground;
  }

  // Determine if we need to lighten or darken based on background
  const shouldLighten = bgLuminance < 0.5;

  // Try pure white or pure black first (most common adjustments)
  const extremeColor = shouldLighten ? '#ffffff' : '#000000';
  const extremeRatio = getContrastRatio(extremeColor, background);

  if (extremeRatio >= targetRatio) {
    return extremeColor;
  }

  // If even extreme doesn't work, return the extreme anyway
  // (this handles edge cases where the background itself is problematic)
  return extremeColor;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (val: number) => {
    const hex = Math.round(val).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate all text colors in a theme meet contrast requirements
 */
export function validateThemeContrast(theme: {
  colors: {
    text: Record<string, string>;
    surface: Record<string, string>;
  };
}): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check primary text on primary surface
  const primaryResult = checkContrast(theme.colors.text.primary, theme.colors.surface.primary);
  if (!primaryResult.passes) {
    issues.push(
      `Primary text (${theme.colors.text.primary}) on primary surface (${theme.colors.surface.primary}) has insufficient contrast: ${primaryResult.ratio.toFixed(2)}:1`
    );
  }

  // Check secondary text on primary surface
  const secondaryResult = checkContrast(theme.colors.text.secondary, theme.colors.surface.primary);
  if (!secondaryResult.passes) {
    issues.push(
      `Secondary text (${theme.colors.text.secondary}) on primary surface (${theme.colors.surface.primary}) has insufficient contrast: ${secondaryResult.ratio.toFixed(2)}:1`
    );
  }

  // Check tertiary text on primary surface
  const tertiaryResult = checkContrast(theme.colors.text.tertiary, theme.colors.surface.primary);
  if (!tertiaryResult.passes) {
    issues.push(
      `Tertiary text (${theme.colors.text.tertiary}) on primary surface (${theme.colors.surface.primary}) has insufficient contrast: ${tertiaryResult.ratio.toFixed(2)}:1`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================================================
// Exports
// ============================================================================

export type { RGB, ContrastResult };
export { WCAG_AA_NORMAL, WCAG_AA_LARGE, WCAG_AAA_NORMAL, WCAG_AAA_LARGE };

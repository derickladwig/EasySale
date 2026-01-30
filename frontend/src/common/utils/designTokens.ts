/**
 * Design Token Utilities
 *
 * This module provides utilities for working with design tokens from tailwind.config.js.
 * It includes type-safe access to colors, spacing, typography, and other design tokens.
 */

/**
 * Color tokens from the design system
 * NOTE: Use CSS custom properties from tokens.css instead of these hardcoded values
 */
export const colors = {
  // Brand colors - DEPRECATED: Use var(--color-primary-*) instead
  primary: {
    50: 'var(--color-primary-50)',
    100: 'var(--color-primary-100)',
    200: 'var(--color-primary-200)',
    300: 'var(--color-primary-300)',
    400: 'var(--color-primary-400)',
    500: 'var(--color-primary-500)',
    600: 'var(--color-primary-600)',
    700: 'var(--color-primary-700)',
    800: 'var(--color-primary-800)',
    900: 'var(--color-primary-900)',
    950: 'var(--color-primary-950)',
  },
  // Dark theme colors - DEPRECATED: Use var(--color-slate-*) instead
  dark: {
    50: 'var(--color-slate-50)',
    100: 'var(--color-slate-100)',
    200: 'var(--color-slate-200)',
    300: 'var(--color-slate-300)',
    400: 'var(--color-slate-400)',
    500: 'var(--color-slate-500)',
    600: 'var(--color-slate-600)',
    700: 'var(--color-slate-700)',
    800: 'var(--color-slate-800)',
    900: 'var(--color-slate-900)',
    950: 'var(--color-slate-950)',
  },
  // Semantic colors - DEPRECATED: Use var(--color-*-500) instead
  success: {
    500: 'var(--color-success-500)',
    600: 'var(--color-success-500)',
    700: 'var(--color-success-500)',
  },
  warning: {
    500: 'var(--color-warning-500)',
    600: 'var(--color-warning-500)',
    700: 'var(--color-warning-500)',
  },
  error: {
    500: 'var(--color-error-500)',
    600: 'var(--color-error-500)',
    700: 'var(--color-error-500)',
  },
  info: {
    500: 'var(--color-info-500)',
    600: 'var(--color-info-500)',
    700: 'var(--color-info-500)',
  },
  // Status colors - DEPRECATED: Use semantic tokens instead
  status: {
    online: 'var(--color-success-500)',
    offline: 'var(--color-error-500)',
    syncing: 'var(--color-primary-500)',
    synced: 'var(--color-success-500)',
    error: 'var(--color-error-500)',
  },
  // Stock colors - DEPRECATED: Use semantic tokens instead
  stock: {
    inStock: 'var(--color-success-500)',
    lowStock: 'var(--color-warning-500)',
    outOfStock: 'var(--color-error-500)',
    backorder: 'var(--color-warning-500)',
  },
} as const;

/**
 * Spacing scale (4px base unit)
 */
export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  32: '8rem', // 128px
} as const;

/**
 * Font sizes with line heights
 */
export const fontSize = {
  xs: { size: '0.75rem', lineHeight: '1rem' }, // 12px
  sm: { size: '0.875rem', lineHeight: '1.25rem' }, // 14px
  base: { size: '1rem', lineHeight: '1.5rem' }, // 16px
  lg: { size: '1.125rem', lineHeight: '1.75rem' }, // 18px
  xl: { size: '1.25rem', lineHeight: '1.75rem' }, // 20px
  '2xl': { size: '1.5rem', lineHeight: '2rem' }, // 24px
  '3xl': { size: '1.875rem', lineHeight: '2.25rem' }, // 30px
  '4xl': { size: '2.25rem', lineHeight: '2.5rem' }, // 36px
} as const;

/**
 * Font weights
 */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Border radius values
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  full: '9999px',
} as const;

/**
 * Shadow values
 */
export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  none: 'none',
} as const;

/**
 * Z-index values
 */
export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

/**
 * Transition durations
 */
export const transitionDuration = {
  75: '75ms',
  100: '100ms',
  150: '150ms', // Fast
  200: '200ms',
  300: '300ms', // Normal
  500: '500ms', // Slow
  700: '700ms',
  1000: '1000ms',
} as const;

/**
 * Breakpoint values
 */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Helper function to get a color value by path
 *
 * @example
 * getColor('primary', 500) // '#3b82f6'
 * getColor('status', 'online') // '#22c55e'
 */
export function getColor(category: keyof typeof colors, shade: string | number): string {
  const colorCategory = colors[category];
  if (!colorCategory) return '';

  // @ts-ignore - Dynamic access
  return colorCategory[shade] || '';
}

/**
 * Helper function to get spacing value
 *
 * @example
 * getSpacing(4) // '1rem' (16px)
 */
export function getSpacing(size: keyof typeof spacing): string {
  return spacing[size];
}

/**
 * Helper function to get font size with line height
 *
 * @example
 * getFontSize('lg') // { size: '1.125rem', lineHeight: '1.75rem' }
 */
export function getFontSize(size: keyof typeof fontSize) {
  return fontSize[size];
}

/**
 * Helper function to get z-index value
 *
 * @example
 * getZIndex('modal') // 1050
 */
export function getZIndex(layer: keyof typeof zIndex): number {
  return zIndex[layer];
}

/**
 * Helper function to check if current breakpoint is at or above a target
 *
 * @example
 * isBreakpointUp('md') // true if window width >= 768px
 */
export function isBreakpointUp(breakpoint: keyof typeof breakpoints): boolean {
  return window.innerWidth >= breakpoints[breakpoint];
}

/**
 * Helper function to check if current breakpoint is below a target
 *
 * @example
 * isBreakpointDown('md') // true if window width < 768px
 */
export function isBreakpointDown(breakpoint: keyof typeof breakpoints): boolean {
  return window.innerWidth < breakpoints[breakpoint];
}

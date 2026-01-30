/**
 * Theme Constants
 * Centralized theme values for consistent styling across the application
 */

export const theme = {
  // Colors
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    dark: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    success: {
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
    },
    error: {
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
    },
    warning: {
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
  },

  // Border Radius
  borderRadius: {
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    full: '9999px',
  },

  // Typography
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },

  // Transitions
  transition: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
  },

  // Z-Index
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

// Component-specific styles
export const componentStyles = {
  // Buttons
  button: {
    base: 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizes: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    },
    variants: {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
      outline: 'border border-dark-600 text-dark-200 hover:bg-dark-800 focus:ring-primary-500',
      ghost: 'text-dark-300 hover:bg-dark-800 focus:ring-primary-500',
    },
  },

  // Cards
  card: {
    base: 'bg-dark-800 border border-dark-700 rounded-lg',
    padding: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },

  // Inputs
  input: {
    base: 'w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
    error: 'border-error-500 focus:ring-error-500',
  },

  // Badges
  badge: {
    base: 'inline-flex items-center px-2 py-1 text-xs font-medium rounded',
    variants: {
      primary: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
      success: 'bg-success-500/20 text-success-400 border border-success-500/30',
      error: 'bg-error-500/20 text-error-400 border border-error-500/30',
      warning: 'bg-warning-500/20 text-warning-400 border border-warning-500/30',
    },
  },

  // Tables
  table: {
    header: 'bg-dark-800 border-b border-dark-700',
    headerCell: 'px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider',
    row: 'border-b border-dark-800 hover:bg-dark-800 transition-colors',
    cell: 'px-6 py-4 text-sm text-dark-200',
  },
} as const;

// Utility functions
export const cn = (...classes: (string | boolean | undefined | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

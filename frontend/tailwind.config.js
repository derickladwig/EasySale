/** @type {import('tailwindcss').Config} */
/**
 * THEMESYNC[FE-0004][module=config][type=duplicated-token]: Tailwind color configuration
 * 
 * All colors reference CSS custom properties with fallback hex values.
 * The fallbacks duplicate tokens.css values intentionally for:
 * 1. Build-time class generation (Tailwind needs static values)
 * 2. Graceful degradation if CSS vars fail to load
 * 
 * RULE: Do not add raw hex values without var() wrapper.
 * Source-of-truth: frontend/src/styles/tokens.css
 * See: audit/THEME_CONFLICT_MAP.md#FE-0004
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Design Tokens - Colors
      // IMPORTANT: All colors MUST reference CSS custom properties (--color-*)
      // Hard-coded hex values are NOT allowed (enforced by Stylelint)
      // Fallback values are provided for development/testing only
      colors: {
        // Brand colors (primary - uses CSS variables from tenant config)
        // Professional teal/cyan color scheme - modern, trustworthy, easy on eyes
        primary: {
          50: 'var(--color-primary-50, #f0fdfa)',
          100: 'var(--color-primary-100, #ccfbf1)',
          200: 'var(--color-primary-200, #99f6e4)',
          300: 'var(--color-primary-300, #5eead4)',
          400: 'var(--color-primary-400, #2dd4bf)',
          500: 'var(--color-primary-500, #14b8a6)',
          600: 'var(--color-primary-600, #0d9488)',
          700: 'var(--color-primary-700, #0f766e)',
          800: 'var(--color-primary-800, #115e59)',
          900: 'var(--color-primary-900, #134e4a)',
          950: 'var(--color-primary-950, #042f2e)',
        },
        // Secondary/neutral colors (uses CSS variables from tenant config)
        secondary: {
          50: 'var(--color-secondary-50, #f8fafc)',
          100: 'var(--color-secondary-100, #f1f5f9)',
          200: 'var(--color-secondary-200, #e2e8f0)',
          300: 'var(--color-secondary-300, #cbd5e1)',
          400: 'var(--color-secondary-400, #94a3b8)',
          500: 'var(--color-secondary-500, #64748b)',
          600: 'var(--color-secondary-600, #475569)',
          700: 'var(--color-secondary-700, #334155)',
          800: 'var(--color-secondary-800, #1e293b)',
          900: 'var(--color-secondary-900, #0f172a)',
          950: 'var(--color-secondary-950, #020617)',
        },
        // Accent color (uses CSS variables from theme engine)
        // Teal accent for professional look
        accent: {
          DEFAULT: 'var(--color-accent, #14b8a6)',
          hover: 'var(--color-accent-hover, #0d9488)',
          foreground: 'var(--color-accent-foreground, #ffffff)',
        },
        // Semantic colors (reference CSS variables from theme system)
        success: {
          50: 'var(--color-success-50, #f0fdf4)',
          100: 'var(--color-success-100, #dcfce7)',
          200: 'var(--color-success-200, #bbf7d0)',
          300: 'var(--color-success-300, #86efac)',
          400: 'var(--color-success-400, #4ade80)',
          light: 'var(--color-success-light, #86efac)',
          DEFAULT: 'var(--color-success, #22c55e)',
          500: 'var(--color-success, #22c55e)',
          dark: 'var(--color-success-dark, #16a34a)',
          600: 'var(--color-success-600, #16a34a)',
          700: 'var(--color-success-700, #15803d)',
          800: 'var(--color-success-800, #166534)',
          900: 'var(--color-success-900, #14532d)',
        },
        warning: {
          50: 'var(--color-warning-50, #fffbeb)',
          100: 'var(--color-warning-100, #fef3c7)',
          200: 'var(--color-warning-200, #fde68a)',
          300: 'var(--color-warning-300, #fcd34d)',
          400: 'var(--color-warning-400, #fbbf24)',
          light: 'var(--color-warning-light, #fcd34d)',
          DEFAULT: 'var(--color-warning, #f59e0b)',
          500: 'var(--color-warning, #f59e0b)',
          dark: 'var(--color-warning-dark, #d97706)',
          600: 'var(--color-warning-600, #d97706)',
          700: 'var(--color-warning-700, #b45309)',
          800: 'var(--color-warning-800, #92400e)',
          900: 'var(--color-warning-900, #78350f)',
        },
        error: {
          50: 'var(--color-error-50, #fef2f2)',
          100: 'var(--color-error-100, #fee2e2)',
          200: 'var(--color-error-200, #fecaca)',
          300: 'var(--color-error-300, #fca5a5)',
          400: 'var(--color-error-400, #f87171)',
          light: 'var(--color-error-light, #fca5a5)',
          DEFAULT: 'var(--color-error, #ef4444)',
          500: 'var(--color-error, #ef4444)',
          dark: 'var(--color-error-dark, #dc2626)',
          600: 'var(--color-error-600, #dc2626)',
          700: 'var(--color-error-700, #b91c1c)',
          800: 'var(--color-error-800, #991b1b)',
          900: 'var(--color-error-900, #7f1d1d)',
        },
        info: {
          50: 'var(--color-info-50, #eff6ff)',
          100: 'var(--color-info-100, #dbeafe)',
          200: 'var(--color-info-200, #bfdbfe)',
          300: 'var(--color-info-300, #93c5fd)',
          400: 'var(--color-info-400, #60a5fa)',
          light: 'var(--color-info-light, #93c5fd)',
          DEFAULT: 'var(--color-info, #3b82f6)',
          500: 'var(--color-info, #3b82f6)',
          dark: 'var(--color-info-dark, #2563eb)',
          600: 'var(--color-info-600, #2563eb)',
          700: 'var(--color-info-700, #1d4ed8)',
          800: 'var(--color-info-800, #1e40af)',
          900: 'var(--color-info-900, #1e3a8a)',
        },
        // UI semantic colors (reference CSS variables from theme system)
        // Modern dark slate theme - professional and easy on eyes
        background: {
          DEFAULT: 'var(--color-bg-primary, #0f172a)',      // Default background (slate dark)
          primary: 'var(--color-bg-primary, #0f172a)',      // Darkest - main background
          secondary: 'var(--color-bg-secondary, #1e293b)',  // Dark - cards, panels
          tertiary: 'var(--color-bg-tertiary, #334155)',    // Medium - hover states
        },
        surface: {
          DEFAULT: 'var(--color-surface-base, #1e293b)',    // Default surface
          base: 'var(--color-surface-base, #1e293b)',       // Base surface color
          elevated: 'var(--color-surface-elevated, #334155)', // Elevated elements
          overlay: 'var(--color-surface-overlay, #475569)',  // Overlay elements
          secondary: 'var(--color-surface-elevated, #334155)', // Alias for elevated
        },
        border: {
          light: 'var(--color-border-light, #334155)',      // Light border
          DEFAULT: 'var(--color-border, #475569)',          // Default border
          dark: 'var(--color-border-dark, #64748b)',        // Dark border
          strong: 'var(--color-border-strong, #64748b)',    // Strong border
        },
        text: {
          primary: 'var(--color-text-primary, #f1f5f9)',    // High emphasis
          secondary: 'var(--color-text-secondary, #cbd5e1)', // Medium emphasis
          tertiary: 'var(--color-text-tertiary, #94a3b8)',  // Low emphasis
          disabled: 'var(--color-text-disabled, #64748b)',  // Disabled state
        },
        // Focus ring color (accessibility) - teal to match theme
        focus: {
          DEFAULT: 'var(--color-focus-ring, #14b8a6)',
        },
        // Divider color
        divider: {
          DEFAULT: 'var(--color-divider, #334155)',
        },
        // Status indicator colors (Req 14.1)
        // Consistent colors for status states across the application
        status: {
          online: 'var(--color-status-online, #22c55e)',    // Green - online/connected
          offline: 'var(--color-status-offline, #ef4444)',  // Red - offline/disconnected
          syncing: 'var(--color-status-syncing, #14b8a6)',  // Teal - syncing/in-progress
          synced: 'var(--color-status-synced, #22c55e)',    // Green - synced/completed
          error: 'var(--color-status-error, #ef4444)',      // Red - error state
        },
        // Dark theme specific colors
        dark: {
          400: '#94a3b8',
          900: '#0f172a',
        },
      },
      
      // Design Tokens - Spacing (4px base unit with density support)
      // Use CSS custom property var(--density-scale, 1) for dynamic scaling
      // All values are multiples of 4px (0.25rem) for consistency
      spacing: {
        '0': '0',
        '0.5': '0.125rem',   // 2px (exception for fine-tuning)
        '1': '0.25rem',      // 4px - base unit
        '1.5': '0.375rem',   // 6px (exception for fine-tuning)
        '2': '0.5rem',       // 8px
        '3': '0.75rem',      // 12px
        '4': '1rem',         // 16px - component spacing (Req 15.3)
        '5': '1.25rem',      // 20px
        '6': '1.5rem',       // 24px - form spacing (Req 15.4)
        '8': '2rem',         // 32px - section spacing (Req 15.2)
        '10': '2.5rem',      // 40px
        '12': '3rem',        // 48px
        '16': '4rem',        // 64px
        '20': '5rem',        // 80px
        '24': '6rem',        // 96px
        '32': '8rem',        // 128px
        '40': '10rem',       // 160px
        '48': '12rem',       // 192px
        '56': '14rem',       // 224px
        '64': '16rem',       // 256px
        
        // Responsive spacing utilities (Req 15.5, 15.6)
        // Mobile-first: use smaller values on mobile, larger on desktop
        'container-mobile': '1rem',      // 16px - mobile container padding
        'container-desktop': '1.5rem',   // 24px - desktop container padding
        'grid-gap-mobile': '1rem',       // 16px - mobile grid gap
        'grid-gap-desktop': '1.5rem',    // 24px - desktop grid gap
        
        // Density multiplier utilities (Req 15.7, 15.8, 15.9)
        // Compact: 75% of normal (25% reduction)
        'compact-1': 'calc(0.25rem * 0.75)',  // 3px
        'compact-2': 'calc(0.5rem * 0.75)',   // 6px
        'compact-3': 'calc(0.75rem * 0.75)',  // 9px
        'compact-4': 'calc(1rem * 0.75)',     // 12px
        'compact-6': 'calc(1.5rem * 0.75)',   // 18px
        'compact-8': 'calc(2rem * 0.75)',     // 24px
        
        // Spacious: 125% of normal (25% increase)
        'spacious-1': 'calc(0.25rem * 1.25)', // 5px
        'spacious-2': 'calc(0.5rem * 1.25)',  // 10px
        'spacious-3': 'calc(0.75rem * 1.25)', // 15px
        'spacious-4': 'calc(1rem * 1.25)',    // 20px
        'spacious-6': 'calc(1.5rem * 1.25)',  // 30px
        'spacious-8': 'calc(2rem * 1.25)',    // 40px
      },
      
      // Design Tokens - Typography (with text scale support)
      // Use CSS custom property var(--text-scale, 1) for dynamic scaling
      // Enhanced typography scale with clear heading hierarchy (Req 16.2)
      // Line heights: 1.5 for body, 1.2 for headings (Req 16.3)
      fontSize: {
        // Body text sizes (line-height: 1.5)
        'xs': ['0.75rem', { lineHeight: '1.125rem' }],      // 12px, 18px line-height (1.5)
        'sm': ['0.875rem', { lineHeight: '1.3125rem' }],    // 14px, 21px line-height (1.5)
        'base': ['1rem', { lineHeight: '1.5rem' }],         // 16px, 24px line-height (1.5) - body text
        'lg': ['1.125rem', { lineHeight: '1.6875rem' }],    // 18px, 27px line-height (1.5)
        
        // Heading sizes (line-height: 1.2) - Clear hierarchy (Req 16.2)
        'h4': ['1.25rem', { lineHeight: '1.5rem' }],        // 20px, 24px line-height (1.2) - h4
        'h3': ['1.5rem', { lineHeight: '1.8rem' }],         // 24px, 28.8px line-height (1.2) - h3
        'h2': ['1.875rem', { lineHeight: '2.25rem' }],      // 30px, 36px line-height (1.2) - h2
        'h1': ['2.25rem', { lineHeight: '2.7rem' }],        // 36px, 43.2px line-height (1.2) - h1
        
        // Additional display sizes
        'xl': ['1.25rem', { lineHeight: '1.875rem' }],      // 20px, 30px line-height (1.5)
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],       // 24px, 36px line-height (1.5)
        '3xl': ['1.875rem', { lineHeight: '2.8125rem' }],   // 30px, 45px line-height (1.5)
        '4xl': ['2.25rem', { lineHeight: '3.375rem' }],     // 36px, 54px line-height (1.5)
        '5xl': ['3rem', { lineHeight: '3.6rem' }],          // 48px, 57.6px line-height (1.2)
        '6xl': ['3.75rem', { lineHeight: '4.5rem' }],       // 60px, 72px line-height (1.2)
        '7xl': ['4.5rem', { lineHeight: '5.4rem' }],        // 72px, 86.4px line-height (1.2)
      },
      
      // Design Tokens - Font Weights (Req 16.4)
      // Body text: 400 (normal), Headings: 600 (semibold)
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',      // Body text default (Req 16.4)
        medium: '500',
        semibold: '600',    // Heading default (Req 16.4)
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      
      // Font feature settings for tabular numbers (Req 16.7)
      fontFeatureSettings: {
        'tabular': '"tnum"',  // Tabular numbers for prices and quantities
        'proportional': '"pnum"',  // Proportional numbers (default)
      },
      
      // Design Tokens - Breakpoints (5 breakpoints + aspect ratio support)
      // Verified breakpoints for responsive design (Req 5.1, 5.2, 5.3)
      screens: {
        'xs': '0px',      // Extra small (phones, <640px)
        'sm': '640px',    // Small (large phones, 640-768px)
        'md': '768px',    // Medium (tablets, 768-1024px)
        'lg': '1024px',   // Large (desktops, 1024-1280px)
        'xl': '1280px',   // Extra large (large desktops, 1280-1536px)
        '2xl': '1536px',  // 2X large (ultra-wide, >1536px)
        // Aspect ratio media queries
        'portrait': { 'raw': '(orientation: portrait)' },
        'landscape': { 'raw': '(orientation: landscape)' },
        'square': { 'raw': '(min-aspect-ratio: 9/10) and (max-aspect-ratio: 10/9)' },
        'widescreen': { 'raw': '(min-aspect-ratio: 16/9)' },
        'ultrawide': { 'raw': '(min-aspect-ratio: 21/9)' },
      },
      
      // Container queries support (Req 5.2)
      // Enables @container queries for component-level responsive design
      containers: {
        'xs': '20rem',    // 320px
        'sm': '24rem',    // 384px
        'md': '28rem',    // 448px
        'lg': '32rem',    // 512px
        'xl': '36rem',    // 576px
        '2xl': '42rem',   // 672px
        '3xl': '48rem',   // 768px
        '4xl': '56rem',   // 896px
        '5xl': '64rem',   // 1024px
        '6xl': '72rem',   // 1152px
        '7xl': '80rem',   // 1280px
      },
      
      // Aspect ratio utilities (Req 5.3, 5.7)
      // For consistent card heights and responsive images
      aspectRatio: {
        'auto': 'auto',
        'square': '1 / 1',
        'video': '16 / 9',
        'widescreen': '21 / 9',
        'portrait': '3 / 4',
        'photo': '4 / 3',
        'golden': '1.618 / 1',
        '4/3': '4 / 3',
        '16/9': '16 / 9',
        '21/9': '21 / 9',
        '3/2': '3 / 2',
        '2/3': '2 / 3',
        '9/16': '9 / 16',
      },
      
      // Design Tokens - Border Radius (reference CSS variables)
      borderRadius: {
        'none': 'var(--radius-none, 0)',
        'sm': 'var(--radius-sm, 0.125rem)',    // 2px
        DEFAULT: 'var(--radius-md, 0.25rem)',  // 4px
        'md': 'var(--radius-md, 0.375rem)',    // 6px
        'lg': 'var(--radius-lg, 0.5rem)',      // 8px
        'xl': 'var(--radius-xl, 0.75rem)',     // 12px
        '2xl': 'var(--radius-2xl, 1rem)',      // 16px
        '3xl': 'var(--radius-3xl, 1.5rem)',    // 24px
        'full': 'var(--radius-full, 9999px)',
      },
      
      // Design Tokens - Shadows (elevation levels - reference CSS variables)
      // Elevation levels for depth perception (Req 6.1, 7.2)
      boxShadow: {
        // Base elevation levels
        'sm': 'var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
        DEFAULT: 'var(--shadow-md, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1))',
        'md': 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1))',
        'lg': 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))',
        'xl': 'var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1))',
        '2xl': 'var(--shadow-2xl, 0 25px 50px -12px rgb(0 0 0 / 0.25))',
        
        // Hover shadow utilities (enhanced elevation on hover)
        'hover-sm': 'var(--shadow-hover-sm, 0 2px 4px 0 rgb(0 0 0 / 0.08))',
        'hover-md': 'var(--shadow-hover-md, 0 6px 10px -1px rgb(0 0 0 / 0.15), 0 4px 6px -2px rgb(0 0 0 / 0.1))',
        'hover-lg': 'var(--shadow-hover-lg, 0 15px 20px -3px rgb(0 0 0 / 0.15), 0 6px 8px -4px rgb(0 0 0 / 0.1))',
        'hover-xl': 'var(--shadow-hover-xl, 0 25px 35px -5px rgb(0 0 0 / 0.15), 0 10px 15px -6px rgb(0 0 0 / 0.1))',
        
        // Focus shadow utilities (for accessibility and visual feedback) - purple to match theme
        'focus': 'var(--shadow-focus, 0 0 0 2px var(--color-primary-500, #a855f7))',
        'focus-ring': 'var(--shadow-focus-ring, 0 0 0 2px var(--color-bg-primary, #0f0d1a), 0 0 0 4px var(--color-primary-500, #a855f7))',
        'focus-error': 'var(--shadow-focus-error, 0 0 0 2px var(--color-bg-primary, #0f0d1a), 0 0 0 4px var(--color-error, #f87171))',
        'focus-success': 'var(--shadow-focus-success, 0 0 0 2px var(--color-bg-primary, #0f0d1a), 0 0 0 4px var(--color-success, #34d399))',
        
        // Special shadows
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'none': 'none',
      },
      
      // Design Tokens - Z-Index (layering)
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
      
      // Design Tokens - Animation & Transitions (Req 17.1, 17.2, 17.3, 17.4)
      // Use CSS custom property var(--animation-duration-multiplier, 1) for dynamic speed
      
      // Duration tokens (Req 17.1)
      // Fast: 150ms - Quick interactions (hover, focus)
      // Normal: 300ms - Standard transitions (drawers, modals)
      // Slow: 500ms - Complex animations (page transitions)
      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        'fast': '150ms',    // Fast duration token (Req 17.1)
        '150': '150ms',     // Fast
        '200': '200ms',
        'normal': '300ms',  // Normal duration token (Req 17.1)
        '300': '300ms',     // Normal
        '500': '500ms',     // Slow
        'slow': '500ms',    // Slow duration token (Req 17.1)
        '700': '700ms',
        '1000': '1000ms',
      },
      
      // Easing functions (Req 17.2)
      // ease-out: For entrances (elements coming into view)
      // ease-in: For exits (elements leaving view)
      // ease-in-out: For movements (elements changing position)
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',           // For exits (Req 17.2)
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',          // For entrances (Req 17.2)
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',     // For movements
        'linear': 'linear',
        // Additional easing functions for specific use cases
        'ease-in-back': 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',   // Anticipation
        'ease-out-back': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',  // Overshoot
        'ease-in-out-back': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Both
        'ease-in-circ': 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',      // Circular
        'ease-out-circ': 'cubic-bezier(0.075, 0.82, 0.165, 1)',      // Circular
        'ease-in-out-circ': 'cubic-bezier(0.785, 0.135, 0.15, 0.86)', // Circular
      },
      
      // Transition properties (Req 17.3)
      // Common transition combinations for performance
      transitionProperty: {
        'none': 'none',
        'all': 'all',
        'default': 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
        'colors': 'background-color, border-color, color, fill, stroke',
        'opacity': 'opacity',
        'shadow': 'box-shadow',
        'transform': 'transform',
        'transform-opacity': 'transform, opacity',
        'colors-opacity': 'background-color, border-color, color, fill, stroke, opacity',
        'colors-shadow': 'background-color, border-color, color, fill, stroke, box-shadow',
        'layout': 'width, height, padding, margin',
      },
      
      // Animations
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-out-to-bottom': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        'slide-out-to-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-slow': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'fade-out-fast': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'fade-out-slow': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        'scale-bounce': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'spin-fast': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-fast': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-out-to-bottom': 'slide-out-to-bottom 0.3s ease-in',
        'slide-out-to-right': 'slide-out-to-right 0.3s ease-in',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-fast': 'fade-in-fast 0.15s ease-out',
        'fade-in-slow': 'fade-in-slow 0.5s ease-out',
        'fade-out': 'fade-out 0.3s ease-in',
        'fade-out-fast': 'fade-out-fast 0.15s ease-in',
        'fade-out-slow': 'fade-out-slow 0.5s ease-in',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-out': 'scale-out 0.2s ease-in',
        'scale-bounce': 'scale-bounce 0.5s ease-in-out',
        'spin': 'spin 1s linear infinite',
        'spin-slow': 'spin-slow 2s linear infinite',
        'spin-fast': 'spin-fast 0.5s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.4s ease-in-out',
        'progress-indeterminate': 'progress-indeterminate 1.5s ease-in-out infinite',
      },
      
      // Container max-widths for ultrawide displays
      maxWidth: {
        'xs': '20rem',    // 320px
        'sm': '24rem',    // 384px
        'md': '28rem',    // 448px
        'lg': '32rem',    // 512px
        'xl': '36rem',    // 576px
        '2xl': '42rem',   // 672px
        '3xl': '48rem',   // 768px
        '4xl': '56rem',   // 896px
        '5xl': '64rem',   // 1024px
        '6xl': '72rem',   // 1152px
        '7xl': '80rem',   // 1280px
        'screen-sm': '640px',
        'screen-md': '768px',
        'screen-lg': '1024px',
        'screen-xl': '1280px',
        'screen-2xl': '1536px',
      },
      
      // Minimum touch target sizes
      minWidth: {
        '11': '2.75rem',  // 44px (minimum touch target)
        '14': '3.5rem',   // 56px (primary action touch target)
      },
      minHeight: {
        '11': '2.75rem',  // 44px (minimum touch target)
        '14': '3.5rem',   // 56px (primary action touch target)
      },
      
      // Custom height values for button sizes (Req 7.1)
      height: {
        '13': '3.25rem',  // 52px (lg button height)
        '15': '3.75rem',  // 60px (xl button height)
      },
    },
  },
  plugins: [
    // Plugin to add tabular number utilities (Req 16.7)
    function({ addUtilities }) {
      const newUtilities = {
        '.font-tabular-nums': {
          'font-variant-numeric': 'tabular-nums',
          'font-feature-settings': '"tnum"',
        },
        '.font-proportional-nums': {
          'font-variant-numeric': 'proportional-nums',
          'font-feature-settings': '"pnum"',
        },
      };
      addUtilities(newUtilities);
    },
    
    // Plugin to add reduced-motion support (Req 17.4)
    // Respects user's prefers-reduced-motion setting for accessibility
    function({ addVariant }) {
      // Add 'motion-safe' variant - only applies when user hasn't requested reduced motion
      addVariant('motion-safe', '@media (prefers-reduced-motion: no-preference)');
      // Add 'motion-reduce' variant - only applies when user has requested reduced motion
      addVariant('motion-reduce', '@media (prefers-reduced-motion: reduce)');
    },
    
    // Plugin to add animation utility classes (Req 17.3)
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Transition utility classes with common patterns
        '.transition-fast': {
          'transition-duration': theme('transitionDuration.fast'),
          'transition-timing-function': theme('transitionTimingFunction.ease-out'),
        },
        '.transition-normal': {
          'transition-duration': theme('transitionDuration.normal'),
          'transition-timing-function': theme('transitionTimingFunction.ease-out'),
        },
        '.transition-slow': {
          'transition-duration': theme('transitionDuration.slow'),
          'transition-timing-function': theme('transitionTimingFunction.ease-out'),
        },
        // Entrance animations (ease-out)
        '.transition-entrance': {
          'transition-timing-function': theme('transitionTimingFunction.ease-out'),
        },
        // Exit animations (ease-in)
        '.transition-exit': {
          'transition-timing-function': theme('transitionTimingFunction.ease-in'),
        },
        // Movement animations (ease-in-out)
        '.transition-movement': {
          'transition-timing-function': theme('transitionTimingFunction.ease-in-out'),
        },
        // Disable animations for reduced motion (Req 17.4)
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            'animation-duration': '0.01ms !important',
            'animation-iteration-count': '1 !important',
            'transition-duration': '0.01ms !important',
            'scroll-behavior': 'auto !important',
          },
        },
      };
      addUtilities(newUtilities);
    },
    
    // Plugin to add responsive grid utilities (Req 5.1, 5.2, 5.6, 5.7)
    // Responsive column counts, gaps, and padding for grid layouts
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Responsive grid column utilities (Req 5.1)
        // Mobile: 1 column, Tablet: 2 columns, Desktop: 3+ columns
        '.grid-cols-responsive': {
          'grid-template-columns': 'repeat(1, minmax(0, 1fr))',
          '@media (min-width: 768px)': {
            'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
          },
          '@media (min-width: 1024px)': {
            'grid-template-columns': 'repeat(3, minmax(0, 1fr))',
          },
        },
        '.grid-cols-responsive-2': {
          'grid-template-columns': 'repeat(1, minmax(0, 1fr))',
          '@media (min-width: 768px)': {
            'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
          },
        },
        '.grid-cols-responsive-4': {
          'grid-template-columns': 'repeat(1, minmax(0, 1fr))',
          '@media (min-width: 768px)': {
            'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
          },
          '@media (min-width: 1024px)': {
            'grid-template-columns': 'repeat(4, minmax(0, 1fr))',
          },
        },
        '.grid-cols-responsive-6': {
          'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
          '@media (min-width: 768px)': {
            'grid-template-columns': 'repeat(3, minmax(0, 1fr))',
          },
          '@media (min-width: 1024px)': {
            'grid-template-columns': 'repeat(6, minmax(0, 1fr))',
          },
        },
        
        // Auto-fit responsive grids with min/max widths (Req 5.4, 5.5)
        '.grid-auto-fit-sm': {
          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
        },
        '.grid-auto-fit': {
          'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
        },
        '.grid-auto-fit-md': {
          'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
        },
        '.grid-auto-fit-lg': {
          'grid-template-columns': 'repeat(auto-fit, minmax(350px, 1fr))',
        },
        
        // Responsive gap utilities (Req 5.2)
        // 16px on mobile, 24px on desktop
        '.gap-responsive': {
          'gap': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'gap': '1.5rem', // 24px
          },
        },
        '.gap-x-responsive': {
          'column-gap': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'column-gap': '1.5rem', // 24px
          },
        },
        '.gap-y-responsive': {
          'row-gap': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'row-gap': '1.5rem', // 24px
          },
        },
        
        // Responsive padding utilities (Req 15.5, 15.6)
        // 16px on mobile, 24px on desktop
        '.p-responsive': {
          'padding': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'padding': '1.5rem', // 24px
          },
        },
        '.px-responsive': {
          'padding-left': '1rem', // 16px
          'padding-right': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'padding-left': '1.5rem', // 24px
            'padding-right': '1.5rem', // 24px
          },
        },
        '.py-responsive': {
          'padding-top': '1rem', // 16px
          'padding-bottom': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'padding-top': '1.5rem', // 24px
            'padding-bottom': '1.5rem', // 24px
          },
        },
        '.pt-responsive': {
          'padding-top': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'padding-top': '1.5rem', // 24px
          },
        },
        '.pb-responsive': {
          'padding-bottom': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'padding-bottom': '1.5rem', // 24px
          },
        },
        '.pl-responsive': {
          'padding-left': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'padding-left': '1.5rem', // 24px
          },
        },
        '.pr-responsive': {
          'padding-right': '1rem', // 16px
          '@media (min-width: 1024px)': {
            'padding-right': '1.5rem', // 24px
          },
        },
        
        // Container padding utilities (Req 6.3)
        '.container-padding': {
          'padding-left': '1rem', // 16px mobile
          'padding-right': '1rem', // 16px mobile
          '@media (min-width: 1024px)': {
            'padding-left': '1.5rem', // 24px desktop
            'padding-right': '1.5rem', // 24px desktop
          },
        },
      };
      addUtilities(newUtilities);
    },
    
    // Plugin to add touch optimization utilities (Req 19.1, 19.2, 19.3)
    // Minimum touch targets, touch-friendly spacing, and mobile-specific utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Minimum touch target utilities (Req 19.1)
        // 44x44px minimum touch target for accessibility and usability
        '.touch-target': {
          'min-width': '2.75rem',  // 44px
          'min-height': '2.75rem', // 44px
        },
        '.touch-target-sm': {
          'min-width': '2.5rem',   // 40px
          'min-height': '2.5rem',  // 40px
        },
        '.touch-target-lg': {
          'min-width': '3rem',     // 48px
          'min-height': '3rem',    // 48px
        },
        '.touch-target-xl': {
          'min-width': '3.5rem',   // 56px
          'min-height': '3.5rem',  // 56px
        },
        
        // Touch-friendly spacing utilities (Req 19.2)
        // Minimum 8px spacing between interactive elements
        '.touch-spacing': {
          'gap': '0.5rem', // 8px minimum spacing
        },
        '.touch-spacing-x': {
          'column-gap': '0.5rem', // 8px minimum spacing
        },
        '.touch-spacing-y': {
          'row-gap': '0.5rem', // 8px minimum spacing
        },
        '.touch-spacing-md': {
          'gap': '0.75rem', // 12px spacing
        },
        '.touch-spacing-lg': {
          'gap': '1rem', // 16px spacing
        },
        
        // Touch-friendly padding utilities
        '.touch-padding': {
          'padding': '0.75rem', // 12px padding for touch-friendly areas
        },
        '.touch-padding-x': {
          'padding-left': '0.75rem',  // 12px
          'padding-right': '0.75rem', // 12px
        },
        '.touch-padding-y': {
          'padding-top': '0.75rem',    // 12px
          'padding-bottom': '0.75rem', // 12px
        },
        
        // Mobile-specific utilities (Req 19.3)
        // Full-width on mobile, auto on desktop
        '@media (max-width: 639px)': {
          '.mobile-full': {
            'width': '100%',
          },
          '.mobile-stack': {
            'display': 'flex',
            'flex-direction': 'column',
            'gap': '1rem', // 16px
          },
          '.mobile-hidden': {
            'display': 'none',
          },
          '.mobile-text-base': {
            'font-size': '1rem', // 16px minimum to prevent zoom on iOS
          },
        },
        
        // Desktop-specific utilities
        '@media (min-width: 640px)': {
          '.desktop-hidden': {
            'display': 'none',
          },
        },
        
        // Touch-optimized button utilities
        '.touch-button': {
          'min-width': '2.75rem',  // 44px
          'min-height': '2.75rem', // 44px
          'padding': '0.75rem 1rem', // 12px 16px
          'display': 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'gap': '0.5rem', // 8px between icon and text
        },
        '.touch-button-sm': {
          'min-width': '2.5rem',   // 40px
          'min-height': '2.5rem',  // 40px
          'padding': '0.5rem 0.75rem', // 8px 12px
          'display': 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'gap': '0.5rem', // 8px
        },
        '.touch-button-lg': {
          'min-width': '3rem',     // 48px
          'min-height': '3rem',    // 48px
          'padding': '1rem 1.5rem', // 16px 24px
          'display': 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'gap': '0.5rem', // 8px
        },
        
        // Touch-optimized input utilities
        '.touch-input': {
          'min-height': '2.75rem', // 44px
          'padding': '0.75rem',    // 12px
          'font-size': '1rem',     // 16px minimum to prevent zoom on iOS
        },
        '.touch-input-lg': {
          'min-height': '3rem',    // 48px
          'padding': '1rem',       // 16px
          'font-size': '1rem',     // 16px
        },
        
        // Touch-optimized card utilities
        '.touch-card': {
          'padding': '1rem',       // 16px on mobile
          '@media (min-width: 1024px)': {
            'padding': '1.5rem',   // 24px on desktop
          },
        },
        
        // Touch gesture utilities
        '.touch-action-none': {
          'touch-action': 'none',
        },
        '.touch-action-pan-x': {
          'touch-action': 'pan-x',
        },
        '.touch-action-pan-y': {
          'touch-action': 'pan-y',
        },
        '.touch-action-manipulation': {
          'touch-action': 'manipulation', // Prevents double-tap zoom
        },
        
        // Tap highlight utilities (remove default mobile tap highlight)
        '.tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.tap-highlight-primary': {
          '-webkit-tap-highlight-color': 'rgba(59, 130, 246, 0.3)', // primary-500 with 30% opacity
        },
        
        // Safe area utilities (for notched devices)
        '.safe-top': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.safe-left': {
          'padding-left': 'env(safe-area-inset-left)',
        },
        '.safe-right': {
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.safe-area': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
      };
      addUtilities(newUtilities);
    },
    
    // Plugin to add interactive state utility classes (Req 7.1, 7.2, 7.3, 7.4)
    // Focus ring, hover, active, and disabled state utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Focus ring utilities (Req 7.10, 18.2)
        // Visible focus indicators for keyboard navigation and accessibility
        '.focus-ring': {
          'outline': 'none',
          '&:focus': {
            'outline': '2px solid var(--color-primary-500, #3b82f6)',
            'outline-offset': '2px',
          },
        },
        '.focus-ring-inset': {
          'outline': 'none',
          '&:focus': {
            'outline': '2px solid var(--color-primary-500, #3b82f6)',
            'outline-offset': '-2px',
          },
        },
        '.focus-ring-error': {
          'outline': 'none',
          '&:focus': {
            'outline': '2px solid var(--color-error, #ef4444)',
            'outline-offset': '2px',
          },
        },
        '.focus-ring-success': {
          'outline': 'none',
          '&:focus': {
            'outline': '2px solid var(--color-success, #22c55e)',
            'outline-offset': '2px',
          },
        },
        '.focus-ring-none': {
          'outline': 'none',
          '&:focus': {
            'outline': 'none',
          },
        },
        
        // Hover state utilities (Req 7.3)
        // 10% brightness increase on hover (Req 1.5)
        '.hover-brightness': {
          'transition': 'filter 200ms ease-out',
          '&:hover': {
            'filter': 'brightness(1.1)',
          },
        },
        '.hover-brightness-sm': {
          'transition': 'filter 200ms ease-out',
          '&:hover': {
            'filter': 'brightness(1.05)',
          },
        },
        '.hover-brightness-lg': {
          'transition': 'filter 200ms ease-out',
          '&:hover': {
            'filter': 'brightness(1.15)',
          },
        },
        '.hover-lift': {
          'transition': 'transform 200ms ease-out, box-shadow 200ms ease-out',
          '&:hover': {
            'transform': 'translateY(-2px)',
            'box-shadow': theme('boxShadow.hover-md'),
          },
        },
        '.hover-lift-sm': {
          'transition': 'transform 200ms ease-out, box-shadow 200ms ease-out',
          '&:hover': {
            'transform': 'translateY(-1px)',
            'box-shadow': theme('boxShadow.hover-sm'),
          },
        },
        '.hover-lift-lg': {
          'transition': 'transform 200ms ease-out, box-shadow 200ms ease-out',
          '&:hover': {
            'transform': 'translateY(-4px)',
            'box-shadow': theme('boxShadow.hover-lg'),
          },
        },
        
        // Active state utilities (Req 7.4)
        // 15% brightness decrease and scale transform on active (Req 1.6)
        '.active-scale': {
          'transition': 'transform 100ms ease-out',
          '&:active': {
            'transform': 'scale(0.98)',
          },
        },
        '.active-scale-sm': {
          'transition': 'transform 100ms ease-out',
          '&:active': {
            'transform': 'scale(0.99)',
          },
        },
        '.active-scale-lg': {
          'transition': 'transform 100ms ease-out',
          '&:active': {
            'transform': 'scale(0.95)',
          },
        },
        '.active-brightness': {
          'transition': 'filter 100ms ease-out',
          '&:active': {
            'filter': 'brightness(0.85)',
          },
        },
        '.active-brightness-sm': {
          'transition': 'filter 100ms ease-out',
          '&:active': {
            'filter': 'brightness(0.9)',
          },
        },
        '.active-brightness-lg': {
          'transition': 'filter 100ms ease-out',
          '&:active': {
            'filter': 'brightness(0.8)',
          },
        },
        
        // Disabled state utilities (Req 7.8)
        // 50% opacity and no-drop cursor for disabled elements
        '.disabled-state': {
          '&:disabled, &[disabled], &[aria-disabled="true"]': {
            'opacity': '0.5',
            'cursor': 'not-allowed',
            'pointer-events': 'none',
          },
        },
        '.disabled-opacity': {
          '&:disabled, &[disabled], &[aria-disabled="true"]': {
            'opacity': '0.5',
          },
        },
        '.disabled-cursor': {
          '&:disabled, &[disabled], &[aria-disabled="true"]': {
            'cursor': 'not-allowed',
          },
        },
        '.disabled-no-pointer': {
          '&:disabled, &[disabled], &[aria-disabled="true"]': {
            'pointer-events': 'none',
          },
        },
        
        // Combined interactive utilities (common patterns)
        '.interactive': {
          'transition': 'all 200ms ease-out',
          'outline': 'none',
          '&:hover': {
            'filter': 'brightness(1.1)',
          },
          '&:active': {
            'transform': 'scale(0.98)',
            'filter': 'brightness(0.85)',
          },
          '&:focus': {
            'outline': '2px solid var(--color-primary-500, #3b82f6)',
            'outline-offset': '2px',
          },
          '&:disabled, &[disabled], &[aria-disabled="true"]': {
            'opacity': '0.5',
            'cursor': 'not-allowed',
            'pointer-events': 'none',
          },
        },
        '.interactive-card': {
          'transition': 'transform 200ms ease-out, box-shadow 200ms ease-out',
          'cursor': 'pointer',
          '&:hover': {
            'transform': 'translateY(-2px)',
            'box-shadow': theme('boxShadow.hover-md'),
          },
          '&:active': {
            'transform': 'translateY(0)',
          },
          '&:focus': {
            'outline': '2px solid var(--color-primary-500, #3b82f6)',
            'outline-offset': '2px',
          },
        },
        '.interactive-button': {
          'transition': 'all 200ms ease-out',
          'outline': 'none',
          '&:hover': {
            'filter': 'brightness(1.1)',
            'box-shadow': theme('boxShadow.hover-md'),
          },
          '&:active': {
            'transform': 'scale(0.98)',
            'filter': 'brightness(0.85)',
          },
          '&:focus': {
            'outline': '2px solid var(--color-primary-500, #3b82f6)',
            'outline-offset': '2px',
          },
          '&:disabled, &[disabled], &[aria-disabled="true"]': {
            'opacity': '0.5',
            'cursor': 'not-allowed',
            'pointer-events': 'none',
            'filter': 'none',
            'transform': 'none',
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
}

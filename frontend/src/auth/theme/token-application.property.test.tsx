/**
 * Property-Based Tests: Token Application Consistency
 *
 * Feature: themeable-login-system
 * Property 2: Token Application Consistency
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * This property test validates that design tokens are consistently applied as CSS custom properties
 * and that all token values are properly transformed and accessible in the DOM.
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, waitFor } from '@testing-library/react';
import { LoginThemeProvider } from './LoginThemeProvider';
import type { LoginThemeConfig, TokenConfig } from './types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const colorArbitrary = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  );

const surfaceColorsArbitrary = fc.record({
  primary: colorArbitrary,
  secondary: colorArbitrary,
  tertiary: colorArbitrary,
});

const textColorsArbitrary = fc.record({
  primary: colorArbitrary,
  secondary: colorArbitrary,
  tertiary: colorArbitrary,
  inverse: colorArbitrary,
});

const borderColorsArbitrary = fc.record({
  default: colorArbitrary,
  focus: colorArbitrary,
  error: colorArbitrary,
});

const accentColorsArbitrary = fc.record({
  primary: colorArbitrary,
  hover: colorArbitrary,
  active: colorArbitrary,
});

const statusColorsArbitrary = fc.record({
  success: colorArbitrary,
  warning: colorArbitrary,
  error: colorArbitrary,
  info: colorArbitrary,
});

const fontFamilyArbitrary = fc.record({
  primary: fc.constantFrom('Arial', 'Helvetica', 'Inter', 'Roboto', 'system-ui'),
  monospace: fc.constantFrom('Courier', 'Monaco', 'Consolas', 'monospace'),
});

const fontSizeArbitrary = fc.record({
  xs: fc.integer({ min: 8, max: 12 }).map((n) => `${n}px`),
  sm: fc.integer({ min: 12, max: 14 }).map((n) => `${n}px`),
  base: fc.integer({ min: 14, max: 16 }).map((n) => `${n}px`),
  lg: fc.integer({ min: 16, max: 20 }).map((n) => `${n}px`),
  xl: fc.integer({ min: 20, max: 24 }).map((n) => `${n}px`),
  xxl: fc.integer({ min: 24, max: 32 }).map((n) => `${n}px`),
});

const fontWeightArbitrary = fc.record({
  normal: fc.constant(400),
  medium: fc.constant(500),
  semibold: fc.constant(600),
  bold: fc.constant(700),
});

const lineHeightArbitrary = fc.record({
  tight: fc.double({ min: 1.0, max: 1.3, noDefaultInfinity: true }),
  normal: fc.double({ min: 1.3, max: 1.6, noDefaultInfinity: true }),
  relaxed: fc.double({ min: 1.6, max: 2.0, noDefaultInfinity: true }),
});

const spacingScaleArbitrary = fc.record({
  xs: fc.integer({ min: 2, max: 6 }).map((n) => `${n}px`),
  sm: fc.integer({ min: 6, max: 12 }).map((n) => `${n}px`),
  md: fc.integer({ min: 12, max: 20 }).map((n) => `${n}px`),
  lg: fc.integer({ min: 20, max: 32 }).map((n) => `${n}px`),
  xl: fc.integer({ min: 32, max: 48 }).map((n) => `${n}px`),
  xxl: fc.integer({ min: 48, max: 64 }).map((n) => `${n}px`),
});

const shadowElevationArbitrary = fc.record({
  none: fc.constant('none'),
  sm: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
  md: fc.constant('0 2px 4px rgba(0,0,0,0.1)'),
  lg: fc.constant('0 4px 8px rgba(0,0,0,0.1)'),
  xl: fc.constant('0 8px 16px rgba(0,0,0,0.1)'),
});

const backdropBlurArbitrary = fc.record({
  none: fc.constant('none'),
  sm: fc.integer({ min: 2, max: 6 }).map((n) => `blur(${n}px)`),
  md: fc.integer({ min: 6, max: 12 }).map((n) => `blur(${n}px)`),
  lg: fc.integer({ min: 12, max: 20 }).map((n) => `blur(${n}px)`),
});

const radiusArbitrary = fc.record({
  card: fc.integer({ min: 0, max: 16 }).map((n) => `${n}px`),
  input: fc.integer({ min: 0, max: 8 }).map((n) => `${n}px`),
  button: fc.integer({ min: 0, max: 8 }).map((n) => `${n}px`),
  pill: fc.constant('9999px'),
});

const tokensArbitrary: fc.Arbitrary<TokenConfig> = fc.record({
  colors: fc.record({
    surface: surfaceColorsArbitrary,
    text: textColorsArbitrary,
    border: borderColorsArbitrary,
    accent: accentColorsArbitrary,
    status: statusColorsArbitrary,
  }),
  typography: fc.record({
    fontFamily: fontFamilyArbitrary,
    fontSize: fontSizeArbitrary,
    fontWeight: fontWeightArbitrary,
    lineHeight: lineHeightArbitrary,
  }),
  spacing: fc.record({
    scale: spacingScaleArbitrary,
    density: fc.constantFrom('compact', 'comfortable', 'spacious'),
  }),
  shadows: fc.record({
    elevation: shadowElevationArbitrary,
  }),
  blur: fc.record({
    backdrop: backdropBlurArbitrary,
    enabled: fc.boolean(),
  }),
  radius: radiusArbitrary,
});

// Minimal valid config generator (for testing token application)
const minimalConfigArbitrary = (tokens: TokenConfig): LoginThemeConfig => ({
  name: 'Test Theme',
  version: '1.0.0',
  layout: {
    template: 'splitHeroCompactForm',
    slots: {
      header: { enabled: true, components: ['logo'] },
      left: { variant: 'marketing' },
      main: { variant: 'compact' },
      footer: { enabled: false, components: [] },
    },
    responsive: {
      breakpoints: { mobile: 320, tablet: 768, desktop: 1024, kiosk: 1920 },
      stackOnMobile: true,
    },
  },
  tokens,
  components: {
    authCard: {
      methods: ['password'],
      showStorePicker: false,
      showStationPicker: false,
      showDeviceIdentity: false,
      showDemoAccounts: false,
      glassmorphism: false,
      elevation: 'none',
    },
    statusCard: {
      variant: 'systemForward',
      showDatabaseStatus: true,
      showSyncStatus: true,
      showLastSync: true,
      showStoreInfo: true,
      showStationInfo: true,
    },
    header: {
      showLogo: true,
      showEnvironmentSelector: false,
      showHelpMenu: false,
      companyName: 'Test Company',
    },
    footer: {
      showVersion: false,
      showBuild: false,
      showCopyright: false,
      copyrightText: '© 2026',
    },
    errorCallout: {
      presentation: 'inline',
      showRetryAction: true,
      showDiagnosticsAction: false,
    },
  },
  background: {
    type: 'solid',
    solid: { color: '#000000' },
  },
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 2: Token Application Consistency', () => {
  it('should apply all color tokens as CSS custom properties', async () => {
    await fc.assert(
      fc.asyncProperty(tokensArbitrary, async (tokens) => {
        const config = minimalConfigArbitrary(tokens);

        // Mock fetch to return our config
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => config,
        });

        const TestComponent = () => <div data-testid="test">Test</div>;

        render(
          <LoginThemeProvider tenantId="test">
            <TestComponent />
          </LoginThemeProvider>
        );

        await waitFor(() => {
          const root = document.documentElement;

          // Verify surface colors
          expect(root.style.getPropertyValue('--login-surface-primary')).toBe(
            tokens.colors.surface.primary
          );
          expect(root.style.getPropertyValue('--login-surface-secondary')).toBe(
            tokens.colors.surface.secondary
          );
          expect(root.style.getPropertyValue('--login-surface-tertiary')).toBe(
            tokens.colors.surface.tertiary
          );

          // Verify text colors
          expect(root.style.getPropertyValue('--login-text-primary')).toBe(
            tokens.colors.text.primary
          );
          expect(root.style.getPropertyValue('--login-text-secondary')).toBe(
            tokens.colors.text.secondary
          );
          expect(root.style.getPropertyValue('--login-text-tertiary')).toBe(
            tokens.colors.text.tertiary
          );
          expect(root.style.getPropertyValue('--login-text-inverse')).toBe(
            tokens.colors.text.inverse
          );

          // Verify border colors
          expect(root.style.getPropertyValue('--login-border-default')).toBe(
            tokens.colors.border.default
          );
          expect(root.style.getPropertyValue('--login-border-focus')).toBe(
            tokens.colors.border.focus
          );
          expect(root.style.getPropertyValue('--login-border-error')).toBe(
            tokens.colors.border.error
          );

          // Verify accent colors
          expect(root.style.getPropertyValue('--login-accent-primary')).toBe(
            tokens.colors.accent.primary
          );
          expect(root.style.getPropertyValue('--login-accent-hover')).toBe(
            tokens.colors.accent.hover
          );
          expect(root.style.getPropertyValue('--login-accent-active')).toBe(
            tokens.colors.accent.active
          );

          // Verify status colors
          expect(root.style.getPropertyValue('--login-status-success')).toBe(
            tokens.colors.status.success
          );
          expect(root.style.getPropertyValue('--login-status-warning')).toBe(
            tokens.colors.status.warning
          );
          expect(root.style.getPropertyValue('--login-status-error')).toBe(
            tokens.colors.status.error
          );
          expect(root.style.getPropertyValue('--login-status-info')).toBe(
            tokens.colors.status.info
          );
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should apply all typography tokens as CSS custom properties', async () => {
    await fc.assert(
      fc.asyncProperty(tokensArbitrary, async (tokens) => {
        const config = minimalConfigArbitrary(tokens);

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => config,
        });

        const TestComponent = () => <div data-testid="test">Test</div>;

        render(
          <LoginThemeProvider tenantId="test">
            <TestComponent />
          </LoginThemeProvider>
        );

        await waitFor(() => {
          const root = document.documentElement;

          // Verify font families
          expect(root.style.getPropertyValue('--login-font-primary')).toBe(
            tokens.typography.fontFamily.primary
          );
          expect(root.style.getPropertyValue('--login-font-monospace')).toBe(
            tokens.typography.fontFamily.monospace
          );

          // Verify font sizes
          expect(root.style.getPropertyValue('--login-text-xs')).toBe(
            tokens.typography.fontSize.xs
          );
          expect(root.style.getPropertyValue('--login-text-sm')).toBe(
            tokens.typography.fontSize.sm
          );
          expect(root.style.getPropertyValue('--login-text-base')).toBe(
            tokens.typography.fontSize.base
          );
          expect(root.style.getPropertyValue('--login-text-lg')).toBe(
            tokens.typography.fontSize.lg
          );
          expect(root.style.getPropertyValue('--login-text-xl')).toBe(
            tokens.typography.fontSize.xl
          );
          expect(root.style.getPropertyValue('--login-text-xxl')).toBe(
            tokens.typography.fontSize.xxl
          );

          // Verify font weights
          expect(root.style.getPropertyValue('--login-font-normal')).toBe(
            tokens.typography.fontWeight.normal.toString()
          );
          expect(root.style.getPropertyValue('--login-font-medium')).toBe(
            tokens.typography.fontWeight.medium.toString()
          );
          expect(root.style.getPropertyValue('--login-font-semibold')).toBe(
            tokens.typography.fontWeight.semibold.toString()
          );
          expect(root.style.getPropertyValue('--login-font-bold')).toBe(
            tokens.typography.fontWeight.bold.toString()
          );

          // Verify line heights
          expect(root.style.getPropertyValue('--login-leading-tight')).toBe(
            tokens.typography.lineHeight.tight.toString()
          );
          expect(root.style.getPropertyValue('--login-leading-normal')).toBe(
            tokens.typography.lineHeight.normal.toString()
          );
          expect(root.style.getPropertyValue('--login-leading-relaxed')).toBe(
            tokens.typography.lineHeight.relaxed.toString()
          );
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should apply all spacing tokens as CSS custom properties', async () => {
    await fc.assert(
      fc.asyncProperty(tokensArbitrary, async (tokens) => {
        const config = minimalConfigArbitrary(tokens);

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => config,
        });

        const TestComponent = () => <div data-testid="test">Test</div>;

        render(
          <LoginThemeProvider tenantId="test">
            <TestComponent />
          </LoginThemeProvider>
        );

        await waitFor(() => {
          const root = document.documentElement;

          // Verify spacing scale
          expect(root.style.getPropertyValue('--login-space-xs')).toBe(tokens.spacing.scale.xs);
          expect(root.style.getPropertyValue('--login-space-sm')).toBe(tokens.spacing.scale.sm);
          expect(root.style.getPropertyValue('--login-space-md')).toBe(tokens.spacing.scale.md);
          expect(root.style.getPropertyValue('--login-space-lg')).toBe(tokens.spacing.scale.lg);
          expect(root.style.getPropertyValue('--login-space-xl')).toBe(tokens.spacing.scale.xl);
          expect(root.style.getPropertyValue('--login-space-xxl')).toBe(tokens.spacing.scale.xxl);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should apply all shadow, blur, and radius tokens as CSS custom properties', async () => {
    await fc.assert(
      fc.asyncProperty(tokensArbitrary, async (tokens) => {
        const config = minimalConfigArbitrary(tokens);

        const TestComponent = () => <div data-testid="test">Test</div>;

        render(
          <LoginThemeProvider initialConfig={config}>
            <TestComponent />
          </LoginThemeProvider>
        );

        await waitFor(() => {
          const root = document.documentElement;

          // Verify shadows
          expect(root.style.getPropertyValue('--login-shadow-none')).toBe(
            tokens.shadows.elevation.none
          );
          expect(root.style.getPropertyValue('--login-shadow-sm')).toBe(
            tokens.shadows.elevation.sm
          );
          expect(root.style.getPropertyValue('--login-shadow-md')).toBe(
            tokens.shadows.elevation.md
          );
          expect(root.style.getPropertyValue('--login-shadow-lg')).toBe(
            tokens.shadows.elevation.lg
          );
          expect(root.style.getPropertyValue('--login-shadow-xl')).toBe(
            tokens.shadows.elevation.xl
          );

          // Verify blur (only if enabled)
          if (tokens.blur.enabled) {
            expect(root.style.getPropertyValue('--login-blur-none')).toBe(tokens.blur.backdrop.none);
            expect(root.style.getPropertyValue('--login-blur-sm')).toBe(tokens.blur.backdrop.sm);
            expect(root.style.getPropertyValue('--login-blur-md')).toBe(tokens.blur.backdrop.md);
            expect(root.style.getPropertyValue('--login-blur-lg')).toBe(tokens.blur.backdrop.lg);
          }

          // Verify radius
          expect(root.style.getPropertyValue('--login-radius-card')).toBe(tokens.radius.card);
          expect(root.style.getPropertyValue('--login-radius-input')).toBe(tokens.radius.input);
          expect(root.style.getPropertyValue('--login-radius-button')).toBe(tokens.radius.button);
          expect(root.style.getPropertyValue('--login-radius-pill')).toBe(tokens.radius.pill);
        });
      }),
      { numRuns: 20 }
    );
  }, 20000);

  it('should remove CSS custom properties on unmount', async () => {
    await fc.assert(
      fc.asyncProperty(tokensArbitrary, async (tokens) => {
        const config = minimalConfigArbitrary(tokens);

        const TestComponent = () => <div data-testid="test">Test</div>;

        const { unmount } = render(
          <LoginThemeProvider initialConfig={config}>
            <TestComponent />
          </LoginThemeProvider>
        );

        // Wait for CSS variables to be applied
        await waitFor(() => {
          const root = document.documentElement;
          expect(root.style.getPropertyValue('--login-surface-primary')).toBe(
            tokens.colors.surface.primary
          );
        });

        // Unmount the provider
        unmount();

        // Verify CSS variables are removed
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--login-surface-primary')).toBe('');
        expect(root.style.getPropertyValue('--login-text-primary')).toBe('');
        expect(root.style.getPropertyValue('--login-space-md')).toBe('');
      }),
      { numRuns: 20 }
    );
  }, 20000);
});

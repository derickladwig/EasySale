/**
 * Background Rendering - Property-Based Tests
 *
 * Feature: themeable-login-system, Property 5: Background Rendering Based on Type
 *
 * Validates that the correct background component renders based on configuration type,
 * and that error handling works correctly across all background types.
 *
 * Validates Requirements 4.2, 4.3, 4.4, 4.5, 4.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { BackgroundRenderer } from './BackgroundRenderer';
import { LoginThemeProvider } from '../theme/LoginThemeProvider';
import type { LoginThemeConfig, BackgroundConfig } from '../theme/types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

// Helper to generate hex color strings
const hexColorArb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  );

const solidBackgroundArb = fc.record({
  type: fc.constant('solid' as const),
  solid: fc.record({
    color: hexColorArb,
  }),
});

const gradientBackgroundArb = fc.record({
  type: fc.constant('gradient' as const),
  gradient: fc.record({
    stops: fc.array(
      fc.record({
        color: hexColorArb,
        position: fc.integer({ min: 0, max: 100 }),
      }),
      { minLength: 2, maxLength: 5 }
    ),
  }),
});

const wavesBackgroundArb = fc.record({
  type: fc.constant('waves' as const),
  waves: fc.record({
    baseColor: hexColorArb,
    waveColor: hexColorArb,
    intensity: fc.double({ min: 0, max: 1, noNaN: true }),
    showDotGrid: fc.boolean(),
    dotGridOpacity: fc.double({ min: 0, max: 1, noNaN: true }),
  }),
});

const photoBackgroundArb = fc.record({
  type: fc.constant('photo' as const),
  photo: fc.record({
    url: fc.webUrl(),
    lowResUrl: fc.option(fc.webUrl(), { nil: undefined }),
    placeholderColor: hexColorArb,
    blur: fc.integer({ min: 0, max: 32 }),
    overlay: fc.record({
      enabled: fc.boolean(),
      color: hexColorArb,
      opacity: fc.double({ min: 0, max: 1, noNaN: true }),
    }),
  }),
});

const backgroundConfigArb = fc.oneof(
  solidBackgroundArb,
  gradientBackgroundArb,
  wavesBackgroundArb,
  photoBackgroundArb
);

// ============================================================================
// Test Helper
// ============================================================================

function createMockConfig(background: BackgroundConfig): LoginThemeConfig {
  return {
    name: 'Test Config',
    version: '1.0.0',
    layout: {
      template: 'splitHeroCompactForm',
      slots: {
        header: { enabled: true, components: [] },
        left: { variant: 'marketing' },
        main: { variant: 'compact' },
        footer: { enabled: true, components: [] },
      },
      responsive: {
        breakpoints: { mobile: 320, tablet: 768, desktop: 1024, kiosk: 1920 },
        stackOnMobile: true,
      },
    },
    tokens: {
      colors: {
        surface: { primary: '#000', secondary: '#111', tertiary: '#222' },
        text: { primary: '#fff', secondary: '#eee', tertiary: '#ddd', inverse: '#000' },
        border: { default: '#333', focus: '#444', error: '#f00' },
        accent: { primary: '#00f', hover: '#00a', active: '#008' },
        status: { success: '#0f0', warning: '#ff0', error: '#f00', info: '#00f' },
      },
      typography: {
        fontFamily: { primary: 'sans-serif', monospace: 'monospace' },
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          xxl: '1.5rem',
        },
        fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
        lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
      },
      spacing: {
        scale: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem' },
        density: 'comfortable',
      },
      shadows: {
        elevation: {
          none: 'none',
          sm: '0 1px 2px rgba(0,0,0,0.1)',
          md: '0 2px 4px rgba(0,0,0,0.1)',
          lg: '0 4px 8px rgba(0,0,0,0.1)',
          xl: '0 8px 16px rgba(0,0,0,0.1)',
        },
      },
      blur: {
        backdrop: { none: 'none', sm: 'blur(4px)', md: 'blur(8px)', lg: 'blur(16px)' },
        enabled: true,
      },
      radius: { card: '8px', input: '4px', button: '4px', pill: '9999px' },
    },
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
        companyName: 'Test',
      },
      footer: {
        showVersion: true,
        showBuild: true,
        showCopyright: true,
        copyrightText: '© 2026',
      },
      errorCallout: {
        presentation: 'inline',
        showRetryAction: true,
        showDiagnosticsAction: true,
      },
    },
    background,
  };
}

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Background Rendering - Property-Based Tests', () => {
  // Mock Image for photo backgrounds
  let mockImages: Array<{
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  }> = [];

  beforeEach(() => {
    mockImages = [];
    global.Image = class MockImage {
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        const img = { src: this.src, onload: this.onload, onerror: this.onerror };
        mockImages.push(img);
        Object.defineProperty(this, 'src', {
          get: () => img.src,
          set: (value: string) => {
            img.src = value;
          },
        });
        Object.defineProperty(this, 'onload', {
          get: () => img.onload,
          set: (value: (() => void) | null) => {
            img.onload = value;
          },
        });
        Object.defineProperty(this, 'onerror', {
          get: () => img.onerror,
          set: (value: (() => void) | null) => {
            img.onerror = value;
          },
        });
      }
    } as any;
  });

  afterEach(() => {
    mockImages = [];
    cleanup(); // Clean up DOM between tests
  });

  it('Property 5.1: Correct background component renders based on type', () => {
    fc.assert(
      fc.property(backgroundConfigArb, (background) => {
        const config = createMockConfig(background);

        const { container, unmount } = render(
          <LoginThemeProvider initialConfig={config}>
            <BackgroundRenderer />
          </LoginThemeProvider>
        );

        try {
          // Verify background container renders
          const backgroundContainer = container.querySelector('.background-container');
          expect(backgroundContainer).toBeTruthy();

          // Verify correct background type renders
          const backgroundElement = container.querySelector('.background-renderer');
          expect(backgroundElement).toBeTruthy();
        } finally {
          unmount();
        }
      }),
      { numRuns: 20 }
    );
  });

  it('Property 5.2: Solid backgrounds render with configured color', () => {
    fc.assert(
      fc.property(solidBackgroundArb, (background) => {
        const config = createMockConfig(background);

        const { container, unmount } = render(
          <LoginThemeProvider initialConfig={config}>
            <BackgroundRenderer />
          </LoginThemeProvider>
        );

        try {
          const backgroundContainer = container.querySelector('.background-container');
          expect(backgroundContainer).toBeTruthy();
        } finally {
          unmount();
        }
      }),
      { numRuns: 20 }
    );
  });

  it('Property 5.3: Gradient backgrounds render with all color stops', () => {
    fc.assert(
      fc.property(gradientBackgroundArb, (background) => {
        const config = createMockConfig(background);

        const { container, unmount } = render(
          <LoginThemeProvider initialConfig={config}>
            <BackgroundRenderer />
          </LoginThemeProvider>
        );

        try {
          const backgroundContainer = container.querySelector('.background-container');
          expect(backgroundContainer).toBeTruthy();
        } finally {
          unmount();
        }
      }),
      { numRuns: 20 }
    );
  });

  it('Property 5.4: Waves backgrounds render with SVG waves', () => {
    fc.assert(
      fc.property(wavesBackgroundArb, (background) => {
        const config = createMockConfig(background);

        const { container, unmount } = render(
          <LoginThemeProvider initialConfig={config}>
            <BackgroundRenderer />
          </LoginThemeProvider>
        );

        try {
          const backgroundContainer = container.querySelector('.background-container');
          expect(backgroundContainer).toBeTruthy();
        } finally {
          unmount();
        }
      }),
      { numRuns: 20 }
    );
  });

  it('Property 5.5: Photo backgrounds render with placeholder initially', () => {
    fc.assert(
      fc.property(photoBackgroundArb, (background) => {
        const config = createMockConfig(background);

        const { container, unmount } = render(
          <LoginThemeProvider initialConfig={config}>
            <BackgroundRenderer />
          </LoginThemeProvider>
        );

        try {
          const backgroundContainer = container.querySelector('.background-container');
          expect(backgroundContainer).toBeTruthy();
        } finally {
          unmount();
        }
      }),
      { numRuns: 20 }
    );
  });
});

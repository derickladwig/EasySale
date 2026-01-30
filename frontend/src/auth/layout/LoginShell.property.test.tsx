/**
 * LoginShell Property-Based Tests
 * Feature: themeable-login-system, Property 4: Template Slot Rendering
 *
 * Property: For any layout template configuration, when the LoginShell renders,
 * all enabled slots should be visible and all disabled slots should not be rendered.
 *
 * Validates: Requirements 2.2, 2.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { LoginShell } from './LoginShell';
import { LoginThemeProvider } from '../theme/LoginThemeProvider';
import type { LoginThemeConfig } from '../theme/types';

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  // Mock fetch for theme loading
  global.fetch = vi.fn();
  // Clean up DOM before each test
  cleanup();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  // Clean up DOM after each test
  cleanup();
  document.body.innerHTML = '';
});

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const layoutTemplateArb = fc.constantFrom(
  'splitHeroCompactForm',
  'leftStatusRightAuthCard',
  'leftStatusRightAuthCardPhoto'
);

const slotConfigArb = fc.record({
  enabled: fc.boolean(),
  components: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
});

const leftSlotConfigArb = fc.record({
  variant: fc.constantFrom('marketing', 'status'),
});

const mainSlotConfigArb = fc.record({
  variant: fc.constantFrom('compact', 'card'),
});

const responsiveConfigArb = fc.record({
  breakpoints: fc.record({
    mobile: fc.constant(768),
    tablet: fc.constant(1024),
    desktop: fc.constant(1440),
    kiosk: fc.constant(1920),
  }),
  stackOnMobile: fc.boolean(),
});

const layoutConfigArb = fc.record({
  template: layoutTemplateArb,
  slots: fc.record({
    header: slotConfigArb,
    left: leftSlotConfigArb,
    main: mainSlotConfigArb,
    footer: slotConfigArb,
  }),
  responsive: responsiveConfigArb,
});

// Minimal theme config for testing
const minimalThemeConfigArb = (layoutConfig: any): LoginThemeConfig => ({
  name: 'Test Theme',
  version: '1.0.0',
  layout: layoutConfig,
  tokens: {
    colors: {
      surface: { primary: '#000', secondary: '#111', tertiary: '#222' },
      text: { primary: '#fff', secondary: '#eee', tertiary: '#ddd', inverse: '#000' },
      border: { default: '#333', focus: '#444', error: '#f00' },
      accent: { primary: '#00f', hover: '#00e', active: '#00d' },
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
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.15)',
      },
    },
    blur: {
      backdrop: { none: 'none', sm: 'blur(4px)', md: 'blur(12px)', lg: 'blur(16px)' },
      enabled: false,
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
    solid: { color: '#000' },
  },
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 4: Template Slot Rendering', () => {
  it('should render all enabled slots and hide all disabled slots', async () => {
    await fc.assert(
      fc.asyncProperty(layoutConfigArb, async (layoutConfig) => {
        // Clean up before each iteration
        cleanup();
        document.body.innerHTML = '';

        const themeConfig = minimalThemeConfigArb(layoutConfig);

        // Mock fetch to return our test config
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => themeConfig,
        });

        const { container } = render(
          <LoginThemeProvider tenantId="test">
            <LoginShell
              header={<div data-testid="header-content">Header</div>}
              left={<div data-testid="left-content">Left</div>}
              main={<div data-testid="main-content">Main</div>}
              footer={<div data-testid="footer-content">Footer</div>}
              background={<div data-testid="background-content">Background</div>}
            />
          </LoginThemeProvider>
        );

        // Wait for theme to load
        await waitFor(() => {
          expect(container.querySelector('.login-shell')).toBeTruthy();
        });

        // Background should always be rendered
        expect(container.querySelector('.login-background-slot')).toBeTruthy();

        // Check header slot
        if (layoutConfig.slots.header.enabled) {
          expect(container.querySelector('[data-testid="header-content"]')).toBeTruthy();
        } else {
          expect(container.querySelector('[data-testid="header-content"]')).toBeFalsy();
        }

        // Left and main slots are always enabled (they only have variant property)
        // They render if content is provided
        expect(container.querySelector('[data-testid="left-content"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="main-content"]')).toBeTruthy();

        // Check footer slot
        if (layoutConfig.slots.footer.enabled) {
          expect(container.querySelector('[data-testid="footer-content"]')).toBeTruthy();
        } else {
          expect(container.querySelector('[data-testid="footer-content"]')).toBeFalsy();
        }

        // Clean up after iteration
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should apply correct template class for any template type', async () => {
    await fc.assert(
      fc.asyncProperty(layoutTemplateArb, async (template) => {
        // Clean up before each iteration
        cleanup();
        document.body.innerHTML = '';

        const layoutConfig = {
          template,
          slots: {
            header: { enabled: true, components: [] },
            left: { variant: 'marketing' as const, enabled: true },
            main: { variant: 'compact' as const, enabled: true },
            footer: { enabled: true, components: [] },
          },
          responsive: {
            breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
            stackOnMobile: false,
          },
        };

        const themeConfig = minimalThemeConfigArb(layoutConfig);

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => themeConfig,
        });

        const { container } = render(
          <LoginThemeProvider tenantId="test">
            <LoginShell main={<div>Main</div>} />
          </LoginThemeProvider>
        );

        // Wait for theme to load
        await waitFor(() => {
          const shell = container.querySelector('.login-shell');
          expect(shell).toBeTruthy();
        });

        const shell = container.querySelector('.login-shell');
        expect(shell?.classList.contains(`login-shell--${template}`)).toBe(true);

        // Clean up after iteration
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should apply stack-mobile class when stackOnMobile is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (stackOnMobile) => {
        // Clean up before each iteration
        cleanup();
        document.body.innerHTML = '';

        const layoutConfig = {
          template: 'splitHeroCompactForm' as const,
          slots: {
            header: { enabled: true, components: [] },
            left: { variant: 'marketing' as const, enabled: true },
            main: { variant: 'compact' as const, enabled: true },
            footer: { enabled: true, components: [] },
          },
          responsive: {
            breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
            stackOnMobile,
          },
        };

        const themeConfig = minimalThemeConfigArb(layoutConfig);

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => themeConfig,
        });

        const { container } = render(
          <LoginThemeProvider tenantId="test">
            <LoginShell main={<div>Main</div>} />
          </LoginThemeProvider>
        );

        // Wait for theme to load
        await waitFor(() => {
          const shell = container.querySelector('.login-shell');
          expect(shell).toBeTruthy();
        });

        const shell = container.querySelector('.login-shell');

        if (stackOnMobile) {
          expect(shell?.classList.contains('login-shell--stack-mobile')).toBe(true);
        } else {
          expect(shell?.classList.contains('login-shell--stack-mobile')).toBe(false);
        }

        // Clean up after iteration
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should apply correct variant classes to left and main slots', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('marketing', 'status'),
        fc.constantFrom('compact', 'card'),
        async (leftVariant, mainVariant) => {
          // Clean up before each iteration
          cleanup();
          document.body.innerHTML = '';

          const layoutConfig = {
            template: 'splitHeroCompactForm' as const,
            slots: {
              header: { enabled: false, components: [] },
              left: { variant: leftVariant as 'marketing' | 'status', enabled: true },
              main: { variant: mainVariant as 'compact' | 'card', enabled: true },
              footer: { enabled: false, components: [] },
            },
            responsive: {
              breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
              stackOnMobile: false,
            },
          };

          const themeConfig = minimalThemeConfigArb(layoutConfig);

          (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => themeConfig,
          });

          const { container } = render(
            <LoginThemeProvider tenantId="test">
              <LoginShell left={<div>Left</div>} main={<div>Main</div>} />
            </LoginThemeProvider>
          );

          // Wait for theme to load
          await waitFor(() => {
            expect(container.querySelector('.login-shell')).toBeTruthy();
          });

          const leftSlot = container.querySelector('.login-left-slot');
          const mainSlot = container.querySelector('.login-main-slot');

          expect(leftSlot?.classList.contains(`login-shell__left--${leftVariant}`)).toBe(true);
          expect(mainSlot?.classList.contains(`login-shell__main--${mainVariant}`)).toBe(true);

          // Clean up after iteration
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not render slots when content is not provided even if enabled', async () => {
    await fc.assert(
      fc.asyncProperty(layoutConfigArb, async (layoutConfig) => {
        // Clean up before each iteration
        cleanup();
        document.body.innerHTML = '';

        const themeConfig = minimalThemeConfigArb(layoutConfig);

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => themeConfig,
        });

        const { container } = render(
          <LoginThemeProvider tenantId="test">
            <LoginShell
              // Only provide main content, no header/left/footer
              main={<div data-testid="main-content">Main</div>}
            />
          </LoginThemeProvider>
        );

        // Wait for theme to load
        await waitFor(() => {
          expect(container.querySelector('.login-shell')).toBeTruthy();
        });

        // Even if enabled, slots without content should not render
        expect(container.querySelector('[data-testid="header-content"]')).toBeFalsy();
        expect(container.querySelector('[data-testid="left-content"]')).toBeFalsy();
        expect(container.querySelector('[data-testid="footer-content"]')).toBeFalsy();

        // Main should always render since we provided it (main slot is always enabled)
        expect(container.querySelector('[data-testid="main-content"]')).toBeTruthy();

        // Clean up after iteration
        cleanup();
      }),
      { numRuns: 20 }
    );
  });
});

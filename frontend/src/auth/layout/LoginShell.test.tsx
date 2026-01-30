/**
 * LoginShell Unit Tests
 *
 * Tests specific template rendering scenarios and edge cases.
 * Validates Requirements 2.1, 2.4, 2.5, 2.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { LoginShell } from './LoginShell';
import { LoginThemeProvider } from '../theme/LoginThemeProvider';
import type { LoginThemeConfig } from '../theme/types';

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  global.fetch = vi.fn();
  cleanup();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  document.body.innerHTML = '';
});

// ============================================================================
// Helper Functions
// ============================================================================

const createMockConfig = (overrides: Partial<LoginThemeConfig> = {}): LoginThemeConfig => ({
  name: 'Test Theme',
  version: '1.0.0',
  layout: {
    template: 'splitHeroCompactForm',
    slots: {
      header: { enabled: true, components: [] },
      left: { variant: 'marketing' },
      main: { variant: 'compact' },
      footer: { enabled: false, components: [] },
    },
    responsive: {
      breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
      stackOnMobile: false,
    },
  },
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
  ...overrides,
});

// ============================================================================
// Template A Tests (splitHeroCompactForm)
// ============================================================================

describe('Template A: splitHeroCompactForm', () => {
  it('should render marketing hero in left slot and compact form in main slot', async () => {
    const config = createMockConfig({
      layout: {
        template: 'splitHeroCompactForm',
        slots: {
          header: { enabled: true, components: [] },
          left: { variant: 'marketing' },
          main: { variant: 'compact' },
          footer: { enabled: false, components: [] },
        },
        responsive: {
          breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
          stackOnMobile: false,
        },
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <LoginShell
          left={<div data-testid="marketing-hero">Marketing Hero</div>}
          main={<div data-testid="compact-form">Compact Form</div>}
        />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.login-shell--splitHeroCompactForm')).toBeTruthy();
    });

    // Verify template class
    const shell = container.querySelector('.login-shell');
    expect(shell?.classList.contains('login-shell--splitHeroCompactForm')).toBe(true);

    // Verify left slot has marketing variant
    const leftSlot = container.querySelector('.login-left-slot');
    expect(leftSlot?.classList.contains('login-shell__left--marketing')).toBe(true);
    expect(container.querySelector('[data-testid="marketing-hero"]')).toBeTruthy();

    // Verify main slot has compact variant
    const mainSlot = container.querySelector('.login-main-slot');
    expect(mainSlot?.classList.contains('login-shell__main--compact')).toBe(true);
    expect(container.querySelector('[data-testid="compact-form"]')).toBeTruthy();
  });

  it('should apply correct layout styles for Template A', async () => {
    const config = createMockConfig();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <LoginShell left={<div>Left</div>} main={<div>Main</div>} />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.login-shell--splitHeroCompactForm')).toBeTruthy();
    });

    // Verify main area exists
    const mainArea = container.querySelector('.login-shell__main-area');
    expect(mainArea).toBeTruthy();

    // Verify both slots are rendered
    expect(container.querySelector('.login-left-slot')).toBeTruthy();
    expect(container.querySelector('.login-main-slot')).toBeTruthy();
  });
});

// ============================================================================
// Template B/C Tests (leftStatusRightAuthCard)
// ============================================================================

describe('Template B/C: leftStatusRightAuthCard', () => {
  it('should render status card in left slot and auth card in main slot', async () => {
    const config = createMockConfig({
      layout: {
        template: 'leftStatusRightAuthCard',
        slots: {
          header: { enabled: true, components: [] },
          left: { variant: 'status' },
          main: { variant: 'card' },
          footer: { enabled: false, components: [] },
        },
        responsive: {
          breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
          stackOnMobile: false,
        },
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <LoginShell
          left={<div data-testid="status-card">Status Card</div>}
          main={<div data-testid="auth-card">Auth Card</div>}
        />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.login-shell--leftStatusRightAuthCard')).toBeTruthy();
    });

    // Verify template class
    const shell = container.querySelector('.login-shell');
    expect(shell?.classList.contains('login-shell--leftStatusRightAuthCard')).toBe(true);

    // Verify left slot has status variant
    const leftSlot = container.querySelector('.login-left-slot');
    expect(leftSlot?.classList.contains('login-shell__left--status')).toBe(true);
    expect(container.querySelector('[data-testid="status-card"]')).toBeTruthy();

    // Verify main slot has card variant
    const mainSlot = container.querySelector('.login-main-slot');
    expect(mainSlot?.classList.contains('login-shell__main--card')).toBe(true);
    expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
  });

  it('should render environment selector in header when enabled', async () => {
    const config = createMockConfig({
      layout: {
        template: 'leftStatusRightAuthCard',
        slots: {
          header: { enabled: true, components: ['environmentSelector'] },
          left: { variant: 'status' },
          main: { variant: 'card' },
          footer: { enabled: false, components: [] },
        },
        responsive: {
          breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
          stackOnMobile: false,
        },
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <LoginShell
          header={<div data-testid="environment-selector">Environment Selector</div>}
          left={<div>Status</div>}
          main={<div>Auth</div>}
        />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.login-shell--leftStatusRightAuthCard')).toBeTruthy();
    });

    // Verify header is rendered
    expect(container.querySelector('.login-header-slot')).toBeTruthy();
    expect(container.querySelector('[data-testid="environment-selector"]')).toBeTruthy();
  });

  it('should apply correct layout styles for Template B/C', async () => {
    const config = createMockConfig({
      layout: {
        template: 'leftStatusRightAuthCardPhoto',
        slots: {
          header: { enabled: false, components: [] },
          left: { variant: 'status' },
          main: { variant: 'card' },
          footer: { enabled: false, components: [] },
        },
        responsive: {
          breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
          stackOnMobile: false,
        },
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <LoginShell left={<div>Left</div>} main={<div>Main</div>} />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.login-shell--leftStatusRightAuthCardPhoto')).toBeTruthy();
    });

    // Verify template class
    const shell = container.querySelector('.login-shell');
    expect(shell?.classList.contains('login-shell--leftStatusRightAuthCardPhoto')).toBe(true);

    // Verify main area exists
    const mainArea = container.querySelector('.login-shell__main-area');
    expect(mainArea).toBeTruthy();

    // Verify both slots are rendered
    expect(container.querySelector('.login-left-slot')).toBeTruthy();
    expect(container.querySelector('.login-main-slot')).toBeTruthy();
  });
});

// ============================================================================
// Empty Slot Tests
// ============================================================================

describe('Empty Slots', () => {
  it('should render without errors when slots are empty', async () => {
    const config = createMockConfig();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <LoginShell />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.login-shell')).toBeTruthy();
    });

    // Verify shell renders
    expect(container.querySelector('.login-shell')).toBeTruthy();

    // Verify no slots render without content
    expect(container.querySelector('.login-header-slot')).toBeFalsy();
    expect(container.querySelector('.login-left-slot')).toBeFalsy();
    expect(container.querySelector('.login-main-slot')).toBeFalsy();
    expect(container.querySelector('.login-footer-slot')).toBeFalsy();
  });

  it('should render only provided slots', async () => {
    const config = createMockConfig();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <LoginShell main={<div data-testid="main-only">Main Only</div>} />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.login-shell')).toBeTruthy();
    });

    // Verify only main slot renders
    expect(container.querySelector('.login-header-slot')).toBeFalsy();
    expect(container.querySelector('.login-left-slot')).toBeFalsy();
    expect(container.querySelector('.login-main-slot')).toBeTruthy();
    expect(container.querySelector('.login-footer-slot')).toBeFalsy();
    expect(container.querySelector('[data-testid="main-only"]')).toBeTruthy();
  });

  it('should render background slot even when other slots are empty', async () => {
    const config = createMockConfig();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <LoginShell background={<div data-testid="background">Background</div>} />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.login-shell')).toBeTruthy();
    });

    // Verify background renders
    expect(container.querySelector('.login-background-slot')).toBeTruthy();
    expect(container.querySelector('[data-testid="background"]')).toBeTruthy();

    // Verify no other slots render
    expect(container.querySelector('.login-header-slot')).toBeFalsy();
    expect(container.querySelector('.login-left-slot')).toBeFalsy();
    expect(container.querySelector('.login-main-slot')).toBeFalsy();
    expect(container.querySelector('.login-footer-slot')).toBeFalsy();
  });
});

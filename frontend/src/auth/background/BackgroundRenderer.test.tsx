/**
 * BackgroundRenderer Unit Tests
 *
 * Tests background rendering with different types and error handling.
 * Validates Requirements 4.1, 4.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { BackgroundRenderer } from './BackgroundRenderer';
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

const createMockConfig = (
  backgroundType: 'solid' | 'gradient' | 'waves' | 'photo',
  backgroundConfig: any
): LoginThemeConfig => ({
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
    type: backgroundType,
    ...backgroundConfig,
  },
});

// ============================================================================
// Solid Background Tests
// ============================================================================

describe('Solid Background', () => {
  it('should render solid background with configured color', async () => {
    const config = createMockConfig('solid', {
      solid: { color: '#1a1a2e' },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="background-solid"]')).toBeTruthy();
    });

    const solidBg = container.querySelector('[data-testid="background-solid"]') as HTMLElement;
    expect(solidBg.style.backgroundColor).toBe('rgb(26, 26, 46)'); // #1a1a2e in RGB
  });

  it('should use default black color if solid color not provided', async () => {
    const config = createMockConfig('solid', {});

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="background-solid"]')).toBeTruthy();
    });

    const solidBg = container.querySelector('[data-testid="background-solid"]') as HTMLElement;
    expect(solidBg.style.backgroundColor).toBe('rgb(0, 0, 0)'); // #000 in RGB
  });
});

// ============================================================================
// Gradient Background Tests
// ============================================================================

describe('Gradient Background', () => {
  it('should render gradient background placeholder', async () => {
    const config = createMockConfig('gradient', {
      gradient: {
        stops: [
          { color: '#1e293b', position: 0 },
          { color: '#0f172a', position: 100 },
        ],
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="background-gradient"]')).toBeTruthy();
    });
  });
});

// ============================================================================
// Waves Background Tests
// ============================================================================

describe('Waves Background', () => {
  it('should render waves background placeholder', async () => {
    const config = createMockConfig('waves', {
      waves: {
        baseColor: '#0f172a',
        waveColor: '#1e293b',
        intensity: 0.5,
        showDotGrid: true,
        dotGridOpacity: 0.1,
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="background-waves"]')).toBeTruthy();
    });
  });
});

// ============================================================================
// Photo Background Tests
// ============================================================================

describe('Photo Background', () => {
  it('should render photo background placeholder', async () => {
    const config = createMockConfig('photo', {
      photo: {
        url: 'https://example.com/photo.jpg',
        placeholderColor: '#1e293b',
        blur: 0,
        overlay: {
          enabled: false,
          color: '#000',
          opacity: 0,
        },
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="background-photo"]')).toBeTruthy();
    });
  });

  it('should render overlay when enabled', async () => {
    const config = createMockConfig('photo', {
      photo: {
        url: 'https://example.com/photo.jpg',
        placeholderColor: '#1e293b',
        blur: 0,
        overlay: {
          enabled: true,
          color: '#000000',
          opacity: 0.5,
        },
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="photo-overlay"]')).toBeTruthy();
    });

    const overlay = container.querySelector('[data-testid="photo-overlay"]') as HTMLElement;
    expect(overlay.style.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(overlay.style.opacity).toBe('0.5');
  });

  it('should not render overlay when disabled', async () => {
    const config = createMockConfig('photo', {
      photo: {
        url: 'https://example.com/photo.jpg',
        placeholderColor: '#1e293b',
        blur: 0,
        overlay: {
          enabled: false,
          color: '#000',
          opacity: 0.5,
        },
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="background-photo"]')).toBeTruthy();
    });

    expect(container.querySelector('[data-testid="photo-overlay"]')).toBeFalsy();
  });
});

// ============================================================================
// Low-Power Mode Tests
// ============================================================================

describe('Low-Power Mode', () => {
  it('should apply low-power class when enabled', async () => {
    const config = createMockConfig('solid', {
      solid: { color: '#000' },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer lowPowerMode={true} />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.background-container--low-power')).toBeTruthy();
    });
  });

  it('should not apply low-power class when disabled', async () => {
    const config = createMockConfig('solid', {
      solid: { color: '#000' },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer lowPowerMode={false} />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('.background-container')).toBeTruthy();
    });

    expect(container.querySelector('.background-container--low-power')).toBeFalsy();
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should render container even with unknown background type', async () => {
    const config = createMockConfig('solid', {
      solid: { color: '#000' },
    });

    // Override type to unknown value
    (config.background as any).type = 'unknown';

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => config,
    });

    const { container } = render(
      <LoginThemeProvider tenantId="test">
        <BackgroundRenderer />
      </LoginThemeProvider>
    );

    await waitFor(() => {
      // Should fallback to solid background
      expect(container.querySelector('[data-testid="background-solid"]')).toBeTruthy();
    });
  });
});

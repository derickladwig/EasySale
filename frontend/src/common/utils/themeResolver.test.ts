/**
 * Theme Resolver Tests
 * 
 * Tests for theme resolution logic that combines user preferences
 * with tenant defaults.
 * 
 * Validates: Requirements 5.5 (Theme default support)
 * Task: 15.3 Add theme default support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveTheme,
  getSystemPreference,
  getEffectiveThemeDescription,
  needsSystemPreferenceMonitoring,
} from './themeResolver';
import type { BrandConfig } from '../../config/types';

describe('Theme Resolver', () => {
  // Mock window.matchMedia
  const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  };

  beforeEach(() => {
    // Default to light system preference
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveTheme', () => {
    const mockBrandConfig: BrandConfig = {
      appName: 'Test Store',
      company: {
        name: 'Test Store',
        shortName: 'TS',
      },
      logo: {
        light: '/logo-light.png',
        dark: '/logo-dark.png',
      },
      theme: {
        preset: 'default',
        defaultAppearance: 'dark',
      },
    };

    it('should resolve "light" to light', () => {
      expect(resolveTheme('light', mockBrandConfig)).toBe('light');
    });

    it('should resolve "dark" to dark', () => {
      expect(resolveTheme('dark', mockBrandConfig)).toBe('dark');
    });

    it('should resolve "system" to system preference (light)', () => {
      mockMatchMedia(false); // System prefers light
      expect(resolveTheme('system', mockBrandConfig)).toBe('light');
    });

    it('should resolve "system" to system preference (dark)', () => {
      mockMatchMedia(true); // System prefers dark
      expect(resolveTheme('system', mockBrandConfig)).toBe('dark');
    });

    it('should resolve "store-default" to tenant default (dark)', () => {
      expect(resolveTheme('store-default', mockBrandConfig)).toBe('dark');
    });

    it('should resolve "store-default" to tenant default (light)', () => {
      const lightBrandConfig: BrandConfig = {
        ...mockBrandConfig,
        theme: {
          preset: 'default',
          defaultAppearance: 'light',
        },
      };
      expect(resolveTheme('store-default', lightBrandConfig)).toBe('light');
    });

    it('should resolve "store-default" with tenant "system" to system preference', () => {
      const systemBrandConfig: BrandConfig = {
        ...mockBrandConfig,
        theme: {
          preset: 'default',
          defaultAppearance: 'system',
        },
      };
      mockMatchMedia(true); // System prefers dark
      expect(resolveTheme('store-default', systemBrandConfig)).toBe('dark');
    });

    it('should default to system preference when no brand config provided', () => {
      mockMatchMedia(false); // System prefers light
      expect(resolveTheme('store-default')).toBe('light');
    });

    it('should default to system preference when brand config has no theme', () => {
      const noBrandConfig: BrandConfig = {
        ...mockBrandConfig,
        theme: {
          preset: 'default',
        },
      };
      mockMatchMedia(true); // System prefers dark
      expect(resolveTheme('store-default', noBrandConfig)).toBe('dark');
    });
  });

  describe('getSystemPreference', () => {
    it('should return "dark" when system prefers dark', () => {
      mockMatchMedia(true);
      expect(getSystemPreference()).toBe('dark');
    });

    it('should return "light" when system prefers light', () => {
      mockMatchMedia(false);
      expect(getSystemPreference()).toBe('light');
    });
  });

  describe('getEffectiveThemeDescription', () => {
    const mockBrandConfig: BrandConfig = {
      appName: 'Test Store',
      company: {
        name: 'Test Store',
        shortName: 'TS',
      },
      logo: {
        light: '/logo-light.png',
        dark: '/logo-dark.png',
      },
      theme: {
        preset: 'default',
        defaultAppearance: 'dark',
      },
    };

    it('should describe direct light preference', () => {
      expect(getEffectiveThemeDescription('light', mockBrandConfig)).toBe('Light');
    });

    it('should describe direct dark preference', () => {
      expect(getEffectiveThemeDescription('dark', mockBrandConfig)).toBe('Dark');
    });

    it('should describe system preference (light)', () => {
      mockMatchMedia(false);
      expect(getEffectiveThemeDescription('system', mockBrandConfig)).toBe(
        'Following system (Light)'
      );
    });

    it('should describe system preference (dark)', () => {
      mockMatchMedia(true);
      expect(getEffectiveThemeDescription('system', mockBrandConfig)).toBe(
        'Following system (Dark)'
      );
    });

    it('should describe store default (dark)', () => {
      expect(getEffectiveThemeDescription('store-default', mockBrandConfig)).toBe(
        'Using store default (Dark)'
      );
    });

    it('should describe store default (light)', () => {
      const lightBrandConfig: BrandConfig = {
        ...mockBrandConfig,
        theme: {
          preset: 'default',
          defaultAppearance: 'light',
        },
      };
      expect(getEffectiveThemeDescription('store-default', lightBrandConfig)).toBe(
        'Using store default (Light)'
      );
    });
  });

  describe('needsSystemPreferenceMonitoring', () => {
    const mockBrandConfig: BrandConfig = {
      appName: 'Test Store',
      company: {
        name: 'Test Store',
        shortName: 'TS',
      },
      logo: {
        light: '/logo-light.png',
        dark: '/logo-dark.png',
      },
      theme: {
        preset: 'default',
        defaultAppearance: 'dark',
      },
    };

    it('should return true for "system" preference', () => {
      expect(needsSystemPreferenceMonitoring('system', mockBrandConfig)).toBe(true);
    });

    it('should return false for "light" preference', () => {
      expect(needsSystemPreferenceMonitoring('light', mockBrandConfig)).toBe(false);
    });

    it('should return false for "dark" preference', () => {
      expect(needsSystemPreferenceMonitoring('dark', mockBrandConfig)).toBe(false);
    });

    it('should return false for "store-default" with fixed tenant default', () => {
      expect(needsSystemPreferenceMonitoring('store-default', mockBrandConfig)).toBe(false);
    });

    it('should return true for "store-default" with tenant "system"', () => {
      const systemBrandConfig: BrandConfig = {
        ...mockBrandConfig,
        theme: {
          preset: 'default',
          defaultAppearance: 'system',
        },
      };
      expect(needsSystemPreferenceMonitoring('store-default', systemBrandConfig)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing window object gracefully', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing undefined window
      delete global.window;

      expect(getSystemPreference()).toBe('light');

      global.window = originalWindow;
    });

    it('should handle undefined brand config', () => {
      mockMatchMedia(false);
      expect(resolveTheme('store-default', undefined)).toBe('light');
    });

    it('should handle brand config without theme section', () => {
      const noBrandConfig = {
        appName: 'Test',
        company: { name: 'Test', shortName: 'T' },
        logo: { light: '/l.png', dark: '/d.png' },
      } as BrandConfig;

      mockMatchMedia(true);
      expect(resolveTheme('store-default', noBrandConfig)).toBe('dark');
    });
  });
});

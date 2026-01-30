/**
 * Tenant Config System Tests
 *
 * Tests for the tenant configuration system including validation,
 * merge strategy, theme bridge, and asset caching.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateConfig } from './validation';
import { mergeConfigs, resolveTheme } from './configMerge';
import { applyThemeToCSS, themeToCSSVariables, removeThemeFromCSS } from './themeBridge';
import { defaultConfig } from './defaultConfig';
import type { TenantConfig, ThemeConfig } from './types';

describe('Tenant Config System', () => {
  describe('Config Validation', () => {
    it('should validate a valid config', () => {
      const result = validateConfig(defaultConfig, 'development');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject invalid config in development mode', () => {
      const invalidConfig = {
        version: 'invalid', // Should be semver
        tenant: { id: 'test' }, // Missing required fields
      };

      expect(() => {
        validateConfig(invalidConfig, 'development');
      }).toThrow();
    });

    it('should soft-fail invalid config in production mode', () => {
      const invalidConfig = {
        version: 'invalid',
        tenant: { id: 'test' },
      };

      const result = validateConfig(invalidConfig, 'production');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Config Merge Strategy', () => {
    it('should merge configs with correct precedence', () => {
      const tenantConfig: Partial<TenantConfig> = {
        branding: {
          company: {
            name: 'Tenant Company',
          },
        },
      };

      const storeConfig = {
        theme: {
          mode: 'dark' as const,
        },
      };

      const userConfig = {
        theme: {
          mode: 'light' as const,
        },
      };

      const merged = mergeConfigs({
        default: defaultConfig,
        tenant: tenantConfig,
        store: storeConfig,
        user: userConfig,
      });

      // User config should override store config (no locks)
      expect(merged.theme.mode).toBe('light');
      // Tenant branding should be applied
      expect(merged.branding.company.name).toBe('Tenant Company');
    });

    it('should respect theme locks', () => {
      const storeConfig = {
        theme: {
          mode: 'dark' as const,
        },
        locks: {
          lockMode: true,
        },
      };

      const userConfig = {
        theme: {
          mode: 'light' as const,
        },
      };

      const merged = mergeConfigs({
        default: defaultConfig,
        store: storeConfig,
        user: userConfig,
      });

      // Store config should override user config (locked)
      expect(merged.theme.mode).toBe('dark');
    });

    it('should resolve theme with scope precedence', () => {
      const defaultTheme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: '#000000',
          background: '#ffffff',
          surface: '#f5f5f5',
          text: '#000000',
          success: '#00ff00',
          warning: '#ffff00',
          error: '#ff0000',
          info: '#0000ff',
        },
      };

      const storeTheme = {
        mode: 'dark' as const,
      };

      const userTheme = {
        mode: 'light' as const,
      };

      const resolved = resolveTheme(
        defaultTheme,
        undefined,
        storeTheme,
        userTheme,
        { lockMode: true }
      );

      // Store theme should win (locked)
      expect(resolved.mode).toBe('dark');
    });
  });

  describe('Theme CSS Bridge', () => {
    beforeEach(() => {
      // Clean up any existing theme variables
      removeThemeFromCSS();
    });

    afterEach(() => {
      removeThemeFromCSS();
    });

    it('should convert theme to CSS variables', () => {
      const theme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: {
            500: '#3b82f6',
            600: '#2563eb',
          },
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      const variables = themeToCSSVariables(theme);

      expect(variables['--color-primary-500']).toBe('#3b82f6');
      expect(variables['--color-primary-600']).toBe('#2563eb');
      expect(variables['--color-background']).toBe('#0f172a');
      expect(variables['--color-surface']).toBe('#1e293b');
      expect(variables['--color-text']).toBe('#f1f5f9');
    });

    it('should apply theme to DOM', () => {
      const theme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: '#3b82f6',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      applyThemeToCSS(theme);

      const root = document.documentElement;
      expect(root.dataset.theme).toBe('dark');
      expect(root.style.getPropertyValue('--color-background')).toBe('#0f172a');
    });

    it('should handle color scales', () => {
      const theme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            500: '#3b82f6',
            600: '#2563eb',
            900: '#1e3a8a',
          },
          background: '#ffffff',
          surface: '#f5f5f5',
          text: '#000000',
          success: '#00ff00',
          warning: '#ffff00',
          error: '#ff0000',
          info: '#0000ff',
        },
      };

      const variables = themeToCSSVariables(theme);

      expect(variables['--color-primary-50']).toBe('#eff6ff');
      expect(variables['--color-primary-100']).toBe('#dbeafe');
      expect(variables['--color-primary-500']).toBe('#3b82f6');
      expect(variables['--color-primary-600']).toBe('#2563eb');
      expect(variables['--color-primary-900']).toBe('#1e3a8a');
    });

    it('should map semantic action tokens', () => {
      const theme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: {
            500: '#3b82f6',
            600: '#2563eb',
          },
          background: '#ffffff',
          surface: '#f5f5f5',
          text: '#000000',
          success: '#00ff00',
          warning: '#ffff00',
          error: '#ff0000',
          info: '#0000ff',
        },
      };

      const variables = themeToCSSVariables(theme);

      expect(variables['--color-action-primary-bg']).toBe('#3b82f6');
      expect(variables['--color-action-primary-hover']).toBe('#2563eb');
      expect(variables['--color-action-primary-fg']).toBe('#ffffff');
    });
  });
});

/**
 * BrandConfig Tests
 * 
 * Unit tests for BrandConfig type and defaults.
 * Validates: Requirements 6.1
 */

import { describe, it, expect } from 'vitest';
import {
  defaultBrandConfig,
  devBrandConfig,
  firstRunBrandConfig,
  toBrandConfig,
  getBrandConfigForProfile,
} from './brandConfig';
import type { BrandConfig } from './types';

describe('BrandConfig', () => {
  describe('defaultBrandConfig', () => {
    it('should have EasySale-neutral defaults', () => {
      expect(defaultBrandConfig.appName).toBe('EasySale');
      expect(defaultBrandConfig.company.name).toBe('EasySale');
      expect(defaultBrandConfig.company.shortName).toBe('ES');
    });

    it('should have logo paths for light and dark themes', () => {
      expect(defaultBrandConfig.logo.light).toBeDefined();
      expect(defaultBrandConfig.logo.dark).toBeDefined();
      expect(defaultBrandConfig.logo.light).toContain('logo');
      expect(defaultBrandConfig.logo.dark).toContain('logo');
    });

    it('should have favicon path', () => {
      expect(defaultBrandConfig.favicon).toBeDefined();
      expect(defaultBrandConfig.favicon).toContain('favicon');
    });

    it('should have theme configuration', () => {
      expect(defaultBrandConfig.theme).toBeDefined();
      expect(defaultBrandConfig.theme.preset).toBe('default');
      expect(defaultBrandConfig.theme.defaultAppearance).toBe('system');
    });

    it('should not have CAPS-specific values', () => {
      const configStr = JSON.stringify(defaultBrandConfig).toLowerCase();
      expect(configStr).not.toContain('caps');
      expect(configStr).not.toContain('automotive');
    });
  });

  describe('devBrandConfig', () => {
    it('should be labeled as dev/demo', () => {
      expect(devBrandConfig.appName).toContain('Dev');
      expect(devBrandConfig.company.name).toBe('Demo Store');
    });

    it('should have store information', () => {
      expect(devBrandConfig.store).toBeDefined();
      expect(devBrandConfig.store?.name).toBe('Demo Store');
      expect(devBrandConfig.store?.station).toBe('Register 1');
    });
  });

  describe('firstRunBrandConfig', () => {
    it('should show untitled store', () => {
      expect(firstRunBrandConfig.company.name).toBe('Untitled Store');
      expect(firstRunBrandConfig.store?.name).toBe('Untitled Store');
    });

    it('should prompt for setup', () => {
      expect(firstRunBrandConfig.company.shortName).toBe('US');
    });
  });

  describe('toBrandConfig', () => {
    it('should convert BrandingConfig to BrandConfig', () => {
      const brandingConfig = {
        company: {
          name: 'Test Store',
          shortName: 'TS',
          logo: '/test-logo.png',
          favicon: '/test-favicon.png',
          icon: '/test-icon.png',
        },
        store: {
          name: 'Test Location',
          station: 'POS-1',
        },
      };

      const result = toBrandConfig(brandingConfig);

      expect(result.appName).toBe('Test Store');
      expect(result.company.name).toBe('Test Store');
      expect(result.company.shortName).toBe('TS');
      expect(result.company.icon).toBe('/test-icon.png');
      expect(result.favicon).toBe('/test-favicon.png');
      expect(result.store?.name).toBe('Test Location');
      expect(result.store?.station).toBe('POS-1');
    });

    it('should prefer explicit light/dark logos', () => {
      const brandingConfig = {
        company: {
          name: 'Test Store',
          logo: '/generic-logo.png',
          logoLight: '/light-logo.png',
          logoDark: '/dark-logo.png',
        },
      };

      const result = toBrandConfig(brandingConfig);

      expect(result.logo.light).toBe('/light-logo.png');
      expect(result.logo.dark).toBe('/dark-logo.png');
    });

    it('should fall back to generic logo if light/dark not specified', () => {
      const brandingConfig = {
        company: {
          name: 'Test Store',
          logo: '/generic-logo.png',
        },
      };

      const result = toBrandConfig(brandingConfig);

      expect(result.logo.light).toBe('/generic-logo.png');
      expect(result.logo.dark).toBe('/generic-logo.png');
    });

    it('should use defaults if no logos specified', () => {
      const brandingConfig = {
        company: {
          name: 'Test Store',
        },
      };

      const result = toBrandConfig(brandingConfig);

      expect(result.logo.light).toBe(defaultBrandConfig.logo.light);
      expect(result.logo.dark).toBe(defaultBrandConfig.logo.dark);
    });
  });

  describe('getBrandConfigForProfile', () => {
    it('should return dev config for dev profile', () => {
      const result = getBrandConfigForProfile('dev');
      expect(result).toEqual(devBrandConfig);
    });

    it('should return dev config for demo profile', () => {
      const result = getBrandConfigForProfile('demo');
      expect(result).toEqual(devBrandConfig);
    });

    it('should return first-run config for prod without tenant branding', () => {
      const result = getBrandConfigForProfile('prod');
      expect(result).toEqual(firstRunBrandConfig);
    });

    it('should convert tenant branding for prod profile', () => {
      const tenantBranding = {
        company: {
          name: 'My Store',
          shortName: 'MS',
          logo: '/my-logo.png',
        },
      };

      const result = getBrandConfigForProfile('prod', tenantBranding);

      expect(result.appName).toBe('My Store');
      expect(result.company.name).toBe('My Store');
      expect(result.company.shortName).toBe('MS');
    });
  });

  describe('BrandConfig type structure', () => {
    it('should satisfy BrandConfig interface', () => {
      const config: BrandConfig = {
        appName: 'Test',
        company: {
          name: 'Test Company',
        },
        logo: {
          light: '/light.png',
          dark: '/dark.png',
        },
        theme: {
          preset: 'blue',
        },
      };

      expect(config.appName).toBe('Test');
      expect(config.company.name).toBe('Test Company');
      expect(config.logo.light).toBe('/light.png');
      expect(config.logo.dark).toBe('/dark.png');
      expect(config.theme.preset).toBe('blue');
    });

    it('should allow optional fields', () => {
      const minimalConfig: BrandConfig = {
        appName: 'Test',
        company: {
          name: 'Test',
        },
        logo: {
          light: '/light.png',
          dark: '/dark.png',
        },
        theme: {},
      };

      expect(minimalConfig.company.shortName).toBeUndefined();
      expect(minimalConfig.company.icon).toBeUndefined();
      expect(minimalConfig.favicon).toBeUndefined();
      expect(minimalConfig.theme.accentColor).toBeUndefined();
      expect(minimalConfig.theme.preset).toBeUndefined();
      expect(minimalConfig.theme.defaultAppearance).toBeUndefined();
      expect(minimalConfig.store).toBeUndefined();
    });

    it('should support all theme presets', () => {
      const presets: Array<'default' | 'blue' | 'green' | 'purple'> = [
        'default',
        'blue',
        'green',
        'purple',
      ];

      presets.forEach((preset) => {
        const config: BrandConfig = {
          appName: 'Test',
          company: { name: 'Test' },
          logo: { light: '/l.png', dark: '/d.png' },
          theme: { preset },
        };

        expect(config.theme.preset).toBe(preset);
      });
    });

    it('should support all appearance modes', () => {
      const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

      modes.forEach((mode) => {
        const config: BrandConfig = {
          appName: 'Test',
          company: { name: 'Test' },
          logo: { light: '/l.png', dark: '/d.png' },
          theme: { defaultAppearance: mode },
        };

        expect(config.theme.defaultAppearance).toBe(mode);
      });
    });
  });
});

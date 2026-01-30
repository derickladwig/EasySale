/**
 * Themeable Login System - Schema Validation Tests
 *
 * Tests for Zod schema validation of login theme configuration.
 */

import { describe, it, expect } from 'vitest';
import { validateLoginThemeConfig, validateLoginThemeConfigSafe } from './schema';
import type { LoginThemeConfig } from './types';

describe('LoginThemeConfigSchema', () => {
  const validConfig: LoginThemeConfig = {
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
        breakpoints: {
          mobile: 320,
          tablet: 768,
          desktop: 1024,
          kiosk: 1920,
        },
        stackOnMobile: true,
      },
    },
    tokens: {
      colors: {
        surface: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#cbd5e1',
          tertiary: '#94a3b8',
          inverse: '#0f172a',
        },
        border: {
          default: '#334155',
          focus: '#3b82f6',
          error: '#ef4444',
        },
        accent: {
          primary: '#3b82f6',
          hover: '#2563eb',
          active: '#1d4ed8',
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      typography: {
        fontFamily: {
          primary: 'Inter, sans-serif',
          monospace: 'Fira Code, monospace',
        },
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          xxl: '1.5rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        lineHeight: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75,
        },
      },
      spacing: {
        scale: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          xxl: '3rem',
        },
        density: 'compact',
      },
      shadows: {
        elevation: {
          none: 'none',
          sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
          md: '0 4px 6px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
          xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
        },
      },
      blur: {
        backdrop: {
          none: 'none',
          sm: 'blur(4px)',
          md: 'blur(12px)',
          lg: 'blur(16px)',
        },
        enabled: false,
      },
      radius: {
        card: '8px',
        input: '4px',
        button: '4px',
        pill: '9999px',
      },
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
        companyName: 'EasySale',
      },
      footer: {
        showVersion: false,
        showBuild: false,
        showCopyright: false,
        copyrightText: '© 2026 EasySale',
      },
      errorCallout: {
        presentation: 'inline',
        showRetryAction: true,
        showDiagnosticsAction: false,
      },
    },
    background: {
      type: 'gradient',
      gradient: {
        stops: [
          { color: '#0f172a', position: 0 },
          { color: '#1e293b', position: 100 },
        ],
      },
    },
  };

  describe('Valid Configuration', () => {
    it('should validate a complete valid configuration', () => {
      expect(() => validateLoginThemeConfig(validConfig)).not.toThrow();
    });

    it('should return success with safeParse for valid config', () => {
      const result = validateLoginThemeConfigSafe(validConfig);
      expect(result.success).toBe(true);
    });

    it('should validate splitHeroCompactForm template', () => {
      const config = {
        ...validConfig,
        layout: { ...validConfig.layout, template: 'splitHeroCompactForm' as const },
      };
      expect(() => validateLoginThemeConfig(config)).not.toThrow();
    });

    it('should validate leftStatusRightAuthCard template', () => {
      const config = {
        ...validConfig,
        layout: { ...validConfig.layout, template: 'leftStatusRightAuthCard' as const },
      };
      expect(() => validateLoginThemeConfig(config)).not.toThrow();
    });

    it('should validate leftStatusRightAuthCardPhoto template', () => {
      const config = {
        ...validConfig,
        layout: { ...validConfig.layout, template: 'leftStatusRightAuthCardPhoto' as const },
      };
      expect(() => validateLoginThemeConfig(config)).not.toThrow();
    });

    it('should validate all auth methods', () => {
      const config = {
        ...validConfig,
        components: {
          ...validConfig.components,
          authCard: {
            ...validConfig.components.authCard,
            methods: ['pin', 'password', 'badge'] as const,
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).not.toThrow();
    });

    it('should validate solid background type', () => {
      const config = {
        ...validConfig,
        background: {
          type: 'solid' as const,
          solid: { color: '#0f172a' },
        },
      };
      expect(() => validateLoginThemeConfig(config)).not.toThrow();
    });

    it('should validate waves background type', () => {
      const config = {
        ...validConfig,
        background: {
          type: 'waves' as const,
          waves: {
            baseColor: '#1e293b',
            waveColor: '#334155',
            intensity: 0.6,
            showDotGrid: true,
            dotGridOpacity: 0.3,
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).not.toThrow();
    });

    it('should validate photo background type', () => {
      const config = {
        ...validConfig,
        background: {
          type: 'photo' as const,
          photo: {
            url: '/assets/bg.jpg',
            placeholderColor: '#0f172a',
            blur: 4,
            overlay: {
              enabled: true,
              color: '#000000',
              opacity: 0.6,
            },
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).not.toThrow();
    });
  });

  describe('Invalid Configuration', () => {
    it('should reject config with missing name', () => {
      const config = { ...validConfig, name: '' };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject config with invalid version format', () => {
      const config = { ...validConfig, version: '1.0' };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject config with invalid template', () => {
      const config = { ...validConfig, layout: { ...validConfig.layout, template: 'invalid' } };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject config with negative breakpoint', () => {
      const config = {
        ...validConfig,
        layout: {
          ...validConfig.layout,
          responsive: {
            ...validConfig.layout.responsive,
            breakpoints: { ...validConfig.layout.responsive.breakpoints, mobile: -1 },
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject config with invalid font weight', () => {
      const config = {
        ...validConfig,
        tokens: {
          ...validConfig.tokens,
          typography: {
            ...validConfig.tokens.typography,
            fontWeight: { ...validConfig.tokens.typography.fontWeight, normal: 1000 },
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject config with invalid density', () => {
      const config = {
        ...validConfig,
        tokens: {
          ...validConfig.tokens,
          spacing: { ...validConfig.tokens.spacing, density: 'invalid' },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject config with invalid auth method', () => {
      const config = {
        ...validConfig,
        components: {
          ...validConfig.components,
          authCard: {
            ...validConfig.components.authCard,
            methods: ['invalid'],
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject config with invalid elevation', () => {
      const config = {
        ...validConfig,
        components: {
          ...validConfig.components,
          authCard: {
            ...validConfig.components.authCard,
            elevation: 'invalid',
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject gradient with less than 2 stops', () => {
      const config = {
        ...validConfig,
        background: {
          type: 'gradient' as const,
          gradient: {
            stops: [{ color: '#0f172a', position: 0 }],
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject gradient with invalid stop position', () => {
      const config = {
        ...validConfig,
        background: {
          type: 'gradient' as const,
          gradient: {
            stops: [
              { color: '#0f172a', position: 0 },
              { color: '#1e293b', position: 150 },
            ],
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject waves with invalid intensity', () => {
      const config = {
        ...validConfig,
        background: {
          type: 'waves' as const,
          waves: {
            baseColor: '#1e293b',
            waveColor: '#334155',
            intensity: 1.5,
            showDotGrid: true,
            dotGridOpacity: 0.3,
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject photo with negative blur', () => {
      const config = {
        ...validConfig,
        background: {
          type: 'photo' as const,
          photo: {
            url: '/assets/bg.jpg',
            placeholderColor: '#0f172a',
            blur: -1,
            overlay: {
              enabled: true,
              color: '#000000',
              opacity: 0.6,
            },
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });

    it('should reject photo with invalid overlay opacity', () => {
      const config = {
        ...validConfig,
        background: {
          type: 'photo' as const,
          photo: {
            url: '/assets/bg.jpg',
            placeholderColor: '#0f172a',
            blur: 4,
            overlay: {
              enabled: true,
              color: '#000000',
              opacity: 1.5,
            },
          },
        },
      };
      expect(() => validateLoginThemeConfig(config)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', () => {
      const result = validateLoginThemeConfigSafe(null);
      expect(result.success).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = validateLoginThemeConfigSafe(undefined);
      expect(result.success).toBe(false);
    });

    it('should handle empty object', () => {
      const result = validateLoginThemeConfigSafe({});
      expect(result.success).toBe(false);
    });

    it('should handle array input', () => {
      const result = validateLoginThemeConfigSafe([]);
      expect(result.success).toBe(false);
    });

    it('should handle string input', () => {
      const result = validateLoginThemeConfigSafe('invalid');
      expect(result.success).toBe(false);
    });
  });
});

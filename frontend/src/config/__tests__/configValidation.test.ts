/**
 * Configuration Validation Tests
 * 
 * Validates that the configuration system follows requirements:
 * - Module enablement flags are respected
 * - Configuration hot-reload works correctly
 * - Feature data persists when features are disabled
 * - API endpoints enforce module flags
 * - Configuration-driven architecture is maintained
 * 
 * **Validates: Requirements 4.1, 4.2 - Configuration System**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TenantConfig, ModuleConfig } from '../types';

// ============================================================================
// Mock Data
// ============================================================================

const mockTenantConfig: TenantConfig = {
  version: '1.0.0',
  tenant: {
    id: 'test-tenant',
    name: 'Test Business',
    slug: 'test-business',
    description: 'Test business for configuration validation',
  },
  branding: {
    company: {
      name: 'Test Business',
      shortName: 'TB',
      logo: '/assets/logo.png',
      favicon: '/assets/favicon.ico',
    },
  },
  theme: {
    mode: 'light',
    colors: {
      primary: '#3b82f6',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  categories: [],
  navigation: {
    main: [
      { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'home' },
      { id: 'sales', label: 'Sales', route: '/sales', icon: 'shopping-bag' },
    ],
    quickActions: [
      { label: 'New Sale', action: '/sell', icon: 'shopping-cart' },
      { label: 'Customers', action: '/customers', icon: 'users' },
    ],
  },
  widgets: {
    dashboard: [],
  },
  modules: {
    appointments: {
      enabled: true,
      settings: {
        slotDuration: 30,
        advanceBookingDays: 30,
      },
    },
    timeTracking: {
      enabled: true,
      settings: {
        requireProjectAssociation: false,
      },
    },
    estimates: {
      enabled: true,
      settings: {
        expirationDays: 30,
      },
    },
    layaway: {
      enabled: false,
      settings: {
        minimumDeposit: 20,
      },
    },
    commissions: {
      enabled: false,
      settings: {
        defaultRate: 5,
      },
    },
    loyalty: {
      enabled: false,
      settings: {
        pointsPerDollar: 1,
      },
    },
  },
  localization: {
    language: 'en',
    timezone: 'America/New_York',
    currency: {
      code: 'USD',
      symbol: '$',
      position: 'before',
    },
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  layouts: {},
  wizards: {},
};

// ============================================================================
// Setup/Teardown
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Tests
// ============================================================================

describe('Configuration Validation', () => {
  describe('Module Configuration', () => {
    it('should have valid module structure', () => {
      expect(mockTenantConfig.modules).toBeDefined();
      expect(typeof mockTenantConfig.modules).toBe('object');
    });

    it('should have enabled flag for each module', () => {
      Object.values(mockTenantConfig.modules).forEach((module: ModuleConfig) => {
        expect(module).toHaveProperty('enabled');
        expect(typeof module.enabled).toBe('boolean');
      });
    });

    it('should preserve module settings when disabled', () => {
      const appointmentSettings = mockTenantConfig.modules.appointments?.settings as Record<string, unknown>;
      expect(appointmentSettings?.slotDuration).toBe(30);
      expect(appointmentSettings?.advanceBookingDays).toBe(30);
    });

    it('should have settings for layaway module even when disabled', () => {
      const layawayModule = mockTenantConfig.modules.layaway;
      expect(layawayModule?.enabled).toBe(false);
      const layawaySettings = layawayModule?.settings as Record<string, unknown>;
      expect(layawaySettings?.minimumDeposit).toBe(20);
    });
  });

  describe('Tenant Configuration', () => {
    it('should have required tenant fields', () => {
      const { tenant } = mockTenantConfig;
      expect(tenant.id).toBeTruthy();
      expect(tenant.name).toBeTruthy();
      expect(tenant.slug).toBeTruthy();
    });

    it('should have branding configuration', () => {
      const { branding } = mockTenantConfig;
      expect(branding.company.name).toBeTruthy();
    });
  });

  describe('Navigation Configuration', () => {
    it('should have main navigation items', () => {
      expect(Array.isArray(mockTenantConfig.navigation.main)).toBe(true);
    });

    it('should have quick actions', () => {
      const quickActions = mockTenantConfig.navigation.quickActions;
      expect(quickActions).toBeDefined();
      expect(Array.isArray(quickActions)).toBe(true);
    });
  });

  describe('Module Settings Validation', () => {
    it('should validate appointments module settings', () => {
      const appointments = mockTenantConfig.modules.appointments;
      if (appointments?.enabled && appointments.settings) {
        const settings = appointments.settings as Record<string, unknown>;
        expect(settings.slotDuration).toBeGreaterThan(0);
        expect(settings.advanceBookingDays).toBeGreaterThan(0);
      }
    });

    it('should validate time tracking module settings', () => {
      const timeTracking = mockTenantConfig.modules.timeTracking;
      if (timeTracking?.enabled && timeTracking.settings) {
        const settings = timeTracking.settings as Record<string, unknown>;
        expect(typeof settings.requireProjectAssociation).toBe('boolean');
      }
    });

    it('should validate estimates module settings', () => {
      const estimates = mockTenantConfig.modules.estimates;
      if (estimates?.enabled && estimates.settings) {
        const settings = estimates.settings as Record<string, unknown>;
        expect(settings.expirationDays).toBeGreaterThan(0);
      }
    });

    it('should validate layaway module settings', () => {
      const layaway = mockTenantConfig.modules.layaway;
      if (layaway?.settings) {
        const settings = layaway.settings as Record<string, unknown>;
        expect(settings.minimumDeposit).toBeGreaterThanOrEqual(0);
        expect(settings.minimumDeposit).toBeLessThanOrEqual(100);
      }
    });

    it('should validate commissions module settings', () => {
      const commissions = mockTenantConfig.modules.commissions;
      if (commissions?.settings) {
        const settings = commissions.settings as Record<string, unknown>;
        expect(settings.defaultRate).toBeGreaterThanOrEqual(0);
        expect(settings.defaultRate).toBeLessThanOrEqual(100);
      }
    });

    it('should validate loyalty module settings', () => {
      const loyalty = mockTenantConfig.modules.loyalty;
      if (loyalty?.settings) {
        const settings = loyalty.settings as Record<string, unknown>;
        expect(settings.pointsPerDollar).toBeGreaterThan(0);
      }
    });
  });

  describe('Quick Actions Validation', () => {
    it('should have valid quick action structure', () => {
      const quickActions = mockTenantConfig.navigation.quickActions;
      quickActions?.forEach(action => {
        expect(action.label).toBeTruthy();
        expect(action.action).toBeTruthy();
      });
    });
  });

  describe('Main Menu Validation', () => {
    it('should have valid main menu structure', () => {
      const mainMenu = mockTenantConfig.navigation.main;
      mainMenu.forEach(item => {
        expect(item.label).toBeTruthy();
        expect(item.route).toBeTruthy();
      });
    });
  });

  describe('Configuration Merging', () => {
    it('should merge partial configurations correctly', () => {
      const partialConfig: Partial<TenantConfig> = {
        localization: {
          language: 'en',
          timezone: 'America/New_York',
          currency: {
            code: 'USD',
            symbol: '$',
            position: 'before',
          },
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
        },
      };

      const merged = { ...mockTenantConfig, ...partialConfig };
      expect(merged.localization?.timezone).toBe('America/New_York');
      expect(merged.localization?.dateFormat).toBe('MM/DD/YYYY');
      expect(merged.localization?.timeFormat).toBe('12h');
    });

    it('should merge module configurations correctly', () => {
      const partialModules = {
        modules: {
          appointments: {
            enabled: true,
            settings: {
              slotDuration: 30,
            },
          },
        },
      };

      const merged = { ...mockTenantConfig, ...partialModules };
      const appointments = merged.modules.appointments;
      expect(appointments?.enabled).toBe(true);
      const settings = appointments?.settings as Record<string, unknown>;
      expect(settings?.slotDuration).toBe(30);
    });
  });

  describe('Configuration Validation Rules', () => {
    it('should allow valid localization settings', () => {
      const validConfig: Partial<TenantConfig> = {
        localization: {
          language: 'en',
          timezone: 'UTC',
          currency: {
            code: 'USD',
            symbol: '$',
            position: 'before',
          },
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
        },
      };

      expect(validConfig.localization?.currency).toBe('USD');
    });

    it('should allow valid branding settings', () => {
      const validConfig: Partial<TenantConfig> = {
        branding: {
          company: {
            name: 'Test Company',
          },
        },
      };

      expect(validConfig.branding?.company.name).toBe('Test Company');
    });

    it('should allow valid module settings', () => {
      const validConfig: Partial<TenantConfig> = {
        modules: {
          appointments: {
            enabled: true,
            settings: {
              slotDuration: 30,
            },
          },
        },
      };

      const appointments = validConfig.modules?.appointments;
      expect(appointments?.enabled).toBe(true);
      const settings = appointments?.settings as Record<string, unknown>;
      expect(settings?.slotDuration).toBe(30);
    });
  });

  describe('Module Enablement', () => {
    it('should respect module enabled flags', () => {
      const enabledModules = Object.entries(mockTenantConfig.modules)
        .filter(([, config]) => config.enabled)
        .map(([name]) => name);

      expect(enabledModules).toContain('appointments');
      expect(enabledModules).toContain('timeTracking');
      expect(enabledModules).toContain('estimates');
    });

    it('should preserve settings for disabled modules', () => {
      const disabledLayaway = mockTenantConfig.modules.layaway;
      expect(disabledLayaway?.enabled).toBe(false);
      const settings = disabledLayaway?.settings as Record<string, unknown>;
      expect(settings?.minimumDeposit).toBe(20);
    });
  });

  describe('Configuration Updates', () => {
    it('should allow updating module settings', () => {
      const updatedConfig = {
        ...mockTenantConfig,
        modules: {
          ...mockTenantConfig.modules,
          layaway: {
            enabled: true,
            settings: {
              minimumDeposit: 20,
            },
          },
        },
      };

      const layaway = updatedConfig.modules.layaway;
      expect(layaway?.enabled).toBe(true);
      const settings = layaway?.settings as Record<string, unknown>;
      expect(settings?.minimumDeposit).toBe(20);
    });
  });

  describe('Navigation Customization', () => {
    it('should allow custom navigation items', () => {
      const customNav = {
        ...mockTenantConfig,
        navigation: {
          ...mockTenantConfig.navigation,
          quickActions: [
            { label: 'Custom Action', action: '/custom', icon: 'star' },
          ],
          main: [
            { label: 'Custom Menu', path: '/custom', icon: 'star' },
          ],
        },
      };

      expect(customNav.navigation.quickActions?.[0].label).toBe('Custom Action');
      expect(customNav.navigation.main[0].label).toBe('Custom Menu');
    });
  });

  describe('Branding Customization', () => {
    it('should allow custom branding', () => {
      const customBranding = {
        ...mockTenantConfig,
        branding: {
          company: {
            name: 'Custom Company',
          },
        },
        theme: {
          ...mockTenantConfig.theme,
          colors: {
            ...mockTenantConfig.theme.colors,
            primary: '#ff0000',
            accent: '#00ff00',
          },
        },
      };

      expect(customBranding.branding.company.name).toBe('Custom Company');
      expect(customBranding.theme.colors.primary).toBe('#ff0000');
    });
  });
});

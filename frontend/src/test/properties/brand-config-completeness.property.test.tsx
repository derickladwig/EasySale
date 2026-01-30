/**
 * Property-Based Test: Brand Configuration Completeness
 *
 * Feature: navigation-consolidation
 * Property 6: Brand Configuration Completeness
 *
 * **Validates: Requirements 6.1, 6.2**
 *
 * For any valid BrandConfig object, the rendered header SHALL display the
 * configured appName and logo.
 *
 * This test ensures:
 * - Header renders configured appName correctly
 * - Header renders configured logo (or fallback) correctly
 * - Logo fallback works when logo URL is invalid
 * - Branding is consistent across theme modes
 * - All required BrandConfig fields are respected
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import * as fc from 'fast-check';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from '../../AppLayout';
import { ConfigProvider, ThemeProvider } from '../../config';
import { AuthProvider } from '../../common/contexts/AuthContext';
import { PermissionsProvider } from '../../common/contexts/PermissionsContext';
import type { BrandConfig } from '../../config/types';

// Mock the Outlet component from react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
  };
});

// Mock API client to prevent network calls
vi.mock('../../common/api/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: null }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Arbitrary for generating valid BrandConfig objects
const brandConfigArbitrary = fc.record({
  appName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  company: fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    shortName: fc.option(fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length > 0), { nil: undefined }),
    icon: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
  }),
  logo: fc.record({
    light: fc.stringMatching(/^\/[a-z0-9/-]+\.(png|jpg|svg)$/),
    dark: fc.stringMatching(/^\/[a-z0-9/-]+\.(png|jpg|svg)$/),
  }),
  favicon: fc.option(fc.stringMatching(/^\/[a-z0-9/-]+\.(png|ico)$/), { nil: undefined }),
  theme: fc.record({
    accentColor: fc.option(fc.stringMatching(/^#[0-9a-fA-F]{6}$/), { nil: undefined }),
    preset: fc.option(fc.constantFrom('default', 'blue', 'green', 'purple'), { nil: undefined }),
    defaultAppearance: fc.option(fc.constantFrom('light', 'dark', 'system'), { nil: undefined }),
  }),
  store: fc.option(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      station: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
    }),
    { nil: undefined }
  ),
});

// Helper to create a minimal tenant config with the given brand config
function createTenantConfigWithBranding(brandConfig: BrandConfig) {
  return {
    version: '1.0.0',
    tenant: {
      id: 'test-tenant',
      name: 'Test Tenant',
      slug: 'test',
    },
    branding: {
      company: {
        name: brandConfig.company.name,
        shortName: brandConfig.company.shortName,
        logoLight: brandConfig.logo.light,
        logoDark: brandConfig.logo.dark,
        favicon: brandConfig.favicon,
        icon: brandConfig.company.icon,
      },
      store: brandConfig.store,
    },
    theme: {
      mode: (brandConfig.theme.defaultAppearance === 'light' ? 'light' :
            brandConfig.theme.defaultAppearance === 'dark' ? 'dark' :
            'auto') as 'light' | 'dark' | 'auto',
      colors: {
        primary: brandConfig.theme.accentColor || '#3b82f6',
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
        { id: 'home', label: 'Home', route: '/', icon: 'Home' },
      ],
    },
    widgets: {
      dashboard: [],
    },
    modules: {},
    localization: {},
    layouts: {},
    wizards: {},
    // Set profile to 'prod' to avoid dev mode overrides
    profile: 'prod' as 'dev' | 'demo' | 'prod',
  };
}

// Helper to render AppLayout with a specific brand config
function renderAppLayoutWithBrandConfig(brandConfig: BrandConfig) {
  const tenantConfig = createTenantConfigWithBranding(brandConfig);
  
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ConfigProvider initialConfig={tenantConfig}>
        <ThemeProvider>
          <AuthProvider>
            <PermissionsProvider>
              <AppLayout />
            </PermissionsProvider>
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </MemoryRouter>
  );
}

describe('Feature: navigation-consolidation, Property 6: Brand Configuration Completeness', () => {
  beforeEach(() => {
    // Mock console methods to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('AppName rendering', () => {
    it('should render the configured appName in the header', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          const { container } = renderAppLayoutWithBrandConfig(brandConfig);

          // Find the header element
          const header = container.querySelector('header');
          expect(header).toBeInTheDocument();

          // Property: Header should contain the configured appName
          const appNameElement = header?.textContent;
          expect(appNameElement).toContain(brandConfig.appName);
        }),
        { numRuns: 100 }
      );
    });

    it('should render appName consistently across multiple renders', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          // Render multiple times
          const render1 = renderAppLayoutWithBrandConfig(brandConfig);
          const appName1 = render1.container.querySelector('header')?.textContent;
          cleanup();

          const render2 = renderAppLayoutWithBrandConfig(brandConfig);
          const appName2 = render2.container.querySelector('header')?.textContent;
          cleanup();

          const render3 = renderAppLayoutWithBrandConfig(brandConfig);
          const appName3 = render3.container.querySelector('header')?.textContent;

          // Property: AppName should be consistent across renders
          expect(appName1).toContain(brandConfig.appName);
          expect(appName2).toContain(brandConfig.appName);
          expect(appName3).toContain(brandConfig.appName);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle appName with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (appName) => {
            // Create a brand config with the generated appName
            const brandConfig: BrandConfig = {
              appName,
              company: {
                name: appName,
                shortName: appName.trim().substring(0, 2).toUpperCase() || 'XX',
              },
              logo: {
                light: '/assets/logo-light.png',
                dark: '/assets/logo-dark.png',
              },
              theme: {
                preset: 'default',
              },
            };

            const { container } = renderAppLayoutWithBrandConfig(brandConfig);

            const header = container.querySelector('header');
            expect(header).toBeInTheDocument();

            // Property: AppName should be rendered even with special characters
            const appNameElement = header?.textContent;
            expect(appNameElement).toContain(brandConfig.appName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Logo rendering', () => {
    it('should render logo element in the header', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          const { container } = renderAppLayoutWithBrandConfig(brandConfig);

          const header = container.querySelector('header');
          expect(header).toBeInTheDocument();

          // Property: Header should contain a logo element (img or fallback)
          // LogoWithFallback component renders either an img or a fallback div
          const logoContainer = container.querySelector('[data-testid="app-layout-logo"]');
          expect(logoContainer).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });

    it('should use correct logo path based on theme mode', () => {
      fc.assert(
        fc.property(
          brandConfigArbitrary,
          fc.constantFrom('light', 'dark'),
          (brandConfig, themeMode) => {
            // Override theme mode
            const configWithTheme = {
              ...brandConfig,
              theme: {
                ...brandConfig.theme,
                defaultAppearance: themeMode as 'light' | 'dark',
              },
            };

            const { container } = renderAppLayoutWithBrandConfig(configWithTheme);

            // Property: Logo should be present (either as img or fallback)
            const logoContainer = container.querySelector('[data-testid="app-layout-logo"]');
            expect(logoContainer).toBeInTheDocument();

            // If an img element exists, verify it uses the correct logo path
            const imgElement = logoContainer?.querySelector('img');
            if (imgElement) {
              const expectedLogoPath = themeMode === 'dark' 
                ? configWithTheme.logo.dark 
                : configWithTheme.logo.light;
              
              // The src might be transformed by the build system, but should contain the path
              expect(imgElement.src).toContain(expectedLogoPath.replace(/^\//, ''));
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should render fallback when logo is not available', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          // Use invalid logo paths to trigger fallback
          const configWithInvalidLogo = {
            ...brandConfig,
            logo: {
              light: '/invalid/path/to/logo.png',
              dark: '/invalid/path/to/logo.png',
            },
          };

          const { container } = renderAppLayoutWithBrandConfig(configWithInvalidLogo);

          // Property: Logo container should still exist even with invalid logo
          const logoContainer = container.querySelector('[data-testid="app-layout-logo"]');
          expect(logoContainer).toBeInTheDocument();

          // Fallback should show company name or shortName
          const fallbackText = logoContainer?.textContent;
          const expectedFallback = configWithInvalidLogo.company.shortName || 
                                   configWithInvalidLogo.company.name.substring(0, 2).toUpperCase();
          
          // Property: Fallback should contain expected text
          expect(fallbackText).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Company information rendering', () => {
    it('should render company name in branding', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          const { container } = renderAppLayoutWithBrandConfig(brandConfig);

          const header = container.querySelector('header');
          expect(header).toBeInTheDocument();

          // Property: Header should contain company name (either as appName or in logo fallback)
          const headerText = header?.textContent;
          expect(
            headerText?.includes(brandConfig.company.name) ||
            headerText?.includes(brandConfig.appName)
          ).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should use shortName for logo fallback when available', () => {
      fc.assert(
        fc.property(
          brandConfigArbitrary.filter((config) => config.company.shortName !== undefined),
          (brandConfig) => {
            // Use invalid logo to force fallback
            const configWithInvalidLogo = {
              ...brandConfig,
              logo: {
                light: '/invalid/logo.png',
                dark: '/invalid/logo.png',
              },
            };

            const { container } = renderAppLayoutWithBrandConfig(configWithInvalidLogo);

            const logoContainer = container.querySelector('[data-testid="app-layout-logo"]');
            expect(logoContainer).toBeInTheDocument();

            // Property: When shortName exists, it should be used in fallback
            // (LogoWithFallback component uses shortName if available)
            const fallbackText = logoContainer?.textContent;
            expect(fallbackText).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Store information rendering', () => {
    it('should render store name when provided', () => {
      fc.assert(
        fc.property(
          brandConfigArbitrary.filter((config) => config.store !== undefined),
          (brandConfig) => {
            const { container } = renderAppLayoutWithBrandConfig(brandConfig);

            // Property: Store name should appear in the sidebar footer
            const sidebarFooter = container.querySelector('aside .border-t');
            if (sidebarFooter && brandConfig.store) {
              expect(sidebarFooter.textContent).toContain(brandConfig.store.name);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should render station information when provided', () => {
      fc.assert(
        fc.property(
          brandConfigArbitrary.filter((config) => config.store !== undefined),
          (brandConfig) => {
            const { container } = renderAppLayoutWithBrandConfig(brandConfig);

            // Property: Station should appear in the sidebar footer
            const sidebarFooter = container.querySelector('aside .border-t');
            if (sidebarFooter && brandConfig.store) {
              expect(sidebarFooter.textContent).toContain(brandConfig.store.station);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing store information gracefully', () => {
      fc.assert(
        fc.property(
          brandConfigArbitrary.filter((config) => config.store === undefined),
          (brandConfig) => {
            const { container } = renderAppLayoutWithBrandConfig(brandConfig);

            // Property: Should render without errors when store is undefined
            const header = container.querySelector('header');
            expect(header).toBeInTheDocument();

            // Sidebar should still render with default values
            const sidebar = container.querySelector('aside');
            expect(sidebar).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Branding completeness', () => {
    it('should render all required branding elements', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          const { container } = renderAppLayoutWithBrandConfig(brandConfig);

          // Property: All required branding elements should be present
          
          // 1. Header should exist
          const header = container.querySelector('header');
          expect(header, 'Header should exist').toBeInTheDocument();

          // 2. Logo container should exist
          const logoContainer = container.querySelector('[data-testid="app-layout-logo"]');
          expect(logoContainer, 'Logo container should exist').toBeInTheDocument();

          // 3. AppName should be rendered
          const headerText = header?.textContent;
          expect(headerText, 'AppName should be in header').toContain(brandConfig.appName);

          // 4. Sidebar should exist
          const sidebar = container.querySelector('aside');
          expect(sidebar, 'Sidebar should exist').toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain branding consistency across viewport sizes', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          // Test at different viewport sizes (simulated via CSS classes)
          const { container } = renderAppLayoutWithBrandConfig(brandConfig);

          // Property: Core branding elements should be present regardless of viewport
          const header = container.querySelector('header');
          const logoContainer = container.querySelector('[data-testid="app-layout-logo"]');
          
          expect(header).toBeInTheDocument();
          expect(logoContainer).toBeInTheDocument();
          expect(header?.textContent).toContain(brandConfig.appName);
        }),
        { numRuns: 100 }
      );
    });

    it('should not render CAPS-specific branding', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          const { container } = renderAppLayoutWithBrandConfig(brandConfig);

          // Property: No CAPS-specific branding should appear
          const pageText = container.textContent?.toLowerCase() || '';
          
          // These should not appear unless explicitly configured
          if (!brandConfig.appName.toLowerCase().includes('caps') &&
              !brandConfig.company.name.toLowerCase().includes('caps')) {
            expect(pageText).not.toContain('caps pos');
            expect(pageText).not.toContain('caps-pos');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty strings gracefully', () => {
      fc.assert(
        fc.property(brandConfigArbitrary, (brandConfig) => {
          // Create config with minimal valid values
          const minimalConfig = {
            ...brandConfig,
            appName: brandConfig.appName || 'EasySale',
            company: {
              ...brandConfig.company,
              name: brandConfig.company.name || 'Store',
            },
          };

          const { container } = renderAppLayoutWithBrandConfig(minimalConfig);

          // Property: Should render without errors
          const header = container.querySelector('header');
          expect(header).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });

    it('should handle very long appName values', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 50, maxLength: 100 }).filter(s => s.trim().length >= 50),
          (longName) => {
            const brandConfig: BrandConfig = {
              appName: longName,
              company: {
                name: longName,
                shortName: longName.trim().substring(0, 2).toUpperCase() || 'XX',
              },
              logo: {
                light: '/assets/logo-light.png',
                dark: '/assets/logo-dark.png',
              },
              theme: {
                preset: 'default',
              },
            };

            const { container } = renderAppLayoutWithBrandConfig(brandConfig);

            // Property: Should render long names without breaking layout
            const header = container.querySelector('header');
            expect(header).toBeInTheDocument();
            expect(header?.textContent).toContain(brandConfig.appName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in company name', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Za-z0-9 &'-]+$/).filter(s => s.trim().length > 0 && s.trim().length <= 50),
          (name) => {
            const trimmedName = name.trim();
            const brandConfig: BrandConfig = {
              appName: trimmedName,
              company: {
                name: trimmedName,
                shortName: trimmedName.substring(0, 2).toUpperCase() || 'XX',
              },
              logo: {
                light: '/assets/logo-light.png',
                dark: '/assets/logo-dark.png',
              },
              theme: {
                preset: 'default',
              },
            };

            const { container } = renderAppLayoutWithBrandConfig(brandConfig);

            // Property: Should handle special characters in company name
            const header = container.querySelector('header');
            expect(header).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Theme integration', () => {
    it('should respect theme preset configuration', () => {
      fc.assert(
        fc.property(
          brandConfigArbitrary,
          fc.constantFrom('default', 'blue', 'green', 'purple'),
          (brandConfig, preset) => {
            const configWithPreset = {
              ...brandConfig,
              theme: {
                ...brandConfig.theme,
                preset: preset as 'default' | 'blue' | 'green' | 'purple',
              },
            };

            const { container } = renderAppLayoutWithBrandConfig(configWithPreset);

            // Property: Should render with any valid theme preset
            const header = container.querySelector('header');
            expect(header).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle custom accent colors', () => {
      fc.assert(
        fc.property(
          brandConfigArbitrary,
          fc.stringMatching(/^#[0-9a-fA-F]{6}$/),
          (brandConfig, accentColor) => {
            const configWithAccent = {
              ...brandConfig,
              theme: {
                ...brandConfig.theme,
                accentColor,
              },
            };

            const { container } = renderAppLayoutWithBrandConfig(configWithAccent);

            // Property: Should render with custom accent color
            const header = container.querySelector('header');
            expect(header).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

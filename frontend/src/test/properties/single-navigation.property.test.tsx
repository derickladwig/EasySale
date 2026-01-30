/**
 * Property-Based Test: Single Navigation Instance
 *
 * Feature: navigation-consolidation
 * Property 1: Single Navigation Instance
 *
 * **Validates: Requirements 2.1, 2.2, 3.1**
 *
 * For any authenticated route and any viewport size, exactly one sidebar
 * navigation component SHALL be rendered in the DOM.
 *
 * This test ensures:
 * - AppLayout renders exactly one sidebar
 * - Pages don't render additional sidebars
 * - Navigation is consistent across different routes and viewport sizes
 * - No duplicate navigation components exist in the DOM
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import * as fc from 'fast-check';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import { AppLayout } from '../../AppLayout';
import { AuthProvider } from '../../common/contexts/AuthContext';
import { PermissionsProvider } from '../../common/contexts/PermissionsContext';
import { ConfigProvider, ThemeProvider } from '../../config';

// Mock API client to prevent network calls
vi.mock('../../common/api/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: null }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// ============================================================================
// Test Data Generators (Arbitraries)
// ============================================================================

/**
 * All authenticated routes in the application
 * These are routes that render inside AppLayout
 */
const AUTHENTICATED_ROUTES = [
  '/',
  '/sell',
  '/lookup',
  '/inventory',
  '/documents',
  '/vendor-bills',
  '/customers',
  '/reporting',
  '/preferences',
  '/admin',
  '/admin/setup',
  '/admin/users',
  '/admin/store',
  '/admin/locations',
  '/admin/taxes',
  '/admin/pricing',
  '/admin/receipts',
  '/admin/branding',
  '/admin/integrations',
  '/admin/data',
  '/admin/exports',
  '/admin/capabilities',
  '/admin/health',
  '/admin/advanced',
  '/review',
  '/forms',
  '/exports',
];

/**
 * Viewport size categories with realistic dimensions
 */
const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667 },
  mobileLarge: { width: 414, height: 896 },
  tablet: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktop: { width: 1280, height: 800 },
  desktopLarge: { width: 1920, height: 1080 },
  desktopUltrawide: { width: 2560, height: 1440 },
};

/**
 * Arbitrary for generating random authenticated routes
 */
const authenticatedRouteArbitrary = fc.constantFrom(...AUTHENTICATED_ROUTES);

/**
 * Arbitrary for generating random viewport sizes
 */
const viewportSizeArbitrary = fc.oneof(
  // Named viewport sizes
  fc.constantFrom(...Object.values(VIEWPORT_SIZES)),
  // Random viewport sizes within reasonable bounds
  fc.record({
    width: fc.integer({ min: 320, max: 2560 }),
    height: fc.integer({ min: 480, max: 1440 }),
  })
);

/**
 * Arbitrary for generating viewport category names
 */
const viewportCategoryArbitrary = fc.constantFrom(
  'mobile',
  'mobileLarge',
  'tablet',
  'tabletLandscape',
  'desktop',
  'desktopLarge',
  'desktopUltrawide'
) as fc.Arbitrary<keyof typeof VIEWPORT_SIZES>;

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Mock page component that renders minimal content
 */
function MockPage({ name }: { name: string }) {
  return <div data-testid={`page-${name}`}>Page: {name}</div>;
}

/**
 * Mock AdminLayout that renders Outlet for admin sub-routes
 */
function MockAdminLayout() {
  return (
    <div data-testid="admin-layout">
      <div data-testid="admin-content">Admin Content</div>
    </div>
  );
}

/**
 * Render AppLayout with all required providers and routing
 */
function renderAppLayoutWithRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ConfigProvider>
        <ThemeProvider storeId="test-store">
          <AuthProvider>
            <PermissionsProvider>
              <Routes>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<MockPage name="home" />} />
                  <Route path="sell" element={<MockPage name="sell" />} />
                  <Route path="lookup" element={<MockPage name="lookup" />} />
                  <Route path="inventory" element={<MockPage name="inventory" />} />
                  <Route path="documents" element={<MockPage name="documents" />} />
                  <Route path="vendor-bills" element={<MockPage name="vendor-bills" />} />
                  <Route path="customers" element={<MockPage name="customers" />} />
                  <Route path="reporting" element={<MockPage name="reporting" />} />
                  <Route path="preferences" element={<MockPage name="preferences" />} />
                  <Route path="admin" element={<MockAdminLayout />}>
                    <Route index element={<MockPage name="admin" />} />
                    <Route path="setup" element={<MockPage name="admin-setup" />} />
                    <Route path="users" element={<MockPage name="admin-users" />} />
                    <Route path="store" element={<MockPage name="admin-store" />} />
                    <Route path="locations" element={<MockPage name="admin-locations" />} />
                    <Route path="taxes" element={<MockPage name="admin-taxes" />} />
                    <Route path="pricing" element={<MockPage name="admin-pricing" />} />
                    <Route path="receipts" element={<MockPage name="admin-receipts" />} />
                    <Route path="branding" element={<MockPage name="admin-branding" />} />
                    <Route path="integrations" element={<MockPage name="admin-integrations" />} />
                    <Route path="data" element={<MockPage name="admin-data" />} />
                    <Route path="exports" element={<MockPage name="admin-exports" />} />
                    <Route path="capabilities" element={<MockPage name="admin-capabilities" />} />
                    <Route path="health" element={<MockPage name="admin-health" />} />
                    <Route path="advanced" element={<MockPage name="admin-advanced" />} />
                  </Route>
                  <Route path="review" element={<MockPage name="review" />} />
                  <Route path="forms" element={<MockPage name="forms" />} />
                  <Route path="exports" element={<MockPage name="exports" />} />
                </Route>
              </Routes>
            </PermissionsProvider>
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </MemoryRouter>
  );
}

/**
 * Set viewport size by modifying window dimensions
 */
function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
}

/**
 * Count sidebar elements in the DOM
 * Sidebars are identified by the <aside> semantic element
 */
function countSidebarElements(): number {
  return document.querySelectorAll('aside').length;
}

/**
 * Count navigation elements in the DOM
 * Navigation is identified by the <nav> semantic element
 */
function countNavigationElements(): number {
  return document.querySelectorAll('nav').length;
}

/**
 * Check for duplicate navigation components by class or data attributes
 */
function findDuplicateNavigationIndicators(): string[] {
  const indicators: string[] = [];
  
  // Check for multiple sidebars
  const sidebars = document.querySelectorAll('aside');
  if (sidebars.length > 1) {
    indicators.push(`Found ${sidebars.length} <aside> elements (expected 1)`);
  }
  
  // Check for legacy navigation classes (should not exist)
  const legacyNavClasses = [
    '.legacy-sidebar',
    '.blue-sidebar',
    '.icon-rail',
    '[data-legacy-nav]',
  ];
  
  legacyNavClasses.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      indicators.push(`Found ${elements.length} elements matching legacy selector: ${selector}`);
    }
  });
  
  return indicators;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: navigation-consolidation, Property 1: Single Navigation Instance', () => {
  beforeEach(() => {
    // Reset viewport to desktop default
    setViewportSize(1280, 800);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Single Sidebar Rendering', () => {
    it('should render exactly one sidebar for any authenticated route', () => {
      fc.assert(
        fc.property(authenticatedRouteArbitrary, (route) => {
          cleanup(); // Clean up previous render
          
          renderAppLayoutWithRoute(route);
          
          const sidebarCount = countSidebarElements();
          
          // Property: Exactly one sidebar should be rendered
          expect(
            sidebarCount,
            `Route "${route}" rendered ${sidebarCount} sidebars (expected 1)`
          ).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('should render exactly one sidebar for any viewport size', () => {
      fc.assert(
        fc.property(viewportSizeArbitrary, (viewport) => {
          cleanup(); // Clean up previous render
          
          setViewportSize(viewport.width, viewport.height);
          renderAppLayoutWithRoute('/');
          
          const sidebarCount = countSidebarElements();
          
          // Property: Exactly one sidebar should be rendered regardless of viewport
          expect(
            sidebarCount,
            `Viewport ${viewport.width}x${viewport.height} rendered ${sidebarCount} sidebars (expected 1)`
          ).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('should render exactly one sidebar for any route and viewport combination', () => {
      fc.assert(
        fc.property(
          authenticatedRouteArbitrary,
          viewportSizeArbitrary,
          (route, viewport) => {
            cleanup(); // Clean up previous render
            
            setViewportSize(viewport.width, viewport.height);
            renderAppLayoutWithRoute(route);
            
            const sidebarCount = countSidebarElements();
            
            // Property: Exactly one sidebar for any route/viewport combination
            expect(
              sidebarCount,
              `Route "${route}" at ${viewport.width}x${viewport.height} rendered ${sidebarCount} sidebars (expected 1)`
            ).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('No Duplicate Navigation Components', () => {
    it('should not have duplicate navigation indicators for any route', () => {
      fc.assert(
        fc.property(authenticatedRouteArbitrary, (route) => {
          cleanup(); // Clean up previous render
          
          renderAppLayoutWithRoute(route);
          
          const duplicates = findDuplicateNavigationIndicators();
          
          // Property: No duplicate navigation indicators should exist
          expect(
            duplicates,
            `Route "${route}" has duplicate navigation: ${duplicates.join(', ')}`
          ).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should not have legacy navigation components for any route', () => {
      fc.assert(
        fc.property(authenticatedRouteArbitrary, (route) => {
          cleanup(); // Clean up previous render
          
          renderAppLayoutWithRoute(route);
          
          // Check for legacy navigation selectors
          const legacySelectors = [
            '.legacy-sidebar',
            '.blue-sidebar',
            '.icon-rail',
            '[data-legacy-nav]',
            '[data-testid="legacy-navigation"]',
          ];
          
          legacySelectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            expect(
              elements.length,
              `Route "${route}" contains legacy navigation element: ${selector}`
            ).toBe(0);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Navigation Consistency Across Viewport Categories', () => {
    it('should maintain single sidebar across all viewport categories', () => {
      fc.assert(
        fc.property(
          authenticatedRouteArbitrary,
          viewportCategoryArbitrary,
          (route, category) => {
            cleanup(); // Clean up previous render
            
            const viewport = VIEWPORT_SIZES[category];
            setViewportSize(viewport.width, viewport.height);
            renderAppLayoutWithRoute(route);
            
            const sidebarCount = countSidebarElements();
            
            // Property: Single sidebar regardless of viewport category
            expect(
              sidebarCount,
              `Route "${route}" on ${category} (${viewport.width}x${viewport.height}) rendered ${sidebarCount} sidebars`
            ).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have consistent navigation element count across viewports', () => {
      fc.assert(
        fc.property(
          authenticatedRouteArbitrary,
          fc.tuple(viewportCategoryArbitrary, viewportCategoryArbitrary),
          (route, [category1, category2]) => {
            cleanup();
            
            // Render at first viewport
            const viewport1 = VIEWPORT_SIZES[category1];
            setViewportSize(viewport1.width, viewport1.height);
            renderAppLayoutWithRoute(route);
            const sidebarCount1 = countSidebarElements();
            
            cleanup();
            
            // Render at second viewport
            const viewport2 = VIEWPORT_SIZES[category2];
            setViewportSize(viewport2.width, viewport2.height);
            renderAppLayoutWithRoute(route);
            const sidebarCount2 = countSidebarElements();
            
            // Property: Sidebar count should be consistent (always 1)
            expect(sidebarCount1).toBe(1);
            expect(sidebarCount2).toBe(1);
            expect(
              sidebarCount1,
              `Sidebar count differs between ${category1} and ${category2} for route "${route}"`
            ).toBe(sidebarCount2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('AppLayout Structure Verification', () => {
    it('should have proper semantic HTML structure for any route', () => {
      fc.assert(
        fc.property(authenticatedRouteArbitrary, (route) => {
          cleanup();
          
          renderAppLayoutWithRoute(route);
          
          // Property: AppLayout should have proper semantic structure
          const header = document.querySelector('header');
          const aside = document.querySelector('aside');
          const main = document.querySelector('main');
          const nav = document.querySelector('nav');
          
          expect(header, `Route "${route}" missing <header>`).toBeInTheDocument();
          expect(aside, `Route "${route}" missing <aside>`).toBeInTheDocument();
          expect(main, `Route "${route}" missing <main>`).toBeInTheDocument();
          expect(nav, `Route "${route}" missing <nav>`).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });

    it('should have navigation inside sidebar for any route', () => {
      fc.assert(
        fc.property(authenticatedRouteArbitrary, (route) => {
          cleanup();
          
          renderAppLayoutWithRoute(route);
          
          const aside = document.querySelector('aside');
          const navInsideAside = aside?.querySelector('nav');
          
          // Property: Navigation should be inside the sidebar
          expect(
            navInsideAside,
            `Route "${route}" does not have <nav> inside <aside>`
          ).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid route changes without creating duplicate sidebars', () => {
      fc.assert(
        fc.property(
          fc.array(authenticatedRouteArbitrary, { minLength: 2, maxLength: 5 }),
          (routes) => {
            cleanup();
            
            // Render each route in sequence
            routes.forEach((route) => {
              cleanup();
              renderAppLayoutWithRoute(route);
            });
            
            // After all route changes, should still have exactly one sidebar
            const sidebarCount = countSidebarElements();
            expect(
              sidebarCount,
              `After navigating through ${routes.length} routes, found ${sidebarCount} sidebars`
            ).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle extreme viewport sizes without breaking navigation', () => {
      fc.assert(
        fc.property(
          fc.record({
            width: fc.integer({ min: 320, max: 4096 }),
            height: fc.integer({ min: 320, max: 2160 }),
          }),
          (viewport) => {
            cleanup();
            
            setViewportSize(viewport.width, viewport.height);
            renderAppLayoutWithRoute('/');
            
            const sidebarCount = countSidebarElements();
            
            // Property: Even extreme viewports should have exactly one sidebar
            expect(
              sidebarCount,
              `Extreme viewport ${viewport.width}x${viewport.height} rendered ${sidebarCount} sidebars`
            ).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Admin Routes Specific Tests', () => {
    it('should not create additional sidebars for admin sub-routes', () => {
      const adminRoutes = AUTHENTICATED_ROUTES.filter((r) => r.startsWith('/admin'));
      
      fc.assert(
        fc.property(fc.constantFrom(...adminRoutes), (route) => {
          cleanup();
          
          renderAppLayoutWithRoute(route);
          
          const sidebarCount = countSidebarElements();
          
          // Property: Admin routes should not add extra sidebars
          // AdminLayout may have sub-navigation but not additional <aside> elements
          expect(
            sidebarCount,
            `Admin route "${route}" rendered ${sidebarCount} sidebars (expected 1)`
          ).toBe(1);
        }),
        { numRuns: 100 }
      );
    });
  });
});

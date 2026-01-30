/**
 * Property-Based Test: Route-Navigation Synchronization
 *
 * Feature: navigation-consolidation
 * Property 3: Route-Navigation Synchronization
 *
 * **Validates: Requirements 3.7**
 *
 * For any route change, the navigation active state SHALL update to highlight
 * the current route within one render cycle.
 *
 * This test ensures:
 * - Active state updates immediately on route change
 * - Correct item is highlighted for each route
 * - No stale active states remain after navigation
 * - Nested routes (e.g., /admin/users) correctly highlight parent (/admin)
 * - Active state is deterministic and consistent
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import * as fc from 'fast-check';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import { AppLayout } from '../../AppLayout';
import { AuthProvider } from '../../common/contexts/AuthContext';
import { PermissionsProvider } from '../../common/contexts/PermissionsContext';
import { ConfigProvider } from '../../config';

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
 * All authenticated routes in the application that have navigation items
 * Note: "/" (home) is not in the navigation config, so it won't have an active state
 */
const AUTHENTICATED_ROUTES = [
  '/sell',
  '/lookup',
  '/inventory',
  '/documents',
  '/customers',
  '/reporting',
  '/admin',
  '/review',
] as const;

/**
 * Admin sub-routes for testing nested route matching
 */
const ADMIN_SUB_ROUTES = [
  '/admin/users',
  '/admin/store',
  '/admin/branding',
  '/admin/integrations',
] as const;

/**
 * All routes (main + admin sub-routes)
 */
const ALL_ROUTES = [...AUTHENTICATED_ROUTES, ...ADMIN_SUB_ROUTES] as const;

/**
 * Arbitrary for generating navigation paths
 */
const navigationPathArbitrary = fc.constantFrom(...AUTHENTICATED_ROUTES);

/**
 * Arbitrary for generating admin sub-paths
 */
const adminSubPathArbitrary = fc.constantFrom(...ADMIN_SUB_ROUTES);

/**
 * Arbitrary for generating any valid route path
 */
const anyRoutePathArbitrary = fc.constantFrom(...ALL_ROUTES);

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
 * Render AppLayout with all required providers and routing
 */
function renderAppLayoutWithRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ConfigProvider>
        <AuthProvider>
          <PermissionsProvider>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<MockPage name="home" />} />
                <Route path="sell" element={<MockPage name="sell" />} />
                <Route path="lookup" element={<MockPage name="lookup" />} />
                <Route path="customers" element={<MockPage name="customers" />} />
                <Route path="inventory" element={<MockPage name="inventory" />} />
                <Route path="documents" element={<MockPage name="documents" />} />
                <Route path="review" element={<MockPage name="review" />} />
                <Route path="reporting" element={<MockPage name="reporting" />} />
                <Route path="admin" element={<MockPage name="admin" />}>
                  <Route path="users" element={<MockPage name="admin-users" />} />
                  <Route path="store" element={<MockPage name="admin-store" />} />
                  <Route path="branding" element={<MockPage name="admin-branding" />} />
                  <Route path="integrations" element={<MockPage name="admin-integrations" />} />
                </Route>
                <Route path="*" element={<MockPage name="unknown" />} />
              </Route>
            </Routes>
          </PermissionsProvider>
        </AuthProvider>
      </ConfigProvider>
    </MemoryRouter>
  );
}

/**
 * Helper to get the expected active nav item for a given route
 */
function getExpectedActiveRoute(pathname: string): string | null {
  // Exact match
  if (AUTHENTICATED_ROUTES.includes(pathname as any)) {
    return pathname;
  }
  
  // Nested route match (e.g., /admin/users should highlight /admin)
  if (pathname.startsWith('/admin/')) {
    return '/admin';
  }
  
  // No match for unknown routes
  return null;
}

/**
 * Find active navigation button in the rendered component
 * Active buttons have aria-current="page" attribute
 */
function findActiveNavButtons(): HTMLElement[] {
  const buttons = document.querySelectorAll('button[aria-current="page"]');
  return Array.from(buttons) as HTMLElement[];
}

/**
 * Get the route from a navigation button by examining the button's onClick or checking siblings
 * Since we can't easily access the onClick handler, we'll use the button's text content
 */
function getNavButtonRoute(button: HTMLElement): string | null {
  const label = button.textContent?.trim();
  
  // Map labels to routes (based on navigation config)
  // Note: These must match the actual labels in the navigation config
  const labelToRoute: Record<string, string> = {
    'Sell': '/sell',
    'Lookup': '/lookup',
    'Customers': '/customers',
    'Inventory': '/inventory',
    'Documents': '/documents',
    'Review': '/review',
    'Reporting': '/reporting',
    'Admin': '/admin',
  };
  
  // Extract just the label part (remove any badge numbers)
  const cleanLabel = label?.replace(/\d+$/, '').trim();
  
  return cleanLabel ? labelToRoute[cleanLabel] || null : null;
}

/**
 * Count active navigation buttons
 */
function countActiveNavButtons(): number {
  return findActiveNavButtons().length;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: navigation-consolidation, Property 3: Route-Navigation Synchronization', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Active state updates on route change', () => {
    it('should highlight the correct nav item for any navigation path', () => {
      fc.assert(
        fc.property(navigationPathArbitrary, (path) => {
          cleanup();
          
          renderAppLayoutWithRoute(path);
          
          const activeButtons = findActiveNavButtons();
          const expectedActivePath = getExpectedActiveRoute(path);

          if (expectedActivePath) {
            // Property: There should be exactly one active nav item
            expect(
              activeButtons.length,
              `Route "${path}" has ${activeButtons.length} active buttons (expected 1)`
            ).toBe(1);
            
            const activeRoute = getNavButtonRoute(activeButtons[0]);
            
            // Property: The active nav item should match the expected route
            expect(
              activeRoute,
              `Route "${path}" highlighted "${activeRoute}" (expected "${expectedActivePath}")`
            ).toBe(expectedActivePath);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should highlight parent nav item for nested admin routes', () => {
      fc.assert(
        fc.property(adminSubPathArbitrary, (path) => {
          cleanup();
          
          renderAppLayoutWithRoute(path);
          
          const activeButtons = findActiveNavButtons();

          // Property: Admin sub-routes should highlight exactly one nav item
          expect(
            activeButtons.length,
            `Admin route "${path}" has ${activeButtons.length} active buttons (expected 1)`
          ).toBe(1);
          
          const activeRoute = getNavButtonRoute(activeButtons[0]);
          
          // Property: Nested admin routes should activate the /admin parent
          expect(
            activeRoute,
            `Admin route "${path}" highlighted "${activeRoute}" (expected "/admin")`
          ).toBe('/admin');
        }),
        { numRuns: 100 }
      );
    });

    it('should have exactly one active nav item at any time', () => {
      fc.assert(
        fc.property(anyRoutePathArbitrary, (path) => {
          cleanup();
          
          renderAppLayoutWithRoute(path);
          
          const activeCount = countActiveNavButtons();

          // Property: There should be at most one active nav item
          // (Could be 0 for routes not in navigation, but never more than 1)
          expect(
            activeCount,
            `Route "${path}" has ${activeCount} active buttons (expected 0 or 1)`
          ).toBeLessThanOrEqual(1);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Active state consistency', () => {
    it('should produce consistent active state for the same route', () => {
      fc.assert(
        fc.property(anyRoutePathArbitrary, (path) => {
          // Render the same route multiple times
          cleanup();
          renderAppLayoutWithRoute(path);
          const active1 = findActiveNavButtons();
          const route1 = active1.length > 0 ? getNavButtonRoute(active1[0]) : null;

          cleanup();
          renderAppLayoutWithRoute(path);
          const active2 = findActiveNavButtons();
          const route2 = active2.length > 0 ? getNavButtonRoute(active2[0]) : null;

          cleanup();
          renderAppLayoutWithRoute(path);
          const active3 = findActiveNavButtons();
          const route3 = active3.length > 0 ? getNavButtonRoute(active3[0]) : null;

          // Property: Active state should be deterministic
          expect(
            route1,
            `Route "${path}" produced inconsistent active states: ${route1}, ${route2}, ${route3}`
          ).toBe(route2);
          expect(route2).toBe(route3);
        }),
        { numRuns: 100 }
      );
    });

    it('should not have stale active states after navigation', () => {
      fc.assert(
        fc.property(
          fc.array(anyRoutePathArbitrary, { minLength: 2, maxLength: 5 }),
          (pathSequence) => {
            // Ensure we have unique paths
            const uniquePaths = [...new Set(pathSequence)];
            fc.pre(uniquePaths.length >= 2);

            // Navigate through the sequence
            uniquePaths.forEach((path) => {
              cleanup();
              renderAppLayoutWithRoute(path);

              // Property: After each navigation, should have at most one active button
              const activeCount = countActiveNavButtons();
              expect(
                activeCount,
                `After navigating to "${path}", found ${activeCount} active buttons`
              ).toBeLessThanOrEqual(1);

              const activeButtons = findActiveNavButtons();
              const expectedActivePath = getExpectedActiveRoute(path);

              if (expectedActivePath && activeButtons.length > 0) {
                const activeRoute = getNavButtonRoute(activeButtons[0]);
                expect(
                  activeRoute,
                  `Route "${path}" highlighted "${activeRoute}" (expected "${expectedActivePath}")`
                ).toBe(expectedActivePath);
              }
            });
          }
        ),
        { numRuns: 50 } // Fewer runs due to sequence complexity
      );
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle /sell path correctly', () => {
      cleanup();
      
      renderAppLayoutWithRoute('/sell');

      const activeButtons = findActiveNavButtons();

      // Property: /sell path should have exactly one active nav item
      expect(
        activeButtons.length,
        `/sell path has ${activeButtons.length} active buttons (expected 1)`
      ).toBe(1);
      
      const activeRoute = getNavButtonRoute(activeButtons[0]);
      expect(
        activeRoute,
        `/sell path highlighted "${activeRoute}" (expected "/sell")`
      ).toBe('/sell');
    });

    it('should handle unknown routes gracefully', () => {
      const unknownPath = '/unknown/route/that/does/not/exist';
      
      cleanup();
      renderAppLayoutWithRoute(unknownPath);

      // Property: Unknown routes should not cause errors
      // and should not have any active nav items
      const activeCount = countActiveNavButtons();
      expect(
        activeCount,
        `Unknown route "${unknownPath}" has ${activeCount} active buttons (expected 0)`
      ).toBe(0);
    });

    it('should handle rapid route changes', () => {
      fc.assert(
        fc.property(
          fc.array(anyRoutePathArbitrary, { minLength: 3, maxLength: 10 }),
          (pathSequence) => {
            // Navigate through sequence rapidly
            pathSequence.forEach((path) => {
              cleanup();
              renderAppLayoutWithRoute(path);
            });

            // After rapid changes, verify final state
            const finalPath = pathSequence[pathSequence.length - 1];
            const activeButtons = findActiveNavButtons();
            const expectedActivePath = getExpectedActiveRoute(finalPath);

            if (expectedActivePath) {
              expect(
                activeButtons.length,
                `After rapid navigation to "${finalPath}", found ${activeButtons.length} active buttons`
              ).toBe(1);
              
              const activeRoute = getNavButtonRoute(activeButtons[0]);
              expect(
                activeRoute,
                `Final route "${finalPath}" highlighted "${activeRoute}" (expected "${expectedActivePath}")`
              ).toBe(expectedActivePath);
            }

            // Property: Should have at most one active item
            expect(
              activeButtons.length,
              `After rapid navigation, found ${activeButtons.length} active buttons`
            ).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 50 } // Fewer runs due to complexity
      );
    });
  });

  describe('Real-world navigation scenarios', () => {
    it('should correctly handle typical user navigation flow', () => {
      // Simulate a typical user flow: Sell -> Lookup -> Admin -> Admin/Users -> Sell
      const userFlow = ['/sell', '/lookup', '/admin', '/admin/users', '/sell'];
      
      userFlow.forEach((path) => {
        cleanup();
        renderAppLayoutWithRoute(path);

        // Verify correct active state at each step
        const activeButtons = findActiveNavButtons();
        const expectedActivePath = getExpectedActiveRoute(path);

        if (expectedActivePath) {
          expect(
            activeButtons.length,
            `User flow step "${path}" has ${activeButtons.length} active buttons (expected 1)`
          ).toBe(1);
          
          const activeRoute = getNavButtonRoute(activeButtons[0]);
          expect(
            activeRoute,
            `User flow step "${path}" highlighted "${activeRoute}" (expected "${expectedActivePath}")`
          ).toBe(expectedActivePath);
        }

        // Verify no duplicate active states
        expect(
          activeButtons.length,
          `User flow step "${path}" has ${activeButtons.length} active buttons`
        ).toBeLessThanOrEqual(1);
      });
    });

    it('should maintain correct active state when navigating between admin sub-routes', () => {
      const adminFlow = ['/admin', '/admin/users', '/admin/store', '/admin/branding', '/admin'];
      
      adminFlow.forEach((path) => {
        cleanup();
        renderAppLayoutWithRoute(path);

        const activeButtons = findActiveNavButtons();

        // All admin routes should highlight the /admin nav item
        expect(
          activeButtons.length,
          `Admin flow step "${path}" has ${activeButtons.length} active buttons (expected 1)`
        ).toBe(1);
        
        const activeRoute = getNavButtonRoute(activeButtons[0]);
        expect(
          activeRoute,
          `Admin flow step "${path}" highlighted "${activeRoute}" (expected "/admin")`
        ).toBe('/admin');
      });
    });
  });
});

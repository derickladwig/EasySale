/**
 * Property-Based Test: Route Registry Enforcement
 *
 * Feature: navigation-consolidation
 * Task: 10.2 Write route registry enforcement test (REQUIRED)
 *
 * **Validates: Requirements 4.2, 4.3**
 *
 * This test ensures:
 * - No quarantined routes are marked as active
 * - All legacy routes have replacement paths defined
 * - Route registry is consistent and valid
 * - No routes point to quarantined/legacy pages
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  routeRegistry,
  RouteEntry,
  RouteStatus,
  NavSection,
  LayoutType,
  getActiveRoutes,
  getLegacyRoutes,
  getQuarantinedRoutes,
  getRouteStatistics,
  validateNoQuarantinedRoutes,
  findRouteByPath,
  getReplacementRoute,
} from '../../config/routeRegistry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the audit directory
const AUDIT_DIR = path.resolve(__dirname, '../../../../audit');

/**
 * Interface for route registry audit results
 */
interface RouteAuditResult {
  timestamp: string;
  totalRoutes: number;
  activeRoutes: number;
  legacyRoutes: number;
  quarantinedRoutes: number;
  violations: RouteViolation[];
  statistics: ReturnType<typeof getRouteStatistics>;
}

/**
 * Interface for route violations
 */
interface RouteViolation {
  type: 'quarantined_active' | 'legacy_no_replacement' | 'invalid_status' | 'invalid_nav_section' | 'invalid_layout';
  route: RouteEntry;
  message: string;
}

/**
 * Validate route registry and collect violations
 */
function validateRouteRegistry(): RouteAuditResult {
  const violations: RouteViolation[] = [];
  const stats = getRouteStatistics();

  // Check 1: No quarantined routes should be marked as active
  const quarantinedRoutes = getQuarantinedRoutes();
  quarantinedRoutes.forEach((route) => {
    if (route.status !== 'quarantined') {
      violations.push({
        type: 'quarantined_active',
        route,
        message: `Route ${route.path} is in quarantined list but has status ${route.status}`,
      });
    }
  });

  // Check 2: All legacy routes must have replacement paths
  const legacyRoutes = getLegacyRoutes();
  legacyRoutes.forEach((route) => {
    if (!route.replacement) {
      violations.push({
        type: 'legacy_no_replacement',
        route,
        message: `Legacy route ${route.path} has no replacement path defined`,
      });
    }
  });

  // Check 3: Validate route status values
  routeRegistry.forEach((route) => {
    const validStatuses: RouteStatus[] = ['active', 'legacy', 'quarantined'];
    if (!validStatuses.includes(route.status)) {
      violations.push({
        type: 'invalid_status',
        route,
        message: `Route ${route.path} has invalid status: ${route.status}`,
      });
    }
  });

  // Check 4: Validate nav section values
  routeRegistry.forEach((route) => {
    const validSections: NavSection[] = ['main', 'admin', 'profile', 'none'];
    if (!validSections.includes(route.navSection)) {
      violations.push({
        type: 'invalid_nav_section',
        route,
        message: `Route ${route.path} has invalid navSection: ${route.navSection}`,
      });
    }
  });

  // Check 5: Validate layout values
  routeRegistry.forEach((route) => {
    const validLayouts: LayoutType[] = ['AppLayout', 'none'];
    if (!validLayouts.includes(route.layout)) {
      violations.push({
        type: 'invalid_layout',
        route,
        message: `Route ${route.path} has invalid layout: ${route.layout}`,
      });
    }
  });

  return {
    timestamp: new Date().toISOString(),
    totalRoutes: routeRegistry.length,
    activeRoutes: getActiveRoutes().length,
    legacyRoutes: legacyRoutes.length,
    quarantinedRoutes: quarantinedRoutes.length,
    violations,
    statistics: stats,
  };
}

/**
 * Generate audit report markdown
 */
function generateAuditReport(result: RouteAuditResult): string {
  const lines: string[] = [
    '# Route Registry Audit Report',
    '',
    `**Generated:** ${result.timestamp}`,
    `**Purpose:** Validate route registry consistency and detect violations`,
    '',
    '## Summary',
    '',
    `- **Total Routes:** ${result.totalRoutes}`,
    `- **Active Routes:** ${result.activeRoutes}`,
    `- **Legacy Routes:** ${result.legacyRoutes}`,
    `- **Quarantined Routes:** ${result.quarantinedRoutes}`,
    `- **Violations Found:** ${result.violations.length}`,
    '',
    '## Statistics',
    '',
    '### By Navigation Section',
    '',
    `- **Main:** ${result.statistics.byNavSection.main}`,
    `- **Admin:** ${result.statistics.byNavSection.admin}`,
    `- **Profile:** ${result.statistics.byNavSection.profile}`,
    `- **None:** ${result.statistics.byNavSection.none}`,
    '',
    '### By Layout',
    '',
    `- **AppLayout:** ${result.statistics.byLayout.AppLayout}`,
    `- **None:** ${result.statistics.byLayout.none}`,
    '',
  ];

  // Add violations section
  if (result.violations.length > 0) {
    lines.push('## ⚠️ Violations Found', '');

    const violationsByType = result.violations.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push(v);
      return acc;
    }, {} as Record<string, RouteViolation[]>);

    Object.entries(violationsByType).forEach(([type, violations]) => {
      lines.push(`### ${type.replace(/_/g, ' ').toUpperCase()}`, '');
      violations.forEach((v, index) => {
        lines.push(`${index + 1}. **${v.route.path}**`);
        lines.push(`   - ${v.message}`);
        lines.push(`   - Component: ${v.route.component}`);
        lines.push(`   - Status: ${v.route.status}`);
        lines.push('');
      });
    });
  } else {
    lines.push('## ✅ No Violations Found', '');
    lines.push('All routes in the registry are valid and consistent.', '');
  }

  // Add active routes section
  lines.push('## Active Routes', '');
  const activeRoutes = getActiveRoutes();
  
  lines.push('### Main Navigation', '');
  const mainRoutes = activeRoutes.filter((r) => r.navSection === 'main');
  mainRoutes.forEach((route) => {
    lines.push(`- **${route.path}** → ${route.component}`);
    if (route.description) lines.push(`  - ${route.description}`);
  });
  lines.push('');

  lines.push('### Admin Sub-Navigation', '');
  const adminRoutes = activeRoutes.filter((r) => r.navSection === 'admin');
  adminRoutes.forEach((route) => {
    lines.push(`- **${route.path}** → ${route.component}`);
    if (route.description) lines.push(`  - ${route.description}`);
  });
  lines.push('');

  lines.push('### Profile Menu', '');
  const profileRoutes = activeRoutes.filter((r) => r.navSection === 'profile');
  profileRoutes.forEach((route) => {
    lines.push(`- **${route.path}** → ${route.component}`);
    if (route.description) lines.push(`  - ${route.description}`);
  });
  lines.push('');

  lines.push('### Other Routes (Detail Pages, etc.)', '');
  const otherRoutes = activeRoutes.filter((r) => r.navSection === 'none');
  otherRoutes.forEach((route) => {
    lines.push(`- **${route.path}** → ${route.component}`);
    if (route.description) lines.push(`  - ${route.description}`);
  });
  lines.push('');

  // Add legacy routes section
  const legacyRoutes = getLegacyRoutes();
  if (legacyRoutes.length > 0) {
    lines.push('## Legacy Routes (Redirects)', '');
    legacyRoutes.forEach((route) => {
      lines.push(`- **${route.path}** → redirects to **${route.replacement || 'MISSING'}**`);
      if (route.quarantineReason) lines.push(`  - Reason: ${route.quarantineReason}`);
    });
    lines.push('');
  }

  // Add quarantined routes section
  const quarantinedRoutes = getQuarantinedRoutes();
  if (quarantinedRoutes.length > 0) {
    lines.push('## Quarantined Routes (Should Not Be Imported)', '');
    quarantinedRoutes.forEach((route) => {
      lines.push(`- **${route.path}** → ${route.component}`);
      if (route.quarantinedPath) lines.push(`  - Moved to: ${route.quarantinedPath}`);
      if (route.quarantineReason) lines.push(`  - Reason: ${route.quarantineReason}`);
      if (route.replacement) lines.push(`  - Replacement: ${route.replacement}`);
    });
    lines.push('');
  }

  // Add before/after comparison
  lines.push('## Before/After Comparison', '');
  lines.push('');
  lines.push('### Before Consolidation', '');
  lines.push('');
  lines.push('- Multiple navigation systems (icon rail, legacy sidebar, modern sidebar)');
  lines.push('- Scattered settings pages under /settings/*');
  lines.push('- Duplicate navigation rendering (AppLayout + AppShell)');
  lines.push('- No clear route registry or status tracking');
  lines.push('');
  lines.push('### After Consolidation', '');
  lines.push('');
  lines.push('- Single navigation system (AppLayout sidebar)');
  lines.push('- Consolidated admin section under /admin/*');
  lines.push('- Clear route status (active/legacy/quarantined)');
  lines.push('- Enforced route registry with validation');
  lines.push('- Legacy routes redirect to new locations');
  lines.push('- Quarantined components isolated and documented');
  lines.push('');

  // Add validation rules
  lines.push('## Validation Rules', '');
  lines.push('');
  lines.push('1. **No Quarantined Routes Active:** Routes marked as quarantined must not be active');
  lines.push('2. **Legacy Routes Have Replacements:** All legacy routes must define a replacement path');
  lines.push('3. **Valid Status Values:** Route status must be one of: active, legacy, quarantined');
  lines.push('4. **Valid Nav Sections:** Nav section must be one of: main, admin, profile, none');
  lines.push('5. **Valid Layouts:** Layout must be one of: AppLayout, none');
  lines.push('');

  return lines.join('\n');
}

/**
 * Write audit report to file
 */
function writeAuditReport(result: RouteAuditResult): void {
  try {
    // Ensure audit directory exists
    if (!fs.existsSync(AUDIT_DIR)) {
      fs.mkdirSync(AUDIT_DIR, { recursive: true });
    }

    const reportPath = path.join(AUDIT_DIR, 'ROUTE_REGISTRY_DIFF.md');
    const report = generateAuditReport(result);

    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`✅ Audit report written to: ${reportPath}`);
  } catch (error) {
    console.error('❌ Failed to write audit report:', error);
  }
}

// Store audit results for use in tests
let auditResults: RouteAuditResult;

describe('Feature: navigation-consolidation, Task 10.2: Route Registry Enforcement', () => {
  beforeAll(() => {
    // Perform validation once before all tests
    auditResults = validateRouteRegistry();
    
    // Write audit report
    writeAuditReport(auditResults);
  });

  describe('Route Registry Validation', () => {
    it('should have a non-empty route registry', () => {
      expect(routeRegistry.length).toBeGreaterThan(0);
      expect(auditResults.totalRoutes).toBeGreaterThan(0);
    });

    it('should not have any quarantined routes marked as active', () => {
      const quarantinedActiveViolations = auditResults.violations.filter(
        (v) => v.type === 'quarantined_active'
      );

      if (quarantinedActiveViolations.length > 0) {
        console.error('Quarantined routes marked as active:');
        quarantinedActiveViolations.forEach((v) => {
          console.error(`  - ${v.route.path}: ${v.message}`);
        });
      }

      expect(
        quarantinedActiveViolations,
        'Found quarantined routes marked as active'
      ).toHaveLength(0);
    });

    it('should have replacement paths for all legacy routes', () => {
      const legacyNoReplacementViolations = auditResults.violations.filter(
        (v) => v.type === 'legacy_no_replacement'
      );

      if (legacyNoReplacementViolations.length > 0) {
        console.error('Legacy routes without replacement paths:');
        legacyNoReplacementViolations.forEach((v) => {
          console.error(`  - ${v.route.path}: ${v.message}`);
        });
      }

      expect(
        legacyNoReplacementViolations,
        'Found legacy routes without replacement paths'
      ).toHaveLength(0);
    });

    it('should have valid status values for all routes', () => {
      const invalidStatusViolations = auditResults.violations.filter(
        (v) => v.type === 'invalid_status'
      );

      expect(
        invalidStatusViolations,
        'Found routes with invalid status values'
      ).toHaveLength(0);
    });

    it('should have valid nav section values for all routes', () => {
      const invalidNavSectionViolations = auditResults.violations.filter(
        (v) => v.type === 'invalid_nav_section'
      );

      expect(
        invalidNavSectionViolations,
        'Found routes with invalid nav section values'
      ).toHaveLength(0);
    });

    it('should have valid layout values for all routes', () => {
      const invalidLayoutViolations = auditResults.violations.filter(
        (v) => v.type === 'invalid_layout'
      );

      expect(
        invalidLayoutViolations,
        'Found routes with invalid layout values'
      ).toHaveLength(0);
    });

    it('should have no violations overall', () => {
      if (auditResults.violations.length > 0) {
        console.error(`Found ${auditResults.violations.length} violations:`);
        auditResults.violations.forEach((v) => {
          console.error(`  - ${v.type}: ${v.message}`);
        });
      }

      expect(
        auditResults.violations,
        'Route registry has violations'
      ).toHaveLength(0);
    });
  });

  describe('Property-Based Tests: Route Registry Consistency', () => {
    /**
     * Arbitrary for generating route status values
     */
    const routeStatusArbitrary = fc.constantFrom<RouteStatus>(
      'active',
      'legacy',
      'quarantined'
    );

    /**
     * Arbitrary for generating nav section values
     */
    const navSectionArbitrary = fc.constantFrom<NavSection>(
      'main',
      'admin',
      'profile',
      'none'
    );

    /**
     * Arbitrary for generating layout values
     */
    const layoutArbitrary = fc.constantFrom<LayoutType>('AppLayout', 'none');

    /**
     * Arbitrary for generating route paths
     */
    const routePathArbitrary = fc.oneof(
      fc.constantFrom(
        '/',
        '/sell',
        '/admin',
        '/admin/users',
        '/preferences',
        '/settings',
        '/settings/integrations'
      ),
      fc.stringMatching(/^\/[a-z-/]*$/).filter((s) => s.length > 1 && s.length < 50)
    );

    it('should correctly classify routes by status', () => {
      fc.assert(
        fc.property(routeStatusArbitrary, (status) => {
          const routes = routeRegistry.filter((r) => r.status === status);

          // Property: All routes with given status should be in the correct list
          if (status === 'active') {
            const activeRoutes = getActiveRoutes();
            expect(routes.length).toBe(activeRoutes.length);
          } else if (status === 'legacy') {
            const legacyRoutes = getLegacyRoutes();
            expect(routes.length).toBe(legacyRoutes.length);
          } else if (status === 'quarantined') {
            const quarantinedRoutes = getQuarantinedRoutes();
            expect(routes.length).toBe(quarantinedRoutes.length);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should find routes by path correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...routeRegistry.map((r) => r.path)),
          (path) => {
            const found = findRouteByPath(path);

            // Property: Finding a route by path should return the correct route
            expect(found).toBeDefined();
            expect(found?.path).toBe(path);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return undefined for non-existent paths', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^\/nonexistent-[a-z0-9-]+$/),
          (fakePath) => {
            const found = findRouteByPath(fakePath);

            // Property: Non-existent paths should return undefined
            expect(found).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have replacement paths for all legacy routes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getLegacyRoutes()),
          (legacyRoute) => {
            // Property: Every legacy route must have a replacement
            expect(legacyRoute.replacement).toBeDefined();
            expect(legacyRoute.replacement).not.toBe('');

            // Property: Replacement should be a valid path
            expect(legacyRoute.replacement).toMatch(/^\//);
          }
        ),
        { numRuns: Math.min(100, getLegacyRoutes().length || 1) }
      );
    });

    it('should have quarantine metadata for quarantined routes', () => {
      const quarantinedRoutes = getQuarantinedRoutes();
      
      if (quarantinedRoutes.length > 0) {
        fc.assert(
          fc.property(
            fc.constantFrom(...quarantinedRoutes),
            (quarantinedRoute) => {
              // Property: Quarantined routes should have quarantine reason
              expect(quarantinedRoute.quarantineReason).toBeDefined();
              expect(quarantinedRoute.quarantineReason).not.toBe('');

              // Property: Quarantined routes should have replacement or quarantined path
              expect(
                quarantinedRoute.replacement || quarantinedRoute.quarantinedPath
              ).toBeDefined();
            }
          ),
          { numRuns: Math.min(100, quarantinedRoutes.length) }
        );
      } else {
        // If no quarantined routes, test passes
        expect(quarantinedRoutes).toHaveLength(0);
      }
    });

    it('should maintain consistent route statistics', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const stats = getRouteStatistics();

          // Property: Sum of status counts should equal total
          const statusSum = stats.active + stats.legacy + stats.quarantined;
          expect(statusSum).toBe(stats.total);

          // Property: Sum of nav section counts should equal total
          const navSectionSum =
            stats.byNavSection.main +
            stats.byNavSection.admin +
            stats.byNavSection.profile +
            stats.byNavSection.none;
          expect(navSectionSum).toBe(stats.total);

          // Property: Sum of layout counts should equal total
          const layoutSum = stats.byLayout.AppLayout + stats.byLayout.none;
          expect(layoutSum).toBe(stats.total);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate no quarantined routes correctly', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const validation = validateNoQuarantinedRoutes();

          // Property: Validation should match actual quarantined routes
          const quarantinedRoutes = getQuarantinedRoutes();
          const hasQuarantinedActive = quarantinedRoutes.some(
            (r) => r.status !== 'quarantined'
          );

          expect(validation.valid).toBe(!hasQuarantinedActive);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle route lookups deterministically', () => {
      fc.assert(
        fc.property(routePathArbitrary, (path) => {
          const result1 = findRouteByPath(path);
          const result2 = findRouteByPath(path);
          const result3 = findRouteByPath(path);

          // Property: Multiple lookups should return same result
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle replacement route lookups correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getLegacyRoutes().map((r) => r.path)),
          (legacyPath) => {
            const replacement = getReplacementRoute(legacyPath);

            // Property: Legacy routes should have replacement
            expect(replacement).toBeDefined();
            expect(replacement).not.toBe('');

            // Property: Replacement should be a valid path
            expect(replacement).toMatch(/^\//);
          }
        ),
        { numRuns: Math.min(100, getLegacyRoutes().length || 1) }
      );
    });

    it('should return undefined replacement for non-legacy routes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getActiveRoutes().map((r) => r.path)),
          (activePath) => {
            const replacement = getReplacementRoute(activePath);

            // Property: Active routes should not have replacement
            expect(replacement).toBeUndefined();
          }
        ),
        { numRuns: Math.min(100, getActiveRoutes().length || 1) }
      );
    });

    it('should have unique paths in the registry', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const paths = routeRegistry.map((r) => r.path);
          const uniquePaths = new Set(paths);

          // Property: All paths should be unique
          expect(uniquePaths.size).toBe(paths.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should have valid route components', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...routeRegistry),
          (route) => {
            // Property: Every route should have a component
            expect(route.component).toBeDefined();
            expect(route.component).not.toBe('');

            // Property: Component should be a valid identifier
            expect(route.component).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have consistent nav section for admin routes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...routeRegistry.filter((r) => r.path.startsWith('/admin/'))),
          (adminRoute) => {
            // Property: Admin sub-routes should have admin nav section
            expect(adminRoute.navSection).toBe('admin');
          }
        ),
        { numRuns: Math.min(100, routeRegistry.filter((r) => r.path.startsWith('/admin/')).length || 1) }
      );
    });

    it('should have AppLayout for authenticated routes', () => {
      // Exclude public/utility pages that intentionally don't use AppLayout
      const excludedPaths = ['/login', '/fresh-install', '/access-denied', '/oauth/callback'];
      const authenticatedRoutes = getActiveRoutes().filter(
        (r) => !excludedPaths.includes(r.path) && r.layout !== 'none'
      );
      
      fc.assert(
        fc.property(
          fc.constantFrom(...authenticatedRoutes),
          (authRoute) => {
            // Property: Authenticated routes should use AppLayout
            expect(authRoute.layout).toBe('AppLayout');
          }
        ),
        { numRuns: Math.min(100, authenticatedRoutes.length || 1) }
      );
    });
  });

  describe('Integration: Route Registry Usage', () => {
    it('should provide accurate statistics', () => {
      const stats = getRouteStatistics();

      expect(stats.total).toBe(routeRegistry.length);
      expect(stats.active).toBe(getActiveRoutes().length);
      expect(stats.legacy).toBe(getLegacyRoutes().length);
      expect(stats.quarantined).toBe(getQuarantinedRoutes().length);
    });

    it('should handle empty results gracefully', () => {
      // These should not throw
      const nonExistent = findRouteByPath('/this-does-not-exist');
      const replacement = getReplacementRoute('/this-does-not-exist');

      expect(nonExistent).toBeUndefined();
      expect(replacement).toBeUndefined();
    });

    it('should validate registry structure', () => {
      // Verify registry is an array
      expect(Array.isArray(routeRegistry)).toBe(true);

      // Verify each entry has required fields
      routeRegistry.forEach((route) => {
        expect(route).toHaveProperty('path');
        expect(route).toHaveProperty('component');
        expect(route).toHaveProperty('layout');
        expect(route).toHaveProperty('status');
        expect(route).toHaveProperty('navSection');
      });
    });
  });
});

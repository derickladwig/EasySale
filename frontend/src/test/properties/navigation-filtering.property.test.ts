/**
 * Property-Based Test: Navigation Configuration Consistency
 *
 * Feature: navigation-consolidation
 * Property 2: Navigation Configuration Consistency
 *
 * **Validates: Requirements 3.4, 3.5, 10.1**
 *
 * For any navigation item in Navigation_Config, if the user has the required
 * permission AND the required capability is enabled, then that item SHALL
 * appear in the rendered navigation.
 *
 * This test ensures:
 * - Items appear/hide correctly based on permissions and capabilities
 * - Admin links don't leak to cashiers (users without access_admin permission)
 * - Permission filtering is consistent and deterministic
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  filterNavigationByPermissions,
  NavigationItem,
} from '../../common/config/navigation';
import { Permission } from '../../common/contexts/PermissionsContext';

// All available permissions in the system
const ALL_PERMISSIONS: Permission[] = [
  'access_sell',
  'access_inventory',
  'access_admin',
  'apply_discount',
  'override_price',
  'process_return',
  'receive_stock',
  'adjust_inventory',
  'manage_users',
  'manage_settings',
  'view_audit_logs',
  'upload_vendor_bills',
  'view_vendor_bills',
  'review_vendor_bills',
  'post_vendor_bills',
];

// Admin-only permissions that should not be accessible to cashiers
const ADMIN_PERMISSIONS: Permission[] = ['access_admin'];

// Cashier permissions (typical non-admin user)
const CASHIER_PERMISSIONS: Permission[] = ['access_sell'];

// Arbitrary for generating random permission sets
const permissionSetArbitrary = fc.uniqueArray(fc.constantFrom(...ALL_PERMISSIONS), {
  minLength: 0,
  maxLength: ALL_PERMISSIONS.length,
});

// Arbitrary for generating navigation items
const navigationItemArbitrary = fc.record({
  path: fc.stringMatching(/^\/[a-z-/]*$/),
  label: fc.string({ minLength: 1, maxLength: 30 }),
  icon: fc.constantFrom('🛒', '🔍', '📦', '👥', '📊', '⚙️', '📄', '📋', '🔧', '📝', '📤', '🔌'),
  permission: fc.constantFrom<Permission>(...ALL_PERMISSIONS),
  description: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  capability: fc.option(fc.constantFrom('export', 'sync'), { nil: undefined }),
  badgeKey: fc.option(fc.constantFrom('needsReview', 'pendingOrders'), { nil: undefined }),
});

// Arbitrary for generating capabilities response
const capabilitiesArbitrary = fc.record({
  features: fc.record({
    export: fc.boolean(),
    sync: fc.boolean(),
  }),
});

// Helper to create a permission checker from a set of permissions
function createPermissionChecker(permissions: Permission[]): (permission: Permission) => boolean {
  const permSet = new Set(permissions);
  return (permission: Permission) => permSet.has(permission);
}

describe('Feature: navigation-consolidation, Property 2: Navigation Configuration Consistency', () => {
  describe('Permission-based filtering', () => {
    it('should show items when user has the required permission', () => {
      fc.assert(
        fc.property(
          navigationItemArbitrary,
          capabilitiesArbitrary,
          (item, capabilities) => {
            // User has the exact permission required by the item
            const hasPermission = createPermissionChecker([item.permission]);

            // If item has capability requirement, ensure it's enabled
            const adjustedCapabilities = item.capability
              ? {
                  features: {
                    export: item.capability === 'export' ? true : capabilities.features.export,
                    sync: item.capability === 'sync' ? true : capabilities.features.sync,
                  },
                }
              : capabilities;

            const items: NavigationItem[] = [item];
            const filtered = filterNavigationByPermissions(items, hasPermission, adjustedCapabilities);

            // Property: Item should appear when user has required permission
            expect(filtered).toHaveLength(1);
            expect(filtered[0]).toEqual(item);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should hide items when user lacks the required permission', () => {
      fc.assert(
        fc.property(
          navigationItemArbitrary,
          capabilitiesArbitrary,
          (item, capabilities) => {
            // User has NO permissions
            const hasPermission = createPermissionChecker([]);

            const items: NavigationItem[] = [item];
            const filtered = filterNavigationByPermissions(items, hasPermission, capabilities);

            // Property: Item should be hidden when user lacks required permission
            expect(filtered).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter items based on permission set correctly', () => {
      fc.assert(
        fc.property(
          fc.array(navigationItemArbitrary, { minLength: 1, maxLength: 10 }),
          permissionSetArbitrary,
          capabilitiesArbitrary,
          (items, userPermissions, capabilities) => {
            const hasPermission = createPermissionChecker(userPermissions);

            // Enable all capabilities to isolate permission testing
            const allCapabilitiesEnabled = {
              features: { export: true, sync: true },
            };

            const filtered = filterNavigationByPermissions(items, hasPermission, allCapabilitiesEnabled);

            // Property: Every filtered item should have a permission the user has
            filtered.forEach((filteredItem) => {
              expect(userPermissions).toContain(filteredItem.permission);
            });

            // Property: Every item with a permission the user has should be in filtered
            // (unless filtered by capability)
            const expectedItems = items.filter(
              (item) =>
                userPermissions.includes(item.permission) &&
                (!item.capability || allCapabilitiesEnabled.features[item.capability as 'export' | 'sync'])
            );
            expect(filtered.length).toBe(expectedItems.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Admin link protection (prevents leaking to cashiers)', () => {
    it('should NOT show admin items to users without access_admin permission', () => {
      fc.assert(
        fc.property(
          fc.array(navigationItemArbitrary, { minLength: 1, maxLength: 10 }),
          capabilitiesArbitrary,
          (items, capabilities) => {
            // Cashier has only access_sell permission (no admin access)
            const hasPermission = createPermissionChecker(CASHIER_PERMISSIONS);

            // Enable all capabilities
            const allCapabilitiesEnabled = {
              features: { export: true, sync: true },
            };

            const filtered = filterNavigationByPermissions(items, hasPermission, allCapabilitiesEnabled);

            // Property: NO admin items should appear for cashier users
            const adminItemsInFiltered = filtered.filter(
              (item) => item.permission === 'access_admin'
            );

            expect(
              adminItemsInFiltered,
              'Admin links leaked to non-admin user!'
            ).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show admin items ONLY to users with access_admin permission', () => {
      fc.assert(
        fc.property(
          navigationItemArbitrary.filter((item) => item.permission === 'access_admin'),
          capabilitiesArbitrary,
          (adminItem, capabilities) => {
            // Admin user has access_admin permission
            const adminHasPermission = createPermissionChecker(['access_admin']);
            // Cashier does NOT have access_admin permission
            const cashierHasPermission = createPermissionChecker(['access_sell']);

            // Enable capability if required
            const adjustedCapabilities = adminItem.capability
              ? {
                  features: {
                    export: adminItem.capability === 'export' ? true : capabilities.features.export,
                    sync: adminItem.capability === 'sync' ? true : capabilities.features.sync,
                  },
                }
              : capabilities;

            const items: NavigationItem[] = [adminItem];

            const adminFiltered = filterNavigationByPermissions(items, adminHasPermission, adjustedCapabilities);
            const cashierFiltered = filterNavigationByPermissions(items, cashierHasPermission, adjustedCapabilities);

            // Property: Admin should see admin items
            expect(adminFiltered).toHaveLength(1);

            // Property: Cashier should NOT see admin items
            expect(cashierFiltered).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent any permission escalation through navigation', () => {
      fc.assert(
        fc.property(
          fc.array(navigationItemArbitrary, { minLength: 5, maxLength: 15 }),
          permissionSetArbitrary,
          capabilitiesArbitrary,
          (items, userPermissions, capabilities) => {
            const hasPermission = createPermissionChecker(userPermissions);

            const filtered = filterNavigationByPermissions(items, hasPermission, capabilities);

            // Property: User should NEVER see items requiring permissions they don't have
            filtered.forEach((filteredItem) => {
              expect(
                userPermissions,
                `User without ${filteredItem.permission} can see item: ${filteredItem.label}`
              ).toContain(filteredItem.permission);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Capability-based filtering', () => {
    it('should hide items when required capability is disabled', () => {
      fc.assert(
        fc.property(
          navigationItemArbitrary.filter((item) => item.capability !== undefined),
          (itemWithCapability) => {
            // User has the permission
            const hasPermission = createPermissionChecker([itemWithCapability.permission]);

            // Capability is disabled
            const disabledCapabilities = {
              features: {
                export: itemWithCapability.capability === 'export' ? false : true,
                sync: itemWithCapability.capability === 'sync' ? false : true,
              },
            };

            const items: NavigationItem[] = [itemWithCapability];
            const filtered = filterNavigationByPermissions(items, hasPermission, disabledCapabilities);

            // Property: Item should be hidden when capability is disabled
            expect(filtered).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show items when required capability is enabled', () => {
      fc.assert(
        fc.property(
          navigationItemArbitrary.filter((item) => item.capability !== undefined),
          (itemWithCapability) => {
            // User has the permission
            const hasPermission = createPermissionChecker([itemWithCapability.permission]);

            // Capability is enabled
            const enabledCapabilities = {
              features: {
                export: itemWithCapability.capability === 'export' ? true : false,
                sync: itemWithCapability.capability === 'sync' ? true : false,
              },
            };

            const items: NavigationItem[] = [itemWithCapability];
            const filtered = filterNavigationByPermissions(items, hasPermission, enabledCapabilities);

            // Property: Item should appear when capability is enabled
            expect(filtered).toHaveLength(1);
            expect(filtered[0]).toEqual(itemWithCapability);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show items without capability requirement regardless of capability state', () => {
      fc.assert(
        fc.property(
          navigationItemArbitrary.filter((item) => item.capability === undefined),
          capabilitiesArbitrary,
          (itemWithoutCapability, capabilities) => {
            // User has the permission
            const hasPermission = createPermissionChecker([itemWithoutCapability.permission]);

            const items: NavigationItem[] = [itemWithoutCapability];
            const filtered = filterNavigationByPermissions(items, hasPermission, capabilities);

            // Property: Item without capability requirement should always appear (if permission allows)
            expect(filtered).toHaveLength(1);
            expect(filtered[0]).toEqual(itemWithoutCapability);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Combined permission and capability filtering', () => {
    it('should require BOTH permission AND capability for visibility', () => {
      fc.assert(
        fc.property(
          navigationItemArbitrary.filter((item) => item.capability !== undefined),
          fc.boolean(),
          fc.boolean(),
          (itemWithCapability, hasRequiredPermission, hasRequiredCapability) => {
            // Set up permission checker
            const hasPermission = hasRequiredPermission
              ? createPermissionChecker([itemWithCapability.permission])
              : createPermissionChecker([]);

            // Set up capabilities
            const capabilities = {
              features: {
                export: itemWithCapability.capability === 'export' ? hasRequiredCapability : true,
                sync: itemWithCapability.capability === 'sync' ? hasRequiredCapability : true,
              },
            };

            const items: NavigationItem[] = [itemWithCapability];
            const filtered = filterNavigationByPermissions(items, hasPermission, capabilities);

            // Property: Item should only appear if BOTH permission AND capability are satisfied
            const shouldBeVisible = hasRequiredPermission && hasRequiredCapability;

            if (shouldBeVisible) {
              expect(filtered).toHaveLength(1);
            } else {
              expect(filtered).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Filtering consistency and determinism', () => {
    it('should produce consistent results across multiple calls', () => {
      fc.assert(
        fc.property(
          fc.array(navigationItemArbitrary, { minLength: 1, maxLength: 10 }),
          permissionSetArbitrary,
          capabilitiesArbitrary,
          (items, userPermissions, capabilities) => {
            const hasPermission = createPermissionChecker(userPermissions);

            const filtered1 = filterNavigationByPermissions(items, hasPermission, capabilities);
            const filtered2 = filterNavigationByPermissions(items, hasPermission, capabilities);
            const filtered3 = filterNavigationByPermissions(items, hasPermission, capabilities);

            // Property: Filtering should be deterministic
            expect(filtered1).toEqual(filtered2);
            expect(filtered2).toEqual(filtered3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve item order after filtering', () => {
      fc.assert(
        fc.property(
          fc.array(navigationItemArbitrary, { minLength: 2, maxLength: 10 }),
          permissionSetArbitrary,
          capabilitiesArbitrary,
          (items, userPermissions, capabilities) => {
            const hasPermission = createPermissionChecker(userPermissions);

            const filtered = filterNavigationByPermissions(items, hasPermission, capabilities);

            // Property: Filtered items should maintain their relative order from original array
            let lastOriginalIndex = -1;
            filtered.forEach((filteredItem) => {
              const originalIndex = items.findIndex(
                (item) => item.path === filteredItem.path && item.label === filteredItem.label
              );
              expect(originalIndex).toBeGreaterThan(lastOriginalIndex);
              lastOriginalIndex = originalIndex;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty item arrays gracefully', () => {
      fc.assert(
        fc.property(
          permissionSetArbitrary,
          capabilitiesArbitrary,
          (userPermissions, capabilities) => {
            const hasPermission = createPermissionChecker(userPermissions);

            const filtered = filterNavigationByPermissions([], hasPermission, capabilities);

            // Property: Empty input should produce empty output
            expect(filtered).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle undefined capabilities gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(navigationItemArbitrary, { minLength: 1, maxLength: 10 }),
          permissionSetArbitrary,
          (items, userPermissions) => {
            const hasPermission = createPermissionChecker(userPermissions);

            // Should not throw when capabilities is undefined
            const filtered = filterNavigationByPermissions(items, hasPermission, undefined);

            // Property: Items with permission should still appear (fail open for capabilities)
            const itemsWithPermission = items.filter((item) =>
              userPermissions.includes(item.permission)
            );
            expect(filtered.length).toBe(itemsWithPermission.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Real-world navigation scenarios', () => {
    it('should correctly filter standard navigation items', () => {
      // Test with realistic navigation items
      const standardNavItems: NavigationItem[] = [
        { path: '/sell', label: 'Sell', icon: '🛒', permission: 'access_sell' },
        { path: '/inventory', label: 'Inventory', icon: '📦', permission: 'access_inventory' },
        { path: '/admin', label: 'Admin', icon: '⚙️', permission: 'access_admin' },
        { path: '/exports', label: 'Exports', icon: '📤', permission: 'access_admin', capability: 'export' },
      ];

      fc.assert(
        fc.property(
          fc.subarray(ALL_PERMISSIONS, { minLength: 0, maxLength: ALL_PERMISSIONS.length }),
          fc.boolean(),
          (userPermissions, exportEnabled) => {
            const hasPermission = createPermissionChecker(userPermissions);
            const capabilities = { features: { export: exportEnabled, sync: true } };

            const filtered = filterNavigationByPermissions(standardNavItems, hasPermission, capabilities);

            // Verify each item's visibility
            const hasSell = userPermissions.includes('access_sell');
            const hasInventory = userPermissions.includes('access_inventory');
            const hasAdmin = userPermissions.includes('access_admin');

            const expectedCount =
              (hasSell ? 1 : 0) +
              (hasInventory ? 1 : 0) +
              (hasAdmin ? 1 : 0) +
              (hasAdmin && exportEnabled ? 1 : 0);

            expect(filtered.length).toBe(expectedCount);

            // Verify no admin items leak to non-admin users
            if (!hasAdmin) {
              const adminItems = filtered.filter((item) => item.permission === 'access_admin');
              expect(adminItems).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

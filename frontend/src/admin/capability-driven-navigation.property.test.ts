/**
 * Property Test: Capability-Driven Navigation Visibility
 * 
 * **Validates: Requirements 11.12, 15.8**
 * 
 * Property 19: For any navigation item with a capability requirement, the item SHALL only 
 * be visible if the GET /api/capabilities response indicates that capability is enabled.
 * 
 * This test ensures that navigation items are correctly filtered based on backend capabilities,
 * preventing users from seeing navigation items for features that are not available.
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { filterNavigationByPermissions, NavigationItem, NavigationSection } from '../config/navigation';
import { Permission } from '@common/contexts/PermissionsContext';

// Counter for generating unique IDs
let idCounter = 0;

// Arbitrary for generating navigation items with capability requirements
const navigationItemWithCapability = fc.record({
  id: fc.string({ minLength: 3, maxLength: 20 }).map(s => `nav-${idCounter++}-${s}`),
  path: fc.constantFrom('/documents', '/exports', '/sync', '/reports'),
  label: fc.string({ minLength: 3, maxLength: 20 }),
  icon: fc.constantFrom('📄', '📤', '🔄', '📊'),
  permission: fc.constantFrom<Permission>('access_admin', 'access_inventory', 'access_sell'),
  capability: fc.option(fc.constantFrom('export', 'sync'), { nil: undefined }),
  description: fc.option(fc.string({ minLength: 10, maxLength: 50 }), { nil: undefined }),
  section: fc.constantFrom<NavigationSection>('main', 'admin'),
});

// Arbitrary for generating capabilities response
const capabilitiesResponse = fc.record({
  features: fc.record({
    export: fc.boolean(),
    sync: fc.boolean(),
  }),
});

// Mock permission checker that always returns true
const alwaysHasPermission = (_permission: Permission) => true;

// Mock permission checker that always returns false
const neverHasPermission = (_permission: Permission) => false;

describe('Property 19: Capability-Driven Navigation Visibility', () => {
  it('should hide items with capability requirement when capability is disabled', () => {
    fc.assert(
      fc.property(
        navigationItemWithCapability,
        capabilitiesResponse,
        (item, capabilities) => {
          // Only test items that have a capability requirement
          if (!item.capability) {
            return true; // Skip items without capability requirement
          }

          // Create a capabilities object where the required capability is disabled
          const disabledCapabilities = {
            features: {
              export: item.capability === 'export' ? false : capabilities.features.export,
              sync: item.capability === 'sync' ? false : capabilities.features.sync,
            },
          };

          const items: NavigationItem[] = [item];
          const filtered = filterNavigationByPermissions(items, alwaysHasPermission, disabledCapabilities);

          // Property: Item with disabled capability should be filtered out
          expect(filtered).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show items with capability requirement when capability is enabled', () => {
    fc.assert(
      fc.property(
        navigationItemWithCapability,
        capabilitiesResponse,
        (item, capabilities) => {
          // Only test items that have a capability requirement
          if (!item.capability) {
            return true; // Skip items without capability requirement
          }

          // Create a capabilities object where the required capability is enabled
          const enabledCapabilities = {
            features: {
              export: item.capability === 'export' ? true : capabilities.features.export,
              sync: item.capability === 'sync' ? true : capabilities.features.sync,
            },
          };

          const items: NavigationItem[] = [item];
          const filtered = filterNavigationByPermissions(items, alwaysHasPermission, enabledCapabilities);

          // Property: Item with enabled capability should be included
          expect(filtered).toHaveLength(1);
          expect(filtered[0]).toEqual(item);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always show items without capability requirement regardless of capabilities', () => {
    fc.assert(
      fc.property(
        navigationItemWithCapability,
        capabilitiesResponse,
        (item, capabilities) => {
          // Only test items without capability requirement
          if (item.capability) {
            return true; // Skip items with capability requirement
          }

          const items: NavigationItem[] = [item];
          const filtered = filterNavigationByPermissions(items, alwaysHasPermission, capabilities);

          // Property: Item without capability requirement should always be included (if permission allows)
          expect(filtered).toHaveLength(1);
          expect(filtered[0]).toEqual(item);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect permission requirements even when capability is enabled', () => {
    fc.assert(
      fc.property(
        navigationItemWithCapability,
        capabilitiesResponse,
        (item, capabilities) => {
          // Create capabilities where all features are enabled
          const allEnabledCapabilities = {
            features: {
              export: true,
              sync: true,
            },
          };

          const items: NavigationItem[] = [item];
          const filtered = filterNavigationByPermissions(items, neverHasPermission, allEnabledCapabilities);

          // Property: Item should be filtered out if user lacks permission, even if capability is enabled
          expect(filtered).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple items with mixed capability requirements', () => {
    fc.assert(
      fc.property(
        fc.array(navigationItemWithCapability, { minLength: 2, maxLength: 10 }),
        capabilitiesResponse,
        (items, capabilities) => {
          const filtered = filterNavigationByPermissions(items, alwaysHasPermission, capabilities);

          // Property: Filtered items should only include those whose capabilities are enabled (or have no requirement)
          filtered.forEach((filteredItem) => {
            if (filteredItem.capability) {
              // If item has capability requirement, it must be enabled
              if (filteredItem.capability === 'export') {
                expect(capabilities.features.export).toBe(true);
              } else if (filteredItem.capability === 'sync') {
                expect(capabilities.features.sync).toBe(true);
              }
            }
          });

          // Property: All items without capability requirement should be included
          const itemsWithoutCapability = items.filter(item => !item.capability);
          const filteredWithoutCapability = filtered.filter(item => !item.capability);
          expect(filteredWithoutCapability.length).toBe(itemsWithoutCapability.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle undefined capabilities gracefully', () => {
    fc.assert(
      fc.property(
        navigationItemWithCapability,
        (item) => {
          const items: NavigationItem[] = [item];
          const filtered = filterNavigationByPermissions(items, alwaysHasPermission, undefined);

          // Property: When capabilities are undefined, items with capability requirements should still be shown
          // (fail open to avoid hiding features due to API errors)
          expect(filtered).toHaveLength(1);
          expect(filtered[0]).toEqual(item);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain filter consistency across multiple calls with same inputs', () => {
    fc.assert(
      fc.property(
        fc.array(navigationItemWithCapability, { minLength: 1, maxLength: 5 }),
        capabilitiesResponse,
        (items, capabilities) => {
          const filtered1 = filterNavigationByPermissions(items, alwaysHasPermission, capabilities);
          const filtered2 = filterNavigationByPermissions(items, alwaysHasPermission, capabilities);

          // Property: Filtering should be deterministic
          expect(filtered1).toEqual(filtered2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle unknown capability names gracefully', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s !== 'export' && s !== 'sync'),
        capabilitiesResponse,
        (unknownCapability, capabilities) => {
          const item: NavigationItem = {
            id: `unknown-${idCounter++}`,
            path: '/unknown',
            label: 'Unknown',
            icon: '❓',
            permission: 'access_admin',
            capability: unknownCapability,
            section: 'main',
          };

          const items: NavigationItem[] = [item];
          const filtered = filterNavigationByPermissions(items, alwaysHasPermission, capabilities);

          // Property: Items with unknown capability names should be shown (fail open)
          expect(filtered).toHaveLength(1);
          expect(filtered[0]).toEqual(item);
        }
      ),
      { numRuns: 100 }
    );
  });
});

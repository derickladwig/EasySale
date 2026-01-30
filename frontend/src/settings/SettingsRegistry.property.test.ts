/**
 * Property-Based Tests: Settings Registry
 * Tests universal properties of the settings registry system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { SettingsRegistry } from './SettingsRegistry';
import { SettingDefinition, SettingGroup } from './types';

// Feature: unified-design-system, Property 10: Settings Search Filtering
describe('Property 10: Settings Search Filtering', () => {
  let registry: SettingsRegistry;

  beforeEach(() => {
    registry = new SettingsRegistry();
  });

  it('should return only settings matching the query (case-insensitive)', () => {
    fc.assert(
      fc.property(
        // Generate an array of setting definitions
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1 }),
            label: fc.string({ minLength: 1 }),
            description: fc.string({ minLength: 1 }),
            type: fc.constantFrom('policy', 'preference') as fc.Arbitrary<'policy' | 'preference'>,
            group: fc.constantFrom(
              'personal',
              'stores-tax',
              'sell-payments',
              'inventory-products',
              'customers-ar',
              'users-security',
              'devices-offline',
              'integrations',
              'advanced'
            ) as fc.Arbitrary<SettingGroup>,
            defaultValue: fc.anything(),
            allowedScopes: fc.constantFrom(
              ['store', 'user', 'default'],
              ['user', 'default'],
              ['store', 'default']
            ) as fc.Arbitrary<Array<'store' | 'user' | 'default'>>,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        // Generate a search query
        fc.string(),
        (settings, query) => {
          // Create a fresh registry for this test
          const testRegistry = new SettingsRegistry();
          
          // Clear the default settings
          (testRegistry as any).settings.clear();
          
          // Register all settings
          settings.forEach((s) => testRegistry.register(s as SettingDefinition));

          // Search for the query
          const results = testRegistry.search(query);

          // All results should match the query (case-insensitive)
          results.forEach((result) => {
            const lowerQuery = query.toLowerCase();
            const matches =
              result.label.toLowerCase().includes(lowerQuery) ||
              result.description.toLowerCase().includes(lowerQuery) ||
              result.key.toLowerCase().includes(lowerQuery);
            
            expect(matches).toBe(true);
          });

          // If query is empty, should return all settings
          if (!query || query.trim() === '') {
            expect(results.length).toBe(settings.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not return settings that do not match the query', () => {
    fc.assert(
      fc.property(
        // Generate settings with specific labels
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1 }),
            label: fc.constantFrom('Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'),
            description: fc.string({ minLength: 1 }),
            type: fc.constantFrom('policy', 'preference') as fc.Arbitrary<'policy' | 'preference'>,
            group: fc.constantFrom('personal') as fc.Arbitrary<SettingGroup>,
            defaultValue: fc.anything(),
            allowedScopes: fc.constantFrom(['user', 'default']) as fc.Arbitrary<Array<'store' | 'user' | 'default'>>,
          }),
          { minLength: 5, maxLength: 10 }
        ),
        (settings) => {
          // Register all settings
          settings.forEach((s) => registry.register(s as SettingDefinition));

          // Search for a query that should not match any setting
          const query = 'XYZ_NONEXISTENT';
          const results = registry.search(query);

          // Should return no results
          expect(results.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (label) => {
          // Register a setting with the label
          registry.register({
            key: 'test.setting',
            label,
            description: 'Test description',
            type: 'preference',
            group: 'personal',
            defaultValue: '',
            allowedScopes: ['user', 'default'],
          });

          // Search with different cases
          const lowerResults = registry.search(label.toLowerCase());
          const upperResults = registry.search(label.toUpperCase());
          const mixedResults = registry.search(label);

          // All should return the same result
          expect(lowerResults.length).toBeGreaterThan(0);
          expect(upperResults.length).toBeGreaterThan(0);
          expect(mixedResults.length).toBeGreaterThan(0);
          expect(lowerResults.length).toBe(upperResults.length);
          expect(lowerResults.length).toBe(mixedResults.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: unified-design-system, Property 11: Scope Badge Display
describe('Property 11: Scope Badge Display', () => {
  let registry: SettingsRegistry;

  beforeEach(() => {
    registry = new SettingsRegistry();
  });

  it('should resolve scope correctly for policy settings (store > user > default)', () => {
    fc.assert(
      fc.property(
        fc.record({
          store: fc.option(fc.string()),
          user: fc.option(fc.string()),
          default: fc.string(),
        }),
        (values) => {
          // Register a policy setting
          registry.register({
            key: 'test.policy',
            label: 'Test Policy',
            description: 'Test policy setting',
            type: 'policy',
            group: 'personal',
            defaultValue: values.default,
            allowedScopes: ['store', 'user', 'default'],
          });

          // Get the resolved value
          const result = registry.get('test.policy', {
            store: values.store ?? undefined,
            user: values.user ?? undefined,
          });

          // Verify precedence: store > user > default
          if (values.store !== null) {
            expect(result.scope).toBe('store');
            expect(result.value).toBe(values.store);
          } else if (values.user !== null) {
            expect(result.scope).toBe('user');
            expect(result.value).toBe(values.user);
          } else {
            expect(result.scope).toBe('default');
            expect(result.value).toBe(values.default);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should resolve scope correctly for preference settings (user > store > default)', () => {
    fc.assert(
      fc.property(
        fc.record({
          store: fc.option(fc.string()),
          user: fc.option(fc.string()),
          default: fc.string(),
        }),
        (values) => {
          // Register a preference setting
          registry.register({
            key: 'test.preference',
            label: 'Test Preference',
            description: 'Test preference setting',
            type: 'preference',
            group: 'personal',
            defaultValue: values.default,
            allowedScopes: ['store', 'user', 'default'],
          });

          // Get the resolved value
          const result = registry.get('test.preference', {
            store: values.store ?? undefined,
            user: values.user ?? undefined,
          });

          // Verify precedence: user > store > default
          if (values.user !== null) {
            expect(result.scope).toBe('user');
            expect(result.value).toBe(values.user);
          } else if (values.store !== null) {
            expect(result.scope).toBe('store');
            expect(result.value).toBe(values.store);
          } else {
            expect(result.scope).toBe('default');
            expect(result.value).toBe(values.default);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: unified-design-system, Property 12: Setting Persistence
describe('Property 12: Setting Persistence', () => {
  let registry: SettingsRegistry;

  beforeEach(() => {
    registry = new SettingsRegistry();
  });

  it('should validate setting values before setting', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.constantFrom('store', 'user') as fc.Arbitrary<'store' | 'user'>,
        (value, scope) => {
          // Register a setting with allowed scopes
          registry.register({
            key: 'test.setting',
            label: 'Test Setting',
            description: 'Test setting',
            type: 'preference',
            group: 'personal',
            defaultValue: '',
            allowedScopes: [scope, 'default'],
          });

          // Should not throw when setting at allowed scope
          expect(() => {
            registry.validateSet('test.setting', value, scope);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject setting at invalid scope', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (value) => {
          // Register a setting that only allows user scope
          registry.register({
            key: 'test.user_only',
            label: 'Test User Only',
            description: 'Test user-only setting',
            type: 'preference',
            group: 'personal',
            defaultValue: '',
            allowedScopes: ['user', 'default'],
          });

          // Should throw when trying to set at store scope
          expect(() => {
            registry.validateSet('test.user_only', value, 'store');
          }).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 5.2, 5.3, 5.4, 5.8
 */

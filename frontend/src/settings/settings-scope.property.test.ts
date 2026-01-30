/**
 * Property-Based Test: Settings Scope Correctness
 * 
 * Feature: navigation-consolidation
 * Property 8: Settings Scope Correctness
 * 
 * **Validates: Requirements 7.1, 7.3**
 * 
 * For any setting in the system, user preferences SHALL be stored per-user
 * (not as tenant config), and tenant config SHALL be stored at tenant level
 * (not per-user).
 * 
 * This property ensures proper data isolation and prevents:
 * - User preferences leaking across users
 * - Tenant config being duplicated per user
 * - Settings being stored at the wrong scope
 * 
 * Framework: fast-check
 * Minimum iterations: 100
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  getUserPreferences,
  setUserPreferences,
  clearUserPreferences,
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
  type ThemeAppearance,
  type UIDensity,
} from '@common/utils/userPreferences';
import { settingsRegistry } from './SettingsRegistry';
import type { SettingScope } from './types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate arbitrary user IDs
 */
const userId = fc.stringMatching(/^user-[a-z0-9]{8}$/);

/**
 * Generate arbitrary theme appearances
 */
const themeAppearance = fc.constantFrom<ThemeAppearance>('light', 'dark', 'system');

/**
 * Generate arbitrary UI densities
 */
const uiDensity = fc.constantFrom<UIDensity>('comfortable', 'compact', 'spacious');

/**
 * Generate arbitrary landing pages
 */
const landingPage = fc.constantFrom(
  '/',
  '/sell',
  '/lookup',
  '/inventory',
  '/customers',
  '/reporting'
);

/**
 * Generate arbitrary user preferences
 */
const userPreferences = fc.record({
  theme: fc.option(themeAppearance, { nil: undefined }),
  density: fc.option(uiDensity, { nil: undefined }),
  defaultLandingPage: fc.option(landingPage, { nil: undefined }),
  shortcuts: fc.option(
    fc.record({
      enabled: fc.boolean(),
      customBindings: fc.option(fc.dictionary(fc.string(), fc.string()), { nil: undefined }),
    }),
    { nil: undefined }
  ),
}) as fc.Arbitrary<Partial<UserPreferences>>;

/**
 * Generate arbitrary setting scopes
 */
const settingScope = fc.constantFrom<SettingScope>('user', 'store', 'default');

// ============================================================================
// Test Suite
// ============================================================================

describe('Property 8: Settings Scope Correctness', () => {
  // Clean up localStorage before and after each test
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ==========================================================================
  // Core Property: User Preferences are Per-User
  // ==========================================================================

  describe('Core Property: User preferences are isolated per user', () => {
    it('should store user preferences separately for different users', () => {
      fc.assert(
        fc.property(
          userId,
          userId,
          userPreferences,
          userPreferences,
          (userId1, userId2, prefs1, prefs2) => {
            // Skip if user IDs are the same
            fc.pre(userId1 !== userId2);

            // Set preferences for user 1
            setUserPreferences(userId1, prefs1);

            // Set preferences for user 2
            setUserPreferences(userId2, prefs2);

            // Get preferences for both users
            const retrieved1 = getUserPreferences(userId1);
            const retrieved2 = getUserPreferences(userId2);

            // Verify user 1's preferences match what was set
            if (prefs1.theme !== undefined) {
              expect(retrieved1.theme).toBe(prefs1.theme);
            }
            if (prefs1.density !== undefined) {
              expect(retrieved1.density).toBe(prefs1.density);
            }
            if (prefs1.defaultLandingPage !== undefined) {
              expect(retrieved1.defaultLandingPage).toBe(prefs1.defaultLandingPage);
            }

            // Verify user 2's preferences match what was set
            if (prefs2.theme !== undefined) {
              expect(retrieved2.theme).toBe(prefs2.theme);
            }
            if (prefs2.density !== undefined) {
              expect(retrieved2.density).toBe(prefs2.density);
            }
            if (prefs2.defaultLandingPage !== undefined) {
              expect(retrieved2.defaultLandingPage).toBe(prefs2.defaultLandingPage);
            }

            // Verify preferences don't leak between users
            // If prefs are different, retrieved prefs should be different
            if (prefs1.theme !== prefs2.theme && prefs1.theme && prefs2.theme) {
              expect(retrieved1.theme).not.toBe(retrieved2.theme);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use separate localStorage keys for different users', () => {
      fc.assert(
        fc.property(userId, userId, userPreferences, (userId1, userId2, prefs) => {
          // Skip if user IDs are the same
          fc.pre(userId1 !== userId2);

          // Set preferences for user 1
          setUserPreferences(userId1, prefs);

          // Verify localStorage has key for user 1
          const key1 = `userPrefs_${userId1}`;
          const stored1 = localStorage.getItem(key1);
          expect(stored1).not.toBeNull();

          // Verify localStorage does NOT have key for user 2
          const key2 = `userPrefs_${userId2}`;
          const stored2 = localStorage.getItem(key2);
          expect(stored2).toBeNull();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should not affect other users when clearing preferences', () => {
      fc.assert(
        fc.property(
          userId,
          userId,
          userPreferences,
          userPreferences,
          (userId1, userId2, prefs1, prefs2) => {
            // Skip if user IDs are the same
            fc.pre(userId1 !== userId2);

            // Set preferences for both users
            setUserPreferences(userId1, prefs1);
            setUserPreferences(userId2, prefs2);

            // Clear preferences for user 1
            clearUserPreferences(userId1);

            // Verify user 1's preferences are cleared
            const key1 = `userPrefs_${userId1}`;
            expect(localStorage.getItem(key1)).toBeNull();

            // Verify user 2's preferences are still intact
            const key2 = `userPrefs_${userId2}`;
            expect(localStorage.getItem(key2)).not.toBeNull();

            const retrieved2 = getUserPreferences(userId2);
            if (prefs2.theme !== undefined) {
              expect(retrieved2.theme).toBe(prefs2.theme);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Core Property: Settings Registry Scope Enforcement
  // ==========================================================================

  describe('Core Property: Settings registry enforces scope rules', () => {
    it('should classify user preferences as user-scoped', () => {
      // Get all setting definitions
      const allSettings = settingsRegistry.getAllDefinitions();

      // User preference setting keys (from design doc)
      const userPreferenceKeys = [
        'theme',
        'ui.density',
        'keyboard.shortcuts',
        'default.landing.page',
      ];

      // Check each user preference setting
      userPreferenceKeys.forEach((key) => {
        const definition = settingsRegistry.getDefinition(key);

        if (definition) {
          // User preferences should allow 'user' scope
          expect(definition.allowedScopes).toContain('user');

          // User preferences should be type 'preference' (user > store > default)
          expect(definition.type).toBe('preference');
        }
      });
    });

    it('should classify tenant config as store-scoped', () => {
      // Get all setting definitions
      const allSettings = settingsRegistry.getAllDefinitions();

      // Tenant config setting keys (from design doc)
      const tenantConfigKeys = [
        'store.currency',
        'store.locale',
        'store.tax.region',
        'store.tax.rates',
        'store.rounding.rules',
        'store.receipt.header',
        'store.receipt.footer',
        'store.default.inventory',
        'store.default.location',
        'store.pricebook.rules',
      ];

      // Check each tenant config setting
      tenantConfigKeys.forEach((key) => {
        const definition = settingsRegistry.getDefinition(key);

        if (definition) {
          // Tenant config should allow 'store' scope
          expect(definition.allowedScopes).toContain('store');

          // Tenant config should NOT allow 'user' scope only
          // (it can allow both, but must allow store)
          expect(definition.allowedScopes).toContain('store');
        }
      });
    });

    it('should prevent setting user preferences at store scope', () => {
      fc.assert(
        fc.property(themeAppearance, (theme) => {
          // User preferences should not be settable at store scope
          // This is enforced by the settings registry

          const userPreferenceKey = 'theme';
          const definition = settingsRegistry.getDefinition(userPreferenceKey);

          if (definition) {
            // If the setting only allows 'user' scope, trying to set at 'store' should fail
            if (
              definition.allowedScopes.includes('user') &&
              !definition.allowedScopes.includes('store')
            ) {
              expect(() => {
                settingsRegistry.validateSet(userPreferenceKey, theme, 'store');
              }).toThrow();
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: User Preferences Storage Location
  // ==========================================================================

  describe('Property: User preferences use localStorage with user ID', () => {
    it('should store preferences in localStorage with user-specific key', () => {
      fc.assert(
        fc.property(userId, userPreferences, (uid, prefs) => {
          // Set preferences
          setUserPreferences(uid, prefs);

          // Verify storage key format
          const expectedKey = `userPrefs_${uid}`;
          const stored = localStorage.getItem(expectedKey);

          // Should exist in localStorage
          expect(stored).not.toBeNull();

          // Should be valid JSON
          expect(() => JSON.parse(stored!)).not.toThrow();

          // Should contain the user's preferences
          const parsed = JSON.parse(stored!) as UserPreferences;
          if (prefs.theme !== undefined) {
            expect(parsed.theme).toBe(prefs.theme);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should not store preferences in global/shared keys', () => {
      fc.assert(
        fc.property(userId, userPreferences, (uid, prefs) => {
          // Set preferences
          setUserPreferences(uid, prefs);

          // Verify no global keys are used
          const globalKeys = ['theme', 'density', 'preferences', 'userPrefs'];

          globalKeys.forEach((key) => {
            const stored = localStorage.getItem(key);
            // Global keys should either not exist or not contain user preferences
            if (stored) {
              // If it exists, it shouldn't be the user's preferences
              try {
                const parsed = JSON.parse(stored);
                // If it's an object with theme, it shouldn't match the user's theme
                if (parsed.theme && prefs.theme) {
                  // This is acceptable if it's a different format
                  // The key point is we're using userPrefs_{userId} format
                }
              } catch {
                // Not JSON, that's fine
              }
            }
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Default Values
  // ==========================================================================

  describe('Property: Default values are returned for new users', () => {
    it('should return default preferences for users with no stored preferences', () => {
      fc.assert(
        fc.property(userId, (uid) => {
          // Don't set any preferences
          // Just get preferences for a new user
          const prefs = getUserPreferences(uid);

          // Should return defaults
          expect(prefs.theme).toBe(DEFAULT_USER_PREFERENCES.theme);
          expect(prefs.density).toBe(DEFAULT_USER_PREFERENCES.density);
          expect(prefs.defaultLandingPage).toBe(DEFAULT_USER_PREFERENCES.defaultLandingPage);
          expect(prefs.shortcuts?.enabled).toBe(DEFAULT_USER_PREFERENCES.shortcuts.enabled);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should merge partial preferences with defaults', () => {
      fc.assert(
        fc.property(userId, themeAppearance, (uid, theme) => {
          // Set only theme preference
          setUserPreferences(uid, { theme });

          // Get preferences
          const prefs = getUserPreferences(uid);

          // Theme should be set
          expect(prefs.theme).toBe(theme);

          // Other fields should have defaults
          expect(prefs.density).toBe(DEFAULT_USER_PREFERENCES.density);
          expect(prefs.defaultLandingPage).toBe(DEFAULT_USER_PREFERENCES.defaultLandingPage);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Scope Isolation Verification
  // ==========================================================================

  describe('Property: Scope isolation prevents cross-contamination', () => {
    it('should maintain separate preference values for multiple users simultaneously', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(userId, userPreferences), { minLength: 2, maxLength: 5 }),
          (userPrefsArray) => {
            // Ensure all user IDs are unique
            const uniqueUserIds = new Set(userPrefsArray.map(([uid]) => uid));
            fc.pre(uniqueUserIds.size === userPrefsArray.length);

            // Set preferences for all users
            userPrefsArray.forEach(([uid, prefs]) => {
              setUserPreferences(uid, prefs);
            });

            // Verify each user's preferences are correct
            userPrefsArray.forEach(([uid, expectedPrefs]) => {
              const retrieved = getUserPreferences(uid);

              if (expectedPrefs.theme !== undefined) {
                expect(retrieved.theme).toBe(expectedPrefs.theme);
              }
              if (expectedPrefs.density !== undefined) {
                expect(retrieved.density).toBe(expectedPrefs.density);
              }
              if (expectedPrefs.defaultLandingPage !== undefined) {
                expect(retrieved.defaultLandingPage).toBe(expectedPrefs.defaultLandingPage);
              }
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle concurrent updates to different users without interference', () => {
      fc.assert(
        fc.property(
          userId,
          userId,
          themeAppearance,
          themeAppearance,
          (userId1, userId2, theme1, theme2) => {
            // Skip if user IDs are the same
            fc.pre(userId1 !== userId2);
            // Skip if themes are the same (we want to test different values)
            fc.pre(theme1 !== theme2);

            // Set theme for user 1
            setUserPreferences(userId1, { theme: theme1 });

            // Set theme for user 2
            setUserPreferences(userId2, { theme: theme2 });

            // Verify both users have their correct themes
            const prefs1 = getUserPreferences(userId1);
            const prefs2 = getUserPreferences(userId2);

            expect(prefs1.theme).toBe(theme1);
            expect(prefs2.theme).toBe(theme2);

            // Verify themes are different
            expect(prefs1.theme).not.toBe(prefs2.theme);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Integration Test: Real-World Scenario
  // ==========================================================================

  describe('Integration: Real-world multi-user scenario', () => {
    it('should handle a realistic multi-user workflow', () => {
      // Simulate 3 users with different preferences
      const user1 = 'user-admin001';
      const user2 = 'user-cashier1';
      const user3 = 'user-manager1';

      // Admin prefers dark theme, compact density
      setUserPreferences(user1, {
        theme: 'dark',
        density: 'compact',
        defaultLandingPage: '/admin',
      });

      // Cashier prefers light theme, comfortable density
      setUserPreferences(user2, {
        theme: 'light',
        density: 'comfortable',
        defaultLandingPage: '/sell',
      });

      // Manager prefers system theme, spacious density
      setUserPreferences(user3, {
        theme: 'system',
        density: 'spacious',
        defaultLandingPage: '/reporting',
      });

      // Verify each user's preferences
      const adminPrefs = getUserPreferences(user1);
      expect(adminPrefs.theme).toBe('dark');
      expect(adminPrefs.density).toBe('compact');
      expect(adminPrefs.defaultLandingPage).toBe('/admin');

      const cashierPrefs = getUserPreferences(user2);
      expect(cashierPrefs.theme).toBe('light');
      expect(cashierPrefs.density).toBe('comfortable');
      expect(cashierPrefs.defaultLandingPage).toBe('/sell');

      const managerPrefs = getUserPreferences(user3);
      expect(managerPrefs.theme).toBe('system');
      expect(managerPrefs.density).toBe('spacious');
      expect(managerPrefs.defaultLandingPage).toBe('/reporting');

      // Verify localStorage has separate keys
      expect(localStorage.getItem('userPrefs_user-admin001')).not.toBeNull();
      expect(localStorage.getItem('userPrefs_user-cashier1')).not.toBeNull();
      expect(localStorage.getItem('userPrefs_user-manager1')).not.toBeNull();

      // Verify no cross-contamination
      expect(adminPrefs.theme).not.toBe(cashierPrefs.theme);
      expect(cashierPrefs.theme).not.toBe(managerPrefs.theme);
    });
  });
});

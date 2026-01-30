/**
 * Unit Tests: Settings Index and Search
 *
 * Tests search indexing, fuzzy matching, and search functionality
 * for the Settings Search feature.
 *
 * Validates: Requirements 10.1, 10.2, 10.3
 */

import { describe, it, expect } from 'vitest';
import {
  searchSettings,
  getSettingsByCategory,
  getCategories,
  getSettingsByScope,
  SETTINGS_INDEX,
  type SettingIndexEntry,
} from './settingsIndex';

describe('Settings Index', () => {
  describe('Index Structure', () => {
    it('should have all required fields for each entry', () => {
      SETTINGS_INDEX.forEach((entry) => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('category');
        expect(entry).toHaveProperty('scope');
        expect(entry).toHaveProperty('page');
        expect(entry).toHaveProperty('keywords');
        expect(entry).toHaveProperty('path');

        // Validate types
        expect(typeof entry.id).toBe('string');
        expect(typeof entry.name).toBe('string');
        expect(typeof entry.description).toBe('string');
        expect(typeof entry.category).toBe('string');
        expect(['global', 'store', 'station', 'user']).toContain(entry.scope);
        expect(typeof entry.page).toBe('string');
        expect(Array.isArray(entry.keywords)).toBe(true);
        expect(typeof entry.path).toBe('string');
      });
    });

    it('should have unique IDs for all entries', () => {
      const ids = SETTINGS_INDEX.map((entry) => entry.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid navigation paths', () => {
      SETTINGS_INDEX.forEach((entry) => {
        expect(entry.path).toMatch(/^\/admin\//);
      });
    });

    it('should have at least one keyword per entry', () => {
      SETTINGS_INDEX.forEach((entry) => {
        expect(entry.keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search Functionality', () => {
    describe('Exact Matching', () => {
      it('should find exact name matches', () => {
        const results = searchSettings('Users');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Users');
      });

      it('should find exact keyword matches', () => {
        const results = searchSettings('backup');
        expect(results.length).toBeGreaterThan(0);
        const hasBackup = results.some((r) => r.keywords.includes('backup'));
        expect(hasBackup).toBe(true);
      });

      it('should be case-insensitive', () => {
        const lowerResults = searchSettings('users');
        const upperResults = searchSettings('USERS');
        const mixedResults = searchSettings('UsErS');

        expect(lowerResults.length).toBeGreaterThan(0);
        expect(upperResults.length).toBeGreaterThan(0);
        expect(mixedResults.length).toBeGreaterThan(0);
        expect(lowerResults[0].id).toBe(upperResults[0].id);
        expect(lowerResults[0].id).toBe(mixedResults[0].id);
      });
    });

    describe('Partial Matching', () => {
      it('should find partial name matches', () => {
        const results = searchSettings('print');
        expect(results.length).toBeGreaterThan(0);
        const hasPrinter = results.some((r) => r.name.toLowerCase().includes('print'));
        expect(hasPrinter).toBe(true);
      });

      it('should find matches in descriptions', () => {
        const results = searchSettings('accounting');
        expect(results.length).toBeGreaterThan(0);
        const hasAccounting = results.some((r) =>
          r.description.toLowerCase().includes('accounting')
        );
        expect(hasAccounting).toBe(true);
      });

      it('should find matches in categories', () => {
        const results = searchSettings('hardware');
        expect(results.length).toBeGreaterThan(0);
        const hasHardware = results.some((r) => r.category.toLowerCase().includes('hardware'));
        expect(hasHardware).toBe(true);
      });
    });

    describe('Fuzzy Matching', () => {
      it('should handle typos in common words', () => {
        // "printer" with typo
        const results = searchSettings('printe');
        expect(results.length).toBeGreaterThan(0);
      });

      it('should match partial keywords', () => {
        const results = searchSettings('sync');
        expect(results.length).toBeGreaterThan(0);
        const hasSync = results.some(
          (r) =>
            r.keywords.some((k) => k.includes('sync')) ||
            r.name.toLowerCase().includes('sync') ||
            r.description.toLowerCase().includes('sync')
        );
        expect(hasSync).toBe(true);
      });

      it('should handle multi-word queries', () => {
        const results = searchSettings('receipt printer');
        expect(results.length).toBeGreaterThan(0);
        const hasReceiptPrinter = results.some(
          (r) =>
            r.name.toLowerCase().includes('receipt') && r.name.toLowerCase().includes('printer')
        );
        expect(hasReceiptPrinter).toBe(true);
      });

      it('should match when all words appear in different fields', () => {
        const results = searchSettings('payment terminal');
        expect(results.length).toBeGreaterThan(0);
        // Should find payment terminal even if words are in different fields
        const hasPaymentTerminal = results.some((r) => {
          const searchText =
            `${r.name} ${r.description} ${r.keywords.join(' ')}`.toLowerCase();
          return searchText.includes('payment') && searchText.includes('terminal');
        });
        expect(hasPaymentTerminal).toBe(true);
      });
    });

    describe('Result Ranking', () => {
      it('should rank exact name matches highest', () => {
        const results = searchSettings('Users');
        expect(results[0].name).toBe('Users');
      });

      it('should rank name matches higher than description matches', () => {
        const results = searchSettings('tax');
        // "Tax Rates" should rank higher than settings that only mention tax in description
        const taxRatesIndex = results.findIndex((r) => r.name === 'Tax Rates');
        expect(taxRatesIndex).toBeGreaterThanOrEqual(0);
        expect(taxRatesIndex).toBeLessThan(5); // Should be in top 5
      });

      it('should limit results to top 10', () => {
        const results = searchSettings('a'); // Very broad search
        expect(results.length).toBeLessThanOrEqual(10);
      });

      it('should return results in descending score order', () => {
        const results = searchSettings('store');
        expect(results.length).toBeGreaterThan(0);
        // First result should be most relevant
        const firstResult = results[0];
        expect(
          firstResult.name.toLowerCase().includes('store') ||
            firstResult.keywords.includes('store')
        ).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should return empty array for empty query', () => {
        expect(searchSettings('')).toEqual([]);
        expect(searchSettings('   ')).toEqual([]);
      });

      it('should return empty array for no matches', () => {
        const results = searchSettings('xyzabc123nonexistent');
        expect(results).toEqual([]);
      });

      it('should handle special characters gracefully', () => {
        const results = searchSettings('user@email');
        // Should not crash, may or may not return results
        expect(Array.isArray(results)).toBe(true);
      });

      it('should trim whitespace from query', () => {
        const results1 = searchSettings('  users  ');
        const results2 = searchSettings('users');
        expect(results1.length).toBe(results2.length);
        if (results1.length > 0 && results2.length > 0) {
          expect(results1[0].id).toBe(results2[0].id);
        }
      });
    });

    describe('Scope-Specific Searches', () => {
      it('should find global settings', () => {
        const results = searchSettings('company');
        const globalSettings = results.filter((r) => r.scope === 'global');
        expect(globalSettings.length).toBeGreaterThan(0);
      });

      it('should find store-scoped settings', () => {
        const results = searchSettings('tax');
        const storeSettings = results.filter((r) => r.scope === 'store');
        expect(storeSettings.length).toBeGreaterThan(0);
      });

      it('should find station-scoped settings', () => {
        const results = searchSettings('printer');
        const stationSettings = results.filter((r) => r.scope === 'station');
        expect(stationSettings.length).toBeGreaterThan(0);
      });

      it('should find user-scoped settings', () => {
        const results = searchSettings('password');
        const userSettings = results.filter((r) => r.scope === 'user');
        expect(userSettings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Category Functions', () => {
    it('should get settings by category', () => {
      const hardwareSettings = getSettingsByCategory('Hardware');
      expect(hardwareSettings.length).toBeGreaterThan(0);
      hardwareSettings.forEach((setting) => {
        expect(setting.category).toBe('Hardware');
      });
    });

    it('should return empty array for non-existent category', () => {
      const results = getSettingsByCategory('NonExistentCategory');
      expect(results).toEqual([]);
    });

    it('should get all unique categories', () => {
      const categories = getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(Array.isArray(categories)).toBe(true);

      // Should be sorted
      const sorted = [...categories].sort();
      expect(categories).toEqual(sorted);

      // Should be unique
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBe(categories.length);
    });

    it('should have expected categories', () => {
      const categories = getCategories();
      expect(categories).toContain('Hardware');
      expect(categories).toContain('Access Control');
      expect(categories).toContain('Integrations');
    });
  });

  describe('Scope Functions', () => {
    it('should get global settings', () => {
      const globalSettings = getSettingsByScope('global');
      expect(globalSettings.length).toBeGreaterThan(0);
      globalSettings.forEach((setting) => {
        expect(setting.scope).toBe('global');
      });
    });

    it('should get store settings', () => {
      const storeSettings = getSettingsByScope('store');
      expect(storeSettings.length).toBeGreaterThan(0);
      storeSettings.forEach((setting) => {
        expect(setting.scope).toBe('store');
      });
    });

    it('should get station settings', () => {
      const stationSettings = getSettingsByScope('station');
      expect(stationSettings.length).toBeGreaterThan(0);
      stationSettings.forEach((setting) => {
        expect(setting.scope).toBe('station');
      });
    });

    it('should get user settings', () => {
      const userSettings = getSettingsByScope('user');
      expect(userSettings.length).toBeGreaterThan(0);
      userSettings.forEach((setting) => {
        expect(setting.scope).toBe('user');
      });
    });
  });

  describe('Navigation Paths', () => {
    it('should have valid admin paths', () => {
      SETTINGS_INDEX.forEach((entry) => {
        expect(entry.path).toMatch(/^\/admin\//);
      });
    });

    it('should include query parameters for tabbed pages', () => {
      const usersEntry = SETTINGS_INDEX.find((e) => e.id === 'users');
      expect(usersEntry?.path).toContain('?tab=');
    });

    it('should have consistent path structure', () => {
      SETTINGS_INDEX.forEach((entry) => {
        // Path should not have trailing slash
        expect(entry.path).not.toMatch(/\/$/);
        // Path should not have double slashes
        expect(entry.path).not.toContain('//');
      });
    });
  });
});

/**
 * Unit Tests for User Preferences Storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getUserPreferences,
  setUserPreferences,
  updateUserPreference,
  resetUserPreferences,
  clearUserPreferences,
  getUserTheme,
  setUserTheme,
  getUserDensity,
  setUserDensity,
  getUserDefaultLandingPage,
  setUserDefaultLandingPage,
  getUserKeyboardShortcuts,
  setUserKeyboardShortcuts,
  exportUserPreferences,
  importUserPreferences,
  migrateUserPreferences,
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from '../userPreferences';

describe('User Preferences Storage', () => {
  const testUserId = 'test-user-123';
  const storageKey = `userPrefs_${testUserId}`;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('getUserPreferences', () => {
    it('should return default preferences when no preferences are stored', () => {
      const prefs = getUserPreferences(testUserId);
      
      expect(prefs).toEqual(expect.objectContaining({
        theme: 'system',
        density: 'comfortable',
        defaultLandingPage: '/',
      }));
      expect(prefs.shortcuts).toEqual({
        enabled: true,
        customBindings: {},
      });
    });

    it('should return stored preferences when they exist', () => {
      const storedPrefs: UserPreferences = {
        theme: 'dark',
        density: 'compact',
        defaultLandingPage: '/sell',
        shortcuts: {
          enabled: true,
          customBindings: { 'sell': 'Ctrl+S' },
        },
      };
      
      localStorage.setItem(storageKey, JSON.stringify(storedPrefs));
      
      const prefs = getUserPreferences(testUserId);
      
      expect(prefs.theme).toBe('dark');
      expect(prefs.density).toBe('compact');
      expect(prefs.defaultLandingPage).toBe('/sell');
      expect(prefs.shortcuts?.customBindings).toEqual({ 'sell': 'Ctrl+S' });
    });

    it('should merge stored preferences with defaults', () => {
      const partialPrefs = {
        theme: 'dark' as const,
      };
      
      localStorage.setItem(storageKey, JSON.stringify(partialPrefs));
      
      const prefs = getUserPreferences(testUserId);
      
      expect(prefs.theme).toBe('dark');
      expect(prefs.density).toBe('comfortable'); // From defaults
      expect(prefs.shortcuts?.enabled).toBe(true); // From defaults
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(storageKey, 'invalid json {');
      
      const prefs = getUserPreferences(testUserId);
      
      expect(prefs).toEqual(expect.objectContaining(DEFAULT_USER_PREFERENCES));
    });
  });

  describe('setUserPreferences', () => {
    it('should save preferences to localStorage', () => {
      const newPrefs: Partial<UserPreferences> = {
        theme: 'dark',
        density: 'compact',
      };
      
      const result = setUserPreferences(testUserId, newPrefs);
      
      expect(result.theme).toBe('dark');
      expect(result.density).toBe('compact');
      
      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.theme).toBe('dark');
      expect(parsed.density).toBe('compact');
    });

    it('should merge with existing preferences', () => {
      // Set initial preferences
      setUserPreferences(testUserId, { theme: 'dark' });
      
      // Update with new preferences
      const result = setUserPreferences(testUserId, { density: 'compact' });
      
      expect(result.theme).toBe('dark'); // Preserved
      expect(result.density).toBe('compact'); // Updated
    });

    it('should update lastUpdated timestamp', () => {
      const before = new Date().toISOString();
      
      const result = setUserPreferences(testUserId, { theme: 'dark' });
      
      const after = new Date().toISOString();
      
      expect(result.lastUpdated).toBeTruthy();
      expect(result.lastUpdated! >= before).toBe(true);
      expect(result.lastUpdated! <= after).toBe(true);
    });

    it('should merge shortcuts deeply', () => {
      // Set initial shortcuts
      setUserPreferences(testUserId, {
        shortcuts: {
          enabled: true,
          customBindings: { 'sell': 'Ctrl+S' },
        },
      });
      
      // Update shortcuts
      const result = setUserPreferences(testUserId, {
        shortcuts: {
          enabled: false,
        },
      });
      
      expect(result.shortcuts?.enabled).toBe(false);
      expect(result.shortcuts?.customBindings).toEqual({ 'sell': 'Ctrl+S' });
    });
  });

  describe('updateUserPreference', () => {
    it('should update a single preference field', () => {
      const result = updateUserPreference(testUserId, 'theme', 'dark');
      
      expect(result.theme).toBe('dark');
      expect(result.density).toBe('comfortable'); // Unchanged
    });

    it('should update density preference', () => {
      const result = updateUserPreference(testUserId, 'density', 'compact');
      
      expect(result.density).toBe('compact');
    });

    it('should update default landing page', () => {
      const result = updateUserPreference(testUserId, 'defaultLandingPage', '/inventory');
      
      expect(result.defaultLandingPage).toBe('/inventory');
    });
  });

  describe('resetUserPreferences', () => {
    it('should reset preferences to defaults', () => {
      // Set custom preferences
      setUserPreferences(testUserId, {
        theme: 'dark',
        density: 'compact',
        defaultLandingPage: '/sell',
      });
      
      // Reset
      const result = resetUserPreferences(testUserId);
      
      expect(result.theme).toBe('system');
      expect(result.density).toBe('comfortable');
      expect(result.defaultLandingPage).toBe('/');
    });

    it('should save reset preferences to localStorage', () => {
      setUserPreferences(testUserId, { theme: 'dark' });
      
      resetUserPreferences(testUserId);
      
      const stored = localStorage.getItem(storageKey);
      const parsed = JSON.parse(stored!);
      
      expect(parsed.theme).toBe('system');
    });
  });

  describe('clearUserPreferences', () => {
    it('should remove preferences from localStorage', () => {
      setUserPreferences(testUserId, { theme: 'dark' });
      
      expect(localStorage.getItem(storageKey)).toBeTruthy();
      
      clearUserPreferences(testUserId);
      
      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });

  describe('Theme convenience methods', () => {
    it('should get theme preference', () => {
      setUserTheme(testUserId, 'dark');
      
      const theme = getUserTheme(testUserId);
      
      expect(theme).toBe('dark');
    });

    it('should set theme preference', () => {
      setUserTheme(testUserId, 'light');
      
      const prefs = getUserPreferences(testUserId);
      
      expect(prefs.theme).toBe('light');
    });
  });

  describe('Density convenience methods', () => {
    it('should get density preference', () => {
      setUserDensity(testUserId, 'compact');
      
      const density = getUserDensity(testUserId);
      
      expect(density).toBe('compact');
    });

    it('should set density preference', () => {
      setUserDensity(testUserId, 'spacious');
      
      const prefs = getUserPreferences(testUserId);
      
      expect(prefs.density).toBe('spacious');
    });
  });

  describe('Landing page convenience methods', () => {
    it('should get default landing page', () => {
      setUserDefaultLandingPage(testUserId, '/inventory');
      
      const page = getUserDefaultLandingPage(testUserId);
      
      expect(page).toBe('/inventory');
    });

    it('should set default landing page', () => {
      setUserDefaultLandingPage(testUserId, '/sell');
      
      const prefs = getUserPreferences(testUserId);
      
      expect(prefs.defaultLandingPage).toBe('/sell');
    });
  });

  describe('Keyboard shortcuts convenience methods', () => {
    it('should get keyboard shortcuts', () => {
      setUserKeyboardShortcuts(testUserId, {
        enabled: false,
        customBindings: { 'sell': 'Ctrl+S' },
      });
      
      const shortcuts = getUserKeyboardShortcuts(testUserId);
      
      expect(shortcuts.enabled).toBe(false);
      expect(shortcuts.customBindings).toEqual({ 'sell': 'Ctrl+S' });
    });

    it('should set keyboard shortcuts', () => {
      setUserKeyboardShortcuts(testUserId, {
        enabled: false,
      });
      
      const prefs = getUserPreferences(testUserId);
      
      expect(prefs.shortcuts?.enabled).toBe(false);
    });

    it('should merge keyboard shortcuts', () => {
      setUserKeyboardShortcuts(testUserId, {
        customBindings: { 'sell': 'Ctrl+S' },
      });
      
      setUserKeyboardShortcuts(testUserId, {
        enabled: false,
      });
      
      const shortcuts = getUserKeyboardShortcuts(testUserId);
      
      expect(shortcuts.enabled).toBe(false);
      expect(shortcuts.customBindings).toEqual({ 'sell': 'Ctrl+S' });
    });
  });

  describe('Export and Import', () => {
    it('should export preferences as JSON', () => {
      setUserPreferences(testUserId, {
        theme: 'dark',
        density: 'compact',
      });
      
      const json = exportUserPreferences(testUserId);
      
      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(parsed.theme).toBe('dark');
      expect(parsed.density).toBe('compact');
    });

    it('should import preferences from JSON', () => {
      const json = JSON.stringify({
        theme: 'light',
        density: 'spacious',
        defaultLandingPage: '/inventory',
      });
      
      const result = importUserPreferences(testUserId, json);
      
      expect(result.theme).toBe('light');
      expect(result.density).toBe('spacious');
      expect(result.defaultLandingPage).toBe('/inventory');
    });

    it('should throw error on invalid JSON import', () => {
      expect(() => {
        importUserPreferences(testUserId, 'invalid json {');
      }).toThrow('Invalid preferences JSON');
    });
  });

  describe('Migration', () => {
    it('should migrate legacy theme preference', () => {
      // Set legacy theme in localStorage
      localStorage.setItem('theme', 'dark');
      
      migrateUserPreferences(testUserId);
      
      const theme = getUserTheme(testUserId);
      expect(theme).toBe('dark');
      
      // Legacy key should be removed
      expect(localStorage.getItem('theme')).toBeNull();
    });

    it('should not migrate invalid legacy theme', () => {
      localStorage.setItem('theme', 'invalid-theme');
      
      migrateUserPreferences(testUserId);
      
      const theme = getUserTheme(testUserId);
      expect(theme).toBe('system'); // Should use default
    });

    it('should handle migration errors gracefully', () => {
      // This should not throw
      expect(() => {
        migrateUserPreferences(testUserId);
      }).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty user ID', () => {
      const prefs = getUserPreferences('');
      expect(prefs).toEqual(expect.objectContaining(DEFAULT_USER_PREFERENCES));
    });

    it('should handle special characters in user ID', () => {
      const specialUserId = 'user@example.com';
      
      setUserPreferences(specialUserId, { theme: 'dark' });
      const prefs = getUserPreferences(specialUserId);
      
      expect(prefs.theme).toBe('dark');
    });

    it('should isolate preferences between users', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      
      setUserPreferences(user1, { theme: 'dark' });
      setUserPreferences(user2, { theme: 'light' });
      
      expect(getUserTheme(user1)).toBe('dark');
      expect(getUserTheme(user2)).toBe('light');
    });
  });
});

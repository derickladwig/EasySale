/**
 * User Preferences Storage
 * 
 * Manages per-user preferences stored in localStorage.
 * These are personal settings that don't need to be synced across devices.
 * 
 * Scope: User-level only (not tenant/store-wide)
 * Storage: localStorage (browser-local, per-user)
 * 
 * For tenant/store-wide settings, use SettingsPersistence instead.
 */

import { logDebug, logWarn, logError } from './logger';

/**
 * Theme appearance options
 * - 'light': Always use light theme
 * - 'dark': Always use dark theme
 * - 'system': Follow system preference
 * - 'store-default': Use the tenant's default theme setting
 */
export type ThemeAppearance = 'light' | 'dark' | 'system' | 'store-default';

/**
 * UI density options
 */
export type UIDensity = 'comfortable' | 'compact' | 'spacious';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcuts {
  /** Enable/disable keyboard shortcuts globally */
  enabled: boolean;
  /** Custom key bindings (action -> key combination) */
  customBindings?: Record<string, string>;
}

/**
 * User preferences interface
 * All fields are optional to allow partial updates
 */
export interface UserPreferences {
  /** Theme appearance preference */
  theme?: ThemeAppearance;
  
  /** UI density preference */
  density?: UIDensity;
  
  /** Keyboard shortcuts configuration */
  shortcuts?: KeyboardShortcuts;
  
  /** Default landing page after login */
  defaultLandingPage?: string;
  
  /** Last updated timestamp */
  lastUpdated?: string;
}

/**
 * Default user preferences
 * 
 * Note: theme defaults to 'store-default' which means the user will
 * inherit the tenant's default theme setting from BrandConfig.
 */
export const DEFAULT_USER_PREFERENCES: Required<UserPreferences> = {
  theme: 'store-default',
  density: 'comfortable',
  shortcuts: {
    enabled: true,
    customBindings: {},
  },
  defaultLandingPage: '/',
  lastUpdated: new Date().toISOString(),
};

/**
 * Storage key prefix for user preferences
 * Format: userPrefs_{userId}
 */
const STORAGE_KEY_PREFIX = 'userPrefs_';

/**
 * Get the storage key for a specific user
 */
function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * Get user preferences from localStorage
 * 
 * @param userId - The user ID to get preferences for
 * @returns User preferences or default preferences if not found
 */
export function getUserPreferences(userId: string): UserPreferences {
  try {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      logDebug('No stored preferences found for user', { userId });
      return { ...DEFAULT_USER_PREFERENCES };
    }
    
    const parsed = JSON.parse(stored) as UserPreferences;
    
    // Merge with defaults to ensure all fields exist
    const preferences: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
      shortcuts: {
        ...DEFAULT_USER_PREFERENCES.shortcuts,
        ...parsed.shortcuts,
      },
    };
    
    logDebug('Loaded user preferences', { userId, preferences });
    return preferences;
  } catch (error) {
    logError('Failed to load user preferences', { userId, error });
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

/**
 * Set user preferences in localStorage
 * 
 * @param userId - The user ID to set preferences for
 * @param preferences - Partial preferences to update (merged with existing)
 * @returns The updated preferences
 */
export function setUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): UserPreferences {
  try {
    const key = getStorageKey(userId);
    
    // Get existing preferences
    const existing = getUserPreferences(userId);
    
    // Merge with new preferences
    const updated: UserPreferences = {
      ...existing,
      ...preferences,
      shortcuts: preferences.shortcuts
        ? {
            ...existing.shortcuts,
            ...preferences.shortcuts,
          }
        : existing.shortcuts,
      lastUpdated: new Date().toISOString(),
    };
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(updated));
    
    logDebug('Saved user preferences', { userId, updated });
    return updated;
  } catch (error) {
    logError('Failed to save user preferences', { userId, error });
    throw new Error('Failed to save user preferences');
  }
}

/**
 * Update a specific preference field
 * 
 * @param userId - The user ID
 * @param field - The preference field to update
 * @param value - The new value
 */
export function updateUserPreference<K extends keyof UserPreferences>(
  userId: string,
  field: K,
  value: UserPreferences[K]
): UserPreferences {
  return setUserPreferences(userId, { [field]: value });
}

/**
 * Reset user preferences to defaults
 * 
 * @param userId - The user ID
 */
export function resetUserPreferences(userId: string): UserPreferences {
  try {
    const key = getStorageKey(userId);
    const defaults = { ...DEFAULT_USER_PREFERENCES };
    
    localStorage.setItem(key, JSON.stringify(defaults));
    
    logDebug('Reset user preferences to defaults', { userId });
    return defaults;
  } catch (error) {
    logError('Failed to reset user preferences', { userId, error });
    throw new Error('Failed to reset user preferences');
  }
}

/**
 * Clear user preferences from localStorage
 * 
 * @param userId - The user ID
 */
export function clearUserPreferences(userId: string): void {
  try {
    const key = getStorageKey(userId);
    localStorage.removeItem(key);
    
    logDebug('Cleared user preferences', { userId });
  } catch (error) {
    logError('Failed to clear user preferences', { userId, error });
  }
}

/**
 * Get theme preference for a user
 * 
 * @param userId - The user ID
 * @returns Theme appearance preference
 */
export function getUserTheme(userId: string): ThemeAppearance {
  const prefs = getUserPreferences(userId);
  return prefs.theme || DEFAULT_USER_PREFERENCES.theme;
}

/**
 * Set theme preference for a user
 * 
 * @param userId - The user ID
 * @param theme - Theme appearance
 */
export function setUserTheme(userId: string, theme: ThemeAppearance): void {
  updateUserPreference(userId, 'theme', theme);
}

/**
 * Get UI density preference for a user
 * 
 * @param userId - The user ID
 * @returns UI density preference
 */
export function getUserDensity(userId: string): UIDensity {
  const prefs = getUserPreferences(userId);
  return prefs.density || DEFAULT_USER_PREFERENCES.density;
}

/**
 * Set UI density preference for a user
 * 
 * @param userId - The user ID
 * @param density - UI density
 */
export function setUserDensity(userId: string, density: UIDensity): void {
  updateUserPreference(userId, 'density', density);
}

/**
 * Get default landing page for a user
 * 
 * @param userId - The user ID
 * @returns Default landing page path
 */
export function getUserDefaultLandingPage(userId: string): string {
  const prefs = getUserPreferences(userId);
  return prefs.defaultLandingPage || DEFAULT_USER_PREFERENCES.defaultLandingPage;
}

/**
 * Set default landing page for a user
 * 
 * @param userId - The user ID
 * @param path - Landing page path
 */
export function setUserDefaultLandingPage(userId: string, path: string): void {
  updateUserPreference(userId, 'defaultLandingPage', path);
}

/**
 * Get keyboard shortcuts configuration for a user
 * 
 * @param userId - The user ID
 * @returns Keyboard shortcuts configuration
 */
export function getUserKeyboardShortcuts(userId: string): KeyboardShortcuts {
  const prefs = getUserPreferences(userId);
  return prefs.shortcuts || DEFAULT_USER_PREFERENCES.shortcuts;
}

/**
 * Set keyboard shortcuts configuration for a user
 * 
 * @param userId - The user ID
 * @param shortcuts - Keyboard shortcuts configuration
 */
export function setUserKeyboardShortcuts(
  userId: string,
  shortcuts: Partial<KeyboardShortcuts>
): void {
  const existing = getUserKeyboardShortcuts(userId);
  const updated = { ...existing, ...shortcuts };
  updateUserPreference(userId, 'shortcuts', updated);
}

/**
 * Migrate preferences from old storage format (if needed)
 * This can be called on app initialization to handle legacy data
 * 
 * @param userId - The user ID
 */
export function migrateUserPreferences(userId: string): void {
  try {
    // Check for legacy storage keys and migrate if found
    const legacyThemeKey = 'theme';
    const legacyTheme = localStorage.getItem(legacyThemeKey);
    
    if (legacyTheme && (legacyTheme === 'light' || legacyTheme === 'dark' || legacyTheme === 'system')) {
      logDebug('Migrating legacy theme preference', { userId, legacyTheme });
      setUserTheme(userId, legacyTheme as ThemeAppearance);
      localStorage.removeItem(legacyThemeKey);
    }
    
    // Add more migration logic here as needed
  } catch (error) {
    logWarn('Failed to migrate user preferences', { userId, error });
  }
}

/**
 * Export all user preferences (for backup/debugging)
 * 
 * @param userId - The user ID
 * @returns JSON string of preferences
 */
export function exportUserPreferences(userId: string): string {
  const prefs = getUserPreferences(userId);
  return JSON.stringify(prefs, null, 2);
}

/**
 * Import user preferences (for restore/debugging)
 * 
 * @param userId - The user ID
 * @param json - JSON string of preferences
 */
export function importUserPreferences(userId: string, json: string): UserPreferences {
  try {
    const prefs = JSON.parse(json) as UserPreferences;
    return setUserPreferences(userId, prefs);
  } catch (error) {
    logError('Failed to import user preferences', { userId, error });
    throw new Error('Invalid preferences JSON');
  }
}

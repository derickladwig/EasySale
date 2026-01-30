/**
 * React Hook for User Preferences
 * 
 * Provides easy access to user preferences with automatic updates
 * and integration with the auth context.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserPreferences,
  setUserPreferences,
  updateUserPreference,
  resetUserPreferences,
  type UserPreferences,
  type ThemeAppearance,
  type UIDensity,
  type KeyboardShortcuts,
  DEFAULT_USER_PREFERENCES,
} from '../utils/userPreferences';
import { logDebug } from '../utils/logger';

/**
 * Hook return type
 */
export interface UseUserPreferencesReturn {
  /** Current user preferences */
  preferences: UserPreferences;
  
  /** Whether preferences are loading */
  isLoading: boolean;
  
  /** Update multiple preferences at once */
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  
  /** Update a single preference field */
  updatePreference: <K extends keyof UserPreferences>(
    field: K,
    value: UserPreferences[K]
  ) => void;
  
  /** Reset preferences to defaults */
  resetToDefaults: () => void;
  
  /** Convenience methods for common preferences */
  setTheme: (theme: ThemeAppearance) => void;
  setDensity: (density: UIDensity) => void;
  setDefaultLandingPage: (path: string) => void;
  setKeyboardShortcuts: (shortcuts: Partial<KeyboardShortcuts>) => void;
}

/**
 * Hook for managing user preferences
 * 
 * Automatically loads preferences for the current user and provides
 * methods to update them. Preferences are stored in localStorage
 * and are per-user (not shared across devices).
 * 
 * @returns User preferences and update methods
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { preferences, setTheme, setDensity } = useUserPreferences();
 *   
 *   return (
 *     <div>
 *       <button onClick={() => setTheme('dark')}>Dark Mode</button>
 *       <button onClick={() => setDensity('compact')}>Compact</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserPreferences(): UseUserPreferencesReturn {
  const { user, isAuthenticated } = useAuth();
  const [preferences, setPreferencesState] = useState<UserPreferences>(
    DEFAULT_USER_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      logDebug('Loading user preferences', { userId: user.id });
      const prefs = getUserPreferences(user.id);
      setPreferencesState(prefs);
      setIsLoading(false);
    } else {
      // Not authenticated, use defaults
      setPreferencesState(DEFAULT_USER_PREFERENCES);
      setIsLoading(false);
    }
  }, [user?.id, isAuthenticated]);

  // Update multiple preferences
  const updatePreferences = useCallback(
    (prefs: Partial<UserPreferences>) => {
      if (!user?.id) {
        logDebug('Cannot update preferences: no user');
        return;
      }

      const updated = setUserPreferences(user.id, prefs);
      setPreferencesState(updated);
    },
    [user?.id]
  );

  // Update a single preference field
  const updatePreferenceField = useCallback(
    <K extends keyof UserPreferences>(field: K, value: UserPreferences[K]) => {
      if (!user?.id) {
        logDebug('Cannot update preference: no user');
        return;
      }

      const updated = updateUserPreference(user.id, field, value);
      setPreferencesState(updated);
    },
    [user?.id]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (!user?.id) {
      logDebug('Cannot reset preferences: no user');
      return;
    }

    const defaults = resetUserPreferences(user.id);
    setPreferencesState(defaults);
  }, [user?.id]);

  // Convenience method: set theme
  const setTheme = useCallback(
    (theme: ThemeAppearance) => {
      updatePreferenceField('theme', theme);
    },
    [updatePreferenceField]
  );

  // Convenience method: set density
  const setDensity = useCallback(
    (density: UIDensity) => {
      updatePreferenceField('density', density);
    },
    [updatePreferenceField]
  );

  // Convenience method: set default landing page
  const setDefaultLandingPage = useCallback(
    (path: string) => {
      updatePreferenceField('defaultLandingPage', path);
    },
    [updatePreferenceField]
  );

  // Convenience method: set keyboard shortcuts
  const setKeyboardShortcuts = useCallback(
    (shortcuts: Partial<KeyboardShortcuts>) => {
      const existing = preferences.shortcuts || DEFAULT_USER_PREFERENCES.shortcuts;
      const updated = { ...existing, ...shortcuts };
      updatePreferenceField('shortcuts', updated);
    },
    [preferences.shortcuts, updatePreferenceField]
  );

  return {
    preferences,
    isLoading,
    updatePreferences,
    updatePreference: updatePreferenceField,
    resetToDefaults,
    setTheme,
    setDensity,
    setDefaultLandingPage,
    setKeyboardShortcuts,
  };
}

/**
 * Hook to get only the theme preference
 * Useful for components that only need theme information
 * 
 * @returns Current theme preference
 */
export function useThemePreference(): ThemeAppearance {
  const { preferences } = useUserPreferences();
  return preferences.theme || DEFAULT_USER_PREFERENCES.theme;
}

/**
 * Hook to get only the density preference
 * Useful for components that only need density information
 * 
 * @returns Current density preference
 */
export function useDensityPreference(): UIDensity {
  const { preferences } = useUserPreferences();
  return preferences.density || DEFAULT_USER_PREFERENCES.density;
}

/**
 * Hook to get only the default landing page
 * Useful for navigation/routing logic
 * 
 * @returns Default landing page path
 */
export function useDefaultLandingPage(): string {
  const { preferences } = useUserPreferences();
  return preferences.defaultLandingPage || DEFAULT_USER_PREFERENCES.defaultLandingPage;
}

/**
 * Hook to get only the keyboard shortcuts configuration
 * Useful for keyboard shortcut handlers
 * 
 * @returns Keyboard shortcuts configuration
 */
export function useKeyboardShortcuts(): KeyboardShortcuts {
  const { preferences } = useUserPreferences();
  return preferences.shortcuts || DEFAULT_USER_PREFERENCES.shortcuts;
}

import { useState, useEffect, useCallback, useRef } from 'react';

export type TextSize = 'small' | 'medium' | 'large' | 'extra-large';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type SidebarWidth = 'narrow' | 'medium' | 'wide';
export type Theme = 'light' | 'dark' | 'auto';
export type AnimationSpeed = 'none' | 'reduced' | 'normal' | 'enhanced';

export interface DisplaySettings {
  textSize: TextSize;
  density: Density;
  sidebarWidth: SidebarWidth;
  theme: Theme;
  animationSpeed: AnimationSpeed;
  reducedMotion: boolean;
}

// Text size multipliers
const TEXT_SIZE_MULTIPLIERS: Record<TextSize, number> = {
  small: 0.875, // 87.5%
  medium: 1.0, // 100%
  large: 1.125, // 112.5%
  'extra-large': 1.25, // 125%
};

// Density multipliers (applied to spacing)
const DENSITY_MULTIPLIERS: Record<Density, number> = {
  compact: 0.75, // 75% spacing
  comfortable: 1.0, // 100% spacing
  spacious: 1.25, // 125% spacing
};

// Sidebar width values
const SIDEBAR_WIDTHS: Record<SidebarWidth, string> = {
  narrow: '200px',
  medium: '240px',
  wide: '280px',
};

// Animation duration multipliers
const ANIMATION_SPEED_MULTIPLIERS: Record<AnimationSpeed, number> = {
  none: 0, // No animations
  reduced: 0.5, // 50% speed (2x duration)
  normal: 1.0, // 100% speed
  enhanced: 1.5, // 150% speed (0.67x duration)
};

const STORAGE_KEY = 'displaySettings';

const DEFAULT_SETTINGS: DisplaySettings = {
  textSize: 'medium',
  density: 'comfortable',
  sidebarWidth: 'medium',
  theme: 'dark', // Default to dark theme for POS
  animationSpeed: 'normal',
  reducedMotion: false,
};

/**
 * Hook for managing user display settings with localStorage persistence.
 *
 * Settings include:
 * - Text size: Scales all text (87.5% to 125%)
 * - Density: Adjusts spacing (75% to 125%)
 * - Sidebar width: Adjusts navigation width (200px to 280px)
 * - Theme: Light or dark mode
 * - Animation speed: Controls animation duration
 * - Reduced motion: Respects user preference for reduced motion
 *
 * All settings are persisted to localStorage and applied immediately via CSS custom properties.
 *
 * @example
 * const { settings, updateSettings, resetSettings } = useDisplaySettings();
 *
 * // Update text size
 * updateSettings({ textSize: 'large' });
 *
 * // Reset to defaults
 * resetSettings();
 *
 * @returns Object with current settings and update functions
 */
export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>(() => {
    return loadSettings();
  });

  // Apply settings to CSS custom properties whenever they change
  useEffect(() => {
    applyDisplaySettings(settings);
  }, [settings]);

  // Listen for prefers-reduced-motion changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setSettings((prev) => ({ ...prev, reducedMotion: true }));
      }
    };

    // Check initial value
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listen for system theme changes when theme is 'auto'
  useEffect(() => {
    if (settings.theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    // Apply initial theme
    handleChange();

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const updateSettings = useCallback((newSettings: Partial<DisplaySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

/**
 * Load settings from localStorage
 */
function loadSettings(): DisplaySettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      // Check for prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        reducedMotion: prefersReducedMotion || parsed.reducedMotion,
      };
    }
  } catch (error) {
    console.error('Failed to load display settings:', error);
  }

  return {
    ...DEFAULT_SETTINGS,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

/**
 * Save settings to localStorage and optionally sync to backend
 */
function saveSettings(settings: DisplaySettings, syncToBackend = true): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    // Sync theme to backend preferences (non-blocking)
    if (syncToBackend) {
      syncThemeToBackend(settings.theme).catch(() => {
        // Ignore errors - backend sync is optional
      });
    }
  } catch (error) {
    console.error('Failed to save display settings:', error);
  }
}

/**
 * Sync theme preference to backend
 */
async function syncThemeToBackend(theme: Theme): Promise<void> {
  try {
    await fetch('/api/settings/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ theme }),
    });
  } catch {
    // Silent fail - localStorage is the primary source
  }
}

/**
 * Apply display settings to CSS custom properties
 */
export function applyDisplaySettings(settings: DisplaySettings): void {
  const root = document.documentElement;

  // Text size
  root.style.setProperty('--text-scale', TEXT_SIZE_MULTIPLIERS[settings.textSize].toString());

  // Density
  root.style.setProperty('--density-scale', DENSITY_MULTIPLIERS[settings.density].toString());

  // Sidebar width
  root.style.setProperty('--sidebar-width', SIDEBAR_WIDTHS[settings.sidebarWidth]);

  // Animation speed
  const animSpeed =
    settings.animationSpeed === 'none' || settings.reducedMotion
      ? 0
      : 1 / ANIMATION_SPEED_MULTIPLIERS[settings.animationSpeed];
  root.style.setProperty('--animation-duration-multiplier', animSpeed.toString());

  // Theme
  if (settings.theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  } else {
    applyTheme(settings.theme);
  }
}

/**
 * Apply theme to document
 */
function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Get multiplier for a specific setting
 */
export function getTextSizeMultiplier(textSize: TextSize): number {
  return TEXT_SIZE_MULTIPLIERS[textSize];
}

export function getDensityMultiplier(density: Density): number {
  return DENSITY_MULTIPLIERS[density];
}

export function getSidebarWidth(sidebarWidth: SidebarWidth): string {
  return SIDEBAR_WIDTHS[sidebarWidth];
}

export function getAnimationSpeedMultiplier(animationSpeed: AnimationSpeed): number {
  return ANIMATION_SPEED_MULTIPLIERS[animationSpeed];
}

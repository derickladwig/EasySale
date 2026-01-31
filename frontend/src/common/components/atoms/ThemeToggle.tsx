/**
 * ThemeToggle Component
 * 
 * Simple dark/light mode toggle button for use on login page and elsewhere.
 * Uses unified theme storage key for consistency across the app.
 * 
 * For login page: toggles data-theme attribute directly (pre-auth)
 * For main app: syncs with ThemeEngine cache
 */

import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  /** Use simple localStorage-based toggle (for login page) */
  simple?: boolean;
}

// Use the same key as ThemeEngine for consistency
const THEME_CACHE_KEY = 'EasySale_theme_cache_v2';
const THEME_MODE_KEY = 'EasySale_theme_mode';

function getStoredThemeMode(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  
  // Try to get from theme cache first (main source of truth)
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.mode === 'dark' || parsed.mode === 'light') {
        return parsed.mode;
      }
    }
  } catch {
    // Ignore parse errors
  }
  
  // Fallback to simple mode key
  const stored = localStorage.getItem(THEME_MODE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  
  // Check data-theme attribute
  const dataTheme = document.documentElement.getAttribute('data-theme');
  if (dataTheme === 'dark' || dataTheme === 'light') return dataTheme;
  
  // Check system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(() => getStoredThemeMode() === 'dark');

  // Sync with storage changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_CACHE_KEY || e.key === THEME_MODE_KEY) {
        setIsDark(getStoredThemeMode() === 'dark');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleToggle = useCallback(() => {
    const newMode = isDark ? 'light' : 'dark';
    
    // Update data-theme attribute
    document.documentElement.setAttribute('data-theme', newMode);
    
    // Update simple mode key
    localStorage.setItem(THEME_MODE_KEY, newMode);
    
    // Update theme cache if it exists (preserve other settings)
    try {
      const cached = localStorage.getItem(THEME_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.mode = newMode;
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(parsed));
      }
    } catch {
      // Ignore parse errors
    }
    
    setIsDark(!isDark);
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-colors hover:bg-surface-elevated ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-text-tertiary hover:text-text-secondary" />
      ) : (
        <Moon className="w-5 h-5 text-text-secondary hover:text-text-primary" />
      )}
    </button>
  );
}

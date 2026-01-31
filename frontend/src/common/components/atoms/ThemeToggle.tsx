/**
 * ThemeToggle Component
 * 
 * Simple dark/light mode toggle button for use on login page and elsewhere.
 * Works with both main ThemeProvider and LoginThemeProvider contexts.
 * 
 * For login page: toggles data-theme attribute directly (pre-auth)
 * For main app: uses ThemeProvider context
 */

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  /** Use simple localStorage-based toggle (for login page) */
  simple?: boolean;
}

const THEME_STORAGE_KEY = 'EasySale_theme_mode';

export function ThemeToggle({ className = '', simple = false }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    
    // Check localStorage first
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return stored === 'dark';
    
    // Check data-theme attribute
    const dataTheme = document.documentElement.getAttribute('data-theme');
    if (dataTheme) return dataTheme === 'dark';
    
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleToggle = () => {
    setIsDark(!isDark);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-colors hover:bg-white/10 ${className}`}
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

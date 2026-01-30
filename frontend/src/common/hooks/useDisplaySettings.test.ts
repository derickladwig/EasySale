import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDisplaySettings, applyDisplaySettings } from './useDisplaySettings';
import type { DisplaySettings } from './useDisplaySettings';

describe('useDisplaySettings', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset CSS custom properties
    document.documentElement.style.cssText = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('loads default settings when localStorage is empty', () => {
      const { result } = renderHook(() => useDisplaySettings());

      expect(result.current.settings).toEqual({
        textSize: 'medium',
        density: 'comfortable',
        sidebarWidth: 'medium',
        theme: 'dark',
        animationSpeed: 'normal',
        reducedMotion: false,
      });
    });

    it('loads saved settings from localStorage', () => {
      const savedSettings: DisplaySettings = {
        textSize: 'large',
        density: 'spacious',
        sidebarWidth: 'wide',
        theme: 'light',
        animationSpeed: 'reduced',
        reducedMotion: false,
      };

      localStorage.setItem('displaySettings', JSON.stringify(savedSettings));

      const { result } = renderHook(() => useDisplaySettings());
      expect(result.current.settings).toEqual(savedSettings);
    });
  });

  describe('updateSettings', () => {
    it('updates a single setting', () => {
      const { result } = renderHook(() => useDisplaySettings());

      act(() => {
        result.current.updateSettings({ textSize: 'large' });
      });

      expect(result.current.settings.textSize).toBe('large');
    });

    it('updates multiple settings', () => {
      const { result } = renderHook(() => useDisplaySettings());

      act(() => {
        result.current.updateSettings({
          textSize: 'large',
          density: 'compact',
          theme: 'light',
        });
      });

      expect(result.current.settings.textSize).toBe('large');
      expect(result.current.settings.density).toBe('compact');
      expect(result.current.settings.theme).toBe('light');
    });

    it('persists settings to localStorage', () => {
      const { result } = renderHook(() => useDisplaySettings());

      act(() => {
        result.current.updateSettings({ textSize: 'large' });
      });

      const saved = localStorage.getItem('displaySettings');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.textSize).toBe('large');
    });
  });

  describe('resetSettings', () => {
    it('resets to default settings', () => {
      const { result } = renderHook(() => useDisplaySettings());

      // Change settings
      act(() => {
        result.current.updateSettings({
          textSize: 'large',
          density: 'compact',
          theme: 'light',
        });
      });

      // Reset
      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual({
        textSize: 'medium',
        density: 'comfortable',
        sidebarWidth: 'medium',
        theme: 'dark',
        animationSpeed: 'normal',
        reducedMotion: false,
      });
    });

    it('clears localStorage on reset', () => {
      const { result } = renderHook(() => useDisplaySettings());

      act(() => {
        result.current.updateSettings({ textSize: 'large' });
      });

      act(() => {
        result.current.resetSettings();
      });

      const saved = localStorage.getItem('displaySettings');
      const parsed = JSON.parse(saved!);
      expect(parsed.textSize).toBe('medium');
    });
  });

  describe('applyDisplaySettings', () => {
    it('applies text size to CSS custom property', () => {
      const settings: DisplaySettings = {
        textSize: 'large',
        density: 'comfortable',
        sidebarWidth: 'medium',
        theme: 'dark',
        animationSpeed: 'normal',
        reducedMotion: false,
      };

      applyDisplaySettings(settings);

      const textScale = document.documentElement.style.getPropertyValue('--text-scale');
      expect(textScale).toBe('1.125'); // 112.5%
    });

    it('applies density to CSS custom property', () => {
      const settings: DisplaySettings = {
        textSize: 'medium',
        density: 'compact',
        sidebarWidth: 'medium',
        theme: 'dark',
        animationSpeed: 'normal',
        reducedMotion: false,
      };

      applyDisplaySettings(settings);

      const densityScale = document.documentElement.style.getPropertyValue('--density-scale');
      expect(densityScale).toBe('0.75'); // 75%
    });

    it('applies sidebar width to CSS custom property', () => {
      const settings: DisplaySettings = {
        textSize: 'medium',
        density: 'comfortable',
        sidebarWidth: 'wide',
        theme: 'dark',
        animationSpeed: 'normal',
        reducedMotion: false,
      };

      applyDisplaySettings(settings);

      const sidebarWidth = document.documentElement.style.getPropertyValue('--sidebar-width');
      expect(sidebarWidth).toBe('280px');
    });

    it('applies theme to data attribute', () => {
      const settings: DisplaySettings = {
        textSize: 'medium',
        density: 'comfortable',
        sidebarWidth: 'medium',
        theme: 'light',
        animationSpeed: 'normal',
        reducedMotion: false,
      };

      applyDisplaySettings(settings);

      const theme = document.documentElement.getAttribute('data-theme');
      expect(theme).toBe('light');
    });

    it('disables animations when reducedMotion is true', () => {
      const settings: DisplaySettings = {
        textSize: 'medium',
        density: 'comfortable',
        sidebarWidth: 'medium',
        theme: 'dark',
        animationSpeed: 'normal',
        reducedMotion: true,
      };

      applyDisplaySettings(settings);

      const animDuration = document.documentElement.style.getPropertyValue(
        '--animation-duration-multiplier'
      );
      expect(animDuration).toBe('0');
    });

    it('disables animations when animationSpeed is none', () => {
      const settings: DisplaySettings = {
        textSize: 'medium',
        density: 'comfortable',
        sidebarWidth: 'medium',
        theme: 'dark',
        animationSpeed: 'none',
        reducedMotion: false,
      };

      applyDisplaySettings(settings);

      const animDuration = document.documentElement.style.getPropertyValue(
        '--animation-duration-multiplier'
      );
      expect(animDuration).toBe('0');
    });
  });
});

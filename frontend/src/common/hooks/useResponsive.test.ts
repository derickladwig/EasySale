import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsive, useBreakpoint, useAspectRatio, useOrientation } from './useResponsive';

describe('useResponsive', () => {
  // Store original window dimensions
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  // Helper to set window dimensions
  const setWindowDimensions = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
  };

  beforeEach(() => {
    // Reset to default dimensions
    setWindowDimensions(1024, 768);
  });

  afterEach(() => {
    // Restore original dimensions
    setWindowDimensions(originalInnerWidth, originalInnerHeight);
  });

  describe('Breakpoint Detection', () => {
    it('detects xs breakpoint (<640px)', () => {
      setWindowDimensions(320, 568);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe('xs');
      expect(result.current.isMobile).toBe(true);
    });

    it('detects sm breakpoint (640-768px)', () => {
      setWindowDimensions(640, 480);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe('sm');
      expect(result.current.isMobile).toBe(true);
    });

    it('detects md breakpoint (768-1024px)', () => {
      setWindowDimensions(768, 1024);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe('md');
      expect(result.current.isTablet).toBe(true);
    });

    it('detects lg breakpoint (1024-1280px)', () => {
      setWindowDimensions(1024, 768);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe('lg');
      expect(result.current.isDesktop).toBe(true);
    });

    it('detects xl breakpoint (1280-1536px)', () => {
      setWindowDimensions(1280, 720);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe('xl');
      expect(result.current.isDesktop).toBe(true);
    });

    it('detects 2xl breakpoint (>1536px)', () => {
      setWindowDimensions(1920, 1080);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe('2xl');
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('Aspect Ratio Detection', () => {
    it('detects portrait aspect ratio (<0.9)', () => {
      setWindowDimensions(768, 1024);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.aspectRatio).toBe('portrait');
    });

    it('detects square aspect ratio (0.9-1.1)', () => {
      setWindowDimensions(1000, 1000);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.aspectRatio).toBe('square');
    });

    it('detects standard aspect ratio (1.1-1.8)', () => {
      setWindowDimensions(1024, 768); // 4:3
      const { result } = renderHook(() => useResponsive());
      expect(result.current.aspectRatio).toBe('standard');
    });

    it('detects widescreen aspect ratio (1.8-2.2)', () => {
      setWindowDimensions(1920, 1080); // 16:9
      const { result } = renderHook(() => useResponsive());
      expect(result.current.aspectRatio).toBe('widescreen');
    });

    it('detects ultrawide aspect ratio (>2.2)', () => {
      setWindowDimensions(3440, 1440); // 21:9
      const { result } = renderHook(() => useResponsive());
      expect(result.current.aspectRatio).toBe('ultrawide');
    });
  });

  describe('Orientation Detection', () => {
    it('detects landscape orientation', () => {
      setWindowDimensions(1024, 768);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.orientation).toBe('landscape');
    });

    it('detects portrait orientation', () => {
      setWindowDimensions(768, 1024);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.orientation).toBe('portrait');
    });
  });

  describe('Resize Handling', () => {
    it('updates state on window resize', async () => {
      setWindowDimensions(1024, 768);
      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('lg');

      // Simulate resize
      act(() => {
        setWindowDimensions(640, 480);
        window.dispatchEvent(new Event('resize'));
      });

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(result.current.breakpoint).toBe('sm');
    });
  });

  describe('useBreakpoint', () => {
    it('returns true when current breakpoint matches', () => {
      setWindowDimensions(1024, 768);
      const { result } = renderHook(() => useBreakpoint('lg'));
      expect(result.current).toBe(true);
    });

    it('returns false when current breakpoint does not match', () => {
      setWindowDimensions(1024, 768);
      const { result } = renderHook(() => useBreakpoint('xs', 'sm'));
      expect(result.current).toBe(false);
    });

    it('supports multiple breakpoints', () => {
      setWindowDimensions(1024, 768);
      const { result } = renderHook(() => useBreakpoint('md', 'lg', 'xl'));
      expect(result.current).toBe(true);
    });
  });

  describe('useAspectRatio', () => {
    it('returns true when current aspect ratio matches', () => {
      setWindowDimensions(1920, 1080);
      const { result } = renderHook(() => useAspectRatio('widescreen'));
      expect(result.current).toBe(true);
    });

    it('returns false when current aspect ratio does not match', () => {
      setWindowDimensions(1920, 1080);
      const { result } = renderHook(() => useAspectRatio('portrait', 'square'));
      expect(result.current).toBe(false);
    });
  });

  describe('useOrientation', () => {
    it('returns true when current orientation matches', () => {
      setWindowDimensions(1024, 768);
      const { result } = renderHook(() => useOrientation('landscape'));
      expect(result.current).toBe(true);
    });

    it('returns false when current orientation does not match', () => {
      setWindowDimensions(1024, 768);
      const { result } = renderHook(() => useOrientation('portrait'));
      expect(result.current).toBe(false);
    });
  });
});

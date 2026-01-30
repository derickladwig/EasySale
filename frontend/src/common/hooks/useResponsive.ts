import { useState, useEffect } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AspectRatio = 'portrait' | 'square' | 'standard' | 'widescreen' | 'ultrawide';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveState {
  breakpoint: Breakpoint;
  aspectRatio: AspectRatio;
  orientation: Orientation;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
}

/**
 * Hook for detecting responsive breakpoints, aspect ratios, and device characteristics.
 *
 * Breakpoints:
 * - xs: <640px (extra small phones)
 * - sm: 640-768px (large phones)
 * - md: 768-1024px (tablets)
 * - lg: 1024-1280px (desktops)
 * - xl: 1280-1536px (large desktops)
 * - 2xl: >1536px (ultra-wide displays)
 *
 * Aspect Ratios:
 * - portrait: <0.9 (taller than wide)
 * - square: 0.9-1.1 (roughly square)
 * - standard: 1.1-1.7 (4:3 to 16:10)
 * - widescreen: 1.7-2.2 (16:9 and similar)
 * - ultrawide: >2.2 (21:9 and wider)
 *
 * @example
 * const { breakpoint, isMobile, isTouch } = useResponsive();
 *
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 *
 * @returns ResponsiveState object with current responsive information
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => getResponsiveState());

  useEffect(() => {
    let timeoutId: number;

    const handleResize = () => {
      // Debounce resize events for performance
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setState(getResponsiveState());
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    // Also listen for orientation changes on mobile devices
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}

/**
 * Get current responsive state based on window dimensions
 */
function getResponsiveState(): ResponsiveState {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = width / height;

  // Detect breakpoint
  let breakpoint: Breakpoint;
  if (width < 640) breakpoint = 'xs';
  else if (width < 768) breakpoint = 'sm';
  else if (width < 1024) breakpoint = 'md';
  else if (width < 1280) breakpoint = 'lg';
  else if (width < 1536) breakpoint = 'xl';
  else breakpoint = '2xl';

  // Detect aspect ratio
  let aspectRatio: AspectRatio;
  if (ratio < 0.9) aspectRatio = 'portrait';
  else if (ratio < 1.1) aspectRatio = 'square';
  else if (ratio < 1.7) aspectRatio = 'standard';
  else if (ratio < 2.2) aspectRatio = 'widescreen';
  else aspectRatio = 'ultrawide';

  // Detect orientation
  const orientation: Orientation = width > height ? 'landscape' : 'portrait';

  // Detect device type
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';

  // Detect touch capability
  const isTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0;

  return {
    breakpoint,
    aspectRatio,
    orientation,
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
  };
}

/**
 * Hook for checking if current breakpoint matches a specific breakpoint or range
 *
 * @example
 * const isSmallScreen = useBreakpoint('xs', 'sm');
 * const isLargeScreen = useBreakpoint('lg', 'xl', '2xl');
 */
export function useBreakpoint(...breakpoints: Breakpoint[]): boolean {
  const { breakpoint } = useResponsive();
  return breakpoints.includes(breakpoint);
}

/**
 * Hook for checking if current aspect ratio matches specific ratios
 *
 * @example
 * const isWide = useAspectRatio('widescreen', 'ultrawide');
 */
export function useAspectRatio(...ratios: AspectRatio[]): boolean {
  const { aspectRatio } = useResponsive();
  return ratios.includes(aspectRatio);
}

/**
 * Hook for checking current orientation
 *
 * @example
 * const isPortrait = useOrientation('portrait');
 */
export function useOrientation(targetOrientation: Orientation): boolean {
  const { orientation } = useResponsive();
  return orientation === targetOrientation;
}

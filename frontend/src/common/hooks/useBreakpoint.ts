import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'desktop-lg';

export interface BreakpointState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isDesktopLg: boolean;
  width: number;
}

const getBreakpoint = (width: number): Breakpoint => {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1536) return 'desktop';
  return 'desktop-lg';
};

export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const breakpoint = getBreakpoint(width);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop' || breakpoint === 'desktop-lg',
    isDesktopLg: breakpoint === 'desktop-lg',
    width,
  };
}

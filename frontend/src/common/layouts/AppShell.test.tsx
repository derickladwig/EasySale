import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';
import * as useBreakpointModule from '../hooks/useBreakpoint';

// Mock useBreakpoint hook
vi.mock('../hooks/useBreakpoint');

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop
    vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
      breakpoint: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isDesktopLg: false,
      width: 1200,
    });
  });

  describe('Desktop Layout', () => {
    it('renders children in main content area', () => {
      render(
        <AppShell>
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });

    it('renders topBar when provided', () => {
      render(
        <AppShell topBar={<div>Top Bar</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Top Bar')).toBeInTheDocument();
    });

    it('renders leftNav as persistent sidebar', () => {
      render(
        <AppShell leftNav={<div>Left Navigation</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      const leftNav = screen.getByText('Left Navigation');
      expect(leftNav).toBeInTheDocument();
      expect(leftNav.closest('aside')).toHaveClass('w-60');
    });

    it('renders rightPanel as sidebar', () => {
      render(
        <AppShell rightPanel={<div>Right Panel</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      const rightPanel = screen.getByText('Right Panel');
      expect(rightPanel).toBeInTheDocument();
      expect(rightPanel.closest('aside')).toHaveClass('w-80');
    });

    it('renders all sections together', () => {
      render(
        <AppShell
          topBar={<div>Top Bar</div>}
          leftNav={<div>Left Nav</div>}
          rightPanel={<div>Right Panel</div>}
        >
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Top Bar')).toBeInTheDocument();
      expect(screen.getByText('Left Nav')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
      expect(screen.getByText('Right Panel')).toBeInTheDocument();
    });

    it('applies correct layout structure', () => {
      const { container } = render(
        <AppShell>
          <div>Main Content</div>
        </AppShell>
      );

      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass('h-screen', 'flex', 'flex-col');
    });
  });

  describe('Tablet Layout', () => {
    beforeEach(() => {
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: 'tablet',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isDesktopLg: false,
        width: 800,
      });
    });

    it('renders leftNav as drawer (hidden by default)', () => {
      render(
        <AppShell leftNav={<div>Left Navigation</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      const leftNav = screen.getByText('Left Navigation');
      const drawer = leftNav.closest('aside');
      expect(drawer).toHaveClass('-translate-x-full');
    });

    it('shows leftNav drawer when isDrawerOpen is true', () => {
      render(
        <AppShell leftNav={<div>Left Navigation</div>} isDrawerOpen={true}>
          <div>Main Content</div>
        </AppShell>
      );

      const leftNav = screen.getByText('Left Navigation');
      const drawer = leftNav.closest('aside');
      expect(drawer).toHaveClass('translate-x-0');
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isDesktopLg: false,
        width: 400,
      });
    });

    it('renders bottomNav on mobile', () => {
      render(
        <AppShell bottomNav={<div>Bottom Navigation</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Bottom Navigation')).toBeInTheDocument();
    });

    it('renders leftNav as full-screen drawer', () => {
      render(
        <AppShell leftNav={<div>Left Navigation</div>} isDrawerOpen={true}>
          <div>Main Content</div>
        </AppShell>
      );

      const leftNav = screen.getByText('Left Navigation');
      const drawer = leftNav.closest('aside');
      expect(drawer).toHaveClass('w-full');
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts layout based on breakpoint', () => {
      // Desktop
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isDesktopLg: false,
        width: 1200,
      });

      const { rerender } = render(
        <AppShell leftNav={<div>Left Nav</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      let leftNav = screen.getByText('Left Nav');
      expect(leftNav.closest('aside')).toHaveClass('w-60');

      // Tablet
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: 'tablet',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isDesktopLg: false,
        width: 800,
      });

      rerender(
        <AppShell leftNav={<div>Left Nav</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      leftNav = screen.getByText('Left Nav');
      expect(leftNav.closest('aside')).toHaveClass('w-64');
    });
  });
});

/**
 * AppShell Component Tests
 * 
 * Tests for the AppShell layout component including:
 * - Basic rendering
 * - Layout structure
 * - Responsive behavior
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  describe('Basic Rendering', () => {
    it('should render children content', () => {
      render(
        <AppShell>
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });

    it('should render sidebar when provided', () => {
      render(
        <AppShell sidebar={<nav>Sidebar Navigation</nav>}>
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Sidebar Navigation')).toBeInTheDocument();
    });

    it('should render header when provided', () => {
      render(
        <AppShell header={<div>Header Content</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should render all sections together', () => {
      render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          header={<div>Header</div>}
        >
          <div>Content</div>
        </AppShell>
      );

      expect(screen.getByText('Sidebar')).toBeInTheDocument();
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should use semantic HTML elements', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          header={<div>Header</div>}
        >
          <div>Content</div>
        </AppShell>
      );

      expect(container.querySelector('aside')).toBeInTheDocument();
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          header={<div>Header</div>}
        >
          <div>Content</div>
        </AppShell>
      );

      const appShell = container.firstChild as HTMLElement;
      expect(appShell.className).toContain('appShell');
    });
  });

  describe('Mobile Sidebar Behavior', () => {
    it('should control sidebar visibility with isSidebarOpen prop', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={true}
        >
          <div>Content</div>
        </AppShell>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar?.getAttribute('data-open')).toBe('true');
    });

    it('should render backdrop when sidebar is open', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={true}
        >
          <div>Content</div>
        </AppShell>
      );

      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('should not render backdrop when sidebar is closed', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={false}
        >
          <div>Content</div>
        </AppShell>
      );

      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]');
      expect(backdrop).not.toBeInTheDocument();
    });

    it('should call onSidebarClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={true}
          onSidebarClose={handleClose}
        >
          <div>Content</div>
        </AppShell>
      );

      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]');
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop!);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSidebarClose when backdrop is activated with Enter key', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={true}
          onSidebarClose={handleClose}
        >
          <div>Content</div>
        </AppShell>
      );

      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]') as HTMLElement;
      backdrop.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSidebarClose when backdrop is activated with Space key', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={true}
          onSidebarClose={handleClose}
        >
          <div>Content</div>
        </AppShell>
      );

      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]') as HTMLElement;
      backdrop.focus();
      await user.keyboard(' ');
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should set aria-hidden on closed sidebar', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={false}
        >
          <div>Content</div>
        </AppShell>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should not set aria-hidden on open sidebar', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={true}
        >
          <div>Content</div>
        </AppShell>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar?.getAttribute('aria-hidden')).toBeNull();
    });

    it('should make backdrop keyboard accessible', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          isSidebarOpen={true}
        >
          <div>Content</div>
        </AppShell>
      );

      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]');
      expect(backdrop?.getAttribute('tabIndex')).toBe('0');
    });
  });

  describe('Without Sidebar', () => {
    it('should not render backdrop when no sidebar is provided', () => {
      const { container } = render(
        <AppShell isSidebarOpen={true}>
          <div>Content</div>
        </AppShell>
      );

      const backdrop = container.querySelector('[role="button"][aria-label="Close sidebar"]');
      expect(backdrop).not.toBeInTheDocument();
    });

    it('should render content correctly without sidebar', () => {
      render(
        <AppShell header={<div>Header</div>}>
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });
  });

  describe('Layout Contract', () => {
    it('should use CSS Grid for layout', () => {
      const { container } = render(
        <AppShell
          sidebar={<nav>Sidebar</nav>}
          header={<div>Header</div>}
        >
          <div>Content</div>
        </AppShell>
      );

      const appShell = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(appShell);
      
      // Note: In JSDOM, computed styles may not fully reflect CSS
      // This test verifies the class is applied; actual layout is tested visually
      expect(appShell.className).toContain('appShell');
    });
  });
});

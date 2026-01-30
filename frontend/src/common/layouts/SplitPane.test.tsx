import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitPane } from './SplitPane';
import * as useBreakpointModule from '../hooks/useBreakpoint';

// Mock useBreakpoint hook
vi.mock('../hooks/useBreakpoint');

describe('SplitPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop
    vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
      breakpoint: "desktop" as const,
        isMobile: false,
        isDesktopLg: false,
        width: 1200,
      isTablet: false,
      isDesktop: true,
    });
  });

  describe('Desktop Layout', () => {
    it('renders left and right panes', () => {
      render(<SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} />);

      expect(screen.getByText('Left Pane')).toBeInTheDocument();
      expect(screen.getByText('Right Pane')).toBeInTheDocument();
    });

    it('applies default 50/50 ratio', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} />
      );

      const leftPane = screen.getByText('Left Pane').parentElement;
      const rightPane = screen.getByText('Right Pane').parentElement;

      expect(leftPane).toHaveStyle({ width: '50%' });
      expect(rightPane).toHaveStyle({ width: '50%' });
    });

    it('applies custom default ratio', () => {
      render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} defaultRatio={30} />
      );

      const leftPane = screen.getByText('Left Pane').parentElement;
      const rightPane = screen.getByText('Right Pane').parentElement;

      expect(leftPane).toHaveStyle({ width: '30%' });
      expect(rightPane).toHaveStyle({ width: '70%' });
    });

    it('renders resizer when resizable is true', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} resizable={true} />
      );

      const resizer = container.querySelector('.cursor-col-resize');
      expect(resizer).toBeInTheDocument();
    });

    it('does not render resizer when resizable is false', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} resizable={false} />
      );

      const resizer = container.querySelector('.cursor-col-resize');
      expect(resizer).not.toBeInTheDocument();
    });

    it('handles resizer mousedown event', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} resizable={true} />
      );

      const resizer = container.querySelector('.cursor-col-resize') as HTMLElement;
      fireEvent.mouseDown(resizer);

      // After mousedown, resizer should have active styling
      expect(resizer).toHaveClass('bg-primary-500');
    });

    it('updates pane widths on resize', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} resizable={true} />
      );

      const resizer = container.querySelector('.cursor-col-resize') as HTMLElement;
      const splitPaneContainer = container.firstChild as HTMLElement;

      // Start dragging
      fireEvent.mouseDown(resizer);

      // Mock getBoundingClientRect
      splitPaneContainer.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        width: 1000,
        top: 0,
        right: 1000,
        bottom: 500,
        height: 500,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      // Simulate mouse move to 60% position
      fireEvent.mouseMove(splitPaneContainer, { clientX: 600 });

      const leftPane = screen.getByText('Left Pane').parentElement;
      const rightPane = screen.getByText('Right Pane').parentElement;

      expect(leftPane).toHaveStyle({ width: '60%' });
      expect(rightPane).toHaveStyle({ width: '40%' });
    });

    it('respects minimum width constraints', () => {
      const { container } = render(
        <SplitPane
          left={<div>Left Pane</div>}
          right={<div>Right Pane</div>}
          resizable={true}
          minLeftWidth={300}
          minRightWidth={300}
        />
      );

      const resizer = container.querySelector('.cursor-col-resize') as HTMLElement;
      const splitPaneContainer = container.firstChild as HTMLElement;

      fireEvent.mouseDown(resizer);

      splitPaneContainer.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        width: 1000,
        top: 0,
        right: 1000,
        bottom: 500,
        height: 500,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      // Try to resize to 10% (should be constrained by minLeftWidth)
      fireEvent.mouseMove(splitPaneContainer, { clientX: 100 });

      const leftPane = screen.getByText('Left Pane').parentElement;

      // Should be constrained to at least 30% (300px / 1000px)
      const leftWidth = parseFloat(leftPane?.style.width || '0');
      expect(leftWidth).toBeGreaterThanOrEqual(30);
    });

    it('stops resizing on mouse up', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} resizable={true} />
      );

      const resizer = container.querySelector('.cursor-col-resize') as HTMLElement;
      const splitPaneContainer = container.firstChild as HTMLElement;

      fireEvent.mouseDown(resizer);
      expect(resizer).toHaveClass('bg-primary-500');

      fireEvent.mouseUp(splitPaneContainer);
      expect(resizer).not.toHaveClass('bg-primary-500');
    });
  });

  describe('Tablet Layout', () => {
    beforeEach(() => {
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: "tablet" as const,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isDesktopLg: false,
        width: 800,
      });
    });

    it('renders with fixed 60/40 ratio', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} />
      );

      const leftPane = screen.getByText('Left Pane').parentElement;
      const rightPane = screen.getByText('Right Pane').parentElement;

      expect(leftPane).toHaveClass('w-[60%]');
      expect(rightPane).toHaveClass('w-[40%]');
    });

    it('does not render resizer on tablet', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} resizable={true} />
      );

      const resizer = container.querySelector('.cursor-col-resize');
      expect(resizer).not.toBeInTheDocument();
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: "mobile" as const,
        isMobile: true,
        isDesktopLg: false,
        width: 400,
        isTablet: false,
        isDesktop: false,
      });
    });

    it('stacks panes vertically', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} />
      );

      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass('flex-col');
    });

    it('renders both panes with equal flex', () => {
      render(<SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} />);

      const leftPane = screen.getByText('Left Pane').parentElement;
      const rightPane = screen.getByText('Right Pane').parentElement;

      expect(leftPane).toHaveClass('flex-1');
      expect(rightPane).toHaveClass('flex-1');
    });

    it('does not render resizer on mobile', () => {
      const { container } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} resizable={true} />
      );

      const resizer = container.querySelector('.cursor-col-resize');
      expect(resizer).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts layout based on breakpoint', () => {
      // Desktop
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: "desktop" as const,
        isMobile: false,
        isDesktopLg: false,
        width: 1200,
        isTablet: false,
        isDesktop: true,
      });

      const { container, rerender } = render(
        <SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} />
      );

      let root = container.firstChild as HTMLElement;
      expect(root).not.toHaveClass('flex-col');

      // Mobile
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: "mobile" as const,
        isMobile: true,
        isDesktopLg: false,
        width: 400,
        isTablet: false,
        isDesktop: false,
      });

      rerender(<SplitPane left={<div>Left Pane</div>} right={<div>Right Pane</div>} />);

      root = container.firstChild as HTMLElement;
      expect(root).toHaveClass('flex-col');
    });
  });
});

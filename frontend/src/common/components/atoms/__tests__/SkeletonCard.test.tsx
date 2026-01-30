/**
 * SkeletonCard Component Tests
 *
 * Tests for the SkeletonCard component and SkeletonCardGrid.
 *
 * Requirements tested:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonCard, SkeletonCardGrid } from '../SkeletonCard';

describe('SkeletonCard Component', () => {
  describe('Basic Rendering (Requirement 12.1)', () => {
    it('should render with default props', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstChild as HTMLElement;

      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveAttribute('role', 'status');
      expect(card).toHaveAttribute('aria-busy', 'true');
    });

    it('should render body with default 3 lines', () => {
      const { container } = render(<SkeletonCard />);
      const lines = container.querySelectorAll('.space-y-3 > .h-4');

      expect(lines).toHaveLength(3);
    });

    it('should have pulsing animation on skeleton elements (Requirement 12.6)', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Header Section (Requirement 12.5)', () => {
    it('should not render header by default', () => {
      const { container } = render(<SkeletonCard />);
      const header = container.querySelector('.border-b');

      expect(header).not.toBeInTheDocument();
    });

    it('should render header when hasHeader is true', () => {
      const { container } = render(<SkeletonCard hasHeader />);
      const header = container.querySelector('.border-b');

      expect(header).toBeInTheDocument();
    });

    it('should render header skeleton with correct width', () => {
      const { container } = render(<SkeletonCard hasHeader />);
      const headerSkeleton = container.querySelector('.border-b .h-6');

      expect(headerSkeleton).toBeInTheDocument();
      expect(headerSkeleton).toHaveClass('w-1/3');
    });
  });

  describe('Footer Section (Requirement 12.5)', () => {
    it('should not render footer by default', () => {
      const { container } = render(<SkeletonCard />);
      const footer = container.querySelector('.border-t');

      expect(footer).not.toBeInTheDocument();
    });

    it('should render footer when hasFooter is true', () => {
      const { container } = render(<SkeletonCard hasFooter />);
      const footer = container.querySelector('.border-t');

      expect(footer).toBeInTheDocument();
    });

    it('should render footer skeleton with button-like dimensions', () => {
      const { container } = render(<SkeletonCard hasFooter />);
      const footerSkeleton = container.querySelector('.border-t .h-8');

      expect(footerSkeleton).toBeInTheDocument();
      expect(footerSkeleton).toHaveClass('w-24');
    });
  });

  describe('Body Content Lines (Requirement 12.5)', () => {
    it('should render custom number of lines', () => {
      const { container } = render(<SkeletonCard lines={5} />);
      const lines = container.querySelectorAll('.space-y-3 > .h-4');

      expect(lines).toHaveLength(5);
    });

    it('should render lines with varying widths for natural appearance', () => {
      const { container } = render(<SkeletonCard lines={3} />);
      const lines = container.querySelectorAll('.space-y-3 > .h-4');

      // First line should be full width
      expect(lines[0]).toHaveClass('w-full');
      // Second line should be 5/6 width
      expect(lines[1]).toHaveClass('w-5/6');
      // Third line should be 4/6 width
      expect(lines[2]).toHaveClass('w-4/6');
    });
  });

  describe('Variant Styles (Requirement 12.5)', () => {
    it('should render default variant with shadow and border', () => {
      const { container } = render(<SkeletonCard variant="default" />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-background-secondary');
      expect(card).toHaveClass('shadow-md');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-border-light');
    });

    it('should render elevated variant with larger shadow', () => {
      const { container } = render(<SkeletonCard variant="elevated" />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('shadow-lg');
    });

    it('should render outlined variant with transparent background', () => {
      const { container } = render(<SkeletonCard variant="outlined" />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-transparent');
      expect(card).toHaveClass('border-2');
      expect(card).toHaveClass('border-border-DEFAULT');
    });
  });

  describe('Responsive Padding', () => {
    it('should have responsive padding classes', () => {
      const { container } = render(<SkeletonCard />);
      // Find the body div - it's the one with space-y-3 inside it
      const bodyDiv = container.querySelector('.px-4.py-4, .sm\\:px-6.py-4');
      
      // The body should exist and have padding
      expect(bodyDiv).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SkeletonCard className="custom-card-class" />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('custom-card-class');
    });
  });

  describe('Complete Card Structure', () => {
    it('should render complete card with header, body, and footer', () => {
      const { container } = render(<SkeletonCard hasHeader hasFooter lines={4} />);

      // Check header
      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();

      // Check body lines
      const lines = container.querySelectorAll('.space-y-3 > .h-4');
      expect(lines).toHaveLength(4);

      // Check footer
      const footer = container.querySelector('.border-t');
      expect(footer).toBeInTheDocument();
    });
  });
});

describe('SkeletonCardGrid Component', () => {
  describe('Basic Rendering (Requirement 12.1)', () => {
    it('should render default 6 skeleton cards', () => {
      const { container } = render(<SkeletonCardGrid />);
      // Count only the direct card elements, not nested status elements
      const cards = container.querySelectorAll(':scope > div > [role="status"]');

      expect(cards).toHaveLength(6);
    });

    it('should render custom number of cards', () => {
      const { container } = render(<SkeletonCardGrid count={9} />);
      // Count only the direct card elements, not nested status elements
      const cards = container.querySelectorAll(':scope > div > [role="status"]');

      expect(cards).toHaveLength(9);
    });
  });

  describe('Grid Layout', () => {
    it('should have grid layout classes', () => {
      const { container } = render(<SkeletonCardGrid />);
      const grid = container.firstChild as HTMLElement;

      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('gap-4');
      expect(grid).toHaveClass('sm:gap-6');
    });

    it('should apply responsive column classes', () => {
      const { container } = render(<SkeletonCardGrid />);
      const grid = container.firstChild as HTMLElement;

      // Default columns: 1 mobile, 2 tablet, 3 desktop
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('sm:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('should apply custom column configuration', () => {
      const { container } = render(
        <SkeletonCardGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }} />
      );
      const grid = container.firstChild as HTMLElement;

      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('sm:grid-cols-3');
      expect(grid).toHaveClass('lg:grid-cols-4');
    });
  });

  describe('Card Props Propagation', () => {
    it('should pass cardProps to all skeleton cards', () => {
      const { container } = render(
        <SkeletonCardGrid count={3} cardProps={{ hasHeader: true, hasFooter: true, lines: 5 }} />
      );

      // Check that all cards have headers
      const headers = container.querySelectorAll('.border-b');
      expect(headers).toHaveLength(3);

      // Check that all cards have footers
      const footers = container.querySelectorAll('.border-t');
      expect(footers).toHaveLength(3);

      // Check that all cards have 5 lines
      const allLines = container.querySelectorAll('.space-y-3 > .h-4');
      expect(allLines).toHaveLength(15); // 3 cards × 5 lines
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className to grid', () => {
      const { container } = render(<SkeletonCardGrid className="custom-grid-class" />);
      const grid = container.firstChild as HTMLElement;

      expect(grid).toHaveClass('custom-grid-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on all cards', () => {
      const { container } = render(<SkeletonCardGrid count={4} />);
      const cards = container.querySelectorAll('[role="status"]');

      cards.forEach((card) => {
        expect(card).toHaveAttribute('aria-busy', 'true');
      });
    });
  });
});

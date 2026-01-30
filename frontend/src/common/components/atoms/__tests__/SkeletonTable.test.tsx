/**
 * SkeletonTable Component Tests
 *
 * Tests for the SkeletonTable component and variants.
 *
 * Requirements tested:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonTable, SkeletonTableWithPagination } from '../SkeletonTable';

describe('SkeletonTable Component', () => {
  describe('Basic Rendering (Requirement 12.1)', () => {
    it('should render with default props', () => {
      const { container } = render(<SkeletonTable />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveAttribute('role', 'status');
      expect(wrapper).toHaveAttribute('aria-busy', 'true');
    });

    it('should render default 5 rows', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const rows = container.querySelectorAll('tbody tr');

      expect(rows).toHaveLength(5);
    });

    it('should render custom number of rows', () => {
      const { container } = render(<SkeletonTable rows={10} mobileCardLayout={false} />);
      const rows = container.querySelectorAll('tbody tr');

      expect(rows).toHaveLength(10);
    });

    it('should have pulsing animation on skeleton elements (Requirement 12.6)', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Column Configuration (Requirement 12.5)', () => {
    it('should render default 4 columns', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const firstRow = container.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');

      expect(cells).toHaveLength(4);
    });

    it('should render custom number of columns', () => {
      const { container } = render(<SkeletonTable columns={7} mobileCardLayout={false} />);
      const firstRow = container.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');

      expect(cells).toHaveLength(7);
    });
  });

  describe('Header Section (Requirement 12.5)', () => {
    it('should render header by default', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const header = container.querySelector('thead');

      expect(header).toBeInTheDocument();
    });

    it('should not render header when showHeader is false', () => {
      const { container } = render(<SkeletonTable showHeader={false} mobileCardLayout={false} />);
      const header = container.querySelector('thead');

      expect(header).not.toBeInTheDocument();
    });

    it('should render header with correct styling', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const header = container.querySelector('thead');

      expect(header).toHaveClass('bg-background-tertiary/50');
      expect(header).toHaveClass('border-b-2');
      expect(header).toHaveClass('border-border-DEFAULT');
    });

    it('should render header cells matching column count', () => {
      const { container } = render(<SkeletonTable columns={5} mobileCardLayout={false} />);
      const headerCells = container.querySelectorAll('thead th');

      expect(headerCells).toHaveLength(5);
    });
  });

  describe('Selection Checkboxes (Requirement 12.5)', () => {
    it('should not show selection column by default', () => {
      const { container } = render(<SkeletonTable columns={4} mobileCardLayout={false} />);
      const firstRow = container.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');

      expect(cells).toHaveLength(4);
    });

    it('should show selection column when showSelection is true', () => {
      const { container } = render(
        <SkeletonTable columns={4} showSelection mobileCardLayout={false} />
      );
      const firstRow = container.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');

      // Should have 5 cells: 1 selection + 4 data columns
      expect(cells).toHaveLength(5);
    });

    it('should render checkbox skeleton in selection column', () => {
      const { container } = render(
        <SkeletonTable columns={3} showSelection mobileCardLayout={false} />
      );
      const firstRow = container.querySelector('tbody tr');
      const firstCell = firstRow?.querySelector('td');
      const checkboxSkeleton = firstCell?.querySelector('.w-4.h-4');

      expect(checkboxSkeleton).toBeInTheDocument();
    });

    it('should render checkbox skeleton in header when showSelection is true', () => {
      const { container } = render(
        <SkeletonTable columns={3} showSelection mobileCardLayout={false} />
      );
      const headerFirstCell = container.querySelector('thead th');
      const checkboxSkeleton = headerFirstCell?.querySelector('.w-4.h-4');

      expect(checkboxSkeleton).toBeInTheDocument();
    });
  });

  describe('Mobile Card Layout (Requirement 12.5)', () => {
    it('should render mobile card layout by default', () => {
      const { container } = render(<SkeletonTable rows={3} />);
      const mobileCards = container.querySelectorAll('.md\\:hidden .bg-background-secondary');

      expect(mobileCards).toHaveLength(3);
    });

    it('should not render mobile cards when mobileCardLayout is false', () => {
      const { container } = render(<SkeletonTable rows={3} mobileCardLayout={false} />);
      const mobileSection = container.querySelector('.md\\:hidden');

      expect(mobileSection).not.toBeInTheDocument();
    });

    it('should render mobile cards with proper structure', () => {
      const { container } = render(<SkeletonTable rows={2} />);
      const firstCard = container.querySelector('.md\\:hidden .bg-background-secondary');

      expect(firstCard).toHaveClass('border');
      expect(firstCard).toHaveClass('border-border-light');
      expect(firstCard).toHaveClass('rounded-lg');
      expect(firstCard).toHaveClass('p-4');
    });

    it('should hide desktop table on mobile when mobileCardLayout is true', () => {
      const { container } = render(<SkeletonTable />);
      const desktopTable = container.querySelector('.overflow-x-auto');

      expect(desktopTable).toHaveClass('hidden');
      expect(desktopTable).toHaveClass('md:block');
    });
  });

  describe('Desktop Table Layout', () => {
    it('should render table with overflow-x-auto for horizontal scrolling', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const tableWrapper = container.querySelector('.overflow-x-auto');

      expect(tableWrapper).toBeInTheDocument();
    });

    it('should render table with full width', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const table = container.querySelector('table');

      expect(table).toHaveClass('w-full');
      expect(table).toHaveClass('border-collapse');
    });

    it('should render rows with border styling', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const rows = container.querySelectorAll('tbody tr');

      rows.forEach((row) => {
        expect(row).toHaveClass('border-b');
        expect(row).toHaveClass('border-border-light');
      });
    });

    it('should render cells with proper padding', () => {
      const { container } = render(<SkeletonTable mobileCardLayout={false} />);
      const firstCell = container.querySelector('tbody td');

      expect(firstCell).toHaveClass('px-4');
      expect(firstCell).toHaveClass('py-3');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SkeletonTable className="custom-table-class" />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('custom-table-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(<SkeletonTable />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveAttribute('role', 'status');
      expect(wrapper).toHaveAttribute('aria-busy', 'true');
    });
  });
});

describe('SkeletonTableWithPagination Component', () => {
  describe('Basic Rendering (Requirement 12.1)', () => {
    it('should render table and pagination by default', () => {
      const { container } = render(<SkeletonTableWithPagination mobileCardLayout={false} />);

      const table = container.querySelector('table');
      const pagination = container.querySelector('.border-t');

      expect(table).toBeInTheDocument();
      expect(pagination).toBeInTheDocument();
    });

    it('should not render pagination when showPagination is false', () => {
      const { container } = render(
        <SkeletonTableWithPagination showPagination={false} mobileCardLayout={false} />
      );

      const pagination = container.querySelector('.border-t');
      expect(pagination).not.toBeInTheDocument();
    });
  });

  describe('Pagination Structure (Requirement 12.5)', () => {
    it('should render pagination with proper layout', () => {
      const { container } = render(<SkeletonTableWithPagination mobileCardLayout={false} />);
      const pagination = container.querySelector('.border-t');

      expect(pagination).toHaveClass('flex');
      expect(pagination).toHaveClass('items-center');
      expect(pagination).toHaveClass('justify-between');
      expect(pagination).toHaveClass('px-4');
      expect(pagination).toHaveClass('py-3');
    });

    it('should render pagination info skeleton', () => {
      const { container } = render(<SkeletonTableWithPagination mobileCardLayout={false} />);
      const paginationInfo = container.querySelector('.border-t .h-4.w-32');

      expect(paginationInfo).toBeInTheDocument();
    });

    it('should render pagination button skeletons', () => {
      const { container } = render(<SkeletonTableWithPagination mobileCardLayout={false} />);
      const paginationButtons = container.querySelectorAll('.border-t .h-8.w-8');

      expect(paginationButtons).toHaveLength(4);
    });

    it('should have pulsing animation on pagination elements (Requirement 12.6)', () => {
      const { container } = render(<SkeletonTableWithPagination mobileCardLayout={false} />);
      const pagination = container.querySelector('.border-t');
      const skeletons = pagination?.querySelectorAll('.animate-pulse');

      expect(skeletons && skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Table Props Propagation', () => {
    it('should pass table props to SkeletonTable', () => {
      const { container } = render(
        <SkeletonTableWithPagination
          rows={8}
          columns={6}
          showHeader={false}
          showSelection
          mobileCardLayout={false}
        />
      );

      // Check rows
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(8);

      // Check columns (6 data + 1 selection)
      const firstRow = container.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');
      expect(cells).toHaveLength(7);

      // Check header is not shown
      const header = container.querySelector('thead');
      expect(header).not.toBeInTheDocument();
    });
  });

  describe('Spacing', () => {
    it('should have proper spacing between table and pagination', () => {
      const { container } = render(<SkeletonTableWithPagination mobileCardLayout={false} />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('space-y-4');
    });
  });
});

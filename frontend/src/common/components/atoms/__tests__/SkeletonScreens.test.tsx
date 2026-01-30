/**
 * Tests for Skeleton Screen Components
 *
 * Validates:
 * - Requirements 12.1: Use skeleton screens for content loading
 * - Requirements 12.5: Match the shape of the content being loaded
 * - Requirements 12.6: Use subtle pulsing animation for skeletons
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonList,
  SkeletonGrid,
  SkeletonDashboard,
} from '../SkeletonScreens';

describe('SkeletonCard', () => {
  it('should render basic card skeleton', () => {
    const { container } = render(<SkeletonCard />);
    
    // Should have card structure
    expect(container.querySelector('.bg-background-secondary')).toBeInTheDocument();
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    
    // Should have pulsing animation
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    
    // Should have accessibility attributes
    expect(screen.getByLabelText('Loading card content')).toBeInTheDocument();
  });

  it('should render header when hasHeader is true', () => {
    const { container } = render(<SkeletonCard hasHeader />);
    
    // Should have header section with border
    const header = container.querySelector('.border-b');
    expect(header).toBeInTheDocument();
  });

  it('should render footer when hasFooter is true', () => {
    const { container } = render(<SkeletonCard hasFooter />);
    
    // Should have footer section with border
    const footer = container.querySelector('.border-t');
    expect(footer).toBeInTheDocument();
  });

  it('should render custom number of content lines', () => {
    const { container } = render(<SkeletonCard contentLines={5} />);
    
    // Should have 5 skeleton lines in content
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it('should apply custom padding', () => {
    const { container } = render(<SkeletonCard padding="lg" />);
    
    // Should have large padding
    expect(container.querySelector('.p-8')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonCard className="custom-class" />);
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('SkeletonTable', () => {
  it('should render basic table skeleton', () => {
    const { container } = render(<SkeletonTable />);
    
    // Should have table structure
    expect(container.querySelector('table')).toBeInTheDocument();
    
    // Should have pulsing animation
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    
    // Should have accessibility attributes
    expect(screen.getByLabelText('Loading table content')).toBeInTheDocument();
  });

  it('should render header row when showHeader is true', () => {
    const { container } = render(<SkeletonTable showHeader />);
    
    // Should have thead element
    expect(container.querySelector('thead')).toBeInTheDocument();
  });

  it('should not render header row when showHeader is false', () => {
    const { container } = render(<SkeletonTable showHeader={false} />);
    
    // Should not have thead element
    expect(container.querySelector('thead')).not.toBeInTheDocument();
  });

  it('should render correct number of rows', () => {
    const { container } = render(<SkeletonTable rows={7} showHeader={false} />);
    
    // Should have 7 body rows
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(7);
  });

  it('should render correct number of columns', () => {
    const { container } = render(<SkeletonTable columns={5} showHeader />);
    
    // Should have 5 header columns
    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells).toHaveLength(5);
  });

  it('should render selection column when showSelection is true', () => {
    const { container } = render(<SkeletonTable showSelection />);
    
    // Should have extra column for selection
    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells.length).toBeGreaterThan(4); // Default 4 + 1 selection
  });

  it('should render actions column when showActions is true', () => {
    const { container } = render(<SkeletonTable showActions />);
    
    // Should have extra column for actions
    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells.length).toBeGreaterThan(4); // Default 4 + 1 actions
  });

  it('should apply alternating row colors', () => {
    const { container } = render(<SkeletonTable rows={4} showHeader={false} />);
    
    const rows = container.querySelectorAll('tbody tr');
    
    // Even rows should have secondary background
    expect(rows[0]).toHaveClass('bg-background-secondary');
    
    // Odd rows should have primary background
    expect(rows[1]).toHaveClass('bg-background-primary');
  });
});

describe('SkeletonForm', () => {
  it('should render basic form skeleton', () => {
    const { container } = render(<SkeletonForm />);
    
    // Should have pulsing animation
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    
    // Should have accessibility attributes
    expect(screen.getByLabelText('Loading form content')).toBeInTheDocument();
  });

  it('should render correct number of fields', () => {
    const { container } = render(<SkeletonForm fields={5} />);
    
    // Should have 5 field groups
    const fields = container.querySelectorAll('[class*="space-y-6"] > div');
    // Subtract 1 for the button container
    expect(fields.length).toBeGreaterThanOrEqual(5);
  });

  it('should render submit button when hasSubmitButton is true', () => {
    const { container } = render(<SkeletonForm hasSubmitButton />);
    
    // Should have button area
    const buttonArea = container.querySelector('.border-t');
    expect(buttonArea).toBeInTheDocument();
  });

  it('should render cancel button when hasCancelButton is true', () => {
    const { container } = render(<SkeletonForm hasCancelButton />);
    
    // Should have button area with multiple buttons
    const buttonArea = container.querySelector('.border-t');
    expect(buttonArea).toBeInTheDocument();
  });

  it('should render vertical layout by default', () => {
    const { container } = render(<SkeletonForm fields={2} />);
    
    // Should not have horizontal layout classes
    expect(container.querySelector('.flex.items-center.gap-4')).not.toBeInTheDocument();
  });

  it('should render horizontal layout when specified', () => {
    const { container } = render(<SkeletonForm fields={2} layout="horizontal" />);
    
    // Should have horizontal layout classes
    expect(container.querySelector('.flex.items-center.gap-4')).toBeInTheDocument();
  });
});

describe('SkeletonList', () => {
  it('should render basic list skeleton', () => {
    const { container } = render(<SkeletonList />);
    
    // Should have pulsing animation
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    
    // Should have accessibility attributes
    expect(screen.getByLabelText('Loading list content')).toBeInTheDocument();
  });

  it('should render correct number of items', () => {
    const { container } = render(<SkeletonList items={7} />);
    
    // Should have 7 list items
    const items = container.querySelectorAll('.space-y-3 > div');
    expect(items).toHaveLength(7);
  });

  it('should render avatar when showAvatar is true', () => {
    const { container } = render(<SkeletonList showAvatar />);
    
    // Should have circular avatar skeleton
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
  });

  it('should not render avatar when showAvatar is false', () => {
    const { container } = render(<SkeletonList showAvatar={false} />);
    
    // Should not have circular avatar skeleton
    expect(container.querySelector('.rounded-full')).not.toBeInTheDocument();
  });

  it('should render secondary text when showSecondaryText is true', () => {
    const { container } = render(<SkeletonList items={1} showSecondaryText />);
    
    // Should have multiple skeleton lines per item
    const firstItem = container.querySelector('.space-y-3 > div');
    const skeletons = firstItem?.querySelectorAll('.animate-pulse');
    expect(skeletons && skeletons.length).toBeGreaterThan(2); // Avatar + primary + secondary
  });

  it('should render action button when showAction is true', () => {
    const { container } = render(<SkeletonList items={1} showAction />);
    
    // Should have action button skeleton
    const firstItem = container.querySelector('.space-y-3 > div');
    const actionButton = firstItem?.querySelector('.flex-shrink-0:last-child');
    expect(actionButton).toBeInTheDocument();
  });
});

describe('SkeletonGrid', () => {
  it('should render basic grid skeleton', () => {
    const { container } = render(<SkeletonGrid />);
    
    // Should have grid structure
    expect(container.querySelector('.grid')).toBeInTheDocument();
    
    // Should have pulsing animation
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    
    // Should have accessibility attributes
    expect(screen.getByLabelText('Loading grid content')).toBeInTheDocument();
  });

  it('should render correct number of items', () => {
    const { container } = render(<SkeletonGrid items={8} />);
    
    // Should have 8 grid items
    const items = container.querySelectorAll('.grid > div');
    expect(items).toHaveLength(8);
  });

  it('should render images when hasImage is true', () => {
    const { container } = render(<SkeletonGrid items={2} hasImage />);
    
    // Should have image skeletons
    const items = container.querySelectorAll('.grid > div');
    items.forEach((item) => {
      expect(item.querySelector('.h-48')).toBeInTheDocument();
    });
  });

  it('should not render images when hasImage is false', () => {
    const { container } = render(<SkeletonGrid items={2} hasImage={false} />);
    
    // Should not have image skeletons
    const items = container.querySelectorAll('.grid > div');
    items.forEach((item) => {
      expect(item.querySelector('.h-48')).not.toBeInTheDocument();
    });
  });

  it('should apply correct column classes', () => {
    const { container: container2 } = render(<SkeletonGrid columns={2} />);
    expect(container2.querySelector('.sm\\:grid-cols-2')).toBeInTheDocument();

    const { container: container3 } = render(<SkeletonGrid columns={3} />);
    expect(container3.querySelector('.lg\\:grid-cols-3')).toBeInTheDocument();

    const { container: container4 } = render(<SkeletonGrid columns={4} />);
    expect(container4.querySelector('.lg\\:grid-cols-4')).toBeInTheDocument();
  });
});

describe('SkeletonDashboard', () => {
  it('should render basic dashboard skeleton', () => {
    const { container } = render(<SkeletonDashboard />);
    
    // Should have pulsing animation
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    
    // Should have accessibility attributes (check for the main container)
    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('should render header when showHeader is true', () => {
    const { container } = render(<SkeletonDashboard showHeader />);
    
    // Should have header with title and action
    const header = container.querySelector('.flex.items-center.justify-between');
    expect(header).toBeInTheDocument();
  });

  it('should not render header when showHeader is false', () => {
    const { container } = render(<SkeletonDashboard showHeader={false} />);
    
    // Should not have header
    const header = container.querySelector('.flex.items-center.justify-between');
    expect(header).not.toBeInTheDocument();
  });

  it('should render correct number of stat cards', () => {
    const { container } = render(<SkeletonDashboard statCards={6} />);
    
    // Should have 6 stat cards
    const statCards = container.querySelectorAll('.grid > div');
    expect(statCards).toHaveLength(6);
  });

  it('should render chart area when showChart is true', () => {
    const { container } = render(<SkeletonDashboard showChart />);
    
    // Should have chart skeleton
    expect(container.querySelector('.h-64')).toBeInTheDocument();
  });

  it('should not render chart area when showChart is false', () => {
    const { container } = render(<SkeletonDashboard showChart={false} />);
    
    // Should not have chart skeleton
    expect(container.querySelector('.h-64')).not.toBeInTheDocument();
  });

  it('should apply responsive grid classes for stat cards', () => {
    const { container } = render(<SkeletonDashboard />);
    
    // Should have responsive grid
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });
});

describe('Pulsing Animation', () => {
  it('should apply pulsing animation to all skeleton components', () => {
    const { container: cardContainer } = render(<SkeletonCard />);
    expect(cardContainer.querySelector('.animate-pulse')).toBeInTheDocument();

    const { container: tableContainer } = render(<SkeletonTable />);
    expect(tableContainer.querySelector('.animate-pulse')).toBeInTheDocument();

    const { container: formContainer } = render(<SkeletonForm />);
    expect(formContainer.querySelector('.animate-pulse')).toBeInTheDocument();

    const { container: listContainer } = render(<SkeletonList />);
    expect(listContainer.querySelector('.animate-pulse')).toBeInTheDocument();

    const { container: gridContainer } = render(<SkeletonGrid />);
    expect(gridContainer.querySelector('.animate-pulse')).toBeInTheDocument();

    const { container: dashboardContainer } = render(<SkeletonDashboard />);
    expect(dashboardContainer.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('should have proper ARIA attributes on all skeleton components', () => {
    const { unmount: unmount1 } = render(<SkeletonCard />);
    expect(screen.getByLabelText('Loading card content')).toBeInTheDocument();
    unmount1();

    const { unmount: unmount2 } = render(<SkeletonTable />);
    expect(screen.getByLabelText('Loading table content')).toBeInTheDocument();
    unmount2();

    const { unmount: unmount3 } = render(<SkeletonForm />);
    expect(screen.getByLabelText('Loading form content')).toBeInTheDocument();
    unmount3();

    const { unmount: unmount4 } = render(<SkeletonList />);
    expect(screen.getByLabelText('Loading list content')).toBeInTheDocument();
    unmount4();

    const { unmount: unmount5 } = render(<SkeletonGrid />);
    expect(screen.getByLabelText('Loading grid content')).toBeInTheDocument();
    unmount5();
  });

  it('should have aria-busy attribute', () => {
    const { container } = render(<SkeletonCard />);
    const statusElement = container.querySelector('[role="status"]');
    expect(statusElement).toHaveAttribute('aria-busy', 'true');
  });
});

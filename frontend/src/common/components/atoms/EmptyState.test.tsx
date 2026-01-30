import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Package, Search, AlertCircle, Plus } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('Basic Rendering', () => {
    it('should render icon, heading, and description', () => {
      render(
        <EmptyState
          icon={Package}
          heading="No products found"
          description="Get started by adding your first product."
        />
      );

      // Requirement 13.2: Include a clear heading
      expect(screen.getByRole('heading', { name: 'No products found' })).toBeInTheDocument();
      
      // Requirement 13.3: Provide helpful description text
      expect(screen.getByText('Get started by adding your first product.')).toBeInTheDocument();
      
      // Requirement 13.1: Display a relevant icon (icon is rendered with aria-hidden)
      const container = screen.getByRole('status');
      expect(container).toBeInTheDocument();
    });

    it('should render without action button when not provided', () => {
      render(
        <EmptyState
          icon={Search}
          heading="No results"
          description="Try adjusting your search criteria."
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render with action button when provided', () => {
      const handleClick = vi.fn();
      
      render(
        <EmptyState
          icon={Package}
          heading="No products found"
          description="Get started by adding your first product."
          action={{
            label: 'Add Product',
            onClick: handleClick,
          }}
        />
      );

      // Requirement 13.4: Offer a primary action button when applicable
      const button = screen.getByRole('button', { name: 'Add Product' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render default variant with muted colors', () => {
      const { container } = render(
        <EmptyState
          variant="default"
          icon={Package}
          heading="No data"
          description="No data available."
        />
      );

      // Requirement 13.5: Use muted colors
      // The Icon component wraps the SVG, so we check the wrapper div
      const iconWrapper = container.querySelector('.mb-4');
      expect(iconWrapper).toBeInTheDocument();
      const svg = iconWrapper?.querySelector('svg');
      expect(svg).toHaveClass('text-text-tertiary');
    });

    it('should render no-results variant', () => {
      const { container } = render(
        <EmptyState
          variant="no-results"
          icon={Search}
          heading="No results found"
          description="Try adjusting your search."
        />
      );

      const iconWrapper = container.querySelector('.mb-4');
      const svg = iconWrapper?.querySelector('svg');
      expect(svg).toHaveClass('text-text-tertiary');
    });

    it('should render error variant with error color', () => {
      const { container } = render(
        <EmptyState
          variant="error"
          icon={AlertCircle}
          heading="Failed to load"
          description="An error occurred."
        />
      );

      // Error variant should use error color
      const iconWrapper = container.querySelector('.mb-4');
      const svg = iconWrapper?.querySelector('svg');
      expect(svg).toHaveClass('text-error-DEFAULT');
    });
  });

  describe('Action Button', () => {
    it('should call onClick when action button is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(
        <EmptyState
          icon={Package}
          heading="No products"
          description="Add your first product."
          action={{
            label: 'Add Product',
            onClick: handleClick,
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Add Product' });
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render action button with custom variant', () => {
      render(
        <EmptyState
          icon={AlertCircle}
          heading="Error"
          description="Something went wrong."
          action={{
            label: 'Retry',
            onClick: vi.fn(),
            variant: 'secondary',
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Retry' });
      expect(button).toBeInTheDocument();
    });

    it('should render action button with left icon', () => {
      render(
        <EmptyState
          icon={Package}
          heading="No products"
          description="Add your first product."
          action={{
            label: 'Add Product',
            onClick: vi.fn(),
            leftIcon: <Plus data-testid="plus-icon" />,
          }}
        />
      );

      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should center content vertically and horizontally', () => {
      const { container } = render(
        <EmptyState
          icon={Package}
          heading="No data"
          description="No data available."
        />
      );

      // Requirement 13.6: Center content vertically and horizontally
      const emptyStateDiv = container.firstChild as HTMLElement;
      expect(emptyStateDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should adapt to container size responsively', () => {
      const { container } = render(
        <EmptyState
          icon={Package}
          heading="No data"
          description="No data available."
        />
      );

      // Requirement 13.7: Adapt to container size responsively
      const emptyStateDiv = container.firstChild as HTMLElement;
      expect(emptyStateDiv).toHaveClass('min-h-[300px]', 'p-8');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <EmptyState
          icon={Package}
          heading="No data"
          description="No data available."
          className="custom-class"
        />
      );

      const emptyStateDiv = container.firstChild as HTMLElement;
      expect(emptyStateDiv).toHaveClass('custom-class');
    });

    it('should have proper text alignment', () => {
      const { container } = render(
        <EmptyState
          icon={Package}
          heading="No data"
          description="No data available."
        />
      );

      const emptyStateDiv = container.firstChild as HTMLElement;
      expect(emptyStateDiv).toHaveClass('text-center');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" for screen readers', () => {
      render(
        <EmptyState
          icon={Package}
          heading="No data"
          description="No data available."
        />
      );

      const container = screen.getByRole('status');
      expect(container).toBeInTheDocument();
    });

    it('should have aria-live="polite" for screen reader announcements', () => {
      render(
        <EmptyState
          icon={Package}
          heading="No data"
          description="No data available."
        />
      );

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('should hide icon from screen readers', () => {
      const { container } = render(
        <EmptyState
          icon={Package}
          heading="No data"
          description="No data available."
        />
      );

      const iconElement = container.querySelector('svg');
      expect(iconElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Content Variations', () => {
    it('should handle long descriptions gracefully', () => {
      const longDescription = 'This is a very long description that should wrap properly and maintain good readability even when it spans multiple lines. The component should handle this gracefully with proper text wrapping and spacing.';
      
      render(
        <EmptyState
          icon={Package}
          heading="No data"
          description={longDescription}
        />
      );

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should handle short headings', () => {
      render(
        <EmptyState
          icon={Package}
          heading="Empty"
          description="No data available."
        />
      );

      expect(screen.getByRole('heading', { name: 'Empty' })).toBeInTheDocument();
    });

    it('should handle long headings', () => {
      const longHeading = 'This is a very long heading that might wrap';
      
      render(
        <EmptyState
          icon={Package}
          heading={longHeading}
          description="Description text."
        />
      );

      expect(screen.getByRole('heading', { name: longHeading })).toBeInTheDocument();
    });
  });
});

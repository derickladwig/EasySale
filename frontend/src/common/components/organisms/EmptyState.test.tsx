import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { Package } from 'lucide-react';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('should render the empty state', () => {
      const { container } = render(<EmptyState title="No items" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<EmptyState title="No items found" />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(<EmptyState title="No items" description="Get started by adding your first item" />);
      expect(screen.getByText('Get started by adding your first item')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const { container } = render(<EmptyState title="No items" />);
      const descriptions = container.querySelectorAll('p');
      expect(descriptions.length).toBe(0);
    });

    it('should render icon', () => {
      const { container } = render(<EmptyState title="No items" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { container } = render(<EmptyState variant="default" title="No items" />);
      expect(container.querySelector('.text-text-tertiary')).toBeInTheDocument();
    });

    it('should render search variant', () => {
      const { container } = render(<EmptyState variant="search" title="No results" />);
      expect(container.querySelector('.text-text-tertiary')).toBeInTheDocument();
    });

    it('should render error variant', () => {
      const { container } = render(<EmptyState variant="error" title="Error occurred" />);
      expect(container.querySelector('.text-error-500')).toBeInTheDocument();
    });
  });

  describe('Custom Icon', () => {
    it('should render custom icon when provided', () => {
      const { container } = render(<EmptyState title="No items" icon={Package} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should use custom icon over variant icon', () => {
      const { container } = render(<EmptyState variant="error" title="No items" icon={Package} />);
      // Should still have error color but custom icon
      expect(container.querySelector('.text-error-500')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('should not render action button by default', () => {
      render(<EmptyState title="No items" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render action button when actionText is provided', () => {
      render(<EmptyState title="No items" actionText="Add Item" onAction={vi.fn()} />);
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('should call onAction when button is clicked', () => {
      const handleAction = vi.fn();
      render(<EmptyState title="No items" actionText="Add Item" onAction={handleAction} />);

      const button = screen.getByText('Add Item');
      button.click();

      expect(handleAction).toHaveBeenCalled();
    });

    it('should not render button if actionText is provided but onAction is not', () => {
      render(<EmptyState title="No items" actionText="Add Item" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not render button if onAction is provided but actionText is not', () => {
      render(<EmptyState title="No items" onAction={vi.fn()} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should be centered', () => {
      const { container } = render(<EmptyState title="No items" />);
      const emptyState = container.firstChild as HTMLElement;
      expect(emptyState).toHaveClass('flex');
      expect(emptyState).toHaveClass('items-center');
      expect(emptyState).toHaveClass('justify-center');
    });

    it('should have text-center', () => {
      const { container } = render(<EmptyState title="No items" />);
      const emptyState = container.firstChild as HTMLElement;
      expect(emptyState).toHaveClass('text-center');
    });

    it('should have min height', () => {
      const { container } = render(<EmptyState title="No items" />);
      const emptyState = container.firstChild as HTMLElement;
      expect(emptyState).toHaveClass('min-h-[300px]');
    });

    it('should have padding', () => {
      const { container } = render(<EmptyState title="No items" />);
      const emptyState = container.firstChild as HTMLElement;
      expect(emptyState).toHaveClass('p-8');
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(<EmptyState title="No items" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Complex Scenarios', () => {
    it('should render complete empty state with all features', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          variant="default"
          title="No customers yet"
          description="Start by adding your first customer to get started"
          actionText="Add Customer"
          onAction={handleAction}
          icon={Package}
        />
      );

      expect(screen.getByText('No customers yet')).toBeInTheDocument();
      expect(
        screen.getByText('Start by adding your first customer to get started')
      ).toBeInTheDocument();
      expect(screen.getByText('Add Customer')).toBeInTheDocument();
    });

    it('should work with search no results', () => {
      render(
        <EmptyState
          variant="search"
          title="No results found"
          description="Try adjusting your search terms or filters"
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument();
    });

    it('should work with error state', () => {
      const handleRetry = vi.fn();
      render(
        <EmptyState
          variant="error"
          title="Failed to load data"
          description="An error occurred while loading the data"
          actionText="Retry"
          onAction={handleRetry}
        />
      );

      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByText('An error occurred while loading the data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle long text content', () => {
      const longTitle =
        'This is a very long title that might wrap to multiple lines in the empty state';
      const longDescription =
        'This is a very long description that contains a lot of text and might wrap to multiple lines in the empty state component to provide detailed information to the user';

      render(<EmptyState title={longTitle} description={longDescription} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should work in different contexts', () => {
      const { rerender } = render(
        <EmptyState title="No products" description="Add your first product" />
      );
      expect(screen.getByText('No products')).toBeInTheDocument();

      rerender(<EmptyState title="No orders" description="No orders have been placed yet" />);
      expect(screen.getByText('No orders')).toBeInTheDocument();

      rerender(
        <EmptyState variant="search" title="No matches" description="Try a different search" />
      );
      expect(screen.getByText('No matches')).toBeInTheDocument();
    });
  });
});

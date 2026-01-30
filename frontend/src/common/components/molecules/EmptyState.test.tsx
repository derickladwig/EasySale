import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('renders with title only', () => {
      render(<EmptyState title="No items found" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders with title and description', () => {
      render(
        <EmptyState
          title="No inventory found"
          description="Start by scanning items to receive or import your inventory"
        />
      );
      expect(screen.getByText('No inventory found')).toBeInTheDocument();
      expect(screen.getByText(/Start by scanning items/)).toBeInTheDocument();
    });

    it('renders with icon', () => {
      render(<EmptyState title="No items" icon={<span data-testid="custom-icon">📦</span>} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('renders without icon when not provided', () => {
      render(<EmptyState title="No items" />);
      expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument();
    });
  });

  describe('Primary Action', () => {
    it('renders primary action button', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState title="No items" primaryAction={{ label: 'Add Item', onClick: handleClick }} />
      );
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });

    it('calls onClick when primary action is clicked', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState title="No items" primaryAction={{ label: 'Add Item', onClick: handleClick }} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders primary action with icon', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          title="No items"
          primaryAction={{
            label: 'Add Item',
            onClick: handleClick,
            icon: <span data-testid="action-icon">+</span>,
          }}
        />
      );
      expect(screen.getByTestId('action-icon')).toBeInTheDocument();
    });

    it('does not render primary action button when not provided', () => {
      render(<EmptyState title="No items" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Secondary Action', () => {
    it('renders secondary action button', () => {
      const handlePrimary = vi.fn();
      const handleSecondary = vi.fn();
      render(
        <EmptyState
          title="No items"
          primaryAction={{ label: 'Add Item', onClick: handlePrimary }}
          secondaryAction={{ label: 'Import Items', onClick: handleSecondary }}
        />
      );
      expect(screen.getByRole('button', { name: 'Import Items' })).toBeInTheDocument();
    });

    it('calls onClick when secondary action is clicked', () => {
      const handlePrimary = vi.fn();
      const handleSecondary = vi.fn();
      render(
        <EmptyState
          title="No items"
          primaryAction={{ label: 'Add Item', onClick: handlePrimary }}
          secondaryAction={{ label: 'Import Items', onClick: handleSecondary }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Import Items' }));
      expect(handleSecondary).toHaveBeenCalledTimes(1);
      expect(handlePrimary).not.toHaveBeenCalled();
    });

    it('renders secondary action with icon', () => {
      const handlePrimary = vi.fn();
      const handleSecondary = vi.fn();
      render(
        <EmptyState
          title="No items"
          primaryAction={{ label: 'Add Item', onClick: handlePrimary }}
          secondaryAction={{
            label: 'Import Items',
            onClick: handleSecondary,
            icon: <span data-testid="secondary-icon">↓</span>,
          }}
        />
      );
      expect(screen.getByTestId('secondary-icon')).toBeInTheDocument();
    });

    it('renders both primary and secondary actions', () => {
      const handlePrimary = vi.fn();
      const handleSecondary = vi.fn();
      render(
        <EmptyState
          title="No items"
          primaryAction={{ label: 'Add Item', onClick: handlePrimary }}
          secondaryAction={{ label: 'Import Items', onClick: handleSecondary }}
        />
      );
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import Items' })).toBeInTheDocument();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('is focusable when primary action is provided', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState title="No items" primaryAction={{ label: 'Add Item', onClick: handleClick }} />
      );
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('tabIndex', '0');
    });

    it('is not focusable when no primary action is provided', () => {
      render(<EmptyState title="No items" />);
      const container = screen.getByRole('status');
      expect(container).not.toHaveAttribute('tabIndex');
    });

    it('triggers primary action on Enter key press', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState title="No items" primaryAction={{ label: 'Add Item', onClick: handleClick }} />
      );

      const container = screen.getByRole('status');
      fireEvent.keyDown(container, { key: 'Enter', code: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger action on other key presses', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState title="No items" primaryAction={{ label: 'Add Item', onClick: handleClick }} />
      );

      const container = screen.getByRole('status');
      fireEvent.keyDown(container, { key: 'Space', code: 'Space' });
      fireEvent.keyDown(container, { key: 'Escape', code: 'Escape' });
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not trigger action on Enter when no primary action', () => {
      render(<EmptyState title="No items" />);

      const container = screen.getByRole('status');
      // Should not throw error
      fireEvent.keyDown(container, { key: 'Enter', code: 'Enter' });
    });
  });

  describe('Accessibility', () => {
    it('has role="status"', () => {
      render(<EmptyState title="No items" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      render(<EmptyState title="No items" />);
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('icon has aria-hidden="true"', () => {
      render(<EmptyState title="No items" icon={<span data-testid="icon">📦</span>} />);
      const iconContainer = screen.getByTestId('icon').parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<EmptyState title="No items" className="custom-class" />);
      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<EmptyState ref={ref} title="No items" />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Complete Examples', () => {
    it('renders complete empty state with all props', () => {
      const handlePrimary = vi.fn();
      const handleSecondary = vi.fn();

      render(
        <EmptyState
          title="No customers found"
          description="Create your first customer to get started"
          icon={<span data-testid="icon">👥</span>}
          primaryAction={{
            label: 'Create customer',
            onClick: handlePrimary,
            icon: <span data-testid="primary-icon">+</span>,
          }}
          secondaryAction={{
            label: 'Import customers',
            onClick: handleSecondary,
            icon: <span data-testid="secondary-icon">↓</span>,
          }}
          className="custom-empty-state"
        />
      );

      // Verify all elements are rendered
      expect(screen.getByText('No customers found')).toBeInTheDocument();
      expect(screen.getByText(/Create your first customer/)).toBeInTheDocument();
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create customer/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Import customers/ })).toBeInTheDocument();
      expect(screen.getByTestId('primary-icon')).toBeInTheDocument();
      expect(screen.getByTestId('secondary-icon')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('custom-empty-state');

      // Verify interactions work
      fireEvent.click(screen.getByRole('button', { name: /Create customer/ }));
      expect(handlePrimary).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Import customers/ }));
      expect(handleSecondary).toHaveBeenCalledTimes(1);

      // Verify keyboard accessibility
      const container = screen.getByRole('status');
      fireEvent.keyDown(container, { key: 'Enter', code: 'Enter' });
      expect(handlePrimary).toHaveBeenCalledTimes(2);
    });
  });
});

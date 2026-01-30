import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyDetailPane } from './EmptyDetailPane';

describe('EmptyDetailPane', () => {
  describe('Rendering', () => {
    it('renders with message only', () => {
      render(<EmptyDetailPane message="Select a customer to view details" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Select a customer to view details')).toBeInTheDocument();
    });

    it('renders with message and shortcuts', () => {
      render(
        <EmptyDetailPane
          message="Select a product from the list"
          shortcuts={[
            { key: 'F3', description: 'Search products' },
            { key: 'Ctrl+N', description: 'Create new product' },
          ]}
        />
      );
      expect(screen.getByText('Select a product from the list')).toBeInTheDocument();
      expect(screen.getByText('Search products')).toBeInTheDocument();
      expect(screen.getByText('Create new product')).toBeInTheDocument();
    });

    it('renders without shortcuts section when shortcuts array is empty', () => {
      render(<EmptyDetailPane message="Select an item" shortcuts={[]} />);
      expect(screen.getByText('Select an item')).toBeInTheDocument();
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('renders without shortcuts section when shortcuts is undefined', () => {
      render(<EmptyDetailPane message="Select an item" />);
      expect(screen.getByText('Select an item')).toBeInTheDocument();
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('renders keyboard shortcuts heading', () => {
      render(
        <EmptyDetailPane
          message="Select an item"
          shortcuts={[{ key: 'F3', description: 'Search' }]}
        />
      );
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('renders all shortcuts with keys and descriptions', () => {
      const shortcuts = [
        { key: 'F3', description: 'Search products' },
        { key: 'Ctrl+N', description: 'Create new product' },
        { key: '↑↓', description: 'Navigate list' },
      ];

      render(<EmptyDetailPane message="Select an item" shortcuts={shortcuts} />);

      shortcuts.forEach((shortcut) => {
        expect(screen.getByText(shortcut.description)).toBeInTheDocument();
        expect(screen.getByText(shortcut.key)).toBeInTheDocument();
      });
    });

    it('renders kbd elements for keyboard keys', () => {
      render(
        <EmptyDetailPane
          message="Select an item"
          shortcuts={[{ key: 'F3', description: 'Search' }]}
        />
      );

      const kbdElement = screen.getByText('F3');
      expect(kbdElement.tagName).toBe('KBD');
    });

    it('kbd elements have proper aria-label', () => {
      render(
        <EmptyDetailPane
          message="Select an item"
          shortcuts={[{ key: 'Ctrl+N', description: 'Create new' }]}
        />
      );

      const kbdElement = screen.getByText('Ctrl+N');
      expect(kbdElement).toHaveAttribute('aria-label', 'Press Ctrl+N');
    });
  });

  describe('Accessibility', () => {
    it('has role="status"', () => {
      render(<EmptyDetailPane message="Select an item" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      render(<EmptyDetailPane message="Select an item" />);
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('keyboard shortcuts have proper aria-labels', () => {
      render(
        <EmptyDetailPane
          message="Select an item"
          shortcuts={[
            { key: 'F3', description: 'Search' },
            { key: 'Enter', description: 'Select' },
          ]}
        />
      );

      expect(screen.getByLabelText('Press F3')).toBeInTheDocument();
      expect(screen.getByLabelText('Press Enter')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<EmptyDetailPane message="Select an item" className="custom-class" />);
      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<EmptyDetailPane ref={ref} message="Select an item" />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies default bg-surface-base class', () => {
      render(<EmptyDetailPane message="Select an item" />);
      const container = screen.getByRole('status');
      expect(container).toHaveClass('bg-surface-base');
    });
  });

  describe('Complete Examples', () => {
    it('renders complete detail pane with all props', () => {
      const shortcuts = [
        { key: 'F3', description: 'Search products' },
        { key: 'Ctrl+N', description: 'Create new product' },
        { key: '↑↓', description: 'Navigate list' },
        { key: 'Enter', description: 'Select item' },
      ];

      render(
        <EmptyDetailPane
          message="Select a product to view details"
          shortcuts={shortcuts}
          className="custom-detail-pane"
        />
      );

      // Verify message is rendered
      expect(screen.getByText('Select a product to view details')).toBeInTheDocument();

      // Verify shortcuts heading
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

      // Verify all shortcuts are rendered
      shortcuts.forEach((shortcut) => {
        expect(screen.getByText(shortcut.description)).toBeInTheDocument();
        expect(screen.getByText(shortcut.key)).toBeInTheDocument();
        expect(screen.getByLabelText(`Press ${shortcut.key}`)).toBeInTheDocument();
      });

      // Verify custom class is applied
      expect(screen.getByRole('status')).toHaveClass('custom-detail-pane');

      // Verify accessibility attributes
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('renders for customers page use case', () => {
      render(
        <EmptyDetailPane
          message="Select a customer to view details"
          shortcuts={[
            { key: 'F3', description: 'Search customers' },
            { key: 'Ctrl+N', description: 'Create new customer' },
            { key: '↑↓', description: 'Navigate list' },
          ]}
        />
      );

      expect(screen.getByText('Select a customer to view details')).toBeInTheDocument();
      expect(screen.getByText('Search customers')).toBeInTheDocument();
      expect(screen.getByText('Create new customer')).toBeInTheDocument();
      expect(screen.getByText('Navigate list')).toBeInTheDocument();
    });

    it('renders for lookup page use case', () => {
      render(
        <EmptyDetailPane
          message="Select a product from the list"
          shortcuts={[
            { key: 'F3', description: 'Search products' },
            { key: 'Ctrl+N', description: 'Add new product' },
          ]}
        />
      );

      expect(screen.getByText('Select a product from the list')).toBeInTheDocument();
      expect(screen.getByText('Search products')).toBeInTheDocument();
      expect(screen.getByText('Add new product')).toBeInTheDocument();
    });
  });
});

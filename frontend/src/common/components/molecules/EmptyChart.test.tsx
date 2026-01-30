import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyChart } from './EmptyChart';

describe('EmptyChart', () => {
  describe('Rendering', () => {
    it('renders with message only', () => {
      render(<EmptyChart message="Not enough data to display chart" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Not enough data to display chart')).toBeInTheDocument();
    });

    it('renders with message and context', () => {
      render(
        <EmptyChart
          message="Not enough data to display metrics"
          context="Add transactions to see trends"
        />
      );
      expect(screen.getByText('Not enough data to display metrics')).toBeInTheDocument();
      expect(screen.getByText('Add transactions to see trends')).toBeInTheDocument();
    });

    it('renders without context when not provided', () => {
      render(<EmptyChart message="No data available" />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
      // Context should not be in the document
      expect(screen.queryByText(/Add transactions/)).not.toBeInTheDocument();
    });

    it('renders chart icon', () => {
      const { container } = render(<EmptyChart message="No data" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // The aria-hidden is on the parent div, not the svg itself
      const iconContainer = svg?.parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Accessibility', () => {
    it('has role="status"', () => {
      render(<EmptyChart message="No data" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      render(<EmptyChart message="No data" />);
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('icon container has aria-hidden="true"', () => {
      const { container } = render(<EmptyChart message="No data" />);
      const iconContainer = container.querySelector('svg')?.parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<EmptyChart message="No data" className="custom-chart-class" />);
      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-chart-class');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<EmptyChart ref={ref} message="No data" />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('maintains default styling classes', () => {
      render(<EmptyChart message="No data" />);
      const container = screen.getByRole('status');
      expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
      expect(container).toHaveClass('bg-surface-base', 'rounded-lg', 'border', 'border-border');
    });
  });

  describe('Complete Examples', () => {
    it('renders complete empty chart with all props', () => {
      render(
        <EmptyChart
          message="Not enough data to display chart"
          context="Complete at least 10 transactions to see performance trends"
          className="custom-empty-chart"
        />
      );

      // Verify all elements are rendered
      expect(screen.getByText('Not enough data to display chart')).toBeInTheDocument();
      expect(
        screen.getByText('Complete at least 10 transactions to see performance trends')
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('custom-empty-chart');

      // Verify icon is present
      const container = screen.getByRole('status');
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders in minimal configuration', () => {
      render(<EmptyChart message="No metrics available" />);

      // Verify minimal rendering works
      expect(screen.getByText('No metrics available')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Verify no context is shown
      expect(screen.queryByText(/transactions/)).not.toBeInTheDocument();
    });
  });

  describe('Use Cases', () => {
    it('handles performance metrics empty state', () => {
      render(
        <EmptyChart
          message="Not enough data to display metrics"
          context="Add transactions to see trends"
        />
      );
      expect(screen.getByText('Not enough data to display metrics')).toBeInTheDocument();
      expect(screen.getByText('Add transactions to see trends')).toBeInTheDocument();
    });

    it('handles chart visualization empty state', () => {
      render(<EmptyChart message="Not enough data to display chart" />);
      expect(screen.getByText('Not enough data to display chart')).toBeInTheDocument();
    });

    it('handles error log empty state (positive state)', () => {
      render(<EmptyChart message="No errors logged" context="Your system is running smoothly" />);
      expect(screen.getByText('No errors logged')).toBeInTheDocument();
      expect(screen.getByText('Your system is running smoothly')).toBeInTheDocument();
    });
  });

  describe('Runtime Safety', () => {
    it('renders without errors when message is empty string', () => {
      render(<EmptyChart message="" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders without errors when context is empty string', () => {
      render(<EmptyChart message="No data" context="" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('does not crash with undefined context', () => {
      render(<EmptyChart message="No data" context={undefined} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});

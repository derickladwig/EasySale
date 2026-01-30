import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';
import { Users, DollarSign, ShoppingCart } from 'lucide-react';

describe('StatCard', () => {
  describe('Rendering', () => {
    it('should render the stat card', () => {
      const { container } = render(<StatCard value="1,234" label="Total Sales" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render value', () => {
      render(<StatCard value="1,234" label="Total Sales" />);
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('should render label', () => {
      render(<StatCard value="1,234" label="Total Sales" />);
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
    });

    it('should render numeric value', () => {
      render(<StatCard value={1234} label="Count" />);
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('should render string value', () => {
      render(<StatCard value="$45,231" label="Revenue" />);
      expect(screen.getByText('$45,231')).toBeInTheDocument();
    });
  });

  describe('Icon', () => {
    it('should render icon when provided', () => {
      const { container } = render(<StatCard value="156" label="Users" icon={Users} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should not render icon when not provided', () => {
      const { container } = render(<StatCard value="156" label="Users" />);
      // Should only have trend icons if any, not the main icon
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBe(0);
    });

    it('should render different icons', () => {
      const { rerender, container } = render(<StatCard value="100" label="Users" icon={Users} />);
      expect(container.querySelector('svg')).toBeInTheDocument();

      rerender(<StatCard value="200" label="Revenue" icon={DollarSign} />);
      expect(container.querySelector('svg')).toBeInTheDocument();

      rerender(<StatCard value="300" label="Orders" icon={ShoppingCart} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Trend Indicator', () => {
    it('should show upward trend', () => {
      render(<StatCard value="1,234" label="Sales" trend="up" trendValue="12.5" />);
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
    });

    it('should show downward trend', () => {
      render(<StatCard value="1,234" label="Sales" trend="down" trendValue="5.2" />);
      expect(screen.getByText('-5.2%')).toBeInTheDocument();
    });

    it('should show neutral trend', () => {
      render(<StatCard value="1,234" label="Sales" trend="neutral" trendValue="0" />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show trend comparison text', () => {
      render(<StatCard value="1,234" label="Sales" trend="up" trendValue="12.5" />);
      expect(screen.getByText('vs last period')).toBeInTheDocument();
    });

    it('should not show trend when not provided', () => {
      render(<StatCard value="1,234" label="Sales" />);
      expect(screen.queryByText(/vs last period/)).not.toBeInTheDocument();
    });

    it('should not show trend when trendValue is undefined', () => {
      render(<StatCard value="1,234" label="Sales" trend="up" />);
      expect(screen.queryByText(/vs last period/)).not.toBeInTheDocument();
    });

    it('should handle numeric trend values', () => {
      render(<StatCard value="1,234" label="Sales" trend="up" trendValue={15.7} />);
      expect(screen.getByText('+15.7%')).toBeInTheDocument();
    });
  });

  describe('Trend Colors', () => {
    it('should apply success color for upward trend', () => {
      const { container } = render(
        <StatCard value="1,234" label="Sales" trend="up" trendValue="12.5" />
      );
      const trendElement = screen.getByText('+12.5%').parentElement;
      expect(trendElement).toHaveClass('text-success-500');
    });

    it('should apply error color for downward trend', () => {
      const { container } = render(
        <StatCard value="1,234" label="Sales" trend="down" trendValue="5.2" />
      );
      const trendElement = screen.getByText('-5.2%').parentElement;
      expect(trendElement).toHaveClass('text-error-500');
    });

    it('should apply neutral color for neutral trend', () => {
      const { container } = render(
        <StatCard value="1,234" label="Sales" trend="neutral" trendValue="0" />
      );
      const trendElement = screen.getByText('0%').parentElement;
      expect(trendElement).toHaveClass('text-text-tertiary');
    });
  });

  describe('Variants', () => {
    it('should apply default variant', () => {
      const { container } = render(
        <StatCard value="100" label="Metric" icon={Users} variant="default" />
      );
      const iconContainer = container.querySelector('.text-primary-500');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply success variant', () => {
      const { container } = render(
        <StatCard value="100" label="Metric" icon={Users} variant="success" />
      );
      const iconContainer = container.querySelector('.text-success-500');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply warning variant', () => {
      const { container } = render(
        <StatCard value="100" label="Metric" icon={Users} variant="warning" />
      );
      const iconContainer = container.querySelector('.text-warning-500');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply error variant', () => {
      const { container } = render(
        <StatCard value="100" label="Metric" icon={Users} variant="error" />
      );
      const iconContainer = container.querySelector('.text-error-500');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply info variant', () => {
      const { container } = render(
        <StatCard value="100" label="Metric" icon={Users} variant="info" />
      );
      const iconContainer = container.querySelector('.text-info-500');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Interactive State', () => {
    it('should be interactive when interactive prop is true', () => {
      const { container } = render(<StatCard value="100" label="Metric" interactive />);
      expect(container.querySelector('.cursor-pointer')).toBeInTheDocument();
    });

    it('should be interactive when onClick is provided', () => {
      const { container } = render(<StatCard value="100" label="Metric" onClick={vi.fn()} />);
      expect(container.querySelector('.cursor-pointer')).toBeInTheDocument();
    });

    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<StatCard value="100" label="Metric" onClick={handleClick} />);

      const card = screen.getByRole('button');
      card.click();
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('should have proper text sizing for value', () => {
      const { container } = render(<StatCard value="1,234" label="Sales" />);
      const value = screen.getByText('1,234');
      expect(value).toHaveClass('text-3xl');
      expect(value).toHaveClass('font-bold');
    });

    it('should have proper text sizing for label', () => {
      const { container } = render(<StatCard value="1,234" label="Sales" />);
      const label = screen.getByText('Sales');
      expect(label).toHaveClass('text-sm');
      expect(label).toHaveClass('font-medium');
    });

    it('should use elevated card variant', () => {
      const { container } = render(<StatCard value="100" label="Metric" />);
      expect(container.querySelector('.shadow-lg')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(
        <StatCard value="100" label="Metric" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Complex Scenarios', () => {
    it('should render complete stat card with all features', () => {
      render(
        <StatCard
          value="$45,231"
          label="Total Revenue"
          icon={DollarSign}
          variant="success"
          trend="up"
          trendValue="12.5"
        />
      );

      expect(screen.getByText('$45,231')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
      expect(screen.getByText('vs last period')).toBeInTheDocument();
    });

    it('should work with multiple stat cards', () => {
      render(
        <div>
          <StatCard value="1,234" label="Sales" />
          <StatCard value="$45,231" label="Revenue" />
          <StatCard value="156" label="Users" />
        </div>
      );

      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      render(<StatCard value={0} label="Errors" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      render(<StatCard value="1,234,567,890" label="Big Number" />);
      expect(screen.getByText('1,234,567,890')).toBeInTheDocument();
    });

    it('should handle decimal trend values', () => {
      render(<StatCard value="100" label="Metric" trend="up" trendValue="0.5" />);
      expect(screen.getByText('+0.5%')).toBeInTheDocument();
    });
  });
});

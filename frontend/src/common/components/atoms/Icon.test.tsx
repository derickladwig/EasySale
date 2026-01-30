import { describe, it, expect } from 'vitest';
import { render, screen as _screen } from '@testing-library/react';
import { Icon } from './Icon';
import { Plus, Check, Search, AlertCircle, X } from 'lucide-react';

describe('Icon', () => {
  describe('Rendering', () => {
    it('should render the icon component', () => {
      const { container } = render(<Icon icon={Plus} aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render different icon types', () => {
      const { rerender, container } = render(<Icon icon={Plus} aria-label="Add" />);
      expect(container.querySelector('svg')).toBeInTheDocument();

      rerender(<Icon icon={Check} aria-label="Check" />);
      expect(container.querySelector('svg')).toBeInTheDocument();

      rerender(<Icon icon={Search} aria-label="Search" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render xs size (16px)', () => {
      const { container } = render(<Icon icon={Plus} size="xs" aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('should render sm size (20px)', () => {
      const { container } = render(<Icon icon={Plus} size="sm" aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
    });

    it('should render md size (24px) by default', () => {
      const { container } = render(<Icon icon={Plus} aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('should render lg size (32px)', () => {
      const { container } = render(<Icon icon={Plus} size="lg" aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '32');
      expect(svg).toHaveAttribute('height', '32');
    });

    it('should render xl size (48px)', () => {
      const { container } = render(<Icon icon={Plus} size="xl" aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '48');
      expect(svg).toHaveAttribute('height', '48');
    });
  });

  describe('Colors', () => {
    it('should apply custom color class', () => {
      const { container } = render(<Icon icon={Plus} color="text-red-500" aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-red-500');
    });

    it('should apply text-current by default', () => {
      const { container } = render(<Icon icon={Plus} aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-current');
    });

    it('should support multiple color variants', () => {
      const { rerender, container } = render(
        <Icon icon={Check} color="text-green-500" aria-label="Success" />
      );
      expect(container.querySelector('svg')).toHaveClass('text-green-500');

      rerender(<Icon icon={AlertCircle} color="text-yellow-500" aria-label="Warning" />);
      expect(container.querySelector('svg')).toHaveClass('text-yellow-500');

      rerender(<Icon icon={X} color="text-red-500" aria-label="Error" />);
      expect(container.querySelector('svg')).toHaveClass('text-red-500');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label when provided', () => {
      const { container } = render(<Icon icon={Plus} aria-label="Add item" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Add item');
    });

    it('should have aria-hidden when no aria-label provided', () => {
      const { container } = render(<Icon icon={Plus} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should not have aria-hidden when aria-label is provided', () => {
      const { container } = render(<Icon icon={Plus} aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toHaveAttribute('aria-hidden', 'true');
    });

    it('should support descriptive labels for different contexts', () => {
      const { rerender, container } = render(<Icon icon={Search} aria-label="Search products" />);
      expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Search products');

      rerender(<Icon icon={Plus} aria-label="Add new customer" />);
      expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Add new customer');
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(<Icon icon={Plus} className="custom-class" aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-class');
    });

    it('should merge custom className with color', () => {
      const { container } = render(
        <Icon icon={Plus} color="text-accent" className="rotate-45" aria-label="Add" />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-accent');
      expect(svg).toHaveClass('rotate-45');
    });

    it('should forward additional Lucide props', () => {
      const { container } = render(<Icon icon={Plus} strokeWidth={3} aria-label="Add" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '3');
    });
  });

  describe('Integration', () => {
    it('should work with different icon types in a list', () => {
      const icons = [
        { icon: Plus, label: 'Add' },
        { icon: Check, label: 'Complete' },
        { icon: Search, label: 'Search' },
        { icon: AlertCircle, label: 'Alert' },
        { icon: X, label: 'Close' },
      ];

      const { container } = render(
        <div>
          {icons.map((item, index) => (
            <Icon key={index} icon={item.icon} aria-label={item.label} />
          ))}
        </div>
      );

      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(5);
    });

    it('should maintain consistent sizing across different icons', () => {
      const { container } = render(
        <div>
          <Icon icon={Plus} size="md" aria-label="Add" />
          <Icon icon={Check} size="md" aria-label="Check" />
          <Icon icon={Search} size="md" aria-label="Search" />
        </div>
      );

      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('width', '24');
        expect(svg).toHaveAttribute('height', '24');
      });
    });
  });
});

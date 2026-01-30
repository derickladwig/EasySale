import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders with default variant', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-secondary-200', 'text-secondary-800');
    });

    it('renders with default size (md)', () => {
      render(<Badge>Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm');
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-secondary-200', 'text-secondary-800');
    });

    it('renders primary variant', () => {
      render(<Badge variant="primary">Primary</Badge>);
      const badge = screen.getByText('Primary');
      expect(badge).toHaveClass('bg-primary-100', 'text-primary-800');
    });

    it('renders success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-success-100', 'text-success-800');
    });

    it('renders warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-warning-100', 'text-warning-800');
    });

    it('renders error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-error-100', 'text-error-800');
    });

    it('renders info variant', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-info-100', 'text-info-800');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
    });

    it('renders medium size', () => {
      render(<Badge size="md">Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm');
    });

    it('renders large size', () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-base');
    });
  });

  describe('Dot Mode', () => {
    it('renders dot indicator', () => {
      const { container } = render(<Badge dot variant="success" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('rounded-full', 'bg-success-500');
    });

    it('renders small dot', () => {
      const { container } = render(<Badge dot size="sm" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('w-2', 'h-2');
    });

    it('renders medium dot', () => {
      const { container } = render(<Badge dot size="md" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('w-3', 'h-3');
    });

    it('renders large dot', () => {
      const { container } = render(<Badge dot size="lg" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('w-4', 'h-4');
    });

    it('does not render children in dot mode', () => {
      render(<Badge dot>Should not show</Badge>);
      expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
    });

    it('renders dot with default variant color', () => {
      const { container } = render(<Badge dot variant="default" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('bg-secondary-400');
    });

    it('renders dot with primary variant color', () => {
      const { container } = render(<Badge dot variant="primary" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('bg-primary-500');
    });

    it('renders dot with success variant color', () => {
      const { container } = render(<Badge dot variant="success" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('bg-success-500');
    });

    it('renders dot with warning variant color', () => {
      const { container } = render(<Badge dot variant="warning" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('bg-warning-500');
    });

    it('renders dot with error variant color', () => {
      const { container } = render(<Badge dot variant="error" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('bg-error-500');
    });

    it('renders dot with info variant color', () => {
      const { container } = render(<Badge dot variant="info" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('bg-info-500');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });

    it('applies custom className to dot', () => {
      const { container } = render(<Badge dot className="custom-dot" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('custom-dot');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(<Badge ref={ref}>With Ref</Badge>);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });

    it('passes through HTML span attributes', () => {
      render(
        <Badge title="Badge title" data-testid="test-badge">
          Badge
        </Badge>
      );
      const badge = screen.getByTestId('test-badge');
      expect(badge).toHaveAttribute('title', 'Badge title');
    });
  });

  describe('Use Cases', () => {
    it('renders status badge', () => {
      render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders count badge', () => {
      render(<Badge variant="primary">5</Badge>);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders category badge', () => {
      render(<Badge variant="info">Automotive</Badge>);
      expect(screen.getByText('Automotive')).toBeInTheDocument();
    });

    it('renders online status dot', () => {
      const { container } = render(<Badge dot variant="success" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('bg-success-500');
    });

    it('renders offline status dot', () => {
      const { container } = render(<Badge dot variant="error" />);
      const dot = container.firstChild;
      expect(dot).toHaveClass('bg-error-500');
    });
  });

  describe('Count Indicator', () => {
    it('renders count value', () => {
      render(<Badge count={5} variant="primary" />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders zero count', () => {
      render(<Badge count={0} variant="primary" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('formats count over 99 as "99+"', () => {
      render(<Badge count={150} variant="primary" />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('formats count over 999 as "999+"', () => {
      render(<Badge count={1500} variant="primary" />);
      expect(screen.getByText('999+')).toBeInTheDocument();
    });

    it('renders exactly 99', () => {
      render(<Badge count={99} variant="primary" />);
      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('renders count 100 as "99+"', () => {
      render(<Badge count={100} variant="primary" />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('renders count 999 as "99+"', () => {
      render(<Badge count={999} variant="primary" />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('renders count 1000 as "999+"', () => {
      render(<Badge count={1000} variant="primary" />);
      expect(screen.getByText('999+')).toBeInTheDocument();
    });

    it('count takes precedence over children', () => {
      render(<Badge count={5} variant="primary">Should not show</Badge>);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
    });

    it('renders count with different variants', () => {
      const { rerender } = render(<Badge count={3} variant="success" />);
      expect(screen.getByText('3')).toBeInTheDocument();
      
      rerender(<Badge count={3} variant="error" />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Icon Support', () => {
    const TestIcon = () => <svg data-testid="test-icon"><circle /></svg>;

    it('renders icon with text (left position)', () => {
      render(
        <Badge icon={<TestIcon />} iconPosition="left">
          Status
        </Badge>
      );
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('renders icon with text (right position)', () => {
      render(
        <Badge icon={<TestIcon />} iconPosition="right">
          Status
        </Badge>
      );
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('renders icon without text', () => {
      render(<Badge icon={<TestIcon />} />);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('renders icon with count', () => {
      render(<Badge icon={<TestIcon />} count={5} />);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('applies gap when icon and content are present', () => {
      const { container } = render(
        <Badge icon={<TestIcon />}>
          Status
        </Badge>
      );
      const badge = container.firstChild;
      expect(badge).toHaveClass('gap-1');
    });

    it('does not apply gap when only icon is present', () => {
      const { container } = render(<Badge icon={<TestIcon />} />);
      const badge = container.firstChild;
      expect(badge).not.toHaveClass('gap-1');
    });

    it('does not apply gap when only text is present', () => {
      render(<Badge>Status</Badge>);
      const badge = screen.getByText('Status');
      expect(badge).not.toHaveClass('gap-1');
    });

    it('icon position defaults to left', () => {
      const { container } = render(
        <Badge icon={<TestIcon />}>
          Status
        </Badge>
      );
      const badge = container.firstChild as HTMLElement;
      const icon = screen.getByTestId('test-icon');
      const text = screen.getByText('Status');
      
      // Icon should come before text in DOM order
      expect(badge.firstChild).toContain(icon);
    });

    it('renders icon on right when iconPosition is right', () => {
      const { container } = render(
        <Badge icon={<TestIcon />} iconPosition="right">
          Status
        </Badge>
      );
      const badge = container.firstChild as HTMLElement;
      const icon = screen.getByTestId('test-icon');
      
      // Icon should come after text in DOM order
      expect(badge.lastChild).toContain(icon);
    });
  });

  describe('Combined Features', () => {
    const TestIcon = () => <svg data-testid="test-icon"><circle /></svg>;

    it('renders count with icon', () => {
      render(<Badge count={42} icon={<TestIcon />} variant="primary" />);
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('renders formatted count with icon', () => {
      render(<Badge count={150} icon={<TestIcon />} variant="error" />);
      expect(screen.getByText('99+')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('dot mode ignores count and icon', () => {
      const { container } = render(
        <Badge dot count={5} icon={<TestIcon />} variant="success">
          Should not show
        </Badge>
      );
      expect(screen.queryByText('5')).not.toBeInTheDocument();
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
      
      const dot = container.firstChild;
      expect(dot).toHaveClass('rounded-full', 'bg-success-500');
    });
  });
});

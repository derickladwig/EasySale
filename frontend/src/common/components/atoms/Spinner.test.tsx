import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Spinner,
  ButtonSpinner,
  PageSpinner,
  InlineSpinner,
} from './Spinner';

describe('Spinner', () => {
  describe('Basic Spinner', () => {
    it('should render with default props', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should render all size variants', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
      
      sizes.forEach((size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('svg');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should render all color variants', () => {
      const variants = ['default', 'primary', 'success', 'warning', 'error', 'white'] as const;
      
      variants.forEach((variant) => {
        const { container } = render(<Spinner variant={variant} />);
        const spinner = container.querySelector('svg');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should apply custom className', () => {
      const { container } = render(<Spinner className="custom-class" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('custom-class');
    });

    it('should use custom aria-label', () => {
      const { container } = render(<Spinner aria-label="Custom loading message" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveAttribute('aria-label', 'Custom loading message');
    });

    it('should have primary color variant class', () => {
      const { container } = render(<Spinner variant="primary" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('text-primary-500');
    });

    it('should have success color variant class', () => {
      const { container } = render(<Spinner variant="success" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('text-success-DEFAULT');
    });

    it('should have error color variant class', () => {
      const { container } = render(<Spinner variant="error" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('text-error-DEFAULT');
    });
  });

  describe('ButtonSpinner', () => {
    it('should render with button-appropriate size', () => {
      const { container } = render(<ButtonSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
      expect(spinner).toHaveClass('w-4'); // sm size
      expect(spinner).toHaveClass('h-4');
    });

    it('should have white color for button use', () => {
      const { container } = render(<ButtonSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('text-white');
    });

    it('should have right margin for spacing', () => {
      const { container } = render(<ButtonSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('mr-2');
    });

    it('should apply custom className', () => {
      const { container } = render(<ButtonSpinner className="custom-button-spinner" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('custom-button-spinner');
    });

    it('should have proper accessibility attributes', () => {
      const { container } = render(<ButtonSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should use custom aria-label', () => {
      const { container } = render(<ButtonSpinner aria-label="Saving changes" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveAttribute('aria-label', 'Saving changes');
    });
  });

  describe('PageSpinner', () => {
    it('should render with default props', () => {
      render(<PageSpinner />);
      const spinner = screen.getByRole('status');
      
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should render with text', () => {
      render(<PageSpinner text="Loading products..." />);
      
      expect(screen.getByText('Loading products...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading products...');
    });

    it('should center by default', () => {
      const { container } = render(<PageSpinner />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('should not center when centered is false', () => {
      const { container } = render(<PageSpinner centered={false} />);
      const statusElement = screen.getByRole('status');
      
      // The status element should not be wrapped in a centering div
      expect(statusElement.parentElement).not.toHaveClass('flex');
    });

    it('should render all color variants', () => {
      const variants = ['default', 'primary', 'success', 'warning', 'error'] as const;
      
      variants.forEach((variant) => {
        const { unmount } = render(<PageSpinner variant={variant} />);
        expect(screen.getByRole('status')).toBeInTheDocument();
        unmount();
      });
    });

    it('should apply custom className', () => {
      render(<PageSpinner className="custom-page-spinner" />);
      const spinner = screen.getByRole('status');
      
      expect(spinner).toHaveClass('custom-page-spinner');
    });

    it('should use custom aria-label', () => {
      render(<PageSpinner aria-label="Loading dashboard data" />);
      const spinner = screen.getByRole('status');
      
      expect(spinner).toHaveAttribute('aria-label', 'Loading dashboard data');
    });

    it('should have aria-live="polite" for screen readers', () => {
      render(<PageSpinner />);
      const spinner = screen.getByRole('status');
      
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });

    it('should display text with proper styling', () => {
      render(<PageSpinner text="Please wait..." variant="primary" />);
      const text = screen.getByText('Please wait...');
      
      expect(text).toHaveClass('text-base');
      expect(text).toHaveClass('font-medium');
    });
  });

  describe('InlineSpinner', () => {
    it('should render with default props', () => {
      const { container } = render(<InlineSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should have small size for inline use', () => {
      const { container } = render(<InlineSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('w-4'); // sm size
      expect(spinner).toHaveClass('h-4');
    });

    it('should have inline-block display', () => {
      const { container } = render(<InlineSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('inline-block');
    });

    it('should align with text baseline', () => {
      const { container } = render(<InlineSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('align-text-bottom');
    });

    it('should render all color variants', () => {
      const variants = ['default', 'primary', 'success', 'warning', 'error'] as const;
      
      variants.forEach((variant) => {
        const { container } = render(<InlineSpinner variant={variant} />);
        const spinner = container.querySelector('svg');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should apply custom className', () => {
      const { container } = render(<InlineSpinner className="custom-inline-spinner" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('custom-inline-spinner');
    });

    it('should have proper accessibility attributes', () => {
      const { container } = render(<InlineSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should use custom aria-label', () => {
      const { container } = render(<InlineSpinner aria-label="Syncing data" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveAttribute('aria-label', 'Syncing data');
    });
  });

  describe('Animation', () => {
    it('should have animate-spin class for smooth animation', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should animate ButtonSpinner', () => {
      const { container } = render(<ButtonSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should animate PageSpinner', () => {
      const { container } = render(<PageSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should animate InlineSpinner', () => {
      const { container } = render(<InlineSpinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden on base spinner', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have aria-label for screen readers', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveAttribute('aria-label');
    });

    it('should allow custom aria-label', () => {
      const { container } = render(<Spinner aria-label="Processing payment" />);
      const spinner = container.querySelector('svg');
      
      expect(spinner).toHaveAttribute('aria-label', 'Processing payment');
    });

    it('should have role="status" on PageSpinner wrapper', () => {
      render(<PageSpinner />);
      const spinner = screen.getByRole('status');
      
      expect(spinner).toBeInTheDocument();
    });

    it('should have aria-live="polite" on PageSpinner', () => {
      render(<PageSpinner />);
      const spinner = screen.getByRole('status');
      
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });
  });
});

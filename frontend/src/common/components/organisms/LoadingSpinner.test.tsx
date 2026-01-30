import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render the spinner', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have status role', () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-live polite', () => {
      render(<LoadingSpinner />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('should have default aria-label', () => {
      render(<LoadingSpinner />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Loading');
    });

    it('should use text as aria-label when provided', () => {
      render(<LoadingSpinner text="Loading data..." />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Loading data...');
    });
  });

  describe('Text', () => {
    it('should not render text by default', () => {
      const { container } = render(<LoadingSpinner />);
      const text = container.querySelector('span');
      expect(text).not.toBeInTheDocument();
    });

    it('should render text when provided', () => {
      render(<LoadingSpinner text="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render custom text', () => {
      render(<LoadingSpinner text="Please wait" />);
      expect(screen.getByText('Please wait')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply sm size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should apply md size (default)', () => {
      const { container } = render(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should apply lg size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should apply correct text size for sm', () => {
      const { container } = render(<LoadingSpinner size="sm" text="Loading" />);
      const text = screen.getByText('Loading');
      expect(text).toHaveClass('text-sm');
    });

    it('should apply correct text size for md', () => {
      const { container } = render(<LoadingSpinner size="md" text="Loading" />);
      const text = screen.getByText('Loading');
      expect(text).toHaveClass('text-base');
    });

    it('should apply correct text size for lg', () => {
      const { container } = render(<LoadingSpinner size="lg" text="Loading" />);
      const text = screen.getByText('Loading');
      expect(text).toHaveClass('text-lg');
    });
  });

  describe('Variants', () => {
    it('should apply default variant', () => {
      const { container } = render(<LoadingSpinner variant="default" />);
      expect(container.querySelector('.text-text-secondary')).toBeInTheDocument();
    });

    it('should apply primary variant', () => {
      const { container } = render(<LoadingSpinner variant="primary" />);
      expect(container.querySelector('.text-primary-500')).toBeInTheDocument();
    });

    it('should apply success variant', () => {
      const { container } = render(<LoadingSpinner variant="success" />);
      expect(container.querySelector('.text-success-500')).toBeInTheDocument();
    });

    it('should apply warning variant', () => {
      const { container } = render(<LoadingSpinner variant="warning" />);
      expect(container.querySelector('.text-warning-500')).toBeInTheDocument();
    });

    it('should apply error variant', () => {
      const { container } = render(<LoadingSpinner variant="error" />);
      expect(container.querySelector('.text-error-500')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should have spin animation', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Centered', () => {
    it('should not be centered by default', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.querySelector('.flex.items-center.justify-center')).not.toBeInTheDocument();
    });

    it('should be centered when centered prop is true', () => {
      const { container } = render(<LoadingSpinner centered />);
      expect(container.querySelector('.flex.items-center.justify-center')).toBeInTheDocument();
    });

    it('should have min height when centered', () => {
      const { container } = render(<LoadingSpinner centered />);
      expect(container.querySelector('.min-h-\\[200px\\]')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should render with all props', () => {
      render(<LoadingSpinner size="lg" variant="primary" text="Loading data..." centered />);

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should work with different text lengths', () => {
      const { rerender } = render(<LoadingSpinner text="Loading" />);
      expect(screen.getByText('Loading')).toBeInTheDocument();

      rerender(<LoadingSpinner text="Loading a very long piece of text that might wrap" />);
      expect(
        screen.getByText('Loading a very long piece of text that might wrap')
      ).toBeInTheDocument();
    });

    it('should maintain aspect ratio at different sizes', () => {
      const { container: containerSm } = render(<LoadingSpinner size="sm" />);
      const { container: containerMd } = render(<LoadingSpinner size="md" />);
      const { container: containerLg } = render(<LoadingSpinner size="lg" />);

      expect(containerSm.querySelector('svg')).toBeInTheDocument();
      expect(containerMd.querySelector('svg')).toBeInTheDocument();
      expect(containerLg.querySelector('svg')).toBeInTheDocument();
    });
  });
});

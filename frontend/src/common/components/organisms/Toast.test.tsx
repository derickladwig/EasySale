import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders with message', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Test message" onDismiss={onDismiss} />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('renders with default variant (info)', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Info message" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-info-DEFAULT');
    });

    it('has proper ARIA attributes', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Test message" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(toast).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Variants (Requirement 11.2)', () => {
    it('renders success variant with green color', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Success" variant="success" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-success-DEFAULT', 'border-success-dark', 'text-white');
    });

    it('renders error variant with red color', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Error" variant="error" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-error-DEFAULT', 'border-error-dark', 'text-white');
    });

    it('renders warning variant with yellow color', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Warning" variant="warning" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-warning-DEFAULT', 'border-warning-dark', 'text-white');
    });

    it('renders info variant with blue color', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Info" variant="info" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-info-DEFAULT', 'border-info-dark', 'text-white');
    });
  });

  describe('Icons (Requirement 11.7)', () => {
    it('displays CheckCircle icon for success variant', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Success" variant="success" onDismiss={onDismiss} />);
      // Check for SVG element (Lucide icons render as SVG)
      const toast = screen.getByRole('alert');
      const svg = toast.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays AlertCircle icon for error variant', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Error" variant="error" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      const svg = toast.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays AlertTriangle icon for warning variant', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Warning" variant="warning" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      const svg = toast.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays Info icon for info variant', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Info" variant="info" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      const svg = toast.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Auto-dismiss (Requirement 11.3)', () => {
    it('auto-dismisses after 5 seconds by default', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Auto dismiss" onDismiss={onDismiss} />);

      // Fast-forward time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Wait for the exit animation (300ms)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onDismiss).toHaveBeenCalledWith('1');
    });

    it('auto-dismisses after custom duration', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Custom duration" duration={3000} onDismiss={onDismiss} />);

      // Fast-forward time by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Wait for the exit animation (300ms)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onDismiss).toHaveBeenCalledWith('1');
    });

    it('does not auto-dismiss when duration is 0', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="No auto dismiss" duration={0} onDismiss={onDismiss} />);

      // Fast-forward time by 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should not have been dismissed
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Manual dismiss (Requirement 11.4)', () => {
    it('renders dismiss button', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Dismissible" onDismiss={onDismiss} />);
      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      expect(dismissButton).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Click to dismiss" onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      fireEvent.click(dismissButton);

      // Wait for the exit animation (300ms)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onDismiss).toHaveBeenCalledWith('1');
    });

    it('dismiss button has proper ARIA label', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Test" onDismiss={onDismiss} />);
      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification');
    });
  });

  describe('Animations (Requirement 11.6)', () => {
    it('has slide-in animation from right', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Slide in" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('animate-slide-in-from-right');
    });

    it('has slide-out animation when dismissing', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Slide out" onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      fireEvent.click(dismissButton);

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('animate-slide-out-to-right');
    });
  });

  describe('Mobile responsiveness (Requirement 11.10)', () => {
    it('has full-width styling on mobile', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Mobile toast" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('max-sm:min-w-full', 'max-sm:rounded-none');
    });

    it('has minimum width on desktop', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Desktop toast" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('min-w-[300px]', 'max-w-md');
    });
  });

  describe('Styling', () => {
    it('has proper shadow and border', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Styled toast" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('shadow-lg', 'border-2', 'rounded-lg');
    });

    it('has proper padding and gap', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Spaced toast" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('p-4', 'gap-3');
    });

    it('applies custom className', () => {
      const onDismiss = vi.fn();
      render(<Toast id="1" message="Custom" className="custom-class" onDismiss={onDismiss} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('custom-class');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref to toast element', () => {
      const ref = React.createRef<HTMLDivElement>();
      const onDismiss = vi.fn();
      render(<Toast ref={ref} id="1" message="With ref" onDismiss={onDismiss} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveAttribute('role', 'alert');
    });
  });

  describe('Timer cleanup', () => {
    it('cleans up timer on unmount', () => {
      const onDismiss = vi.fn();
      const { unmount } = render(<Toast id="1" message="Cleanup test" onDismiss={onDismiss} />);

      // Unmount before timer expires
      unmount();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should not have been called
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});

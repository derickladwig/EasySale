import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

// Test component that uses the toast hook
const TestComponent = () => {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show Success</button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.warning('Warning message')}>Show Warning</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.showToast('Custom message', 'success', 10000)}>
        Show Custom
      </button>
      <button onClick={() => toast.dismissAll()}>Dismiss All</button>
    </div>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('renders children', () => {
      render(
        <ToastProvider>
          <div>Test content</div>
        </ToastProvider>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders ToastContainer', () => {
      const { container } = render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );
      // ToastContainer should be rendered with fixed positioning
      const toastContainer = container.querySelector('.fixed.z-toast');
      expect(toastContainer).toBeInTheDocument();
    });
  });

  describe('useToast hook', () => {
    it('throws error when used outside ToastProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('provides toast methods when used inside ToastProvider', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByText('Show Success')).toBeInTheDocument();
      expect(screen.getByText('Show Error')).toBeInTheDocument();
      expect(screen.getByText('Show Warning')).toBeInTheDocument();
      expect(screen.getByText('Show Info')).toBeInTheDocument();
    });
  });

  describe('Toast methods', () => {
    it('shows success toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-success-DEFAULT');
    });

    it('shows error toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-error-DEFAULT');
    });

    it('shows warning toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Warning message')).toBeInTheDocument();
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-warning-DEFAULT');
    });

    it('shows info toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Info'));

      expect(screen.getByText('Info message')).toBeInTheDocument();
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-info-DEFAULT');
    });

    it('shows custom toast with custom duration', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Custom'));

      expect(screen.getByText('Custom message')).toBeInTheDocument();
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-success-DEFAULT');
    });
  });

  describe('Multiple toasts', () => {
    it('shows multiple toasts simultaneously', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();

      const toasts = screen.getAllByRole('alert');
      expect(toasts).toHaveLength(3);
    });

    it('stacks toasts in order', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      const toasts = screen.getAllByRole('alert');
      expect(toasts).toHaveLength(2);
      expect(toasts[0]).toHaveTextContent('Success message');
      expect(toasts[1]).toHaveTextContent('Error message');
    });
  });

  describe('Dismiss functionality', () => {
    it('dismisses toast when dismiss button is clicked', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      fireEvent.click(dismissButton);

      // Wait for exit animation
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('dismisses all toasts when dismissAll is called', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getAllByRole('alert')).toHaveLength(3);

      fireEvent.click(screen.getByText('Dismiss All'));

      expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('auto-dismisses toast after default duration', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Fast-forward time by 5 seconds (default duration)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Wait for exit animation
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('auto-dismisses toast after custom duration', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Custom')); // 10 second duration
      expect(screen.getByText('Custom message')).toBeInTheDocument();

      // Fast-forward time by 5 seconds (should still be visible)
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText('Custom message')).toBeInTheDocument();

      // Fast-forward another 5 seconds (total 10 seconds)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Wait for exit animation
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByText('Custom message')).not.toBeInTheDocument();
    });
  });

  describe('Toast IDs', () => {
    it('generates unique IDs for each toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Success'));

      const toasts = screen.getAllByRole('alert');
      expect(toasts).toHaveLength(3);

      // Each toast should have a unique key (React will warn if keys are duplicated)
      // We can't directly test keys, but we can verify all toasts are rendered
      expect(screen.getAllByText('Success message')).toHaveLength(3);
    });
  });

  describe('Integration', () => {
    it('works with multiple components using the hook', () => {
      const Component1 = () => {
        const toast = useToast();
        return <button onClick={() => toast.success('From Component 1')}>Component 1</button>;
      };

      const Component2 = () => {
        const toast = useToast();
        return <button onClick={() => toast.error('From Component 2')}>Component 2</button>;
      };

      render(
        <ToastProvider>
          <Component1 />
          <Component2 />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Component 1'));
      fireEvent.click(screen.getByText('Component 2'));

      expect(screen.getByText('From Component 1')).toBeInTheDocument();
      expect(screen.getByText('From Component 2')).toBeInTheDocument();
    });
  });
});

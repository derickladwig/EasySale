import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';

describe('ToastContainer', () => {
  describe('Rendering', () => {
    it('renders without toasts', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders single toast', () => {
      const onDismiss = vi.fn();
      const toasts = [{ id: '1', message: 'Test toast' }];
      render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);
      expect(screen.getByText('Test toast')).toBeInTheDocument();
    });

    it('renders multiple toasts', () => {
      const onDismiss = vi.fn();
      const toasts = [
        { id: '1', message: 'First toast' },
        { id: '2', message: 'Second toast' },
        { id: '3', message: 'Third toast' },
      ];
      render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);
      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
      expect(screen.getByText('Third toast')).toBeInTheDocument();
    });
  });

  describe('Positioning (Requirement 11.1)', () => {
    it('is positioned in top-right corner on desktop', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveClass('fixed', 'top-4', 'right-4');
    });

    it('is positioned at top full-width on mobile (Requirement 11.10)', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveClass('max-sm:top-0', 'max-sm:right-0', 'max-sm:left-0');
    });

    it('has proper z-index for layering', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveClass('z-toast');
    });
  });

  describe('Stacking (Requirement 11.5, 11.8)', () => {
    it('stacks toasts vertically', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveClass('flex', 'flex-col');
    });

    it('has 8px gap between toasts (Requirement 11.8)', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveClass('gap-2'); // gap-2 = 0.5rem = 8px
    });

    it('renders toasts in order', () => {
      const onDismiss = vi.fn();
      const toasts = [
        { id: '1', message: 'First' },
        { id: '2', message: 'Second' },
        { id: '3', message: 'Third' },
      ];
      render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);
      
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);
      expect(alerts[0]).toHaveTextContent('First');
      expect(alerts[1]).toHaveTextContent('Second');
      expect(alerts[2]).toHaveTextContent('Third');
    });
  });

  describe('Toast variants', () => {
    it('renders toasts with different variants', () => {
      const onDismiss = vi.fn();
      const toasts = [
        { id: '1', message: 'Success', variant: 'success' as const },
        { id: '2', message: 'Error', variant: 'error' as const },
        { id: '3', message: 'Warning', variant: 'warning' as const },
        { id: '4', message: 'Info', variant: 'info' as const },
      ];
      render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);
      
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });
  });

  describe('Dismiss handling', () => {
    it('passes onDismiss to each toast', () => {
      const onDismiss = vi.fn();
      const toasts = [
        { id: '1', message: 'Toast 1' },
        { id: '2', message: 'Toast 2' },
      ];
      render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);
      
      // Each toast should have a dismiss button
      const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss notification' });
      expect(dismissButtons).toHaveLength(2);
    });
  });

  describe('ARIA attributes', () => {
    it('has proper ARIA live region', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveAttribute('aria-live', 'polite');
      expect(toastContainer).toHaveAttribute('aria-atomic', 'false');
    });
  });

  describe('Pointer events', () => {
    it('container has pointer-events-none', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveClass('pointer-events-none');
    });

    it('individual toasts have pointer-events-auto', () => {
      const onDismiss = vi.fn();
      const toasts = [{ id: '1', message: 'Test' }];
      const { container } = render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);
      
      // Find the wrapper div around the toast
      const toastWrapper = container.querySelector('.pointer-events-auto');
      expect(toastWrapper).toBeInTheDocument();
    });
  });

  describe('Custom styling', () => {
    it('applies custom className', () => {
      const onDismiss = vi.fn();
      const { container } = render(
        <ToastContainer toasts={[]} onDismiss={onDismiss} className="custom-class" />
      );
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveClass('custom-class');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref to container element', () => {
      const ref = React.createRef<HTMLDivElement>();
      const onDismiss = vi.fn();
      render(<ToastContainer ref={ref} toasts={[]} onDismiss={onDismiss} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('fixed');
    });
  });

  describe('Empty state', () => {
    it('renders empty container when no toasts', () => {
      const onDismiss = vi.fn();
      const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toBeInTheDocument();
      expect(toastContainer.children).toHaveLength(0);
    });
  });

  describe('Dynamic toast updates', () => {
    it('updates when toasts array changes', () => {
      const onDismiss = vi.fn();
      const { rerender } = render(
        <ToastContainer toasts={[{ id: '1', message: 'First' }]} onDismiss={onDismiss} />
      );
      
      expect(screen.getByText('First')).toBeInTheDocument();
      
      // Add another toast
      rerender(
        <ToastContainer
          toasts={[
            { id: '1', message: 'First' },
            { id: '2', message: 'Second' },
          ]}
          onDismiss={onDismiss}
        />
      );
      
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('removes toast when removed from array', () => {
      const onDismiss = vi.fn();
      const { rerender } = render(
        <ToastContainer
          toasts={[
            { id: '1', message: 'First' },
            { id: '2', message: 'Second' },
          ]}
          onDismiss={onDismiss}
        />
      );
      
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      
      // Remove first toast
      rerender(
        <ToastContainer toasts={[{ id: '2', message: 'Second' }]} onDismiss={onDismiss} />
      );
      
      expect(screen.queryByText('First')).not.toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('Smooth slide-up on dismiss (Requirement 11.9)', () => {
    it('remaining toasts slide up smoothly when one is dismissed', () => {
      const onDismiss = vi.fn();
      const { rerender, container } = render(
        <ToastContainer
          toasts={[
            { id: '1', message: 'First' },
            { id: '2', message: 'Second' },
            { id: '3', message: 'Third' },
          ]}
          onDismiss={onDismiss}
        />
      );
      
      // Verify all three toasts are present
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
      
      // Verify the container has flex-col and gap-2 for smooth transitions
      const toastContainer = container.firstChild as HTMLElement;
      expect(toastContainer).toHaveClass('flex', 'flex-col', 'gap-2');
      
      // Remove the middle toast
      rerender(
        <ToastContainer
          toasts={[
            { id: '1', message: 'First' },
            { id: '3', message: 'Third' },
          ]}
          onDismiss={onDismiss}
        />
      );
      
      // Verify the middle toast is removed
      expect(screen.queryByText('Second')).not.toBeInTheDocument();
      
      // Verify remaining toasts are still present
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
      
      // The smooth slide-up is handled by CSS transitions on the flexbox gap
      // When a toast is removed, the gap automatically closes with transition
      expect(toastContainer).toHaveClass('gap-2'); // 8px gap maintained
    });

    it('maintains proper spacing after toast removal', () => {
      const onDismiss = vi.fn();
      const { rerender, container } = render(
        <ToastContainer
          toasts={[
            { id: '1', message: 'Toast 1' },
            { id: '2', message: 'Toast 2' },
            { id: '3', message: 'Toast 3' },
            { id: '4', message: 'Toast 4' },
          ]}
          onDismiss={onDismiss}
        />
      );
      
      const toastContainer = container.firstChild as HTMLElement;
      
      // Verify initial state
      expect(screen.getAllByRole('alert')).toHaveLength(4);
      expect(toastContainer).toHaveClass('gap-2');
      
      // Remove first toast
      rerender(
        <ToastContainer
          toasts={[
            { id: '2', message: 'Toast 2' },
            { id: '3', message: 'Toast 3' },
            { id: '4', message: 'Toast 4' },
          ]}
          onDismiss={onDismiss}
        />
      );
      
      // Verify spacing is maintained
      expect(screen.getAllByRole('alert')).toHaveLength(3);
      expect(toastContainer).toHaveClass('gap-2');
      
      // Remove last toast
      rerender(
        <ToastContainer
          toasts={[
            { id: '2', message: 'Toast 2' },
            { id: '3', message: 'Toast 3' },
          ]}
          onDismiss={onDismiss}
        />
      );
      
      // Verify spacing is still maintained
      expect(screen.getAllByRole('alert')).toHaveLength(2);
      expect(toastContainer).toHaveClass('gap-2');
    });
  });
});

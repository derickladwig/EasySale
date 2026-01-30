import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  describe('Rendering - Requirement 14.8', () => {
    it('should not render when isVisible is false', () => {
      const { container } = render(<OfflineBanner isVisible={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when isVisible is true', () => {
      render(<OfflineBanner isVisible={true} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should display default message', () => {
      render(<OfflineBanner isVisible={true} />);
      expect(
        screen.getByText(/You are currently offline/i)
      ).toBeInTheDocument();
    });

    it('should display custom message when provided', () => {
      render(
        <OfflineBanner 
          isVisible={true} 
          message="Connection lost. Working in offline mode." 
        />
      );
      expect(screen.getByText(/Connection lost/i)).toBeInTheDocument();
    });

    it('should display offline icon', () => {
      const { container } = render(<OfflineBanner isVisible={true} />);
      // WifiOff icon should be present
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should not show close button by default', () => {
      render(<OfflineBanner isVisible={true} />);
      expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
    });

    it('should show close button when showClose is true and onClose is provided', () => {
      render(<OfflineBanner isVisible={true} showClose onClose={() => {}} />);
      expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(<OfflineBanner isVisible={true} showClose onClose={onClose} />);
      
      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not show close button when showClose is true but onClose is not provided', () => {
      render(<OfflineBanner isVisible={true} showClose />);
      expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have offline status color', () => {
      const { container } = render(<OfflineBanner isVisible={true} />);
      const banner = container.querySelector('.bg-status-offline');
      expect(banner).toBeInTheDocument();
    });

    it('should have slide-in animation', () => {
      const { container } = render(<OfflineBanner isVisible={true} />);
      const banner = container.querySelector('.animate-slide-in-from-top');
      expect(banner).toBeInTheDocument();
    });

    it('should be fixed at top of screen', () => {
      const { container } = render(<OfflineBanner isVisible={true} />);
      const banner = container.querySelector('.fixed.top-0');
      expect(banner).toBeInTheDocument();
    });

    it('should have high z-index', () => {
      const { container } = render(<OfflineBanner isVisible={true} />);
      const banner = container.querySelector('.z-toast');
      expect(banner).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      const { container } = render(
        <OfflineBanner isVisible={true} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert"', () => {
      render(<OfflineBanner isVisible={true} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="assertive"', () => {
      render(<OfflineBanner isVisible={true} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have accessible close button label', () => {
      render(<OfflineBanner isVisible={true} showClose onClose={() => {}} />);
      expect(screen.getByLabelText('Close offline banner')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with all props combined', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(
        <OfflineBanner
          isVisible={true}
          message="Custom offline message"
          showClose
          onClose={onClose}
          className="test-class"
        />
      );

      expect(screen.getByText(/Custom offline message/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
      
      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should toggle visibility correctly', () => {
      const { rerender } = render(<OfflineBanner isVisible={true} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(<OfflineBanner isVisible={false} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});

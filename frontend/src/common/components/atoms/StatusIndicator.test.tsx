import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from './StatusIndicator';

describe('StatusIndicator', () => {
  describe('Rendering', () => {
    it('should render the status indicator', () => {
      const { container } = render(<StatusIndicator status="online" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render all status types', () => {
      const statuses: Array<'online' | 'offline' | 'syncing' | 'synced' | 'error'> = [
        'online',
        'offline',
        'syncing',
        'synced',
        'error',
      ];

      statuses.forEach((status) => {
        const { container } = render(<StatusIndicator status={status} />);
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('Status Colors - Requirement 14.1', () => {
    it('should apply online color (green)', () => {
      const { container } = render(<StatusIndicator status="online" />);
      const dot = container.querySelector('.bg-status-online');
      expect(dot).toBeInTheDocument();
    });

    it('should apply offline color (red)', () => {
      const { container } = render(<StatusIndicator status="offline" />);
      const dot = container.querySelector('.bg-status-offline');
      expect(dot).toBeInTheDocument();
    });

    it('should apply syncing color (blue)', () => {
      const { container } = render(<StatusIndicator status="syncing" />);
      const dot = container.querySelector('.bg-status-syncing');
      expect(dot).toBeInTheDocument();
    });

    it('should apply synced color (green)', () => {
      const { container } = render(<StatusIndicator status="synced" />);
      const dot = container.querySelector('.bg-status-synced');
      expect(dot).toBeInTheDocument();
    });

    it('should apply error color (red)', () => {
      const { container } = render(<StatusIndicator status="error" />);
      const dot = container.querySelector('.bg-status-error');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Sizes - Requirement 14.5', () => {
    it('should render sm size', () => {
      const { container } = render(<StatusIndicator status="online" size="sm" />);
      const dot = container.querySelector('.w-2.h-2');
      expect(dot).toBeInTheDocument();
    });

    it('should render md size by default', () => {
      const { container } = render(<StatusIndicator status="online" />);
      const dot = container.querySelector('.w-3.h-3');
      expect(dot).toBeInTheDocument();
    });

    it('should render lg size', () => {
      const { container } = render(<StatusIndicator status="online" size="lg" />);
      const dot = container.querySelector('.w-4.h-4');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Labels - Requirement 14.3', () => {
    it('should not show label by default', () => {
      const { container } = render(<StatusIndicator status="online" />);
      // Label text exists in screen reader text but not visible
      const visibleLabel = container.querySelector('span:not(.sr-only)');
      expect(visibleLabel).toBeNull();
    });

    it('should show default label when showLabel is true', () => {
      render(<StatusIndicator status="online" showLabel />);
      expect(screen.getByText('Online')).toBeVisible();
    });

    it('should show custom label when provided', () => {
      render(<StatusIndicator status="online" label="Connected" showLabel />);
      expect(screen.getByText('Connected')).toBeVisible();
    });

    it('should show correct default labels for each status', () => {
      const { rerender } = render(<StatusIndicator status="online" showLabel />);
      expect(screen.getByText('Online')).toBeVisible();

      rerender(<StatusIndicator status="offline" showLabel />);
      expect(screen.getByText('Offline')).toBeVisible();

      rerender(<StatusIndicator status="syncing" showLabel />);
      expect(screen.getByText('Syncing...')).toBeVisible();

      rerender(<StatusIndicator status="synced" showLabel />);
      expect(screen.getByText('Synced')).toBeVisible();

      rerender(<StatusIndicator status="error" showLabel />);
      expect(screen.getByText('Error')).toBeVisible();
    });

    it('should apply correct text size for sm', () => {
      const { container } = render(<StatusIndicator status="online" showLabel size="sm" />);
      const label = container.querySelector('.text-xs');
      expect(label).toBeInTheDocument();
    });

    it('should apply correct text size for md', () => {
      const { container } = render(<StatusIndicator status="online" showLabel size="md" />);
      const label = container.querySelector('.text-sm');
      expect(label).toBeInTheDocument();
    });

    it('should apply correct text size for lg', () => {
      const { container } = render(<StatusIndicator status="online" showLabel size="lg" />);
      const label = container.querySelector('.text-base');
      expect(label).toBeInTheDocument();
    });

    it('should apply correct text color for each status', () => {
      const { container, rerender } = render(<StatusIndicator status="online" showLabel />);
      expect(container.querySelector('.text-status-online')).toBeInTheDocument();

      rerender(<StatusIndicator status="offline" showLabel />);
      expect(container.querySelector('.text-status-offline')).toBeInTheDocument();

      rerender(<StatusIndicator status="syncing" showLabel />);
      expect(container.querySelector('.text-status-syncing')).toBeInTheDocument();
    });
  });

  describe('Animations - Requirement 14.2, 14.10', () => {
    it('should animate syncing status', () => {
      const { container } = render(<StatusIndicator status="syncing" />);
      const dot = container.querySelector('.animate-pulse');
      expect(dot).toBeInTheDocument();
    });

    it('should show ping animation for syncing', () => {
      const { container } = render(<StatusIndicator status="syncing" />);
      const ping = container.querySelector('.animate-ping');
      expect(ping).toBeInTheDocument();
    });

    it('should animate error status with pulse', () => {
      const { container } = render(<StatusIndicator status="error" />);
      const dot = container.querySelector('.animate-pulse-fast');
      expect(dot).toBeInTheDocument();
    });

    it('should show ping animation for error', () => {
      const { container } = render(<StatusIndicator status="error" />);
      const ping = container.querySelector('.animate-ping');
      expect(ping).toBeInTheDocument();
    });

    it('should not animate non-syncing/error statuses', () => {
      const { container } = render(<StatusIndicator status="online" />);
      const pulse = container.querySelector('.animate-pulse');
      expect(pulse).not.toBeInTheDocument();
    });
  });

  describe('Count Badge - Requirement 14.4', () => {
    it('should display count badge when count is provided', () => {
      render(<StatusIndicator status="error" count={5} />);
      expect(screen.getByText('5')).toBeVisible();
    });

    it('should not display badge when count is 0', () => {
      const { container } = render(<StatusIndicator status="error" count={0} />);
      const badge = container.querySelector('.rounded-full.font-semibold');
      expect(badge).not.toBeInTheDocument();
    });

    it('should not display badge when count is undefined', () => {
      const { container } = render(<StatusIndicator status="error" />);
      const badge = container.querySelector('.rounded-full.font-semibold');
      expect(badge).not.toBeInTheDocument();
    });

    it('should display "99+" for counts over 99', () => {
      render(<StatusIndicator status="error" count={150} />);
      expect(screen.getByText('99+')).toBeVisible();
    });

    it('should display exact count for counts under 100', () => {
      render(<StatusIndicator status="error" count={42} />);
      expect(screen.getByText('42')).toBeVisible();
    });

    it('should apply correct badge size for sm', () => {
      const { container } = render(<StatusIndicator status="error" count={5} size="sm" />);
      const badge = container.querySelector('.text-\\[10px\\]');
      expect(badge).toBeInTheDocument();
    });

    it('should apply correct badge size for md', () => {
      const { container } = render(<StatusIndicator status="error" count={5} size="md" />);
      const badge = container.querySelector('.text-xs');
      expect(badge).toBeInTheDocument();
    });

    it('should apply correct badge size for lg', () => {
      const { container } = render(<StatusIndicator status="error" count={5} size="lg" />);
      const badge = container.querySelector('.text-sm');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Tooltip - Requirement 14.6', () => {
    it('should add tooltip when provided', () => {
      const { container } = render(
        <StatusIndicator status="online" tooltip="Connected to server" />
      );
      const element = container.firstChild as HTMLElement;
      expect(element.title).toBe('Connected to server');
    });

    it('should not have tooltip when not provided', () => {
      const { container } = render(<StatusIndicator status="online" />);
      const element = container.firstChild as HTMLElement;
      expect(element.title).toBe('');
    });

    it('should include tooltip in screen reader text', () => {
      render(<StatusIndicator status="online" tooltip="Connected to server" />);
      expect(screen.getByText(/Connected to server/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have screen reader text for status', () => {
      render(<StatusIndicator status="online" />);
      expect(screen.getByText('Status: Online')).toBeInTheDocument();
    });

    it('should have screen reader text with custom label', () => {
      render(<StatusIndicator status="online" label="Connected to server" />);
      expect(screen.getByText('Status: Connected to server')).toBeInTheDocument();
    });

    it('should include count in screen reader text', () => {
      render(<StatusIndicator status="error" count={5} />);
      expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
    });

    it('should have aria-hidden on visual elements', () => {
      const { container } = render(<StatusIndicator status="online" />);
      const dots = container.querySelectorAll('[aria-hidden="true"]');
      expect(dots.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Props', () => {
    it('should accept additional className', () => {
      const { container } = render(<StatusIndicator status="online" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(<StatusIndicator status="online" className="ml-4" />);
      expect(container.firstChild).toHaveClass('inline-flex');
      expect(container.firstChild).toHaveClass('ml-4');
    });
  });

  describe('Integration', () => {
    it('should work with multiple indicators in a group', () => {
      const { container } = render(
        <div>
          <StatusIndicator status="online" showLabel />
          <StatusIndicator status="syncing" showLabel />
          <StatusIndicator status="offline" showLabel />
        </div>
      );

      expect(screen.getByText('Online')).toBeVisible();
      expect(screen.getByText('Syncing...')).toBeVisible();
      expect(screen.getByText('Offline')).toBeVisible();
    });

    it('should maintain consistent sizing across multiple indicators', () => {
      const { container } = render(
        <div>
          <StatusIndicator status="online" size="md" />
          <StatusIndicator status="syncing" size="md" />
          <StatusIndicator status="offline" size="md" />
        </div>
      );

      const dots = container.querySelectorAll('.w-3.h-3');
      expect(dots.length).toBe(3);
    });

    it('should work with all features combined', () => {
      render(
        <StatusIndicator
          status="error"
          showLabel
          count={5}
          tooltip="5 sync errors"
          size="lg"
        />
      );

      expect(screen.getByText('Error')).toBeVisible();
      expect(screen.getByText('5')).toBeVisible();
      expect(screen.getByText(/5 sync errors/)).toBeInTheDocument();
    });
  });
});

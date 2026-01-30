import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncProgressIndicator } from './SyncProgressIndicator';

describe('SyncProgressIndicator', () => {
  describe('Rendering - Requirement 14.9', () => {
    it('should not render when isSyncing is false', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when isSyncing is true', () => {
      render(<SyncProgressIndicator isSyncing={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should display default syncing message', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} />);
      const visibleText = container.querySelector('.font-medium');
      expect(visibleText).toHaveTextContent(/Syncing\.\.\./i);
    });

    it('should display custom message when provided', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} message="Uploading changes..." />);
      const visibleText = container.querySelector('.font-medium');
      expect(visibleText).toHaveTextContent(/Uploading changes/i);
    });

    it('should display syncing icon', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} />);
      // RefreshCw icon should be present
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have spinning animation on icon', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} />);
      const icon = container.querySelector('.animate-spin');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('should display progress bar when progress is provided', () => {
      render(<SyncProgressIndicator isSyncing={true} progress={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not display progress bar when progress is not provided', () => {
      render(<SyncProgressIndicator isSyncing={true} />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('should set correct progress value', () => {
      render(<SyncProgressIndicator isSyncing={true} progress={65} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
    });

    it('should calculate progress from items synced and total', () => {
      render(<SyncProgressIndicator isSyncing={true} itemsSynced={45} totalItems={100} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
    });

    it('should display item count message', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} itemsSynced={45} totalItems={100} />);
      const visibleText = container.querySelector('.font-medium');
      expect(visibleText).toHaveTextContent(/Syncing 45 of 100 items/i);
    });

    it('should prefer explicit progress over calculated progress', () => {
      render(
        <SyncProgressIndicator 
          isSyncing={true} 
          progress={75} 
          itemsSynced={45} 
          totalItems={100} 
        />
      );
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should handle 0% progress', () => {
      render(<SyncProgressIndicator isSyncing={true} progress={0} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should handle 100% progress', () => {
      render(<SyncProgressIndicator isSyncing={true} progress={100} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should clamp progress above 100', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} progress={150} />);
      const progressFill = container.querySelector('.bg-status-syncing.transition-all');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('should clamp progress below 0', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} progress={-10} />);
      const progressFill = container.querySelector('.bg-status-syncing.transition-all');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });
  });

  describe('Sizes - Requirement 14.5', () => {
    it('should render sm size', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} size="sm" />);
      expect(container.querySelector('.text-xs')).toBeInTheDocument();
    });

    it('should render md size by default', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} />);
      expect(container.querySelector('.text-sm')).toBeInTheDocument();
    });

    it('should render lg size', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} size="lg" />);
      expect(container.querySelector('.text-base')).toBeInTheDocument();
    });

    it('should apply correct progress bar height for sm', () => {
      const { container } = render(
        <SyncProgressIndicator isSyncing={true} progress={50} size="sm" />
      );
      expect(container.querySelector('.h-1')).toBeInTheDocument();
    });

    it('should apply correct progress bar height for md', () => {
      const { container } = render(
        <SyncProgressIndicator isSyncing={true} progress={50} size="md" />
      );
      expect(container.querySelector('.h-1\\.5')).toBeInTheDocument();
    });

    it('should apply correct progress bar height for lg', () => {
      const { container } = render(
        <SyncProgressIndicator isSyncing={true} progress={50} size="lg" />
      );
      expect(container.querySelector('.h-2')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have syncing status color', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} />);
      expect(container.querySelector('.text-status-syncing')).toBeInTheDocument();
    });

    it('should have syncing background color', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} />);
      expect(container.querySelector('.bg-status-syncing\\/20')).toBeInTheDocument();
    });

    it('should have syncing border color', () => {
      const { container } = render(<SyncProgressIndicator isSyncing={true} />);
      expect(container.querySelector('.border-status-syncing\\/30')).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      const { container } = render(
        <SyncProgressIndicator isSyncing={true} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<SyncProgressIndicator isSyncing={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-live="polite"', () => {
      render(<SyncProgressIndicator isSyncing={true} />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('should have screen reader text for message', () => {
      render(<SyncProgressIndicator isSyncing={true} />);
      expect(screen.getByText(/Syncing\.\.\./i, { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('should include progress percentage in screen reader text', () => {
      render(<SyncProgressIndicator isSyncing={true} progress={65} />);
      expect(screen.getByText(/65% complete/i)).toBeInTheDocument();
    });

    it('should have proper progressbar attributes', () => {
      render(<SyncProgressIndicator isSyncing={true} progress={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });
  });

  describe('Integration', () => {
    it('should work with all props combined', () => {
      const { container } = render(
        <SyncProgressIndicator
          isSyncing={true}
          progress={75}
          itemsSynced={75}
          totalItems={100}
          message="Custom sync message"
          size="lg"
          className="test-class"
        />
      );

      const visibleText = container.querySelector('.font-medium');
      expect(visibleText).toHaveTextContent(/Custom sync message/i);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
      expect(screen.getByRole('status')).toHaveClass('test-class');
    });

    it('should toggle visibility correctly', () => {
      const { rerender } = render(<SyncProgressIndicator isSyncing={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<SyncProgressIndicator isSyncing={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should update progress dynamically', () => {
      const { rerender } = render(<SyncProgressIndicator isSyncing={true} progress={25} />);
      let progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');

      rerender(<SyncProgressIndicator isSyncing={true} progress={75} />);
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });
  });
});

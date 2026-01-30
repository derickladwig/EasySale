import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ProgressBar,
  DeterminateProgressBar,
  IndeterminateProgressBar,
} from './ProgressBar';

describe('ProgressBar', () => {
  describe('Determinate Progress', () => {
    it('renders with correct progress value', () => {
      const { container } = render(<ProgressBar value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('clamps value between 0 and 100', () => {
      const { container: container1 } = render(<ProgressBar value={-10} />);
      const progressBar1 = container1.querySelector('[role="progressbar"]');
      expect(progressBar1).toHaveAttribute('aria-valuenow', '0');

      const { container: container2 } = render(<ProgressBar value={150} />);
      const progressBar2 = container2.querySelector('[role="progressbar"]');
      expect(progressBar2).toHaveAttribute('aria-valuenow', '100');
    });

    it('renders with label when showLabel is true', () => {
      render(<ProgressBar value={65} showLabel />);
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<ProgressBar value={50} label="Uploading files..." />);
      expect(screen.getByText('Uploading files...')).toBeInTheDocument();
    });

    it('does not render label by default', () => {
      const { container } = render(<ProgressBar value={50} />);
      expect(container.querySelector('.text-sm')).not.toBeInTheDocument();
    });

    it('applies correct width style based on value', () => {
      const { container } = render(<ProgressBar value={75} />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveStyle({ width: '75%' });
    });
  });

  describe('Indeterminate Progress', () => {
    it('renders indeterminate progress when value is undefined', () => {
      const { container } = render(<ProgressBar />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).not.toHaveAttribute('aria-valuenow');
    });

    it('applies indeterminate animation class', () => {
      const { container } = render(<ProgressBar />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('animate-progress-indeterminate');
    });

    it('sets width to 40% for indeterminate state', () => {
      const { container } = render(<ProgressBar />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveStyle({ width: '40%' });
    });

    it('does not show label for indeterminate progress', () => {
      const { container } = render(<ProgressBar showLabel />);
      expect(container.querySelector('.text-sm')).not.toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      const { container } = render(<ProgressBar value={50} size="sm" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-1');
    });

    it('renders medium size correctly (default)', () => {
      const { container } = render(<ProgressBar value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-2');
    });

    it('renders large size correctly', () => {
      const { container } = render(<ProgressBar value={50} size="lg" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-3');
    });
  });

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      const { container } = render(<ProgressBar value={50} variant="default" />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('bg-secondary-400');
    });

    it('renders primary variant correctly', () => {
      const { container } = render(<ProgressBar value={50} variant="primary" />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('bg-primary-500');
    });

    it('renders success variant correctly', () => {
      const { container } = render(<ProgressBar value={50} variant="success" />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('bg-success-DEFAULT');
    });

    it('renders warning variant correctly', () => {
      const { container } = render(<ProgressBar value={50} variant="warning" />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('bg-warning-DEFAULT');
    });

    it('renders error variant correctly', () => {
      const { container } = render(<ProgressBar value={50} variant="error" />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('bg-error-DEFAULT');
    });

    it('renders info variant correctly', () => {
      const { container } = render(<ProgressBar value={50} variant="info" />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('bg-info-DEFAULT');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes for determinate progress', () => {
      const { container } = render(<ProgressBar value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Progress');
    });

    it('has correct ARIA attributes for indeterminate progress', () => {
      const { container } = render(<ProgressBar />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).not.toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-label', 'Loading');
    });

    it('uses custom aria-label when provided', () => {
      const { container } = render(<ProgressBar value={50} aria-label="Custom loading" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-label', 'Custom loading');
    });

    it('uses label text as aria-label when provided', () => {
      const { container } = render(<ProgressBar value={50} label="Uploading..." />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-label', 'Uploading...');
    });
  });

  describe('Animations', () => {
    it('applies smooth transition for determinate progress', () => {
      const { container } = render(<ProgressBar value={50} />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('transition-all');
      expect(fill).toHaveClass('duration-300');
      expect(fill).toHaveClass('ease-out');
    });

    it('applies indeterminate animation for indeterminate progress', () => {
      const { container } = render(<ProgressBar />);
      const fill = container.querySelector('[role="progressbar"] > div');
      expect(fill).toHaveClass('animate-progress-indeterminate');
    });
  });

  describe('Custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(<ProgressBar value={50} className="custom-class" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });
});

describe('DeterminateProgressBar', () => {
  it('renders as a determinate progress bar', () => {
    const { container } = render(<DeterminateProgressBar value={75} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
  });

  it('requires value prop', () => {
    const { container } = render(<DeterminateProgressBar value={50} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('supports all ProgressBar props', () => {
    render(<DeterminateProgressBar value={60} variant="success" size="lg" showLabel />);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});

describe('IndeterminateProgressBar', () => {
  it('renders as an indeterminate progress bar', () => {
    const { container } = render(<IndeterminateProgressBar />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toHaveAttribute('aria-valuenow');
  });

  it('applies indeterminate animation', () => {
    const { container } = render(<IndeterminateProgressBar />);
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveClass('animate-progress-indeterminate');
  });

  it('supports variant and size props', () => {
    const { container } = render(<IndeterminateProgressBar variant="primary" size="lg" />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('h-3');
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveClass('bg-primary-500');
  });

  it('does not support showLabel prop', () => {
    const { container } = render(<IndeterminateProgressBar />);
    expect(container.querySelector('.text-sm')).not.toBeInTheDocument();
  });
});

describe('Requirements Validation', () => {
  it('validates Requirement 12.3: Use progress bars for determinate operations', () => {
    const { container } = render(<DeterminateProgressBar value={75} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('validates Requirement 12.4: Animate smoothly with CSS animations', () => {
    // Test determinate animation
    const { container: container1 } = render(<DeterminateProgressBar value={50} />);
    const fill1 = container1.querySelector('[role="progressbar"] > div');
    expect(fill1).toHaveClass('transition-all');
    expect(fill1).toHaveClass('duration-300');
    expect(fill1).toHaveClass('ease-out');

    // Test indeterminate animation
    const { container: container2 } = render(<IndeterminateProgressBar />);
    const fill2 = container2.querySelector('[role="progressbar"] > div');
    expect(fill2).toHaveClass('animate-progress-indeterminate');
  });
});

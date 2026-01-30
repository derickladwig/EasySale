/**
 * Skeleton Component Tests
 *
 * Tests for the base Skeleton component and its variants.
 *
 * Requirements tested:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 */

import { describe, it, expect } from 'vitest';
import { render, screen as _screen } from '@testing-library/react';
import { Skeleton, SkeletonText, SkeletonAvatar } from '../Skeleton';

describe('Skeleton Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('bg-background-tertiary');
      expect(skeleton).toHaveClass('rounded');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should have proper ARIA attributes for accessibility', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveClass('custom-class');
    });
  });

  describe('Variants (Requirement 12.5)', () => {
    it('should render rectangle variant with rounded corners', () => {
      const { container } = render(<Skeleton variant="rectangle" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveClass('rounded');
    });

    it('should render circle variant with rounded-full', () => {
      const { container } = render(<Skeleton variant="circle" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveClass('rounded-full');
    });

    it('should render text variant with default dimensions', () => {
      const { container } = render(<Skeleton variant="text" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveClass('w-full');
      expect(skeleton).toHaveClass('h-4');
      expect(skeleton).toHaveClass('rounded');
    });
  });

  describe('Animation Speed (Requirement 12.6)', () => {
    it('should use normal pulse animation by default', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should use slow pulse animation when specified', () => {
      const { container } = render(<Skeleton speed="slow" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveClass('animate-pulse-slow');
    });

    it('should use fast pulse animation when specified', () => {
      const { container } = render(<Skeleton speed="fast" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveClass('animate-pulse-fast');
    });
  });

  describe('Custom Dimensions', () => {
    it('should apply custom width as string', () => {
      const { container } = render(<Skeleton width="200px" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveStyle({ width: '200px' });
    });

    it('should apply custom width as number', () => {
      const { container } = render(<Skeleton width={150} />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveStyle({ width: '150px' });
    });

    it('should apply custom height as string', () => {
      const { container } = render(<Skeleton height="50px" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveStyle({ height: '50px' });
    });

    it('should apply custom height as number', () => {
      const { container } = render(<Skeleton height={100} />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveStyle({ height: '100px' });
    });
  });
});

describe('SkeletonText Component', () => {
  describe('Basic Rendering', () => {
    it('should render default 3 lines', () => {
      const { container } = render(<SkeletonText />);
      const lines = container.querySelectorAll('.h-4');

      expect(lines).toHaveLength(3);
    });

    it('should render custom number of lines', () => {
      const { container } = render(<SkeletonText lines={5} />);
      const lines = container.querySelectorAll('.h-4');

      expect(lines).toHaveLength(5);
    });

    it('should apply normal spacing by default', () => {
      const { container } = render(<SkeletonText />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('space-y-3');
    });
  });

  describe('Spacing Options', () => {
    it('should apply tight spacing', () => {
      const { container } = render(<SkeletonText spacing="tight" />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('space-y-2');
    });

    it('should apply loose spacing', () => {
      const { container } = render(<SkeletonText spacing="loose" />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('space-y-4');
    });
  });

  describe('Last Line Width (Requirement 12.5)', () => {
    it('should apply default 60% width to last line', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const lines = container.querySelectorAll('.h-4');
      const lastLine = lines[lines.length - 1] as HTMLElement;

      expect(lastLine.style.width).toBe('60%');
    });

    it('should apply custom width to last line', () => {
      const { container } = render(<SkeletonText lines={3} lastLineWidth="75%" />);
      const lines = container.querySelectorAll('.h-4');
      const lastLine = lines[lines.length - 1] as HTMLElement;

      expect(lastLine.style.width).toBe('75%');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SkeletonText className="custom-text-class" />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('custom-text-class');
    });
  });
});

describe('SkeletonAvatar Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default medium size', () => {
      const { container } = render(<SkeletonAvatar />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar).toHaveClass('w-12');
      expect(avatar).toHaveClass('h-12');
      expect(avatar).toHaveClass('rounded-full');
    });

    it('should have pulsing animation (Requirement 12.6)', () => {
      const { container } = render(<SkeletonAvatar />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar).toHaveClass('animate-pulse');
    });
  });

  describe('Size Variants (Requirement 12.5)', () => {
    it('should render small size', () => {
      const { container } = render(<SkeletonAvatar size="sm" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar).toHaveClass('w-8');
      expect(avatar).toHaveClass('h-8');
    });

    it('should render medium size', () => {
      const { container } = render(<SkeletonAvatar size="md" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar).toHaveClass('w-12');
      expect(avatar).toHaveClass('h-12');
    });

    it('should render large size', () => {
      const { container } = render(<SkeletonAvatar size="lg" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar).toHaveClass('w-16');
      expect(avatar).toHaveClass('h-16');
    });

    it('should render extra large size', () => {
      const { container } = render(<SkeletonAvatar size="xl" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar).toHaveClass('w-24');
      expect(avatar).toHaveClass('h-24');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SkeletonAvatar className="custom-avatar-class" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar).toHaveClass('custom-avatar-class');
    });
  });
});

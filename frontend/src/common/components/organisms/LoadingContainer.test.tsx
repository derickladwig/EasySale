/**
 * LoadingContainer Component Tests
 *
 * Tests for the LoadingContainer component that manages loading, error, and content states.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingContainer } from './LoadingContainer';

describe('LoadingContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('should display loading spinner when isLoading is true', () => {
      render(
        <LoadingContainer isLoading={true}>
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should not display loading text immediately', () => {
      render(
        <LoadingContainer isLoading={true} loadingText="Processing...">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });

    it('should display loading text after delay for long operations (Requirement 12.7)', async () => {
      render(
        <LoadingContainer
          isLoading={true}
          loadingText="Processing your request..."
          showLoadingTextDelay={2000}
        >
          <div>Content</div>
        </LoadingContainer>
      );

      // Initially no text
      expect(screen.queryByText('Processing your request...')).not.toBeInTheDocument();

      // After delay, text should appear
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(screen.getByText('Processing your request...')).toBeInTheDocument();
    });

    it('should use custom delay for showing loading text', async () => {
      render(
        <LoadingContainer
          isLoading={true}
          loadingText="Loading..."
          showLoadingTextDelay={1000}
        >
          <div>Content</div>
        </LoadingContainer>
      );

      // Not visible before delay
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

      // Advance by custom delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should clear loading text timer when loading completes', async () => {
      const { rerender } = render(
        <LoadingContainer isLoading={true} loadingText="Loading...">
          <div>Content</div>
        </LoadingContainer>
      );

      // Start timer
      vi.advanceTimersByTime(1000);

      // Stop loading before delay completes
      rerender(
        <LoadingContainer isLoading={false} loadingText="Loading...">
          <div>Content</div>
        </LoadingContainer>
      );

      // Advance remaining time
      vi.advanceTimersByTime(1000);

      // Loading text should not appear
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should use custom spinner size', () => {
      render(
        <LoadingContainer isLoading={true} spinnerSize="sm">
          <div>Content</div>
        </LoadingContainer>
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should use custom spinner variant', () => {
      render(
        <LoadingContainer isLoading={true} spinnerVariant="success">
          <div>Content</div>
        </LoadingContainer>
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Content State', () => {
    it('should display content when not loading and no error', async () => {
      render(
        <LoadingContainer isLoading={false}>
          <div>Test Content</div>
        </LoadingContainer>
      );

      // Advance timer for fade-in
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should fade in content when loading completes (Requirement 12.8)', async () => {
      const { rerender } = render(
        <LoadingContainer isLoading={true}>
          <div>Content</div>
        </LoadingContainer>
      );

      // Initially loading
      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      // Stop loading
      rerender(
        <LoadingContainer isLoading={false}>
          <div>Content</div>
        </LoadingContainer>
      );

      // Advance timer for fade-in delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      const content = screen.getByText('Content');
      expect(content).toBeInTheDocument();
      // Check for opacity transition class
      expect(content.parentElement).toHaveClass('transition-opacity');
    });

    it('should apply custom className to content', async () => {
      render(
        <LoadingContainer isLoading={false} className="custom-class">
          <div>Content</div>
        </LoadingContainer>
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      const content = screen.getByText('Content');
      expect(content.parentElement).toHaveClass('custom-class');
    });
  });

  describe('Error State', () => {
    it('should display error state when error is provided (Requirement 12.9)', () => {
      const error = new Error('Something went wrong');

      render(
        <LoadingContainer isLoading={false} error={error}>
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should display error state with string error', () => {
      render(
        <LoadingContainer isLoading={false} error="Network error">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should display custom error title', () => {
      render(
        <LoadingContainer
          isLoading={false}
          error="Error occurred"
          errorTitle="Custom Error Title"
        >
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    });

    it('should display custom error message override', () => {
      render(
        <LoadingContainer
          isLoading={false}
          error={new Error('Original error')}
          errorMessage="Custom error message"
        >
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Original error')).not.toBeInTheDocument();
    });

    it('should display default error message for unknown errors', () => {
      render(
        <LoadingContainer isLoading={false} error={{} as Error}>
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });

    it('should display error icon (Requirement 12.10)', () => {
      render(
        <LoadingContainer isLoading={false} error="Error">
          <div>Content</div>
        </LoadingContainer>
      );

      // Check for error icon container using heading as reference
      const heading = screen.getByRole('heading', { name: 'Error' });
      const iconContainer = heading.parentElement?.querySelector('.bg-error-DEFAULT\\/10');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should display retry button by default', () => {
      const onRetry = vi.fn();

      render(
        <LoadingContainer isLoading={false} error="Error" onRetry={onRetry}>
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      vi.useRealTimers(); // Use real timers for userEvent
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <LoadingContainer isLoading={false} error="Error" onRetry={onRetry}>
          <div>Content</div>
        </LoadingContainer>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
      vi.useFakeTimers(); // Restore fake timers
    });

    it('should hide retry button when showRetry is false', () => {
      const onRetry = vi.fn();

      render(
        <LoadingContainer
          isLoading={false}
          error="Error"
          onRetry={onRetry}
          showRetry={false}
        >
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should not display retry button when onRetry is not provided', () => {
      render(
        <LoadingContainer isLoading={false} error="Error">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to content', async () => {
      const { rerender } = render(
        <LoadingContainer isLoading={true}>
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(
        <LoadingContainer isLoading={false}>
          <div>Content</div>
        </LoadingContainer>
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should transition from loading to error', () => {
      const { rerender } = render(
        <LoadingContainer isLoading={true}>
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(
        <LoadingContainer isLoading={false} error="Error occurred">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('should transition from error to loading', () => {
      const { rerender } = render(
        <LoadingContainer isLoading={false} error="Error">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByRole('heading', { name: 'Error' })).toBeInTheDocument();

      rerender(
        <LoadingContainer isLoading={true}>
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.queryByRole('heading', { name: 'Error' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should transition from error to content', async () => {
      const { rerender } = render(
        <LoadingContainer isLoading={false} error="Error">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByRole('heading', { name: 'Error' })).toBeInTheDocument();

      rerender(
        <LoadingContainer isLoading={false} error={null}>
          <div>Content</div>
        </LoadingContainer>
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.queryByRole('heading', { name: 'Error' })).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom minHeight', () => {
      const { container } = render(
        <LoadingContainer isLoading={true} minHeight="400px">
          <div>Content</div>
        </LoadingContainer>
      );

      const loadingContainer = container.firstChild as HTMLElement;
      expect(loadingContainer).toHaveStyle({ minHeight: '400px' });
    });

    it('should apply custom className to loading state', () => {
      const { container } = render(
        <LoadingContainer isLoading={true} className="custom-loading">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(container.firstChild).toHaveClass('custom-loading');
    });

    it('should apply custom className to error state', () => {
      const { container } = render(
        <LoadingContainer isLoading={false} error="Error" className="custom-error">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(container.firstChild).toHaveClass('custom-error');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', () => {
      render(
        <LoadingContainer isLoading={true}>
          <div>Content</div>
        </LoadingContainer>
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });

    it('should have accessible error message', () => {
      render(
        <LoadingContainer isLoading={false} error="Error message">
          <div>Content</div>
        </LoadingContainer>
      );

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should have accessible retry button', () => {
      const onRetry = vi.fn();

      render(
        <LoadingContainer isLoading={false} error="Error" onRetry={onRetry}>
          <div>Content</div>
        </LoadingContainer>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });
  });
});

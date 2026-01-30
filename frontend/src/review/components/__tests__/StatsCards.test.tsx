import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatsCards } from '../StatsCards';
import { DocumentStats } from '../../../documents/utils/statsAggregation';

describe('StatsCards', () => {
  const mockStats: DocumentStats = {
    needsReview: 12,
    processing: 3,
    failed: 2,
  };

  it('should render all three stat cards', () => {
    render(<StatsCards stats={mockStats} />);

    expect(screen.getByText('Needs Review')).toBeTruthy();
    expect(screen.getByText('Processing')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
  });

  it('should display correct values for each stat', () => {
    render(<StatsCards stats={mockStats} />);

    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('should show loading skeleton when isLoading is true', () => {
    const { container } = render(<StatsCards stats={mockStats} isLoading={true} />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('should call onCardClick when a card with non-zero value is clicked', () => {
    const onCardClick = vi.fn();
    render(<StatsCards stats={mockStats} onCardClick={onCardClick} />);

    const needsReviewCard = screen.getByText('Needs Review').closest('button');
    if (needsReviewCard) {
      fireEvent.click(needsReviewCard);
      expect(onCardClick).toHaveBeenCalledWith('NeedsReview');
    }
  });

  it('should not call onCardClick when a card with zero value is clicked', () => {
    const onCardClick = vi.fn();
    const zeroStats: DocumentStats = {
      needsReview: 0,
      processing: 0,
      failed: 0,
    };
    render(<StatsCards stats={zeroStats} onCardClick={onCardClick} />);

    const needsReviewCard = screen.getByText('Needs Review').closest('button');
    if (needsReviewCard) {
      fireEvent.click(needsReviewCard);
      expect(onCardClick).not.toHaveBeenCalled();
    }
  });

  it('should disable cards with zero values', () => {
    const zeroStats: DocumentStats = {
      needsReview: 0,
      processing: 0,
      failed: 0,
    };
    render(<StatsCards stats={zeroStats} onCardClick={vi.fn()} />);

    const needsReviewCard = screen.getByText('Needs Review').closest('button');
    expect(needsReviewCard?.disabled).toBe(true);
  });

  it('should not disable cards with non-zero values when onCardClick is provided', () => {
    render(<StatsCards stats={mockStats} onCardClick={vi.fn()} />);

    const needsReviewCard = screen.getByText('Needs Review').closest('button');
    expect(needsReviewCard?.disabled).toBe(false);
  });

  it('should render cards as non-clickable when onCardClick is not provided', () => {
    const { container } = render(<StatsCards stats={mockStats} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button.disabled).toBe(true);
    });
  });
});

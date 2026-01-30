import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextActionCenter } from './NextActionCenter';
import { DocumentStats } from '../hooks/useReviewApi';

describe('NextActionCenter', () => {
  it('should display failed documents as highest priority', () => {
    const stats: DocumentStats = {
      needsReview: 5,
      processing: 2,
      failed: 3,
    };
    const onAction = vi.fn();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    expect(screen.getByText('Failed Documents Need Attention')).toBeTruthy();
    expect(screen.getByText(/3 documents failed processing/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review Failed' })).toBeTruthy();
  });

  it('should display needs review when no failed cases', () => {
    const stats: DocumentStats = {
      needsReview: 10,
      processing: 2,
      failed: 0,
    };
    const onAction = vi.fn();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    expect(screen.getByText('Cases Ready for Review')).toBeTruthy();
    expect(screen.getByText(/10 cases are waiting for review/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start Reviewing' })).toBeTruthy();
  });

  it('should display processing status when no failed or needs review', () => {
    const stats: DocumentStats = {
      needsReview: 0,
      processing: 5,
      failed: 0,
    };
    const onAction = vi.fn();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    expect(screen.getByText('Documents Processing')).toBeTruthy();
    expect(screen.getByText(/5 documents are currently being processed/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View Status' })).toBeTruthy();
  });

  it('should display upload prompt when all queues are empty', () => {
    const stats: DocumentStats = {
      needsReview: 0,
      processing: 0,
      failed: 0,
    };
    const onAction = vi.fn();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    expect(screen.getByText('All Caught Up!')).toBeTruthy();
    expect(screen.getByText(/No pending cases/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload Documents' })).toBeTruthy();
  });

  it('should call onAction with correct action when button clicked', async () => {
    const stats: DocumentStats = {
      needsReview: 5,
      processing: 0,
      failed: 0,
    };
    const onAction = vi.fn();
    const user = userEvent.setup();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    const button = screen.getByRole('button', { name: 'Start Reviewing' });
    await user.click(button);

    expect(onAction).toHaveBeenCalledWith('reviewCases');
  });

  it('should show secondary actions when multiple priorities exist', () => {
    const stats: DocumentStats = {
      needsReview: 5,
      processing: 2,
      failed: 3,
    };
    const onAction = vi.fn();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    // Primary action should be failed (highest priority)
    expect(screen.getByRole('button', { name: 'Review Failed' })).toBeTruthy();

    // Secondary actions should be visible
    expect(screen.getByText('Also available:')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start Reviewing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View Status' })).toBeTruthy();
  });

  it('should handle singular vs plural correctly', () => {
    const stats: DocumentStats = {
      needsReview: 1,
      processing: 0,
      failed: 0,
    };
    const onAction = vi.fn();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    // Should use singular form
    expect(screen.getByText(/1 case is waiting for review/)).toBeTruthy();
  });

  it('should prioritize failed over needs review', () => {
    const stats: DocumentStats = {
      needsReview: 10,
      processing: 0,
      failed: 1,
    };
    const onAction = vi.fn();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    // Failed should be primary action
    expect(screen.getByText('Failed Documents Need Attention')).toBeTruthy();
    
    // Needs review should be secondary
    expect(screen.getByRole('button', { name: 'Start Reviewing' })).toBeTruthy();
  });

  it('should prioritize needs review over processing', () => {
    const stats: DocumentStats = {
      needsReview: 5,
      processing: 10,
      failed: 0,
    };
    const onAction = vi.fn();

    render(<NextActionCenter stats={stats} onAction={onAction} />);

    // Needs review should be primary action
    expect(screen.getByText('Cases Ready for Review')).toBeTruthy();
    
    // Processing should be secondary
    expect(screen.getByRole('button', { name: 'View Status' })).toBeTruthy();
  });
});

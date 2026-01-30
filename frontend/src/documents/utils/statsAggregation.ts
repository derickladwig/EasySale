/**
 * Stats aggregation utilities for Document Center
 * 
 * These functions calculate statistics from case data for display in the Document Center.
 */

export interface CaseWithState {
  case_id: string;
  state: 'NeedsReview' | 'Processing' | 'Queued' | 'Failed' | 'Approved' | 'AutoApproved' | 'InReview' | 'Rejected' | 'Exported';
  [key: string]: unknown;
}

export interface DocumentStats {
  needsReview: number;
  processing: number;
  failed: number;
}

/**
 * Calculate document statistics from an array of cases
 * 
 * **Validates: Requirements 1.2**
 * 
 * @param cases - Array of cases with state information
 * @returns Statistics object with counts for different states
 */
export function calculateStats(cases: CaseWithState[]): DocumentStats {
  const needsReview = cases.filter(c => c.state === 'NeedsReview').length;
  const processing = cases.filter(c => c.state === 'Processing' || c.state === 'Queued').length;
  const failed = cases.filter(c => c.state === 'Failed').length;

  return {
    needsReview,
    processing,
    failed,
  };
}

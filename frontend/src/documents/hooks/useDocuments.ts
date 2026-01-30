/**
 * useDocuments Hook
 * 
 * Hook for fetching documents from the cases API.
 * This is a presentation layer on top of the cases API - the Document Center
 * and Review Queue both use the same /api/cases endpoint.
 * 
 * Requirements: 1.11
 */

import { useReviewQueue, QueueFilters } from '../../review/hooks/useReviewApi';

export interface DocumentFilters extends QueueFilters {
  // Document-specific filters can be added here if needed
  // For now, we use the same filters as the review queue
}

/**
 * Fetch documents from the cases API
 * 
 * This hook is essentially an alias for useReviewQueue since documents
 * are backed by the /api/cases endpoint (Requirement 1.11).
 * 
 * @param filters - Filters to apply to the document list
 * @returns Query result with documents (cases) data
 */
export function useDocuments(filters: DocumentFilters = {}) {
  return useReviewQueue(filters);
}

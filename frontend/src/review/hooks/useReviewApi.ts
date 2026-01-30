import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@common/api/client';

// Types matching backend models
export interface ReviewCase {
  case_id: string;
  state: 'AutoApproved' | 'NeedsReview' | 'InReview' | 'Approved' | 'Rejected' | 'Exported' | 'Processing' | 'Queued' | 'Failed';
  vendor_name?: string;
  confidence: number;
  created_at: string;
  fields_needing_attention: number;
  validation_result?: ValidationSummary;
}

export interface CaseDetail {
  case_id: string;
  state: string;
  confidence: number;
  created_at: string;
  extracted: InvoiceExtraction;
  validation_result: ValidationSummary;
}

export interface InvoiceExtraction {
  invoice_number?: string;
  invoice_date?: string;
  vendor_name?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  line_items: LineItem[];
}

export interface LineItem {
  sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface ValidationSummary {
  hard_flags: string[];
  soft_flags: string[];
  can_approve: boolean;
}

export interface QueueFilters {
  state?: string;
  vendor?: string;
  min_conf?: number;
  sort?: string;
  page?: number;
  per_page?: number;
}

export interface DecideFieldRequest {
  field: string;
  chosen_value: string;
  source: string;
}

export interface DecideFieldResponse {
  updated_confidence: number;
  validation_result: ValidationSummary;
}

export interface ApproveResponse {
  approved: boolean;
  blocking_reasons: string[];
  state: string;
}

export interface UndoResponse {
  restored_decision: string;
  current_state: string;
}

// Response types matching backend
export interface ListCasesResponse {
  cases: ReviewCase[];
  total: number;
  page: number;
  per_page: number;
}

// API Hooks
export function useReviewQueue(filters: QueueFilters = {}) {
  return useQuery<ListCasesResponse>({
    queryKey: ['review-queue', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await api.get<ListCasesResponse>(`/api/cases?${params}`);
      
      // Ensure we always return a valid response structure even if backend returns unexpected data
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server');
      }
      
      return {
        cases: Array.isArray(response.cases) ? response.cases : [],
        total: typeof response.total === 'number' ? response.total : 0,
        page: typeof response.page === 'number' ? response.page : 1,
        per_page: typeof response.per_page === 'number' ? response.per_page : 20,
      };
    },
    // Add retry logic for transient failures
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Keep data fresh but don't refetch too aggressively
    staleTime: 30000, // 30 seconds
    // Show cached data while refetching
    refetchOnWindowFocus: true,
  });
}

export function useReviewCase(caseId: string) {
  return useQuery<CaseDetail>({
    queryKey: ['review-case', caseId],
    queryFn: async () => {
      if (!caseId) {
        throw new Error('Case ID is required');
      }
      
      const response = await api.get<CaseDetail>(`/api/cases/${caseId}`);
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server');
      }
      
      return response;
    },
    enabled: !!caseId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 10000, // 10 seconds - case details change less frequently
  });
}

export function useDecideField() {
  const queryClient = useQueryClient();
  
  return useMutation<DecideFieldResponse, Error, DecideFieldRequest & { caseId: string }>({
    mutationFn: async ({ caseId, ...request }: DecideFieldRequest & { caseId: string }) => {
      if (!caseId) {
        throw new Error('Case ID is required');
      }
      if (!request.field || !request.chosen_value || !request.source) {
        throw new Error('Field, chosen_value, and source are required');
      }
      
      const response = await api.post<DecideFieldResponse>(`/api/cases/${caseId}/decide`, request);
      return response;
    },
    onSuccess: (_, { caseId }) => {
      // Invalidate both the specific case and the queue
      queryClient.invalidateQueries({ queryKey: ['review-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (error) => {
      console.error('Failed to decide field:', error);
    },
  });
}

export function useApproveCase() {
  const queryClient = useQueryClient();
  
  return useMutation<ApproveResponse, Error, string>({
    mutationFn: async (caseId: string) => {
      if (!caseId) {
        throw new Error('Case ID is required');
      }
      
      const response = await api.post<ApproveResponse>(`/api/cases/${caseId}/approve`);
      return response;
    },
    onSuccess: (_, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['review-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (error) => {
      console.error('Failed to approve case:', error);
    },
  });
}

export function useUndoDecision() {
  const queryClient = useQueryClient();
  
  return useMutation<UndoResponse, Error, string>({
    mutationFn: async (caseId: string) => {
      if (!caseId) {
        throw new Error('Case ID is required');
      }
      
      const response = await api.post<UndoResponse>(`/api/cases/${caseId}/undo`);
      return response;
    },
    onSuccess: (_, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['review-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (error) => {
      console.error('Failed to undo decision:', error);
    },
  });
}

// Stats hook for fetching document statistics
export interface DocumentStats {
  needsReview: number;
  processing: number;
  failed: number;
}

export function useDocumentStats() {
  return useQuery<DocumentStats>({
    queryKey: ['document-stats'],
    queryFn: async () => {
      // Fetch counts for each state by making parallel requests
      const [needsReviewRes, processingRes, queuedRes, failedRes] = await Promise.all([
        api.get<ListCasesResponse>('/api/cases?state=NeedsReview&per_page=1'),
        api.get<ListCasesResponse>('/api/cases?state=Processing&per_page=1'),
        api.get<ListCasesResponse>('/api/cases?state=Queued&per_page=1'),
        api.get<ListCasesResponse>('/api/cases?state=Failed&per_page=1'),
      ]);

      return {
        needsReview: needsReviewRes?.total || 0,
        processing: (processingRes?.total || 0) + (queuedRes?.total || 0),
        failed: failedRes?.total || 0,
      };
    },
    // Refresh stats every 30 seconds
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Retry case hook for re-processing failed cases
export interface RetryCaseRequest {
  caseId: string;
  profile?: 'fast' | 'balanced' | 'high_accuracy';
}

export interface RetryCaseResponse {
  case_id: string;
  status: string;
  message: string;
  estimated_time_ms?: number;
}

export function useRetryCase() {
  const queryClient = useQueryClient();
  
  return useMutation<RetryCaseResponse, Error, RetryCaseRequest>({
    mutationFn: async ({ caseId, profile = 'balanced' }: RetryCaseRequest) => {
      if (!caseId) {
        throw new Error('Case ID is required');
      }
      
      const response = await api.post<RetryCaseResponse>(`/api/cases/${caseId}/retry`, {
        profile,
      });
      
      // Handle stub response gracefully
      if (!response || typeof response !== 'object') {
        // Return a mock response for stub endpoints
        return {
          case_id: caseId,
          status: 'queued',
          message: 'Case queued for reprocessing',
          estimated_time_ms: 5000,
        };
      }
      
      return response;
    },
    onSuccess: (_, { caseId }) => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['review-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
    },
    onError: (error) => {
      console.error('Failed to retry case:', error);
    },
  });
}

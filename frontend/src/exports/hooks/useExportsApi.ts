import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient as api } from '@common/api/client';

// Types for export functionality
export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  vendor?: string;
  status?: 'approved' | 'exported';
}

export interface ExportPreset {
  id: string;
  name: string;
  format: 'csv' | 'json' | 'quickbooks';
  includeLineItems: boolean;
  fieldMapping?: Record<string, string>;
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  caseCount: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
}

export interface ExportCaseRequest {
  format: 'csv' | 'json';
  includeLineItems: boolean;
}

export interface ExportCaseResponse {
  exportUrl: string;
  expiresAt: string;
}

export interface BulkExportRequest {
  entityType: string;
  format: string;
  filters?: ExportFilters;
}

export interface BulkExportResponse {
  jobId: string;
  status: string;
  estimatedTimeMs?: number;
}

// Default export presets
export const DEFAULT_EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'quickbooks-ready',
    name: 'QuickBooks-ready',
    format: 'csv',
    includeLineItems: true,
    fieldMapping: {
      invoice_number: 'RefNumber',
      invoice_date: 'TxnDate',
      vendor_name: 'VendorRef',
      total: 'TotalAmt',
    },
  },
  {
    id: 'csv-receiving',
    name: 'CSV for receiving',
    format: 'csv',
    includeLineItems: true,
  },
  {
    id: 'audit-json',
    name: 'Audit JSON',
    format: 'json',
    includeLineItems: true,
  },
];

// Hook for exporting a single case
export function useExportCase() {
  return useMutation<ExportCaseResponse, Error, { caseId: string } & ExportCaseRequest>({
    mutationFn: async ({ caseId, format, includeLineItems }) => {
      if (!caseId) {
        throw new Error('Case ID is required');
      }

      const response = await api.post<ExportCaseResponse>(`/api/cases/${caseId}/export`, {
        format,
        include_line_items: includeLineItems,
      });

      // Handle stub response gracefully
      if (!response || typeof response !== 'object') {
        throw new Error('Export feature is not yet fully implemented');
      }

      return response;
    },
    onError: (error) => {
      console.error('Failed to export case:', error);
    },
  });
}

// Hook for bulk export
export function useBulkExport() {
  return useMutation<BulkExportResponse, Error, BulkExportRequest>({
    mutationFn: async (request) => {
      const response = await api.post<BulkExportResponse>('/api/data-management/export', request);

      // Handle stub response gracefully
      if (!response || typeof response !== 'object') {
        throw new Error('Bulk export feature is not yet fully implemented');
      }

      return response;
    },
    onError: (error) => {
      console.error('Failed to initiate bulk export:', error);
    },
  });
}

// Hook for fetching export jobs history (mock for now)
export function useExportJobs() {
  return useQuery<ExportJob[]>({
    queryKey: ['export-jobs'],
    queryFn: async () => {
      // This would call a real endpoint when available
      // For now, return empty array
      return [];
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

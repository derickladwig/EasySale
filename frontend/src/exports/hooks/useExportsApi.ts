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

      try {
        const response = await api.post<ExportCaseResponse>(`/api/cases/${caseId}/export`, {
          format,
          include_line_items: includeLineItems,
        });

        if (!response || typeof response !== 'object') {
          // Fallback to client-side export
          return await generateClientSideExport(caseId, format, includeLineItems);
        }

        return response;
      } catch {
        // Fallback to client-side export if API not available
        return await generateClientSideExport(caseId, format, includeLineItems);
      }
    },
    onError: (error) => {
      console.error('Failed to export case:', error);
    },
  });
}

// Client-side export generation fallback
async function generateClientSideExport(
  caseId: string,
  format: 'csv' | 'json',
  includeLineItems: boolean
): Promise<ExportCaseResponse> {
  // Fetch case data
  const caseData = await api.get<Record<string, unknown>>(`/api/cases/${caseId}`);
  
  let content: string;
  let mimeType: string;
  let extension: string;
  
  if (format === 'json') {
    content = JSON.stringify(caseData, null, 2);
    mimeType = 'application/json';
    extension = 'json';
  } else {
    // Generate CSV
    const headers = Object.keys(caseData).filter(k => k !== 'line_items' || includeLineItems);
    const values = headers.map(h => {
      const val = caseData[h];
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val ?? '');
    });
    content = headers.join(',') + '\n' + values.join(',');
    mimeType = 'text/csv';
    extension = 'csv';
  }
  
  // Create blob and download URL
  const blob = new Blob([content], { type: mimeType });
  const exportUrl = URL.createObjectURL(blob);
  
  // Trigger download
  const a = document.createElement('a');
  a.href = exportUrl;
  a.download = `case-${caseId}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // URL expires in 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  
  return { exportUrl, expiresAt };
}

// Hook for bulk export
export function useBulkExport() {
  return useMutation<BulkExportResponse, Error, BulkExportRequest>({
    mutationFn: async (request) => {
      try {
        const response = await api.post<BulkExportResponse>('/api/data-management/export', request);

        if (!response || typeof response !== 'object') {
          // Fallback to client-side bulk export
          return await generateBulkClientSideExport(request);
        }

        return response;
      } catch {
        // Fallback to client-side bulk export
        return await generateBulkClientSideExport(request);
      }
    },
    onError: (error) => {
      console.error('Failed to initiate bulk export:', error);
    },
  });
}

// Client-side bulk export generation
async function generateBulkClientSideExport(
  request: BulkExportRequest
): Promise<BulkExportResponse> {
  const { entityType, format, filters } = request;
  
  // Build query params
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters?.dateTo) params.append('date_to', filters.dateTo);
  if (filters?.vendor) params.append('vendor', filters.vendor);
  if (filters?.status) params.append('status', filters.status);
  
  // Fetch data based on entity type
  let endpoint = '/api/';
  switch (entityType) {
    case 'products':
      endpoint += 'products';
      break;
    case 'customers':
      endpoint += 'customers';
      break;
    case 'invoices':
      endpoint += 'invoices';
      break;
    case 'sales':
      endpoint += 'sales';
      break;
    default:
      endpoint += entityType;
  }
  
  const queryString = params.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  
  try {
    const data = await api.get<unknown[]>(url);
    
    let content: string;
    let mimeType: string;
    let extension: string;
    
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      // Generate CSV from array
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0] as Record<string, unknown>);
        const rows = data.map(row => {
          const r = row as Record<string, unknown>;
          return headers.map(h => {
            const val = r[h];
            if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
            return String(val ?? '');
          }).join(',');
        });
        content = headers.join(',') + '\n' + rows.join('\n');
      } else {
        content = 'No data to export';
      }
      mimeType = 'text/csv';
      extension = 'csv';
    }
    
    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const exportUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = `${entityType}-export.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Return mock job response
    return {
      jobId: `local-${Date.now()}`,
      status: 'completed',
      estimatedTimeMs: 0,
    };
  } catch (error) {
    console.error('Bulk export failed:', error);
    throw new Error('Failed to export data. Please try again.');
  }
}

// Hook for fetching export jobs history
export function useExportJobs() {
  return useQuery<ExportJob[]>({
    queryKey: ['export-jobs'],
    queryFn: async () => {
      try {
        const response = await api.get<ExportJob[]>('/api/export-jobs');
        return response || [];
      } catch {
        // Return empty array if endpoint not available
        return [];
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

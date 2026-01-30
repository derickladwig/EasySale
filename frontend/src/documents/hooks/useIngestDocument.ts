/**
 * useIngestDocument Hook
 * 
 * Hook for uploading documents via the OCR ingest endpoint
 * Requirements: 2.10
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface IngestRequest {
  file: File;
  vendorId?: string;
  templateId?: string;
}

interface IngestResponse {
  case_id: string;
  status: string;
  estimated_time_ms: number;
}

/**
 * Upload a document to the OCR ingest endpoint
 */
async function ingestDocument(request: IngestRequest): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append('file', request.file);
  
  if (request.vendorId) {
    formData.append('vendor_id', request.vendorId);
  }
  
  if (request.templateId) {
    formData.append('template_id', request.templateId);
  }

  const response = await axios.post<IngestResponse>(
    '/api/ocr/ingest',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

/**
 * Hook for uploading documents via OCR ingest
 * 
 * Automatically invalidates cases queries on success to refresh the review queue
 */
export function useIngestDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ingestDocument,
    onSuccess: () => {
      // Invalidate cases queries to refresh the review queue
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
    },
  });
}

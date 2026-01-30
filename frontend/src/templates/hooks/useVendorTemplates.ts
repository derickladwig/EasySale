import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api, ApiError } from '@common/api/client';

// Types matching backend models
export interface VendorTemplate {
  id: string;
  vendor_id: string;
  vendor_name: string;
  name: string;
  version: number;
  active: boolean;
  success_rate?: number;
  last_updated: string;
  config_json: TemplateConfig;
}

export interface TemplateConfig {
  header: Record<string, { pattern: string; zone?: BoundingBox }>;
  line_items: {
    table_start: string;
    columns: string[];
    row_pattern?: string;
  };
  normalization?: Record<string, NormalizationRule>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
}

export interface NormalizationRule {
  type: 'regex' | 'lookup' | 'transform';
  pattern?: string;
  replacement?: string;
  lookup_table?: string;
}

export interface CreateVendorTemplateRequest {
  vendor_id: string;
  name: string;
  config_json: TemplateConfig;
}

export interface ListTemplatesResponse {
  templates: VendorTemplate[];
  total: number;
}

// API Hooks
export function useVendorTemplates(vendorId?: string) {
  return useQuery<ListTemplatesResponse>({
    queryKey: ['vendor-templates', vendorId],
    queryFn: async () => {
      const params = vendorId ? `?vendor_id=${vendorId}` : '';
      try {
        const response = await api.get<ListTemplatesResponse>(`/api/vendors/templates${params}`);
        
        // Ensure we always return a valid response structure
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response from server');
        }
        
        return {
          templates: Array.isArray(response.templates) ? response.templates : [],
          total: typeof response.total === 'number' ? response.total : 0,
        };
      } catch (error) {
        // Check if this is a 404 (endpoint not available - feature not enabled)
        if (error instanceof ApiError && error.status === 404) {
          console.warn('Vendor templates endpoint not available. The document-processing feature may not be enabled in the backend.');
          return { templates: [], total: 0 };
        }
        throw error;
      }
    },
    retry: 1, // Reduce retries since this might be a feature flag issue
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change frequently
  });
}

export function useVendorTemplate(templateId: string) {
  // Don't fetch if templateId is empty or 'new' (creating a new template)
  const shouldFetch = !!templateId && templateId !== 'new';
  
  return useQuery<VendorTemplate>({
    queryKey: ['vendor-template', templateId],
    queryFn: async () => {
      if (!templateId || templateId === 'new') {
        throw new Error('Template ID is required');
      }
      
      const response = await api.get<VendorTemplate>(`/api/vendors/templates/${templateId}`);
      
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server');
      }
      
      return response;
    },
    enabled: shouldFetch,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation<VendorTemplate, Error, CreateVendorTemplateRequest>({
    mutationFn: async (request: CreateVendorTemplateRequest) => {
      if (!request.vendor_id || !request.name || !request.config_json) {
        throw new Error('Vendor ID, name, and config are required');
      }
      
      const response = await api.post<VendorTemplate>('/api/vendors/templates', request);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-templates'] });
    },
    onError: (error) => {
      console.error('Failed to create template:', error);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation<VendorTemplate, Error, { templateId: string } & Partial<CreateVendorTemplateRequest>>({
    mutationFn: async ({ templateId, ...request }) => {
      if (!templateId) {
        throw new Error('Template ID is required');
      }
      
      const response = await api.put<VendorTemplate>(`/api/vendors/templates/${templateId}`, request);
      return response;
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-templates'] });
    },
    onError: (error) => {
      console.error('Failed to update template:', error);
    },
  });
}

export function useDeactivateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (templateId: string) => {
      if (!templateId) {
        throw new Error('Template ID is required');
      }
      
      await api.delete(`/api/vendors/templates/${templateId}`);
    },
    onSuccess: (_, templateId) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-templates'] });
    },
    onError: (error) => {
      console.error('Failed to deactivate template:', error);
    },
  });
}

/**
 * Sales API Client
 * 
 * Handles POS sales transactions - creating, completing, and voiding sales.
 */

import { apiClient } from '@common/api/client';

// ============================================================================
// Types
// ============================================================================

export interface SaleLineItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
}

export interface CreateSaleRequest {
  customer_id?: string;
  items: SaleLineItem[];
  payment_method: 'cash' | 'card' | 'other';
  discount_amount?: number;
  notes?: string;
}

export interface Sale {
  id: string;
  transaction_number: string;
  customer_id?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  items_count: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface SaleListResponse {
  sales: Sale[];
  total: number;
}

// ============================================================================
// API Functions
// ============================================================================

export const salesApi = {
  /**
   * Create a new sale transaction
   */
  create: async (data: CreateSaleRequest): Promise<Sale> => {
    return apiClient.post('/api/sales', data);
  },

  /**
   * Get a sale by ID
   */
  get: async (id: string): Promise<Sale> => {
    return apiClient.get(`/api/sales/${id}`);
  },

  /**
   * List recent sales
   */
  list: async (params?: { limit?: number; offset?: number }): Promise<SaleListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));
    const qs = searchParams.toString();
    return apiClient.get(`/api/sales${qs ? `?${qs}` : ''}`);
  },

  /**
   * Void a sale
   */
  void: async (id: string, reason: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(`/api/sales/${id}/void`, { reason });
  },
};

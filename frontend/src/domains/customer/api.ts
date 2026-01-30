/**
 * Customer API Client
 * 
 * Provides functions for interacting with customer endpoints
 */

import { apiClient } from '../../common/utils/apiClient';

export interface CustomerResponse {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pricing_tier: string;
  loyalty_points: number;
  store_credit: number;
  credit_limit: number | null;
  credit_balance: number;
  created_at: string;
  updated_at: string;
  sync_version: number;
  store_id: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  pricing_tier?: 'retail' | 'wholesale' | 'vip';
  store_id?: string; // Optional - backend derives from session if not provided
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  pricing_tier?: 'retail' | 'wholesale' | 'vip';
  loyalty_points?: number;
  store_credit?: number;
  credit_limit?: number;
}

/**
 * List all customers
 */
export async function listCustomers(params?: {
  pricing_tier?: string;
  store_id?: string;
}): Promise<CustomerResponse[]> {
  const queryParams = new URLSearchParams();
  if (params?.pricing_tier) queryParams.append('pricing_tier', params.pricing_tier);
  if (params?.store_id) queryParams.append('store_id', params.store_id);
  
  const url = `/api/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<CustomerResponse[]>(url);
}

/**
 * Get customer by ID
 */
export async function getCustomer(id: string): Promise<CustomerResponse> {
  return apiClient.get<CustomerResponse>(`/api/customers/${id}`);
}

/**
 * Create new customer
 */
export async function createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
  return apiClient.post<CustomerResponse>('/api/customers', data);
}

/**
 * Update customer
 */
export async function updateCustomer(id: string, data: UpdateCustomerRequest): Promise<CustomerResponse> {
  return apiClient.put<CustomerResponse>(`/api/customers/${id}`, data);
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string): Promise<void> {
  return apiClient.delete(`/api/customers/${id}`);
}

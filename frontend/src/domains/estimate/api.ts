/**
 * Estimate API Functions
 * 
 * API calls for estimate management.
 */

import type {
  Estimate,
  EstimateLineItem,
  CreateEstimateRequest,
  UpdateEstimateRequest,
  ListEstimatesParams,
} from './types';

const API_BASE = '/api/estimates';

/**
 * Create a new estimate
 */
export async function createEstimate(request: CreateEstimateRequest): Promise<Estimate> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create estimate' }));
    throw new Error(error.error || 'Failed to create estimate');
  }

  return response.json();
}

/**
 * List estimates with optional filters
 */
export async function listEstimates(params?: ListEstimatesParams): Promise<Estimate[]> {
  const searchParams = new URLSearchParams();
  
  if (params?.customer_id) {
    searchParams.append('customer_id', params.customer_id);
  }
  if (params?.status) {
    searchParams.append('status', params.status);
  }
  if (params?.limit) {
    searchParams.append('limit', params.limit.toString());
  }
  if (params?.offset) {
    searchParams.append('offset', params.offset.toString());
  }

  const url = searchParams.toString() ? `${API_BASE}?${searchParams}` : API_BASE;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch estimates' }));
    throw new Error(error.error || 'Failed to fetch estimates');
  }

  return response.json();
}

/**
 * Get estimate by ID
 */
export async function getEstimate(id: string): Promise<Estimate> {
  const response = await fetch(`${API_BASE}/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch estimate' }));
    throw new Error(error.error || 'Failed to fetch estimate');
  }

  return response.json();
}

/**
 * Get estimate line items
 */
export async function getEstimateLineItems(id: string): Promise<EstimateLineItem[]> {
  const response = await fetch(`${API_BASE}/${id}/line-items`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch line items' }));
    throw new Error(error.error || 'Failed to fetch line items');
  }

  return response.json();
}

/**
 * Update estimate
 */
export async function updateEstimate(
  id: string,
  request: UpdateEstimateRequest
): Promise<Estimate> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update estimate' }));
    throw new Error(error.error || 'Failed to update estimate');
  }

  return response.json();
}

/**
 * Delete estimate (soft delete)
 */
export async function deleteEstimate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete estimate' }));
    throw new Error(error.error || 'Failed to delete estimate');
  }
}

/**
 * Generate PDF for estimate
 */
export async function generateEstimatePdf(id: string): Promise<string> {
  const response = await fetch(`${API_BASE}/${id}/pdf`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
    throw new Error(error.error || 'Failed to generate PDF');
  }

  return response.text();
}

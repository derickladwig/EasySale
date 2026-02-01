/**
 * Estimate Domain Types
 * 
 * Types for estimate management including creation, editing, and conversion.
 */

export interface Estimate {
  id: string;
  tenant_id: string;
  estimate_number: string;
  customer_id: string;
  estimate_date: string;
  expiration_date?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: EstimateStatus;
  terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  converted_to_invoice_id?: string;
  converted_to_work_order_id?: string;
  store_id: string;
  sync_version: number;
}

export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface EstimateLineItem {
  id: string;
  estimate_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
  line_total: number;
  created_at: string;
}

export interface CreateEstimateRequest {
  customer_id: string;
  estimate_date: string;
  expiration_date?: string;
  terms?: string;
  notes?: string;
  line_items: CreateEstimateLineItem[];
}

export interface CreateEstimateLineItem {
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_rate?: number;
}

export interface UpdateEstimateRequest {
  customer_id?: string;
  estimate_date?: string;
  expiration_date?: string;
  status?: EstimateStatus;
  terms?: string;
  notes?: string;
  line_items?: CreateEstimateLineItem[];
}

export interface ListEstimatesParams {
  customer_id?: string;
  status?: EstimateStatus;
  limit?: number;
  offset?: number;
}

/**
 * Get status badge color classes using semantic tokens
 */
export function getEstimateStatusColor(status: EstimateStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-surface-elevated text-text-secondary';
    case 'sent':
      return 'bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300';
    case 'accepted':
      return 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300';
    case 'rejected':
      return 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300';
    case 'expired':
      return 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300';
    case 'converted':
      return 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300';
    default:
      return 'bg-surface-elevated text-text-secondary';
  }
}

/**
 * Get status display label
 */
export function getEstimateStatusLabel(status: EstimateStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'sent':
      return 'Sent';
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    case 'converted':
      return 'Converted';
    default:
      return status;
  }
}

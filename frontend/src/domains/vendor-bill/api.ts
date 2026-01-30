/**
 * Vendor Bill API Client
 *
 * API functions for vendor bill receiving system
 */

import axios from 'axios';
import type {
  VendorBill as _VendorBill,
  VendorSkuAlias as _VendorSkuAlias,
  BillWithDetails,
  UploadBillResponse,
  ListBillsParams,
  ListBillsResponse,
  ListAliasesParams,
  ListAliasesResponse,
  LineUpdate,
  CreateAliasRequest,
  MatchSuggestionsResponse,
  CreateProductFromLineRequest,
  CreateProductFromLineResponse,
} from './types';

const API_BASE = '/api';

/**
 * Upload a vendor bill file
 */
export async function uploadBill(file: File, vendorId?: string): Promise<UploadBillResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (vendorId) {
    formData.append('vendor_id', vendorId);
  }

  const response = await axios.post<UploadBillResponse>(
    `${API_BASE}/vendor-bills/upload`,
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
 * Get a vendor bill with details
 */
export async function getBill(billId: string): Promise<BillWithDetails> {
  const response = await axios.get<BillWithDetails>(`${API_BASE}/vendor-bills/${billId}`);

  return response.data;
}

/**
 * List vendor bills with filters
 */
export async function listBills(params: ListBillsParams = {}): Promise<ListBillsResponse> {
  const response = await axios.get<ListBillsResponse>(`${API_BASE}/vendor-bills`, { params });

  return response.data;
}

/**
 * Update line item matches
 */
export async function updateMatches(billId: string, lines: LineUpdate[]): Promise<void> {
  await axios.put(`${API_BASE}/vendor-bills/${billId}/matches`, { lines });
}

/**
 * Create a vendor SKU alias
 */
export async function createAlias(alias: CreateAliasRequest): Promise<void> {
  await axios.post(`${API_BASE}/vendor-sku-aliases`, alias);
}

/**
 * List vendor SKU aliases
 */
export async function listAliases(params: ListAliasesParams = {}): Promise<ListAliasesResponse> {
  const response = await axios.get<ListAliasesResponse>(`${API_BASE}/vendor-sku-aliases`, {
    params,
  });

  return response.data;
}

/**
 * Post receiving transaction (to be implemented in Phase 6)
 */
export async function postReceiving(billId: string): Promise<void> {
  await axios.post(`${API_BASE}/vendor-bills/${billId}/post`);
}

/**
 * Reprocess a bill (to be implemented in Phase 7)
 */
export async function reprocessBill(billId: string): Promise<void> {
  await axios.post(`${API_BASE}/vendor-bills/${billId}/reprocess`);
}

/**
 * Get match suggestions for a vendor SKU
 */
export async function getMatchSuggestions(
  vendorSku: string,
  description: string,
  vendorId?: string,
  limit?: number
): Promise<MatchSuggestionsResponse> {
  const params: Record<string, string | number> = {
    vendor_sku: vendorSku,
    description: description,
  };
  if (vendorId) params.vendor_id = vendorId;
  if (limit) params.limit = limit;

  const response = await axios.get<MatchSuggestionsResponse>(
    `${API_BASE}/vendor-bills/match-suggestions`,
    { params }
  );

  return response.data;
}

/**
 * Create a new product from a vendor bill line item
 */
export async function createProductFromLine(
  billId: string,
  request: CreateProductFromLineRequest
): Promise<CreateProductFromLineResponse> {
  const response = await axios.post<CreateProductFromLineResponse>(
    `${API_BASE}/vendor-bills/${billId}/create-product`,
    request
  );

  return response.data;
}

/**
 * Reopen a posted bill for editing
 */
export async function reopenBill(billId: string, reason?: string): Promise<void> {
  await axios.post(`${API_BASE}/vendor-bills/${billId}/reopen`, { reason });
}

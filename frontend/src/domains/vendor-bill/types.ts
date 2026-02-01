/**
 * Vendor Bill Domain Types
 *
 * Type definitions for vendor bill receiving system
 */

export interface Vendor {
  id: string;
  name: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  identifiers: {
    keywords?: string[];
    tax_ids?: string[];
    patterns?: string[];
  };
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  POSTED = 'POSTED',
  VOID = 'VOID',
}

export interface VendorBill {
  id: string;
  vendor_id: string;
  invoice_no: string;
  invoice_date: string;
  po_number?: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: BillStatus;
  file_path: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  idempotency_key: string;
  posted_at?: string;
  posted_by?: string;
  tenant_id: string;
  store_id: string;
  created_at: string;
  updated_at: string;
}

export interface VendorBillParse {
  id: string;
  vendor_bill_id: string;
  ocr_text: string;
  ocr_confidence: number;
  parsed_json: Record<string, any>;
  template_id?: string;
  template_version: number;
  ocr_engine: string;
  config_hash: string;
  created_at: string;
}

export interface VendorBillLine {
  id: string;
  vendor_bill_id: string;
  line_no: number;
  vendor_sku_raw: string;
  vendor_sku_norm: string;
  desc_raw: string;
  qty_raw: string;
  unit_raw: string;
  unit_price_raw: string;
  ext_price_raw: string;
  normalized_qty: number;
  normalized_unit: string;
  unit_price: number;
  ext_price: number;
  matched_sku?: string;
  match_confidence: number;
  match_reason: string;
  user_overridden: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorSkuAlias {
  id: string;
  vendor_id: string;
  vendor_sku_norm: string;
  internal_sku: string;
  unit_conversion?: {
    multiplier: number;
    from_unit: string;
    to_unit: string;
  };
  priority: number;
  last_seen_at: string;
  usage_count: number;
  created_by: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface VendorTemplate {
  id: string;
  vendor_id: string;
  name: string;
  version: number;
  active: boolean;
  config_json: Record<string, any>;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface BillWithDetails {
  bill: VendorBill;
  vendor?: Vendor;
  parse?: VendorBillParse;
  lines: VendorBillLine[];
}

export interface MatchCandidate {
  sku: string;
  name: string;
  confidence: number;
  reason: string;
  product_id?: string;
  category?: string;
  cost?: number;
  quantity_on_hand?: number;
}

export interface MatchSuggestionsResponse {
  suggestions: MatchCandidate[];
  total_candidates: number;
}

export interface CreateProductFromLineRequest {
  line_id: string;
  sku: string;
  name: string;
  category: string;
  cost: number;
  unit_price: number;
  quantity_on_hand?: number;
  barcode?: string;
  vendor_catalog_ref?: string;
  create_alias?: boolean;
}

export interface CreateProductFromLineResponse {
  product_id: string;
  sku: string;
  name: string;
  message: string;
}

export enum MatchConfidenceLevel {
  HIGH = 'HIGH', // >= 0.95
  MEDIUM = 'MEDIUM', // 0.70 - 0.94
  LOW = 'LOW', // < 0.70
}

export interface LineUpdate {
  line_id: string;
  matched_sku: string;
  normalized_qty?: number;
  normalized_unit?: string;
}

export interface CreateAliasRequest {
  vendor_id: string;
  vendor_sku: string;
  internal_sku: string;
  unit_conversion?: {
    multiplier: number;
    from_unit: string;
    to_unit: string;
  };
  priority?: number;
}

export interface UploadBillResponse {
  bill_id: string;
  status: BillStatus;
  message: string;
}

export interface ListBillsParams {
  vendor_id?: string;
  status?: BillStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface ListBillsResponse {
  bills: VendorBill[];
  page: number;
  page_size: number;
  total?: number;
}

export interface ListAliasesParams {
  vendor_id?: string;
  internal_sku?: string;
  page?: number;
  page_size?: number;
}

export interface ListAliasesResponse {
  aliases: VendorSkuAlias[];
  page: number;
  page_size: number;
  total?: number;
}

/**
 * Get confidence level from numeric confidence score
 */
export function getConfidenceLevel(confidence: number): MatchConfidenceLevel {
  if (confidence >= 0.95) return MatchConfidenceLevel.HIGH;
  if (confidence >= 0.7) return MatchConfidenceLevel.MEDIUM;
  return MatchConfidenceLevel.LOW;
}

/**
 * Get color class for confidence level
 * Uses semantic tokens for theme compliance
 */
export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case MatchConfidenceLevel.HIGH:
      return 'text-success-600 dark:text-success-400';
    case MatchConfidenceLevel.MEDIUM:
      return 'text-warning-600 dark:text-warning-400';
    case MatchConfidenceLevel.LOW:
      return 'text-error-600 dark:text-error-400';
  }
}

/**
 * Get background color class for confidence level
 * Uses semantic tokens for theme compliance
 */
export function getConfidenceBgColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case MatchConfidenceLevel.HIGH:
      return 'bg-success-100 dark:bg-success-900/20';
    case MatchConfidenceLevel.MEDIUM:
      return 'bg-warning-100 dark:bg-warning-900/20';
    case MatchConfidenceLevel.LOW:
      return 'bg-error-100 dark:bg-error-900/20';
  }
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`;
}

/**
 * Check if bill can be posted
 */
export function canPostBill(bill: VendorBill, lines: VendorBillLine[]): boolean {
  if (bill.status !== BillStatus.REVIEW) return false;
  return lines.every((line) => line.matched_sku && line.matched_sku.length > 0);
}

/**
 * Get status badge color
 * Uses semantic tokens for theme compliance
 */
export function getStatusColor(status: BillStatus): string {
  switch (status) {
    case BillStatus.DRAFT:
      return 'bg-surface-elevated text-text-primary dark:bg-surface-elevated dark:text-text-primary';
    case BillStatus.REVIEW:
      return 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400';
    case BillStatus.POSTED:
      return 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400';
    case BillStatus.VOID:
      return 'bg-error-100 text-error-800 dark:bg-error-900/20 dark:text-error-400';
  }
}

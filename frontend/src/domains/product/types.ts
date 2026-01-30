// Product domain types

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  unitPrice: number;
  cost: number;
  quantityOnHand: number;
  reorderPoint?: number;
  attributes: Record<string, string | number | boolean | string[]>;
  parentId?: string;
  barcode?: string;
  barcodeType?: string;
  images: string[];
  tenantId: string;
  storeId: string;
  isActive: boolean;
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
  profitMargin: number;
  profitAmount: number;
  // Aliases for convenience
  price?: number; // Alias for unitPrice
  quantity?: number; // Alias for quantityOnHand
  variants?: ProductVariant[]; // Populated when fetching parent products
}

export interface ProductSearchRequest {
  query?: string;
  category?: string;
  filters?: Record<string, any>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProductSearchResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  unitPrice: number;
  cost: number;
  quantityOnHand?: number;
  reorderPoint?: number;
  attributes?: Record<string, any>;
  parentId?: string;
  parent_id?: string; // Alias for backend compatibility
  barcode?: string;
  barcodeType?: string;
  images?: string[];
  storeId?: string; // Optional - backend derives from session if not provided
  variantAttributes?: Record<string, any>; // For variant creation
  price?: number; // Alias for unitPrice
  quantity?: number; // Alias for quantityOnHand
}

export interface UpdateProductRequest {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  unitPrice?: number;
  cost?: number;
  quantityOnHand?: number;
  reorderPoint?: number;
  attributes?: Record<string, any>;
  barcode?: string;
  barcodeType?: string;
  images?: string[];
  isActive?: boolean;
}

export interface BulkOperationRequest {
  operation: 'update' | 'delete' | 'import' | 'export';
  productIds?: string[];
  updates?: Record<string, any>;
  importData?: any[];
  file?: File; // For import operations
  format?: 'csv' | 'excel' | 'json'; // For export operations
}

export interface ProductVariant {
  id: string;
  parentId: string;
  variantId: string;
  variantAttributes: Record<string, any>;
  displayOrder: number;
  variantProduct: Product;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductVariantRequest {
  parentId: string;
  variantProduct: CreateProductRequest;
  variantAttributes?: Record<string, any>;
  displayOrder?: number;
}

export interface CategoryConfig {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  parent?: string;
  order?: number;
  attributes: AttributeConfig[];
  searchFields?: string[];
  displayTemplate?: string;
  filters?: FilterConfig[];
  wizard?: WizardConfig;
}

export interface AttributeConfig {
  name: string;
  label?: string;
  type: 'text' | 'number' | 'dropdown' | 'boolean' | 'date' | 'hierarchy';
  required?: boolean;
  unique?: boolean;
  values?: string[];
  hierarchySource?: string;
  min?: number;
  max?: number;
  pattern?: string;
  default?: any;
  placeholder?: string;
  helpText?: string;
}

export interface FilterConfig {
  field: string;
  label?: string;
  type: 'dropdown' | 'range' | 'hierarchy';
  options?: any[];
}

export interface WizardConfig {
  enabled: boolean;
  steps?: WizardStep[];
}

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  fields?: string[];
  dependsOn?: string;
  filterBy?: string;
}

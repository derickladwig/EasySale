// Product API client

import {
  Product,
  ProductSearchRequest,
  ProductSearchResponse,
  CreateProductRequest,
  UpdateProductRequest,
  BulkOperationRequest,
  ProductVariant,
  CreateProductVariantRequest,
  CategoryConfig,
} from './types';

const API_BASE = '/api/products';

export const productApi = {
  /**
   * List products with pagination and filters
   */
  async listProducts(params?: {
    page?: number;
    pageSize?: number;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ProductSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('page_size', params.pageSize.toString());
    if (params?.category) queryParams.set('category', params.category);
    if (params?.sortBy) queryParams.set('sort_by', params.sortBy);
    if (params?.sortOrder) queryParams.set('sort_order', params.sortOrder);

    const response = await fetch(`${API_BASE}?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to list products: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get a single product by ID
   */
  async getProduct(id: string): Promise<Product> {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to get product: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Create a new product
   */
  async createProduct(product: CreateProductRequest): Promise<Product> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to create product');
    }
    return response.json();
  },

  /**
   * Update an existing product
   */
  async updateProduct(id: string, updates: UpdateProductRequest): Promise<Product> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to update product');
    }
    return response.json();
  },

  /**
   * Delete a product (soft delete)
   */
  async deleteProduct(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete product: ${response.statusText}`);
    }
  },

  /**
   * Search products with advanced filters
   */
  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResponse> {
    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to search products: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Bulk operations (update, delete, import, export)
   */
  async bulkOperation(request: BulkOperationRequest): Promise<any> {
    const response = await fetch(`${API_BASE}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to perform bulk operation: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get all categories from configuration
   */
  async getCategories(): Promise<CategoryConfig[]> {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) {
      throw new Error(`Failed to get categories: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Autocomplete suggestions
   */
  async autocomplete(query: string, category?: string, limit?: number): Promise<string[]> {
    const queryParams = new URLSearchParams({ q: query });
    if (category) queryParams.set('category', category);
    if (limit) queryParams.set('limit', limit.toString());

    const response = await fetch(`${API_BASE}/autocomplete?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to get autocomplete: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Lookup product by barcode
   */
  async lookupByBarcode(barcode: string): Promise<Product | null> {
    const response = await fetch(`${API_BASE}/barcode/${encodeURIComponent(barcode)}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to lookup barcode: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get all variants for a product
   */
  async getVariants(productId: string): Promise<ProductVariant[]> {
    const response = await fetch(`${API_BASE}/${productId}/variants`);
    if (!response.ok) {
      throw new Error(`Failed to get variants: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Create a product variant
   */
  async createVariant(request: CreateProductVariantRequest): Promise<ProductVariant> {
    const response = await fetch(`${API_BASE}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to create variant');
    }
    return response.json();
  },
};

// Named exports for convenience
export const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  bulkOperation,
  getCategories,
  autocomplete,
  lookupByBarcode,
  getVariants,
  createVariant,
} = productApi;

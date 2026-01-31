// Product API client - uses centralized apiClient for consistent error handling

import { apiClient } from '@common/utils/apiClient';
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

    return apiClient.get<ProductSearchResponse>(`${API_BASE}?${queryParams}`);
  },

  /**
   * Get a single product by ID
   */
  async getProduct(id: string): Promise<Product> {
    return apiClient.get<Product>(`${API_BASE}/${id}`);
  },

  /**
   * Create a new product
   */
  async createProduct(product: CreateProductRequest): Promise<Product> {
    return apiClient.post<Product>(API_BASE, product);
  },

  /**
   * Update an existing product
   */
  async updateProduct(id: string, updates: UpdateProductRequest): Promise<Product> {
    return apiClient.put<Product>(`${API_BASE}/${id}`, updates);
  },

  /**
   * Delete a product (soft delete)
   */
  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/${id}`);
  },

  /**
   * Search products with advanced filters
   */
  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResponse> {
    return apiClient.post<ProductSearchResponse>(`${API_BASE}/search`, request);
  },

  /**
   * Bulk operations (update, delete, import, export)
   */
  async bulkOperation(request: BulkOperationRequest): Promise<unknown> {
    return apiClient.post(`${API_BASE}/bulk`, request);
  },

  /**
   * Get all categories from configuration
   */
  async getCategories(): Promise<CategoryConfig[]> {
    return apiClient.get<CategoryConfig[]>(`${API_BASE}/categories`);
  },

  /**
   * Autocomplete suggestions
   */
  async autocomplete(query: string, category?: string, limit?: number): Promise<string[]> {
    const queryParams = new URLSearchParams({ q: query });
    if (category) queryParams.set('category', category);
    if (limit) queryParams.set('limit', limit.toString());

    return apiClient.get<string[]>(`${API_BASE}/autocomplete?${queryParams}`);
  },

  /**
   * Lookup product by barcode
   */
  async lookupByBarcode(barcode: string): Promise<Product | null> {
    try {
      return await apiClient.get<Product>(`${API_BASE}/barcode/${encodeURIComponent(barcode)}`);
    } catch (error) {
      // Return null for 404 (product not found)
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get all variants for a product
   */
  async getVariants(productId: string): Promise<ProductVariant[]> {
    return apiClient.get<ProductVariant[]>(`${API_BASE}/${productId}/variants`);
  },

  /**
   * Create a product variant
   */
  async createVariant(request: CreateProductVariantRequest): Promise<ProductVariant> {
    return apiClient.post<ProductVariant>(`${API_BASE}/variants`, request);
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

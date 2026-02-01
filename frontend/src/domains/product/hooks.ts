// Product data hooks using React Query

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { productApi } from './api';
import { Product, ProductSearchResponse, ProductSearchRequest, CreateProductRequest, UpdateProductRequest } from './types';

/**
 * Hook to fetch products list
 *
 * @param params - Optional query parameters for filtering and pagination
 * @returns Query result with products data
 */
export function useProductsQuery(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  sortBy?: string;
  sortOrder?: string;
}): UseQueryResult<ProductSearchResponse, Error> {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.listProducts(params),
  });
}

/**
 * Hook to search products with advanced filters
 *
 * @param request - Search request with query, filters, pagination
 * @returns Query result with search results
 */
export function useProductSearchQuery(
  request: ProductSearchRequest
): UseQueryResult<ProductSearchResponse, Error> {
  return useQuery({
    queryKey: ['products', 'search', request],
    queryFn: () => productApi.searchProducts(request),
    enabled: !!(request.query || request.category || request.filters),
  });
}

/**
 * Hook to fetch a single product by ID
 *
 * @param id - Product ID
 * @returns Query result with product data
 */
export function useProductQuery(id: string): UseQueryResult<Product, Error> {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getProduct(id),
    enabled: !!id,
  });
}

/**
 * Hook to lookup product by barcode
 *
 * @param barcode - Product barcode
 * @returns Query result with product data or null if not found
 */
export function useProductByBarcodeQuery(barcode: string): UseQueryResult<Product | null, Error> {
  return useQuery({
    queryKey: ['product', 'barcode', barcode],
    queryFn: () => productApi.lookupByBarcode(barcode),
    enabled: !!barcode,
  });
}

/**
 * Hook to create a new product
 */
export function useCreateProductMutation(): UseMutationResult<
  Product,
  Error,
  CreateProductRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to update a product
 */
export function useUpdateProductMutation(): UseMutationResult<
  Product,
  Error,
  { id: string; updates: UpdateProductRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }) => productApi.updateProduct(id, updates),
    onSuccess: (data) => {
      // Invalidate products list and specific product
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', data.id] });
    },
  });
}

/**
 * Hook to delete a product
 */
export function useDeleteProductMutation(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.deleteProduct,
    onSuccess: () => {
      // Invalidate products list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

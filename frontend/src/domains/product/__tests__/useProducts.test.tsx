import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useProductsQuery,
  useProductQuery,
  useProductByBarcodeQuery,
  useProductSearchQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '../hooks';

// Mock the product API
vi.mock('../api', () => ({
  productApi: {
    listProducts: vi.fn(),
    getProduct: vi.fn(),
    lookupByBarcode: vi.fn(),
    searchProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProductsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch products successfully', async () => {
    const mockResponse = {
      products: [
        {
          id: '1',
          sku: 'TEST-001',
          name: 'Test Product',
          category: 'general',
          unitPrice: 10.99,
          cost: 5.00,
          quantityOnHand: 100,
          attributes: {},
          images: [],
          tenantId: 'tenant1',
          storeId: 'store1',
          isActive: true,
          syncVersion: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          profitMargin: 54.5,
          profitAmount: 5.99,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
      hasMore: false,
    };

    const { productApi } = await import('../api');
    (productApi.listProducts as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.products).toHaveLength(1);
    expect(result.current.data?.products[0].name).toBe('Test Product');
  });

  it('should handle fetch error', async () => {
    const { productApi } = await import('../api');
    (productApi.listProducts as any).mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should pass query parameters correctly', async () => {
    const mockResponse = {
      products: [],
      total: 0,
      page: 2,
      pageSize: 25,
      hasMore: false,
    };

    const { productApi } = await import('../api');
    (productApi.listProducts as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () =>
        useProductsQuery({
          page: 2,
          pageSize: 25,
          category: 'electronics',
          sortBy: 'name',
          sortOrder: 'ASC',
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(productApi.listProducts).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      category: 'electronics',
      sortBy: 'name',
      sortOrder: 'ASC',
    });
  });
});

describe('useProductQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single product successfully', async () => {
    const mockProduct = {
      id: '1',
      sku: 'TEST-001',
      name: 'Test Product',
      category: 'general',
      unitPrice: 10.99,
      cost: 5.00,
      quantityOnHand: 100,
      attributes: {},
      images: [],
      tenantId: 'tenant1',
      storeId: 'store1',
      isActive: true,
      syncVersion: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      profitMargin: 54.5,
      profitAmount: 5.99,
    };

    const { productApi } = await import('../api');
    (productApi.getProduct as any).mockResolvedValueOnce(mockProduct);

    const { result } = renderHook(() => useProductQuery('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProduct);
    expect(productApi.getProduct).toHaveBeenCalledWith('1');
  });

  it('should not fetch when id is empty', async () => {
    const { productApi } = await import('../api');
    
    const { result } = renderHook(() => useProductQuery(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(productApi.getProduct).not.toHaveBeenCalled();
  });
});

describe('useProductByBarcodeQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch product by barcode successfully', async () => {
    const mockProduct = {
      id: '1',
      sku: 'TEST-001',
      name: 'Test Product',
      barcode: '123456789',
      category: 'general',
      unitPrice: 10.99,
      cost: 5.00,
      quantityOnHand: 100,
      attributes: {},
      images: [],
      tenantId: 'tenant1',
      storeId: 'store1',
      isActive: true,
      syncVersion: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      profitMargin: 54.5,
      profitAmount: 5.99,
    };

    const { productApi } = await import('../api');
    (productApi.lookupByBarcode as any).mockResolvedValueOnce(mockProduct);

    const { result } = renderHook(() => useProductByBarcodeQuery('123456789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProduct);
    expect(productApi.lookupByBarcode).toHaveBeenCalledWith('123456789');
  });

  it('should return null when product not found', async () => {
    const { productApi } = await import('../api');
    (productApi.lookupByBarcode as any).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useProductByBarcodeQuery('999999999'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe('useProductSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should search products with query successfully', async () => {
    const mockResponse = {
      products: [
        {
          id: '1',
          sku: 'SEARCH-001',
          name: 'Searchable Product',
          category: 'electronics',
          unitPrice: 99.99,
          cost: 50.00,
          quantityOnHand: 25,
          attributes: {},
          images: [],
          tenantId: 'tenant1',
          storeId: 'store1',
          isActive: true,
          syncVersion: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          profitMargin: 50.0,
          profitAmount: 49.99,
        },
      ],
      total: 1,
      page: 0,
      pageSize: 50,
      hasMore: false,
    };

    const { productApi } = await import('../api');
    (productApi.searchProducts as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () =>
        useProductSearchQuery({
          query: 'Searchable',
          category: 'electronics',
          page: 0,
          pageSize: 50,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(productApi.searchProducts).toHaveBeenCalledWith({
      query: 'Searchable',
      category: 'electronics',
      page: 0,
      pageSize: 50,
    });
  });

  it('should search products with filters successfully', async () => {
    const mockResponse = {
      products: [],
      total: 0,
      page: 0,
      pageSize: 50,
      hasMore: false,
    };

    const { productApi } = await import('../api');
    (productApi.searchProducts as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () =>
        useProductSearchQuery({
          category: 'electronics',
          filters: { brand: 'Samsung', price_min: 100 },
          page: 0,
          pageSize: 50,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(productApi.searchProducts).toHaveBeenCalledWith({
      category: 'electronics',
      filters: { brand: 'Samsung', price_min: 100 },
      page: 0,
      pageSize: 50,
    });
  });

  it('should not fetch when no search criteria provided', async () => {
    const { productApi } = await import('../api');

    const { result } = renderHook(
      () =>
        useProductSearchQuery({
          page: 0,
          pageSize: 50,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(productApi.searchProducts).not.toHaveBeenCalled();
  });

  it('should handle search error', async () => {
    const { productApi } = await import('../api');
    (productApi.searchProducts as any).mockRejectedValueOnce(new Error('Search failed'));

    const { result } = renderHook(
      () =>
        useProductSearchQuery({
          query: 'test',
          page: 0,
          pageSize: 50,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useCreateProductMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create product successfully', async () => {
    const mockProduct = {
      id: '1',
      sku: 'NEW-001',
      name: 'New Product',
      category: 'general',
      unitPrice: 15.99,
      cost: 8.00,
      quantityOnHand: 50,
      attributes: {},
      images: [],
      tenantId: 'tenant1',
      storeId: 'store1',
      isActive: true,
      syncVersion: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      profitMargin: 49.9,
      profitAmount: 7.99,
    };

    const { productApi } = await import('../api');
    (productApi.createProduct as any).mockResolvedValueOnce(mockProduct);

    const { result } = renderHook(() => useCreateProductMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      sku: 'NEW-001',
      name: 'New Product',
      category: 'general',
      unitPrice: 15.99,
      cost: 8.00,
      quantityOnHand: 50,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(productApi.createProduct).toHaveBeenCalledWith(
      {
        sku: 'NEW-001',
        name: 'New Product',
        category: 'general',
        unitPrice: 15.99,
        cost: 8.00,
        quantityOnHand: 50,
      },
      expect.any(Object) // React Query context
    );
  });

  it('should handle create error', async () => {
    const { productApi } = await import('../api');
    (productApi.createProduct as any).mockRejectedValueOnce(new Error('Bad Request'));

    const { result } = renderHook(() => useCreateProductMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      sku: 'NEW-001',
      name: 'New Product',
      category: 'general',
      unitPrice: 15.99,
      cost: 8.00,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useUpdateProductMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update product successfully', async () => {
    const mockProduct = {
      id: '1',
      sku: 'TEST-001',
      name: 'Updated Product',
      category: 'general',
      unitPrice: 12.99,
      cost: 5.00,
      quantityOnHand: 100,
      attributes: {},
      images: [],
      tenantId: 'tenant1',
      storeId: 'store1',
      isActive: true,
      syncVersion: 2,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      profitMargin: 61.5,
      profitAmount: 7.99,
    };

    const { productApi } = await import('../api');
    (productApi.updateProduct as any).mockResolvedValueOnce(mockProduct);

    const { result } = renderHook(() => useUpdateProductMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: '1',
      updates: { name: 'Updated Product', unitPrice: 12.99 },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(productApi.updateProduct).toHaveBeenCalledWith('1', {
      name: 'Updated Product',
      unitPrice: 12.99,
    });
  });
});

describe('useDeleteProductMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete product successfully', async () => {
    const { productApi } = await import('../api');
    (productApi.deleteProduct as any).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteProductMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(productApi.deleteProduct).toHaveBeenCalledWith('1', expect.any(Object));
  });

  it('should handle delete error', async () => {
    const { productApi } = await import('../api');
    (productApi.deleteProduct as any).mockRejectedValueOnce(new Error('Not Found'));

    const { result } = renderHook(() => useDeleteProductMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('999');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

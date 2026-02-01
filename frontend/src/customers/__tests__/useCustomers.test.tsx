import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useCustomersQuery,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCustomerSearch,
} from '../hooks';

// Mock fetch
global.fetch = vi.fn();

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

describe('useCustomersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch customers successfully', async () => {
    const mockCustomers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0001',
        pricing_tier: 'gold',
        total_spent: 1000,
        order_count: 5,
        last_order: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    });

    const { result } = renderHook(() => useCustomersQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      tier: 'gold',
      totalSpent: 1000,
      orderCount: 5,
    });
  });

  it('should handle fetch error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useCustomersQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('Failed to fetch customers');
  });

  it('should map pricing tiers correctly', async () => {
    const mockCustomers = [
      { id: '1', name: 'Standard', pricing_tier: 'standard', email: '', phone: '' },
      { id: '2', name: 'Silver', pricing_tier: 'silver', email: '', phone: '' },
      { id: '3', name: 'Gold', pricing_tier: 'gold', email: '', phone: '' },
      { id: '4', name: 'Platinum', pricing_tier: 'platinum', email: '', phone: '' },
      { id: '5', name: 'Unknown', pricing_tier: 'unknown', email: '', phone: '' },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    });

    const { result } = renderHook(() => useCustomersQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].tier).toBe('standard');
    expect(result.current.data?.[1].tier).toBe('silver');
    expect(result.current.data?.[2].tier).toBe('gold');
    expect(result.current.data?.[3].tier).toBe('platinum');
    expect(result.current.data?.[4].tier).toBe('standard'); // Unknown maps to standard
  });
});

describe('useCreateCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create customer successfully', async () => {
    const mockCustomer = {
      id: '1',
      name: 'New Customer',
      email: 'new@example.com',
      phone: '555-0001',
      pricing_tier: 'standard',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    });

    const { result } = renderHook(() => useCreateCustomer(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'New Customer',
      email: 'new@example.com',
      phone: '555-0001',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'New Customer',
        email: 'new@example.com',
        phone: '555-0001',
      }),
    });
  });

  it('should handle create error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
    });

    const { result } = renderHook(() => useCreateCustomer(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'New Customer',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('Failed to create customer');
  });
});

describe('useUpdateCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update customer successfully', async () => {
    const mockCustomer = {
      id: '1',
      name: 'Updated Customer',
      email: 'updated@example.com',
      phone: '555-0001',
      pricing_tier: 'gold',
      total_spent: 2000,
      order_count: 10,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    });

    const { result } = renderHook(() => useUpdateCustomer(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: '1',
      data: { name: 'Updated Customer' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/customers/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Customer' }),
    });
  });
});

describe('useDeleteCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete customer successfully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    const { result } = renderHook(() => useDeleteCustomer(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/customers/1', {
      method: 'DELETE',
    });
  });
});

describe('useCustomerSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter customers by name', async () => {
    const mockCustomers = [
      { id: '1', name: 'John Doe', email: 'john@example.com', phone: '555-0001', pricing_tier: 'standard' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0002', pricing_tier: 'standard' },
      { id: '3', name: 'John Smith', email: 'jsmith@example.com', phone: '555-0003', pricing_tier: 'standard' },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    });

    const { result } = renderHook(() => useCustomerSearch('john'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('John Doe');
    expect(result.current.data?.[1].name).toBe('John Smith');
  });

  it('should filter customers by email', async () => {
    const mockCustomers = [
      { id: '1', name: 'John Doe', email: 'john@example.com', phone: '555-0001', pricing_tier: 'standard' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0002', pricing_tier: 'standard' },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    });

    const { result } = renderHook(() => useCustomerSearch('jane@'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].email).toBe('jane@example.com');
  });

  it('should return all customers when search term is empty', async () => {
    const mockCustomers = [
      { id: '1', name: 'John Doe', email: 'john@example.com', phone: '555-0001', pricing_tier: 'standard' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0002', pricing_tier: 'standard' },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    });

    const { result } = renderHook(() => useCustomerSearch(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });
});

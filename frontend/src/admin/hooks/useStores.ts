import { useState, useEffect } from 'react';
import { apiClient } from '@common/utils';

export interface Store {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
  receipt_footer?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStoreData {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  receipt_footer?: string;
}

export interface UpdateStoreData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  receipt_footer?: string;
  is_active?: boolean;
}

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all stores
  const fetchStores = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Store[]>('/api/stores');
      setStores(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stores';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Create store
  const createStore = async (storeData: CreateStoreData): Promise<Store> => {
    const response = await apiClient.post<Store>('/api/stores', storeData);
    await fetchStores(); // Refresh list
    return response;
  };

  // Update store
  const updateStore = async (storeId: string, storeData: UpdateStoreData): Promise<Store> => {
    const response = await apiClient.put<Store>(`/api/stores/${storeId}`, storeData);
    await fetchStores(); // Refresh list
    return response;
  };

  // Delete store
  const deleteStore = async (storeId: string): Promise<void> => {
    await apiClient.delete(`/api/stores/${storeId}`);
    await fetchStores(); // Refresh list
  };

  // Load stores on mount
  useEffect(() => {
    fetchStores();
  }, []);

  return {
    stores,
    isLoading,
    error,
    fetchStores,
    createStore,
    updateStore,
    deleteStore,
  };
}

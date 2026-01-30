import { useState, useEffect } from 'react';
import { apiClient } from '@common/utils/apiClient';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  location: string;
  lastReceived: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

type InventoryItemApi = {
  id: string | number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  min_stock: number;
  location: string;
  last_received: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
};

export interface UseInventoryQueryResult {
  data: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching inventory data
 *
 * Returns inventory items with loading and error states.
 * Automatically fetches data on mount.
 *
 * @returns {UseInventoryQueryResult} Query result with data, loading, error, and refetch
 *
 * @example
 * const { data: inventory, isLoading, error, refetch } = useInventoryQuery();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 * if (inventory.length === 0) return <EmptyState ... />;
 */
export function useInventoryQuery(): UseInventoryQueryResult {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get<InventoryItemApi[]>('/api/inventory/items');

      // Transform backend data to frontend format
      const items: InventoryItem[] = response.map((item) => ({
        id: String(item.id),
        name: item.name,
        sku: item.sku,
        category: item.category,
        stock: item.stock,
        minStock: item.min_stock,
        location: item.location,
        lastReceived: item.last_received,
        status: item.status,
      }));

      setData(items);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchInventory,
  };
}

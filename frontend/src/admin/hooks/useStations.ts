import { useState, useEffect } from 'react';
import { apiClient, ApiError } from '@common/utils';

export interface Station {
  id: string;
  store_id: string;
  name: string;
  device_id?: string;
  ip_address?: string;
  is_active: boolean;
  offline_mode_enabled: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStationData {
  store_id: string;
  name: string;
  device_id?: string;
  ip_address?: string;
  offline_mode_enabled?: boolean;
}

export interface UpdateStationData {
  name?: string;
  device_id?: string;
  ip_address?: string;
  is_active?: boolean;
  offline_mode_enabled?: boolean;
}

interface UseStationsOptions {
  /** Skip fetching stations (useful when user lacks permissions) */
  skip?: boolean;
}

export function useStations(storeId?: string, options: UseStationsOptions = {}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stations (optionally filtered by store)
  const fetchStations = async () => {
    if (options.skip) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const url = storeId ? `/api/stations?store_id=${storeId}` : '/api/stations';
      const response = await apiClient.get<Station[]>(url);
      setStations(response);
    } catch (err: unknown) {
      // Don't propagate 401/403 errors - just silently fail
      // This prevents redirect loops when user lacks permissions
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        // Silently ignore permission errors - stations list is optional
        setStations([]);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch stations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Create station
  const createStation = async (stationData: CreateStationData): Promise<Station> => {
    const response = await apiClient.post<Station>('/api/stations', stationData);
    await fetchStations(); // Refresh list
    return response;
  };

  // Update station
  const updateStation = async (
    stationId: string,
    stationData: UpdateStationData
  ): Promise<Station> => {
    const response = await apiClient.put<Station>(`/api/stations/${stationId}`, stationData);
    await fetchStations(); // Refresh list
    return response;
  };

  // Delete station
  const deleteStation = async (stationId: string): Promise<void> => {
    await apiClient.delete(`/api/stations/${stationId}`);
    await fetchStations(); // Refresh list
  };

  // Load stations on mount or when storeId changes
  useEffect(() => {
    fetchStations();
  }, [storeId, options.skip]);

  return {
    stations,
    isLoading,
    error,
    fetchStations,
    createStation,
    updateStation,
    deleteStation,
  };
}

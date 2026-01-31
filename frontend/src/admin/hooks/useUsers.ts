import { useState, useEffect } from 'react';
import { apiClient } from '@common/utils';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  display_name?: string; // Computed or stored display name
  store_id?: string;
  station_policy: string;
  station_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: string;
  first_name?: string;
  last_name?: string;
  store_id?: string;
  station_policy?: string;
  station_id?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  store_id?: string;
  station_policy?: string;
  station_id?: string;
  is_active?: boolean;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all users
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<User[]>('/api/users');
      setUsers(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Create user
  const createUser = async (userData: CreateUserData): Promise<User> => {
    const response = await apiClient.post<User>('/api/users', userData);
    await fetchUsers(); // Refresh list
    return response;
  };

  // Update user
  const updateUser = async (userId: string, userData: UpdateUserData): Promise<User> => {
    const response = await apiClient.put<User>(`/api/users/${userId}`, userData);
    await fetchUsers(); // Refresh list
    return response;
  };

  // Delete user
  const deleteUser = async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/users/${userId}`);
    await fetchUsers(); // Refresh list
  };

  // Bulk assign store
  const bulkAssignStore = async (userIds: string[], storeId: string): Promise<void> => {
    await Promise.all(
      userIds.map((userId) => apiClient.put(`/api/users/${userId}`, { store_id: storeId }))
    );
    await fetchUsers(); // Refresh list
  };

  // Bulk assign role
  const bulkAssignRole = async (userIds: string[], role: string): Promise<void> => {
    await Promise.all(userIds.map((userId) => apiClient.put(`/api/users/${userId}`, { role })));
    await fetchUsers(); // Refresh list
  };

  // Bulk enable/disable
  const bulkSetActive = async (userIds: string[], isActive: boolean): Promise<void> => {
    await Promise.all(
      userIds.map((userId) => apiClient.put(`/api/users/${userId}`, { is_active: isActive }))
    );
    await fetchUsers(); // Refresh list
  };

  // Bulk reset password
  const bulkResetPassword = async (userIds: string[]): Promise<void> => {
    // TODO: Implement password reset endpoint
    await Promise.all(
      userIds.map((userId) => apiClient.post(`/api/users/${userId}/reset-password`, {}))
    );
    await fetchUsers(); // Refresh list
  };

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkAssignStore,
    bulkAssignRole,
    bulkSetActive,
    bulkResetPassword,
  };
}

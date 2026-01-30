import { useState, useEffect, useCallback } from 'react';
import { fetchRoles, createRole, updateRole, deleteRole, Role } from '../api/rolesApi';

export interface UseRolesResult {
  data: Role[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createRole: (role: Omit<Role, 'id' | 'user_count'>) => Promise<void>;
  updateRole: (id: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
}

/**
 * Hook for managing roles data with loading, error, and CRUD operations
 */
export function useRoles(): UseRolesResult {
  const [data, setData] = useState<Role[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const roles = await fetchRoles();
      setData(roles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch roles';
      setError(errorMessage);
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateRole = useCallback(async (role: Omit<Role, 'id' | 'user_count'>) => {
    try {
      setError(null);
      const newRole = await createRole(role);
      setData(prev => prev ? [...prev, newRole] : [newRole]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create role';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const handleUpdateRole = useCallback(async (id: string, updates: Partial<Role>) => {
    try {
      setError(null);
      const updatedRole = await updateRole(id, updates);
      setData(prev => 
        prev ? prev.map(role => role.id === id ? updatedRole : role) : null
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update role';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const handleDeleteRole = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteRole(id);
      setData(prev => prev ? prev.filter(role => role.id !== id) : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete role';
      setError(errorMessage);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    createRole: handleCreateRole,
    updateRole: handleUpdateRole,
    deleteRole: handleDeleteRole,
  };
}

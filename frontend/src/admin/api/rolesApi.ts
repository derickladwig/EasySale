import { apiClient } from '@common/utils/apiClient';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
  is_system: boolean;
}

export interface RolesResponse {
  roles: Role[];
  status: string;
}

export interface ApiError {
  error: string;
  code?: string;
  message?: string;
}

/**
 * Fetch all roles from the API
 */
export async function fetchRoles(): Promise<Role[]> {
  try {
    const response = await apiClient.get<RolesResponse>('/api/roles');
    
    if (response.status === 'success' && response.roles) {
      return response.roles;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    throw error;
  }
}

/**
 * Create a new role
 */
export async function createRole(role: Omit<Role, 'id' | 'user_count'>): Promise<Role> {
  try {
    const response = await apiClient.post<{ role: Role; status: string }>('/api/roles', role);
    
    if (response.status === 'success' && response.role) {
      return response.role;
    }
    
    throw new Error('Failed to create role');
  } catch (error) {
    console.error('Failed to create role:', error);
    throw error;
  }
}

/**
 * Update an existing role
 */
export async function updateRole(id: string, updates: Partial<Role>): Promise<Role> {
  try {
    const response = await apiClient.put<{ role: Role; status: string }>(`/api/roles/${id}`, updates);
    
    if (response.status === 'success' && response.role) {
      return response.role;
    }
    
    throw new Error('Failed to update role');
  } catch (error) {
    console.error('Failed to update role:', error);
    throw error;
  }
}

/**
 * Delete a role
 */
export async function deleteRole(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/roles/${id}`);
  } catch (error) {
    console.error('Failed to delete role:', error);
    throw error;
  }
}

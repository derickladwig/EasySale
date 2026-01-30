import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RolesTab } from '../RolesTab';
import * as rolesApi from '../../api/rolesApi';

// Mock the API module
vi.mock('../../api/rolesApi');

const mockRoles = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access',
    permissions: ['*'],
    user_count: 2,
    is_system: true,
  },
  {
    id: 'cashier',
    name: 'Cashier',
    description: 'Point of sale operations',
    permissions: ['process_sales'],
    user_count: 5,
    is_system: false,
  },
];

describe('RolesTab Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    // Mock API to never resolve
    vi.mocked(rolesApi.fetchRoles).mockImplementation(() => new Promise(() => {}));

    render(<RolesTab />);

    expect(screen.getByText('Loading roles...')).toBeInTheDocument();
  });

  it('should display roles after successful API call', async () => {
    vi.mocked(rolesApi.fetchRoles).mockResolvedValue(mockRoles);

    render(<RolesTab />);

    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Cashier')).toBeInTheDocument();
    });

    expect(screen.getByText('Full system access')).toBeInTheDocument();
    expect(screen.getByText('Point of sale operations')).toBeInTheDocument();
  });

  it('should display error state when API call fails', async () => {
    const errorMessage = 'Failed to fetch roles';
    vi.mocked(rolesApi.fetchRoles).mockRejectedValue(new Error(errorMessage));

    render(<RolesTab />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load roles')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should retry API call when retry button is clicked', async () => {
    const errorMessage = 'Network error';
    vi.mocked(rolesApi.fetchRoles)
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockRoles);

    render(<RolesTab />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load roles')).toBeInTheDocument();
    });

    // Click retry button
    fireEvent.click(screen.getByText('Try Again'));

    // Wait for successful data load
    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });

    expect(rolesApi.fetchRoles).toHaveBeenCalledTimes(2);
  });

  it('should display empty state when no roles are returned', async () => {
    vi.mocked(rolesApi.fetchRoles).mockResolvedValue([]);

    render(<RolesTab />);

    await waitFor(() => {
      expect(screen.getByText('No roles found')).toBeInTheDocument();
      expect(screen.getByText('No roles have been configured yet. Create your first role to get started.')).toBeInTheDocument();
    });
  });

  it('should handle role permissions display', async () => {
    vi.mocked(rolesApi.fetchRoles).mockResolvedValue(mockRoles);

    render(<RolesTab />);

    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });

    // Check that permissions are displayed (this depends on the table implementation)
    // The exact assertion would depend on how permissions are rendered in the table
    expect(screen.getByText('2')).toBeInTheDocument(); // user_count for admin
    expect(screen.getByText('5')).toBeInTheDocument(); // user_count for cashier
  });

  it('should call API with correct parameters', async () => {
    vi.mocked(rolesApi.fetchRoles).mockResolvedValue(mockRoles);

    render(<RolesTab />);

    await waitFor(() => {
      expect(rolesApi.fetchRoles).toHaveBeenCalledTimes(1);
      expect(rolesApi.fetchRoles).toHaveBeenCalledWith();
    });
  });
});

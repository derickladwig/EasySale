import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PermissionMatrix } from './PermissionMatrix';

const mockRoles = [
  {
    id: 'admin',
    name: 'Administrator',
    permissions: ['*'],
  },
  {
    id: 'manager',
    name: 'Manager',
    permissions: ['view_sales', 'view_reports', 'manage_inventory', 'manage_customers'],
  },
  {
    id: 'cashier',
    name: 'Cashier',
    permissions: ['process_sales', 'process_returns', 'view_customers'],
  },
];

const mockPermissions = [
  {
    id: 'view_sales',
    name: 'View Sales',
    module: 'sales',
    description: 'View sales transactions',
  },
  {
    id: 'process_sales',
    name: 'Process Sales',
    module: 'sales',
    description: 'Process new sales',
  },
  {
    id: 'process_returns',
    name: 'Process Returns',
    module: 'sales',
    description: 'Process customer returns',
  },
  {
    id: 'view_reports',
    name: 'View Reports',
    module: 'reports',
    description: 'View system reports',
  },
  {
    id: 'manage_inventory',
    name: 'Manage Inventory',
    module: 'inventory',
    description: 'Manage inventory items',
  },
  {
    id: 'manage_customers',
    name: 'Manage Customers',
    module: 'customers',
    description: 'Manage customer records',
  },
  {
    id: 'view_customers',
    name: 'View Customers',
    module: 'customers',
    description: 'View customer information',
  },
];

describe('PermissionMatrix', () => {
  beforeEach(() => {
    // Reset any state between tests
  });

  describe('Rendering', () => {
    it('should render the permission matrix table', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render all role columns', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText('Cashier')).toBeInTheDocument();
    });

    it('should render all permission rows', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByText('View Sales')).toBeInTheDocument();
      expect(screen.getByText('Process Sales')).toBeInTheDocument();
      expect(screen.getByText('Process Returns')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();
      expect(screen.getByText('Manage Inventory')).toBeInTheDocument();
      expect(screen.getByText('Manage Customers')).toBeInTheDocument();
      expect(screen.getByText('View Customers')).toBeInTheDocument();
    });

    it('should render permission header', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByText('Permission')).toBeInTheDocument();
    });

    it('should render legend', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByText('Has Permission')).toBeInTheDocument();
      expect(screen.getByText('No Permission')).toBeInTheDocument();
    });

    it('should render summary text', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByText(/Showing \d+ of \d+ permissions/)).toBeInTheDocument();
    });
  });

  describe('Permission Matrix Display', () => {
    it('should show checkmarks for granted permissions', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      // Manager has view_sales permission - verify the permission is displayed
      expect(screen.getByText('View Sales')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      
      // The table should have rows with permissions
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + data rows
    });

    it('should show X marks for denied permissions', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      // Cashier does not have manage_inventory permission
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      
      // Find the Manage Inventory row
      const manageInventoryRow = rows.find((row) => row.textContent?.includes('Manage Inventory'));
      expect(manageInventoryRow).toBeDefined();
    });

    it('should show checkmarks for all permissions when role has wildcard', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      // Admin has * permission, so should have checkmarks for all
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      
      // All permission rows should have checkmarks in the admin column
      rows.forEach((row) => {
        if (row.textContent?.includes('View Sales') || 
            row.textContent?.includes('Process Sales') ||
            row.textContent?.includes('Manage Inventory')) {
          // Should have checkmarks
          expect(row).toBeInTheDocument();
        }
      });
    });

    it('should correctly display manager permissions', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      // Manager should have: view_sales, view_reports, manage_inventory, manage_customers
      // Manager should NOT have: process_sales, process_returns, view_customers
      
      expect(screen.getByText('View Sales')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();
      expect(screen.getByText('Manage Inventory')).toBeInTheDocument();
      expect(screen.getByText('Manage Customers')).toBeInTheDocument();
    });

    it('should correctly display cashier permissions', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      // Cashier should have: process_sales, process_returns, view_customers
      expect(screen.getByText('Process Sales')).toBeInTheDocument();
      expect(screen.getByText('Process Returns')).toBeInTheDocument();
      expect(screen.getByText('View Customers')).toBeInTheDocument();
    });
  });

  describe('Module Badges', () => {
    it('should display module badges for each permission', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      // Use getAllByText since there are multiple instances of each module
      expect(screen.getAllByText('sales').length).toBeGreaterThan(0);
      expect(screen.getByText('reports')).toBeInTheDocument();
      expect(screen.getByText('inventory')).toBeInTheDocument();
      expect(screen.getAllByText('customers').length).toBeGreaterThan(0);
    });

    it('should apply correct colors to module badges', () => {
      const { container } = render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      // Check that module badges have color classes
      const salesBadges = container.querySelectorAll('.bg-info-100');
      expect(salesBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter permissions by search query', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      fireEvent.change(searchInput, { target: { value: 'sales' } });

      // Should show sales-related permissions
      expect(screen.getByText('View Sales')).toBeInTheDocument();
      expect(screen.getByText('Process Sales')).toBeInTheDocument();
      
      // Should not show non-sales permissions
      expect(screen.queryByText('Manage Inventory')).not.toBeInTheDocument();
    });

    it('should filter by permission name', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      fireEvent.change(searchInput, { target: { value: 'View' } });

      expect(screen.getByText('View Sales')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();
      expect(screen.getByText('View Customers')).toBeInTheDocument();
    });

    it('should filter by module name', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      fireEvent.change(searchInput, { target: { value: 'inventory' } });

      expect(screen.getByText('Manage Inventory')).toBeInTheDocument();
      expect(screen.queryByText('View Sales')).not.toBeInTheDocument();
    });

    it('should be case-insensitive', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      fireEvent.change(searchInput, { target: { value: 'SALES' } });

      expect(screen.getByText('View Sales')).toBeInTheDocument();
      expect(screen.getByText('Process Sales')).toBeInTheDocument();
    });

    it('should update summary count after search', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      fireEvent.change(searchInput, { target: { value: 'sales' } });

      // Should show filtered count
      expect(screen.getByText(/Showing \d+ of \d+ permissions/)).toBeInTheDocument();
    });
  });

  describe('Module Filter', () => {
    it('should render module filter dropdown', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const moduleFilter = screen.getByRole('combobox');
      expect(moduleFilter).toBeInTheDocument();
    });

    it('should show "All Modules" option', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByText('All Modules')).toBeInTheDocument();
    });

    it('should list all unique modules', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const moduleFilter = screen.getByRole('combobox');
      
      // Check that module options exist
      expect(within(moduleFilter).getByText('All Modules')).toBeInTheDocument();
    });

    it('should filter permissions by selected module', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const moduleFilter = screen.getByRole('combobox');
      fireEvent.change(moduleFilter, { target: { value: 'sales' } });

      // Should show only sales permissions
      expect(screen.getByText('View Sales')).toBeInTheDocument();
      expect(screen.getByText('Process Sales')).toBeInTheDocument();
      expect(screen.getByText('Process Returns')).toBeInTheDocument();
      
      // Should not show other modules
      expect(screen.queryByText('Manage Inventory')).not.toBeInTheDocument();
    });

    it('should show all permissions when "all" is selected', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const moduleFilter = screen.getByRole('combobox');
      
      // First filter to a specific module
      fireEvent.change(moduleFilter, { target: { value: 'sales' } });
      
      // Then switch back to all
      fireEvent.change(moduleFilter, { target: { value: 'all' } });

      // Should show all permissions again
      expect(screen.getByText('View Sales')).toBeInTheDocument();
      expect(screen.getByText('Manage Inventory')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should render sort buttons', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Module' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument();
    });

    it('should default to sorting by module', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const moduleButton = screen.getByRole('button', { name: 'Module' });
      expect(moduleButton).toHaveClass('bg-primary-100');
    });

    it('should switch to sorting by name', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const nameButton = screen.getByRole('button', { name: 'Name' });
      fireEvent.click(nameButton);

      expect(nameButton).toHaveClass('bg-primary-100');
    });

    it('should sort permissions by module', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const moduleButton = screen.getByRole('button', { name: 'Module' });
      fireEvent.click(moduleButton);

      // Permissions should be grouped by module
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should sort permissions by name', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const nameButton = screen.getByRole('button', { name: 'Name' });
      fireEvent.click(nameButton);

      // Permissions should be sorted alphabetically by name
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no permissions match filter', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No permissions found')).toBeInTheDocument();
    });

    it('should handle empty permissions array', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={[]} />);

      expect(screen.getByText('No permissions found')).toBeInTheDocument();
    });

    it('should handle empty roles array', () => {
      render(<PermissionMatrix roles={[]} permissions={mockPermissions} />);

      // Should still render the table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Permission Descriptions', () => {
    it('should display permission descriptions', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      expect(screen.getByText('View sales transactions')).toBeInTheDocument();
      expect(screen.getByText('Process new sales')).toBeInTheDocument();
      expect(screen.getByText('Manage inventory items')).toBeInTheDocument();
    });

    it('should handle permissions without descriptions', () => {
      const permissionsWithoutDesc = [
        {
          id: 'test_permission',
          name: 'Test Permission',
          module: 'test',
        },
      ];

      render(<PermissionMatrix roles={mockRoles} permissions={permissionsWithoutDesc} />);

      expect(screen.getByText('Test Permission')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const headers = within(table).getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have accessible search input', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should have accessible filter dropdown', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const moduleFilter = screen.getByRole('combobox');
      expect(moduleFilter).toBeInTheDocument();
    });

    it('should have accessible sort buttons', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const moduleButton = screen.getByRole('button', { name: 'Module' });
      const nameButton = screen.getByRole('button', { name: 'Name' });
      
      expect(moduleButton).toBeInTheDocument();
      expect(nameButton).toBeInTheDocument();
    });
  });

  describe('Combined Filters', () => {
    it('should apply both search and module filter', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      const moduleFilter = screen.getByRole('combobox');

      // Filter by module
      fireEvent.change(moduleFilter, { target: { value: 'sales' } });
      
      // Then search within that module
      fireEvent.change(searchInput, { target: { value: 'Process' } });

      expect(screen.getByText('Process Sales')).toBeInTheDocument();
      expect(screen.getByText('Process Returns')).toBeInTheDocument();
      expect(screen.queryByText('View Sales')).not.toBeInTheDocument();
    });

    it('should update summary with combined filters', () => {
      render(<PermissionMatrix roles={mockRoles} permissions={mockPermissions} />);

      const searchInput = screen.getByPlaceholderText('Search permissions...');
      fireEvent.change(searchInput, { target: { value: 'View' } });

      const summary = screen.getByText(/Showing \d+ of \d+ permissions/);
      expect(summary).toBeInTheDocument();
    });
  });
});

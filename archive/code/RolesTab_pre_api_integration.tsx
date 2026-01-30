import { useState, useEffect } from 'react';
import { Shield, Users } from 'lucide-react';
import { Button } from '@common/components/atoms';
import { SettingsPageShell } from './SettingsPageShell';
import { SettingsTable } from './SettingsTable';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
  is_system: boolean;
}

export function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchQuery] = useState('');

  // Fetch roles
  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/roles', { credentials: 'include' });
      // const data = await response.json();

      // Mock data for now
      const mockRoles: Role[] = [
        {
          id: 'admin',
          name: 'Administrator',
          description: 'Full system access with all permissions',
          permissions: ['*'],
          user_count: 2,
          is_system: true,
        },
        {
          id: 'manager',
          name: 'Manager',
          description: 'Store management and reporting access',
          permissions: [
            'view_sales',
            'view_reports',
            'manage_inventory',
            'manage_customers',
            'manage_employees',
            'view_settings',
          ],
          user_count: 5,
          is_system: true,
        },
        {
          id: 'cashier',
          name: 'Cashier',
          description: 'Point of sale operations',
          permissions: ['process_sales', 'process_returns', 'view_products', 'view_customers'],
          user_count: 12,
          is_system: true,
        },
        {
          id: 'inventory',
          name: 'Inventory Clerk',
          description: 'Inventory management and receiving',
          permissions: ['manage_inventory', 'receive_stock', 'view_products', 'print_labels'],
          user_count: 3,
          is_system: false,
        },
      ];

      setRoles(mockRoles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle view role details

  // Table columns
  const columns: any[] = [
    {
      key: 'name',
      label: 'Role Name',
      sortable: true,
      render: (role: any) => (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-secondary-400" />
          <div>
            <div className="font-medium text-secondary-900">{role.name}</div>
            {role.is_system && <span className="text-xs text-secondary-500">System Role</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: (role: any) => <span className="text-sm text-secondary-600">{role.description}</span>,
    },
    {
      key: 'user_count',
      label: 'Users',
      sortable: true,
      render: (role: any) => (
        <div className="flex items-center gap-1 text-sm text-secondary-700">
          <Users className="w-4 h-4" />
          <span>{role.user_count}</span>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      sortable: false,
      render: (role: any) => (
        <span className="text-sm text-secondary-600">
          {role.permissions[0] === '*' ? 'All' : `${role.permissions.length} permissions`}
        </span>
      ),
    },
  ];

  // Row actions

  // Filter roles
  const filteredRoles = roles.filter((role) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      role.name.toLowerCase().includes(query) || role.description.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <SettingsPageShell
        title="Roles & Permissions"
        subtitle="View role definitions and permission assignments"
      >
        <SettingsTable
          data={filteredRoles}
          columns={columns}
          isLoading={loading}
          getRowId={(row) => row.id}
        />
      </SettingsPageShell>

      {/* Role Details Modal */}
      {selectedRole && (
        <RoleDetailsModal role={selectedRole} onClose={() => setSelectedRole(null)} />
      )}
    </>
  );
}

// Role Details Modal Component
interface RoleDetailsModalProps {
  role: Role;
  onClose: () => void;
}

function RoleDetailsModal({ role, onClose }: RoleDetailsModalProps) {
  // Group permissions by module
  const groupedPermissions = groupPermissionsByModule(role.permissions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-secondary-900">{role.name}</h2>
              <p className="text-sm text-secondary-600 mt-1">{role.description}</p>
            </div>
            <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Role Info */}
          <div className="mb-6">
            <div className="flex items-center gap-4 text-sm text-secondary-600">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{role.user_count} users</span>
              </div>
              {role.is_system && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  System Role
                </span>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Permissions</h3>

            {role.permissions[0] === '*' ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">All Permissions</p>
                <p className="text-sm text-blue-700 mt-1">
                  This role has unrestricted access to all system features
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([module, permissions]) => (
                  <div key={module} className="border border-secondary-200 rounded-lg p-4">
                    <h4 className="font-medium text-secondary-900 mb-2 capitalize">
                      {module.replace('_', ' ')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <div
                          key={permission}
                          className="flex items-center gap-2 text-sm text-secondary-700"
                        >
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="capitalize">{permission.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-200 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function to group permissions by module
function groupPermissionsByModule(permissions: string[]): Record<string, string[]> {
  if (permissions[0] === '*') {
    return {};
  }

  const grouped: Record<string, string[]> = {};

  permissions.forEach((permission) => {
    const parts = permission.split('_');
    const feature = parts.slice(1).join('_'); // e.g., "sales", "inventory"

    const key = feature || 'general';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(permission);
  });

  return grouped;
}

import React, { useState } from 'react';
import { Shield, Users } from 'lucide-react';
import { Button } from '@common/components/atoms';
import { SettingsPageShell } from './SettingsPageShell';
import { SettingsTable } from './SettingsTable';
import { useRoles } from '../hooks/useRoles';
import { RolesLoadingState, RolesErrorState, RolesEmptyState } from './RolesStateComponents';
import type { Role } from '../api/rolesApi';

export function RolesTab() {
  const { data: roles, loading, error, refetch } = useRoles();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchQuery] = useState('');

  // Handle view role details

  // Handle loading state
  if (loading) {
    return <RolesLoadingState />;
  }

  // Handle error state
  if (error) {
    return <RolesErrorState error={error} onRetry={refetch} />;
  }

  // Handle empty state
  if (!roles || roles.length === 0) {
    return <RolesEmptyState />;
  }

  // Table columns
  const columns: Array<{
    key: string;
    label: string;
    sortable: boolean;
    render: (role: Role) => React.ReactNode;
  }> = [
    {
      key: 'name',
      label: 'Role Name',
      sortable: true,
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-text-tertiary" />
          <div>
            <div className="font-medium text-text-primary">{role.name}</div>
            {role.is_system && <span className="text-xs text-text-tertiary">System Role</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: (role: Role) => <span className="text-sm text-text-secondary">{role.description}</span>,
    },
    {
      key: 'user_count',
      label: 'Users',
      sortable: true,
      render: (role: Role) => (
        <div className="flex items-center gap-1 text-sm text-text-secondary">
          <Users className="w-4 h-4" />
          <span>{role.user_count}</span>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      sortable: false,
      render: (role: Role) => (
        <span className="text-sm text-text-secondary">
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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-base rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{role.name}</h2>
              <p className="text-sm text-text-secondary mt-1">{role.description}</p>
            </div>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
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
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{role.user_count} users</span>
              </div>
              {role.is_system && (
                <span className="px-2 py-1 bg-info-500/20 text-info-400 rounded text-xs font-medium">
                  System Role
                </span>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-medium text-text-primary mb-4">Permissions</h3>

            {role.permissions[0] === '*' ? (
              <div className="p-4 bg-info-500/10 border border-info-500/30 rounded-lg">
                <p className="text-sm text-info-400 font-medium">All Permissions</p>
                <p className="text-sm text-info-300 mt-1">
                  This role has unrestricted access to all system features
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([module, permissions]) => (
                  <div key={module} className="border border-border rounded-lg p-4">
                    <h4 className="font-medium text-text-primary mb-2 capitalize">
                      {module.replace('_', ' ')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <div
                          key={permission}
                          className="flex items-center gap-2 text-sm text-text-secondary"
                        >
                          <svg
                            className="w-4 h-4 text-success-600"
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
        <div className="px-6 py-4 border-t border-border flex justify-end">
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

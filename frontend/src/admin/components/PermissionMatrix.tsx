import { useState, useMemo } from 'react';
import { Check, X, Filter } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface Permission {
  id: string;
  name: string;
  module: string;
  description?: string;
}

interface PermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
}

export function PermissionMatrix({ roles, permissions }: PermissionMatrixProps) {
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'module'>('module');

  // Get unique modules
  const modules = useMemo(() => {
    const moduleSet = new Set(permissions.map((p) => p.module));
    return ['all', ...Array.from(moduleSet).sort()];
  }, [permissions]);

  // Filter and sort permissions
  const filteredPermissions = useMemo(() => {
    let filtered = permissions;

    // Apply module filter
    if (moduleFilter !== 'all') {
      filtered = filtered.filter((p) => p.module === moduleFilter);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.module.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'module') {
        if (a.module !== b.module) {
          return a.module.localeCompare(b.module);
        }
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [permissions, moduleFilter, searchQuery, sortBy]);

  // Check if role has permission
  const hasPermission = (role: Role, permissionId: string): boolean => {
    return role.permissions.includes('*') || role.permissions.includes(permissionId);
  };

  // Get module color - uses semantic theme tokens
  const getModuleColor = (module: string): string => {
    const colors: Record<string, string> = {
      sales: 'bg-info-100 text-info-dark',
      inventory: 'bg-success-100 text-success-700',
      customers: 'bg-purple-500/20 text-purple-400',
      reports: 'bg-warning-100 text-warning-700',
      settings: 'bg-error-100 text-error-700',
      users: 'bg-primary-100 text-primary-700',
    };
    return colors[module.toLowerCase()] || 'bg-secondary-100 text-secondary-700';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search permissions..."
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Module Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-secondary-500" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {modules.map((module) => (
              <option key={module} value={module}>
                {module === 'all'
                  ? 'All Modules'
                  : module.charAt(0).toUpperCase() + module.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-secondary-600">Sort by:</span>
          <button
            onClick={() => setSortBy('module')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortBy === 'module'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            Module
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sortBy === 'name'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            Name
          </button>
        </div>
      </div>

      {/* Matrix */}
      <div className="border border-secondary-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50">
              <tr>
                <th className="sticky left-0 z-10 bg-secondary-50 px-4 py-3 text-left text-sm font-medium text-secondary-700 border-r border-secondary-200">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="px-4 py-3 text-center text-sm font-medium text-secondary-700 min-w-[120px]"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-surface-base divide-y divide-border">
              {filteredPermissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    className="px-4 py-8 text-center text-text-secondary"
                  >
                    No permissions found
                  </td>
                </tr>
              ) : (
                filteredPermissions.map((permission, idx) => (
                  <tr
                    key={permission.id}
                    className={idx % 2 === 0 ? 'bg-surface-base' : 'bg-surface-elevated/50'}
                  >
                    <td className="sticky left-0 z-10 px-4 py-3 border-r border-border bg-inherit">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {permission.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${getModuleColor(
                              permission.module
                            )}`}
                          >
                            {permission.module}
                          </span>
                        </div>
                        {permission.description && (
                          <p className="text-xs text-secondary-600 mt-1">
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="px-4 py-3 text-center">
                        {hasPermission(role, permission.id) ? (
                          <div className="flex justify-center">
                            <div className="w-6 h-6 rounded-full bg-success-100 flex items-center justify-center">
                              <Check className="w-4 h-4 text-success-600" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <div className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center">
                              <X className="w-4 h-4 text-secondary-400" />
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-secondary-600">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-success-100 flex items-center justify-center">
            <Check className="w-4 h-4 text-success-600" />
          </div>
          <span>Has Permission</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center">
            <X className="w-4 h-4 text-secondary-400" />
          </div>
          <span>No Permission</span>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-secondary-600">
        Showing {filteredPermissions.length} of {permissions.length} permissions
      </div>
    </div>
  );
}

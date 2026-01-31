import { useState } from 'react';
import { Plus, AlertCircle, UserCheck, UserX, Store, Monitor } from 'lucide-react';
import { SettingsPageShell, SettingsTable, ColumnDef, FilterChip, InlineWarningBanner } from '.';
import { FixIssuesWizard } from './FixIssuesWizard';
import { EditUserModal } from './EditUserModal';
import { useUsers, useStores, useStations, useBulkActions, User } from '../hooks';
import { Button } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';

export function UsersTab() {
  const { users, isLoading, bulkAssignStore, bulkAssignRole, bulkSetActive, updateUser } =
    useUsers();
  const { stores } = useStores();
  const { stations } = useStations();
  const { isProcessing, executeBulkAction } = useBulkActions();
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAssignStoreModal, setShowAssignStoreModal] = useState(false);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [showFixIssuesWizard, setShowFixIssuesWizard] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    active: false,
    inactive: false,
    unassignedStore: false,
    unassignedStation: false,
    neverLoggedIn: false,
  });

  // Calculate problem count (users with missing assignments)
  const problematicUsers = users.filter((user) => {
    // EasySale-neutral roles that require store assignment
    const roleRequiresStore = [
      'cashier',
      'manager',
      'specialist',
      'technician',
    ].includes(user.role);
    const roleRequiresStation = user.role === 'cashier';

    return (
      (roleRequiresStore && !user.store_id) ||
      (roleRequiresStation && user.station_policy === 'specific' && !user.station_id)
    );
  });
  const problemCount = problematicUsers.length;

  const handleFixIssues = async (
    fixes: Array<{ userId: string; storeId?: string; stationId?: string }>
  ) => {
    await executeBulkAction(
      fixes.map((fix) => fix.userId),
      async (userId) => {
        const fix = fixes.find((f) => f.userId === userId);
        if (fix) {
          await updateUser(fix.userId, {
            store_id: fix.storeId,
            station_id: fix.stationId,
          });
        }
      }
    );
  };

  // Filter users based on active filters
  const filteredUsers = users.filter((user) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.first_name && user.first_name.toLowerCase().includes(query)) ||
        (user.last_name && user.last_name.toLowerCase().includes(query));

      if (!matchesSearch) return false;
    }

    // Active/Inactive filter
    if (activeFilters.active && !user.is_active) return false;
    if (activeFilters.inactive && user.is_active) return false;

    // Unassigned Store filter
    if (activeFilters.unassignedStore) {
      // EasySale-neutral roles that require store assignment
      const roleRequiresStore = [
        'cashier',
        'manager',
        'specialist',
        'technician',
      ].includes(user.role);
      if (!roleRequiresStore || user.store_id) return false;
    }

    // Unassigned Station filter
    if (activeFilters.unassignedStation) {
      const roleRequiresStation = user.role === 'cashier';
      if (!roleRequiresStation || (user.station_policy === 'specific' && user.station_id))
        return false;
    }

    // Never Logged In filter (placeholder - would need last_login_at field)
    if (activeFilters.neverLoggedIn) {
      // TODO: Implement when last_login_at is available
    }

    return true;
  });

  // Toggle filter
  const toggleFilter = (filterKey: keyof typeof activeFilters) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  };

  // Define table columns
  const columns: ColumnDef<User>[] = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{user.username}</span>
          {!user.is_active && (
            <span className="px-2 py-0.5 text-xs font-medium bg-surface-elevated text-text-secondary rounded">
              Inactive
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user) => <span className="capitalize">{user.role.replace('_', ' ')}</span>,
    },
    {
      key: 'store_id',
      label: 'Store',
      render: (user) => {
        // EasySale-neutral roles that require store assignment
        const roleRequiresStore = [
          'cashier',
          'manager',
          'specialist',
          'technician',
        ].includes(user.role);

        if (!roleRequiresStore) {
          return <span className="text-text-tertiary">N/A</span>;
        }

        if (!user.store_id) {
          return (
            <div className="flex items-center gap-1 text-warning-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Unassigned</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1 text-text-secondary">
            <Store className="w-4 h-4" />
            <span className="text-sm">{user.store_id}</span>
          </div>
        );
      },
    },
    {
      key: 'station_policy',
      label: 'Station',
      render: (user) => {
        if (user.station_policy === 'none') {
          return <span className="text-text-tertiary">None</span>;
        }

        if (user.station_policy === 'any') {
          return <span className="text-text-secondary">Any</span>;
        }

        if (user.station_policy === 'specific') {
          if (!user.station_id) {
            return (
              <div className="flex items-center gap-1 text-warning-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Unassigned</span>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1 text-text-secondary">
              <Monitor className="w-4 h-4" />
              <span className="text-sm">{user.station_id}</span>
            </div>
          );
        }

        return null;
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-1">
          {user.is_active ? (
            <>
              <UserCheck className="w-4 h-4 text-success-600" />
              <span className="text-sm text-success-700">Active</span>
            </>
          ) : (
            <>
              <UserX className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">Inactive</span>
            </>
          )}
        </div>
      ),
    },
  ];

  // Define filters
  const filters: FilterChip[] = [
    {
      label: 'Active',
      active: activeFilters.active,
      onClick: () => toggleFilter('active'),
    },
    {
      label: 'Inactive',
      active: activeFilters.inactive,
      onClick: () => toggleFilter('inactive'),
    },
    {
      label: 'Unassigned Store',
      active: activeFilters.unassignedStore,
      onClick: () => toggleFilter('unassignedStore'),
    },
    {
      label: 'Unassigned Station',
      active: activeFilters.unassignedStation,
      onClick: () => toggleFilter('unassignedStation'),
    },
    {
      label: 'Never Logged In',
      active: activeFilters.neverLoggedIn,
      onClick: () => toggleFilter('neverLoggedIn'),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: 'Assign Store',
      onClick: (selectedIds: string[]) => {
        setSelectedUserIds(selectedIds);
        setShowAssignStoreModal(true);
      },
    },
    {
      label: 'Assign Role',
      onClick: (selectedIds: string[]) => {
        setSelectedUserIds(selectedIds);
        setShowAssignRoleModal(true);
      },
    },
    {
      label: 'Enable',
      onClick: async (selectedIds: string[]) => {
        if (window.confirm(`Enable ${selectedIds.length} users?`)) {
          await executeBulkAction(selectedIds, async (id) => {
            await bulkSetActive([id], true);
          });
        }
      },
    },
    {
      label: 'Disable',
      onClick: async (selectedIds: string[]) => {
        if (window.confirm(`Disable ${selectedIds.length} users?`)) {
          await executeBulkAction(selectedIds, async (id) => {
            await bulkSetActive([id], false);
          });
        }
      },
      variant: 'danger' as const,
    },
  ];

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setShowEditUserModal(true);
  };

  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleSaveUser = async (userId: string, data: any) => {
    await updateUser(userId, data);
    setShowEditUserModal(false);
    setSelectedUser(undefined);
  };

  const handleAssignStore = async () => {
    if (!selectedStore) return;

    await executeBulkAction(selectedUserIds, async (id) => {
      await bulkAssignStore([id], selectedStore);
    });

    setShowAssignStoreModal(false);
    setSelectedStore('');
    setSelectedUserIds([]);
  };

  const handleAssignRole = async () => {
    if (!selectedRole) return;

    await executeBulkAction(selectedUserIds, async (id) => {
      await bulkAssignRole([id], selectedRole);
    });

    setShowAssignRoleModal(false);
    setSelectedRole('');
    setSelectedUserIds([]);
  };

  // EasySale-neutral roles - no CAPS-specific roles like paint_tech
  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'inventory_clerk', label: 'Inventory Clerk' },
    { value: 'specialist', label: 'Specialist' },
    { value: 'technician', label: 'Technician' },
  ];

  return (
    <>
      <SettingsPageShell
        title="Users"
        subtitle="Manage user accounts and permissions"
        scope="global"
        searchPlaceholder="Search users by name, email, or username..."
        onSearch={setSearchQuery}
        filters={filters}
        problemCount={problemCount}
        primaryAction={{
          label: 'Add User',
          onClick: handleAddUser,
          icon: Plus,
        }}
      >
        {/* Fix Issues Banner */}
        {problemCount > 0 && (
          <div className="mb-4">
            <InlineWarningBanner
              message={`${problemCount} user${problemCount !== 1 ? 's' : ''} need${problemCount === 1 ? 's' : ''} store or station assignments`}
              actionLabel="Fix Now"
              onAction={() => setShowFixIssuesWizard(true)}
            />
          </div>
        )}

        <SettingsTable
          data={filteredUsers}
          columns={columns}
          onRowClick={handleRowClick}
          bulkActions={bulkActions}
          getRowId={(user) => user.id}
          isLoading={isLoading || isProcessing}
          emptyState={{
            title: 'No users found',
            description: 'Get started by creating your first user account.',
            action: {
              label: 'Add User',
              onClick: handleAddUser,
            },
          }}
        />
      </SettingsPageShell>

      {/* Fix Issues Wizard */}
      <FixIssuesWizard
        isOpen={showFixIssuesWizard}
        onClose={() => setShowFixIssuesWizard(false)}
        problematicUsers={problematicUsers}
        stores={stores}
        stations={stations}
        onFixIssues={handleFixIssues}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(undefined);
        }}
        user={selectedUser}
        stores={stores}
        stations={stations}
        onSave={handleSaveUser}
      />

      {/* Assign Store Modal */}
      <Modal
        isOpen={showAssignStoreModal}
        onClose={() => setShowAssignStoreModal(false)}
        title="Assign Store"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Assign a store to {selectedUserIds.length} selected user
            {selectedUserIds.length !== 1 ? 's' : ''}.
          </p>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Select Store
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={() => setShowAssignStoreModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleAssignStore}
              variant="primary"
              disabled={!selectedStore || isProcessing}
            >
              {isProcessing ? 'Assigning...' : 'Assign Store'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Role Modal */}
      <Modal
        isOpen={showAssignRoleModal}
        onClose={() => setShowAssignRoleModal(false)}
        title="Assign Role"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Assign a role to {selectedUserIds.length} selected user
            {selectedUserIds.length !== 1 ? 's' : ''}.
          </p>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Select Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={() => setShowAssignRoleModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              variant="primary"
              disabled={!selectedRole || isProcessing}
            >
              {isProcessing ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

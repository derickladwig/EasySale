import type { Meta, StoryObj } from '@storybook/react';
import { SettingsPageShell } from './SettingsPageShell';
import { Plus } from 'lucide-react';
import { SettingsTable } from './SettingsTable';

const meta = {
  title: 'Admin/SettingsPageShell',
  component: SettingsPageShell,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    scope: {
      control: 'select',
      options: ['global', 'store', 'station', 'user'],
    },
    problemCount: {
      control: 'number',
    },
  },
} satisfies Meta<typeof SettingsPageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data for table
const sampleUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Manager', status: 'Active' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Cashier', status: 'Inactive' },
];

const sampleColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'status', label: 'Status', sortable: false },
];

export const Basic: Story = {
  args: {
    title: 'Users & Roles',
    subtitle: 'Manage user accounts and permissions',
    children: <div className="p-4 bg-white rounded-lg">Content goes here</div>,
  },
};

export const WithGlobalScope: Story = {
  args: {
    title: 'System Settings',
    subtitle: 'Configure global system settings',
    scope: 'global',
    children: <div className="p-4 bg-white rounded-lg">Global settings content</div>,
  },
};

export const WithStoreScope: Story = {
  args: {
    title: 'Store Configuration',
    subtitle: 'Configure store-specific settings',
    scope: 'store',
    children: <div className="p-4 bg-white rounded-lg">Store settings content</div>,
  },
};

export const WithStationScope: Story = {
  args: {
    title: 'Station Settings',
    subtitle: 'Configure station-specific settings',
    scope: 'station',
    children: <div className="p-4 bg-white rounded-lg">Station settings content</div>,
  },
};

export const WithUserScope: Story = {
  args: {
    title: 'My Preferences',
    subtitle: 'Customize your personal preferences',
    scope: 'user',
    children: <div className="p-4 bg-white rounded-lg">User preferences content</div>,
  },
};

export const WithSearch: Story = {
  args: {
    title: 'Users & Roles',
    subtitle: 'Manage user accounts and permissions',
    searchPlaceholder: 'Search users...',
    onSearch: (query: string) => console.log('Search:', query),
    children: (
      <SettingsTable
        data={sampleUsers}
        columns={sampleColumns}
        getRowId={(row) => row.id}
      />
    ),
  },
};

export const WithFilters: Story = {
  args: {
    title: 'Users & Roles',
    subtitle: 'Manage user accounts and permissions',
    filters: [
      { label: 'Active', active: true, onClick: () => console.log('Active filter') },
      { label: 'Inactive', active: false, onClick: () => console.log('Inactive filter') },
      { label: 'Unassigned Store', active: false, onClick: () => console.log('Unassigned filter') },
      { label: 'Admin', active: false, onClick: () => console.log('Admin filter') },
    ],
    children: (
      <SettingsTable
        data={sampleUsers}
        columns={sampleColumns}
        getRowId={(row) => row.id}
      />
    ),
  },
};

export const WithProblems: Story = {
  args: {
    title: 'Users & Roles',
    subtitle: 'Manage user accounts and permissions',
    problemCount: 6,
    children: (
      <SettingsTable
        data={sampleUsers}
        columns={sampleColumns}
        getRowId={(row) => row.id}
      />
    ),
  },
};

export const WithPrimaryAction: Story = {
  args: {
    title: 'Users & Roles',
    subtitle: 'Manage user accounts and permissions',
    primaryAction: {
      label: 'Add User',
      onClick: () => console.log('Add user clicked'),
      icon: Plus,
    },
    children: (
      <SettingsTable
        data={sampleUsers}
        columns={sampleColumns}
        getRowId={(row) => row.id}
      />
    ),
  },
};

export const Complete: Story = {
  args: {
    title: 'Users & Roles',
    subtitle: 'Manage user accounts and permissions',
    scope: 'global',
    searchPlaceholder: 'Search users...',
    onSearch: (query: string) => console.log('Search:', query),
    filters: [
      { label: 'Active', active: true, onClick: () => console.log('Active filter') },
      { label: 'Inactive', active: false, onClick: () => console.log('Inactive filter') },
      { label: 'Unassigned Store', active: false, onClick: () => console.log('Unassigned filter') },
    ],
    problemCount: 6,
    primaryAction: {
      label: 'Add User',
      onClick: () => console.log('Add user clicked'),
      icon: Plus,
    },
    children: (
      <SettingsTable
        data={sampleUsers}
        columns={sampleColumns}
        getRowId={(row) => row.id}
      />
    ),
  },
};

export const AllScopes: Story = {
  args: {
    title: "All Scopes",
    children: "Content",
  },
  render: () => (
    <div className="space-y-8">
      <SettingsPageShell
        title="Global Settings"
        subtitle="System-wide configuration"
        scope="global"
      >
        <div className="p-4 bg-white rounded-lg">Global scope content</div>
      </SettingsPageShell>
      <SettingsPageShell
        title="Store Settings"
        subtitle="Store-specific configuration"
        scope="store"
      >
        <div className="p-4 bg-white rounded-lg">Store scope content</div>
      </SettingsPageShell>
      <SettingsPageShell
        title="Station Settings"
        subtitle="Station-specific configuration"
        scope="station"
      >
        <div className="p-4 bg-white rounded-lg">Station scope content</div>
      </SettingsPageShell>
      <SettingsPageShell
        title="User Preferences"
        subtitle="Personal preferences"
        scope="user"
      >
        <div className="p-4 bg-white rounded-lg">User scope content</div>
      </SettingsPageShell>
    </div>
  ),
};

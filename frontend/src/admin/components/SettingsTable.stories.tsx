import type { Meta, StoryObj } from '@storybook/react';
import { SettingsTable } from './SettingsTable';
import { Trash2, UserPlus, Store } from 'lucide-react';
import { Badge } from '@common/components/atoms';

const meta = {
  title: 'Admin/SettingsTable',
  component: SettingsTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SettingsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data
const sampleUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', store: 'Main Store' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Manager', status: 'Active', store: 'Main Store' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Cashier', status: 'Inactive', store: 'Branch Store' },
  { id: '4', name: 'Alice Williams', email: 'alice@example.com', role: 'Cashier', status: 'Active', store: 'Main Store' },
  { id: '5', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Manager', status: 'Active', store: 'Branch Store' },
];

const largeDataset = Array.from({ length: 100 }, (_, i) => ({
  id: `${i + 1}`,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: ['Admin', 'Manager', 'Cashier'][i % 3],
  status: i % 4 === 0 ? 'Inactive' : 'Active',
  store: i % 2 === 0 ? 'Main Store' : 'Branch Store',
}));

const basicColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'status', label: 'Status', sortable: false },
];

const columnsWithCustomRender = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { 
    key: 'role', 
    label: 'Role', 
    sortable: true,
    render: (row: any) => (
      <Badge variant={row.role === 'Admin' ? 'success' : 'default'}>
        {row.role}
      </Badge>
    ),
  },
  { 
    key: 'status', 
    label: 'Status', 
    sortable: false,
    render: (row: any) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'error'}>
        {row.status}
      </Badge>
    ),
  },
];

export const Basic: Story = {
  args: {
    data: sampleUsers,
    columns: basicColumns,
    getRowId: (row: any) => row.id,
  },
};

export const WithCustomRender: Story = {
  args: {
    data: sampleUsers,
    columns: columnsWithCustomRender,
    getRowId: (row: any) => row.id,
  },
};

export const WithRowClick: Story = {
  args: {
    data: sampleUsers,
    columns: basicColumns,
    getRowId: (row: any) => row.id,
    onRowClick: (row) => console.log('Row clicked:', row),
  },
};

export const WithBulkActions: Story = {
  args: {
    data: sampleUsers,
    columns: basicColumns,
    getRowId: (row: any) => row.id,
    bulkActions: [
      {
        label: 'Assign Store',
        icon: Store,
        onClick: (ids) => console.log('Assign store to:', ids),
      },
      {
        label: 'Assign Role',
        icon: UserPlus,
        onClick: (ids) => console.log('Assign role to:', ids),
      },
      {
        label: 'Delete',
        icon: Trash2,
        onClick: (ids) => console.log('Delete:', ids),
        variant: 'danger' as const,
      },
    ],
  },
};

export const EmptyState: Story = {
  args: {
    data: [],
    columns: basicColumns,
    getRowId: (row: any) => row.id,
    emptyState: {
      title: 'No users found',
      description: 'Get started by creating your first user account.',
      action: {
        label: 'Add User',
        onClick: () => console.log('Add user clicked'),
      },
    },
  },
};

export const Loading: Story = {
  args: {
    data: sampleUsers,
    columns: basicColumns,
    getRowId: (row: any) => row.id,
    isLoading: true,
  },
};

export const LargeDataset: Story = {
  args: {
    data: largeDataset,
    columns: basicColumns,
    getRowId: (row: any) => row.id,
    virtualized: true,
  },
};

export const Sortable: Story = {
  args: {
    data: sampleUsers,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'role', label: 'Role', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'store', label: 'Store', sortable: true },
    ],
    getRowId: (row: any) => row.id,
  },
};

export const WithColumnWidths: Story = {
  args: {
    data: sampleUsers,
    columns: [
      { key: 'name', label: 'Name', sortable: true, width: '25%' },
      { key: 'email', label: 'Email', sortable: true, width: '30%' },
      { key: 'role', label: 'Role', sortable: true, width: '15%' },
      { key: 'status', label: 'Status', sortable: false, width: '15%' },
      { key: 'store', label: 'Store', sortable: false, width: '15%' },
    ],
    getRowId: (row: any) => row.id,
  },
};

export const Complete: Story = {
  args: {
    data: sampleUsers,
    columns: columnsWithCustomRender,
    getRowId: (row: any) => row.id,
    onRowClick: (row) => console.log('Row clicked:', row),
    bulkActions: [
      {
        label: 'Assign Store',
        icon: Store,
        onClick: (ids) => console.log('Assign store to:', ids),
      },
      {
        label: 'Delete',
        icon: Trash2,
        onClick: (ids) => console.log('Delete:', ids),
        variant: 'danger' as const,
      },
    ],
  },
};

export const AllStates: Story = {
  args: {
    data: [],
    columns: [],
    getRowId: (row: any) => row.id,
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium mb-4">Basic Table</h3>
        <SettingsTable
          data={sampleUsers.slice(0, 3)}
          columns={basicColumns}
          getRowId={(row: any) => row.id}
        />
      </div>
      <div>
        <h3 className="text-lg font-medium mb-4">With Bulk Actions</h3>
        <SettingsTable
          data={sampleUsers.slice(0, 3)}
          columns={basicColumns}
          getRowId={(row: any) => row.id}
          bulkActions={[
            {
              label: 'Assign Store',
              icon: Store,
              onClick: (ids) => console.log('Assign store to:', ids),
            },
          ]}
        />
      </div>
      <div>
        <h3 className="text-lg font-medium mb-4">Empty State</h3>
        <SettingsTable
          data={[]}
          columns={basicColumns}
          getRowId={(row: any) => row.id}
          emptyState={{
            title: 'No users found',
            description: 'Get started by creating your first user account.',
            action: {
              label: 'Add User',
              onClick: () => console.log('Add user clicked'),
            },
          }}
        />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import { BulkActionsBar } from './BulkActionsBar';
import { Store, UserPlus, Trash2, Mail, Lock } from 'lucide-react';

const meta = {
  title: 'Admin/BulkActionsBar',
  component: BulkActionsBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedCount: {
      control: 'number',
    },
  },
} satisfies Meta<typeof BulkActionsBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleActions = [
  {
    label: 'Assign Store',
    icon: Store,
    onClick: (ids: string[]) => console.log('Assign store to:', ids),
  },
  {
    label: 'Assign Role',
    icon: UserPlus,
    onClick: (ids: string[]) => console.log('Assign role to:', ids),
  },
  {
    label: 'Delete',
    icon: Trash2,
    onClick: (ids: string[]) => console.log('Delete:', ids),
    variant: 'danger' as const,
  },
];

export const SingleItem: Story = {
  args: {
    selectedCount: 1,
    selectedIds: ['1'],
    actions: sampleActions,
  },
};

export const MultipleItems: Story = {
  args: {
    selectedCount: 5,
    selectedIds: ['1', '2', '3', '4', '5'],
    actions: sampleActions,
  },
};

export const ManyItems: Story = {
  args: {
    selectedCount: 42,
    selectedIds: Array.from({ length: 42 }, (_, i) => `${i + 1}`),
    actions: sampleActions,
  },
};

export const WithClearSelection: Story = {
  args: {
    selectedCount: 5,
    selectedIds: ['1', '2', '3', '4', '5'],
    actions: sampleActions,
    onClearSelection: () => console.log('Clear selection'),
  },
};

export const SingleAction: Story = {
  args: {
    selectedCount: 3,
    selectedIds: ['1', '2', '3'],
    actions: [
      {
        label: 'Delete',
        icon: Trash2,
        onClick: (ids: string[]) => console.log('Delete:', ids),
        variant: 'danger' as const,
      },
    ],
  },
};

export const ManyActions: Story = {
  args: {
    selectedCount: 3,
    selectedIds: ['1', '2', '3'],
    actions: [
      {
        label: 'Assign Store',
        icon: Store,
        onClick: (ids: string[]) => console.log('Assign store to:', ids),
      },
      {
        label: 'Assign Role',
        icon: UserPlus,
        onClick: (ids: string[]) => console.log('Assign role to:', ids),
      },
      {
        label: 'Send Email',
        icon: Mail,
        onClick: (ids: string[]) => console.log('Send email to:', ids),
      },
      {
        label: 'Reset Password',
        icon: Lock,
        onClick: (ids: string[]) => console.log('Reset password for:', ids),
      },
      {
        label: 'Delete',
        icon: Trash2,
        onClick: (ids: string[]) => console.log('Delete:', ids),
        variant: 'danger' as const,
      },
    ],
  },
};

export const DangerActions: Story = {
  args: {
    selectedCount: 3,
    selectedIds: ['1', '2', '3'],
    actions: [
      {
        label: 'Disable',
        onClick: (ids: string[]) => console.log('Disable:', ids),
        variant: 'danger' as const,
      },
      {
        label: 'Delete',
        icon: Trash2,
        onClick: (ids: string[]) => console.log('Delete:', ids),
        variant: 'danger' as const,
      },
    ],
  },
};

export const NoSelection: Story = {
  args: {
    selectedCount: 0,
    selectedIds: [],
    actions: sampleActions,
  },
};

export const AllVariations: Story = {
  args: {
    selectedCount: 1,
    selectedIds: ['1'],
    actions: sampleActions,
    onClearSelection: () => {}
  },
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Single Item Selected</h3>
        <BulkActionsBar
          selectedCount={1}
          selectedIds={['1']}
          actions={sampleActions}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Multiple Items Selected</h3>
        <BulkActionsBar
          selectedCount={5}
          selectedIds={['1', '2', '3', '4', '5']}
          actions={sampleActions}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">With Clear Selection</h3>
        <BulkActionsBar
          selectedCount={5}
          selectedIds={['1', '2', '3', '4', '5']}
          actions={sampleActions}
          onClearSelection={() => console.log('Clear selection')}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Many Actions</h3>
        <BulkActionsBar
          selectedCount={3}
          selectedIds={['1', '2', '3']}
          actions={[
            {
              label: 'Assign Store',
              icon: Store,
              onClick: (ids: string[]) => console.log('Assign store to:', ids),
            },
            {
              label: 'Assign Role',
              icon: UserPlus,
              onClick: (ids: string[]) => console.log('Assign role to:', ids),
            },
            {
              label: 'Send Email',
              icon: Mail,
              onClick: (ids: string[]) => console.log('Send email to:', ids),
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: (ids: string[]) => console.log('Delete:', ids),
              variant: 'danger' as const,
            },
          ]}
        />
      </div>
    </div>
  ),
};

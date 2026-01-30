import type { Meta, StoryObj } from '@storybook/react';
import { SyncProgressIndicator } from './SyncProgressIndicator';

const meta = {
  title: 'Molecules/SyncProgressIndicator',
  component: SyncProgressIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isSyncing: {
      control: 'boolean',
    },
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    itemsSynced: {
      control: 'number',
    },
    totalItems: {
      control: 'number',
    },
    message: {
      control: 'text',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof SyncProgressIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isSyncing: true,
  },
};

export const WithProgress: Story = {
  args: {
    isSyncing: true,
    progress: 65,
  },
};

export const WithItemCount: Story = {
  args: {
    isSyncing: true,
    itemsSynced: 45,
    totalItems: 100,
  },
};

export const WithCustomMessage: Story = {
  args: {
    isSyncing: true,
    message: 'Uploading changes to server...',
    progress: 75,
  },
};

export const SmallSize: Story = {
  args: {
    isSyncing: true,
    progress: 50,
    size: 'sm',
  },
};

export const MediumSize: Story = {
  args: {
    isSyncing: true,
    progress: 50,
    size: 'md',
  },
};

export const LargeSize: Story = {
  args: {
    isSyncing: true,
    progress: 50,
    size: 'lg',
  },
};

export const NotSyncing: Story = {
  args: {
    isSyncing: false,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <SyncProgressIndicator isSyncing={true} progress={50} size="sm" />
      <SyncProgressIndicator isSyncing={true} progress={50} size="md" />
      <SyncProgressIndicator isSyncing={true} progress={50} size="lg" />
    </div>
  ),
};

export const ProgressStages: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <SyncProgressIndicator isSyncing={true} progress={0} message="Starting sync..." />
      <SyncProgressIndicator isSyncing={true} progress={25} message="Syncing..." />
      <SyncProgressIndicator isSyncing={true} progress={50} message="Halfway there..." />
      <SyncProgressIndicator isSyncing={true} progress={75} message="Almost done..." />
      <SyncProgressIndicator isSyncing={true} progress={100} message="Completing..." />
    </div>
  ),
};

export const AllFeatures: Story = {
  args: {
    isSyncing: true,
    progress: 75,
    itemsSynced: 75,
    totalItems: 100,
    message: 'Syncing your changes...',
    size: 'lg',
  },
};

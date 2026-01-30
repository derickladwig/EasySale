import type { Meta, StoryObj } from '@storybook/react';
import { StatusIndicator } from './StatusIndicator';

const meta = {
  title: 'Atoms/StatusIndicator',
  component: StatusIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['online', 'offline', 'syncing', 'synced', 'error'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    showLabel: {
      control: 'boolean',
    },
    count: {
      control: 'number',
    },
    tooltip: {
      control: 'text',
    },
  },
} satisfies Meta<typeof StatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Online: Story = {
  args: {
    status: 'online',
    showLabel: true,
  },
};

export const Offline: Story = {
  args: {
    status: 'offline',
    showLabel: true,
  },
};

export const Syncing: Story = {
  args: {
    status: 'syncing',
    showLabel: true,
  },
};

export const Synced: Story = {
  args: {
    status: 'synced',
    showLabel: true,
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    showLabel: true,
  },
};

export const Small: Story = {
  args: {
    status: 'online',
    size: 'sm',
    showLabel: true,
  },
};

export const Medium: Story = {
  args: {
    status: 'online',
    size: 'md',
    showLabel: true,
  },
};

export const Large: Story = {
  args: {
    status: 'online',
    size: 'lg',
    showLabel: true,
  },
};

export const WithoutLabel: Story = {
  args: {
    status: 'online',
    showLabel: false,
  },
};

export const WithCount: Story = {
  args: {
    status: 'error',
    showLabel: true,
    count: 5,
  },
};

export const WithTooltip: Story = {
  args: {
    status: 'online',
    showLabel: true,
    tooltip: 'Connected to server',
  },
};

export const AllStatuses: Story = {
  args: {
    status: "online" as const
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <StatusIndicator status="online" showLabel />
      <StatusIndicator status="offline" showLabel />
      <StatusIndicator status="syncing" showLabel />
      <StatusIndicator status="synced" showLabel />
      <StatusIndicator status="error" showLabel />
    </div>
  ),
};

export const AllSizes: Story = {
  args: {
    status: "online" as const
  },
  render: () => (
    <div className="flex items-center gap-4">
      <StatusIndicator status="online" size="sm" showLabel />
      <StatusIndicator status="online" size="md" showLabel />
      <StatusIndicator status="online" size="lg" showLabel />
    </div>
  ),
};

export const DotsOnly: Story = {
  args: {
    status: "online" as const
  },
  render: () => (
    <div className="flex items-center gap-4">
      <StatusIndicator status="online" />
      <StatusIndicator status="offline" />
      <StatusIndicator status="syncing" />
      <StatusIndicator status="synced" />
      <StatusIndicator status="error" />
    </div>
  ),
};

export const WithCountBadges: Story = {
  args: {
    status: "error" as const,
    count: 3
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <StatusIndicator status="error" showLabel count={3} />
      <StatusIndicator status="error" showLabel count={15} />
      <StatusIndicator status="error" showLabel count={150} />
      <StatusIndicator status="syncing" showLabel count={42} />
    </div>
  ),
};

export const WithTooltips: Story = {
  args: {
    status: "online" as const,
    tooltip: "Connected to server"
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <StatusIndicator status="online" showLabel tooltip="Connected to server" />
      <StatusIndicator status="offline" showLabel tooltip="No internet connection" />
      <StatusIndicator status="syncing" showLabel tooltip="Syncing 45 of 100 items" />
      <StatusIndicator status="error" showLabel count={5} tooltip="5 sync errors occurred" />
    </div>
  ),
};

export const AllFeaturesCombined: Story = {
  args: {
    status: "online" as const
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <StatusIndicator 
        status="online" 
        showLabel 
        size="lg" 
        tooltip="System is online and operational" 
      />
      <StatusIndicator 
        status="error" 
        showLabel 
        size="md" 
        count={5} 
        tooltip="5 errors need attention" 
      />
      <StatusIndicator 
        status="syncing" 
        showLabel 
        size="sm" 
        count={42} 
        tooltip="Syncing 42 items" 
      />
    </div>
  ),
};

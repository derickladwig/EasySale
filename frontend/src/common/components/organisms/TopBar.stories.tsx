import type { Meta, StoryObj } from '@storybook/react';
import { TopBar } from './TopBar';

const meta = {
  title: 'Layout/TopBar',
  component: TopBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    syncStatus: {
      control: 'select',
      options: ['online', 'syncing', 'offline'],
    },
    notificationCount: {
      control: 'number',
    },
    showSearch: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultUser = {
  firstName: 'John',
  username: 'john.doe',
  role: 'manager',
};

export const Default: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
    notificationCount: 0,
  },
};

export const OnlineStatus: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
  },
};

export const SyncingStatus: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'syncing',
  },
};

export const OfflineStatus: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'offline',
  },
};

export const WithNotifications: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
    notificationCount: 5,
  },
};

export const WithoutSearch: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
    showSearch: false,
  },
};

export const MobileSidebarOpen: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
    isSidebarOpen: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const MobileSidebarClosed: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
    isSidebarOpen: false,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletView: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const WithCustomLogo: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
    logo: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">🚗</span>
        </div>
        <span className="text-lg font-bold text-white">Custom Store</span>
      </div>
    ),
  },
};

export const WithCustomStoreName: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
    storeName: 'Downtown Auto Parts',
  },
};

export const WithInteractions: Story = {
  args: {
    user: defaultUser,
    syncStatus: 'online',
    notificationCount: 3,
    onMenuClick: () => console.log('Menu clicked'),
    onLogout: () => console.log('Logout clicked'),
    onSearchChange: (value) => console.log('Search:', value),
    onNotificationsClick: () => console.log('Notifications clicked'),
    onProfileClick: () => console.log('Profile clicked'),
  },
};

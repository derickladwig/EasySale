import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { AuthProvider } from './common/contexts/AuthContext';
import { PermissionsProvider } from './common/contexts/PermissionsContext';

const meta = {
  title: 'Layout/AppShell',
  component: AppLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <PermissionsProvider>
            <Story />
          </PermissionsProvider>
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnHomePage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <PermissionsProvider>
            <Story />
          </PermissionsProvider>
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
};

export const OnSellPage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/sell']}>
        <AuthProvider>
          <PermissionsProvider>
            <Story />
          </PermissionsProvider>
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
};

export const OnInventoryPage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/inventory']}>
        <AuthProvider>
          <PermissionsProvider>
            <Story />
          </PermissionsProvider>
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
};

export const OnAdminPage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <PermissionsProvider>
            <Story />
          </PermissionsProvider>
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const DesktopView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

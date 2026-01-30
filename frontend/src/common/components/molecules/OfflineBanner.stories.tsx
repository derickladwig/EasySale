import type { Meta, StoryObj } from '@storybook/react';
import { OfflineBanner } from './OfflineBanner';

const meta = {
  title: 'Molecules/OfflineBanner',
  component: OfflineBanner,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    isVisible: {
      control: 'boolean',
    },
    showClose: {
      control: 'boolean',
    },
    message: {
      control: 'text',
    },
  },
} satisfies Meta<typeof OfflineBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isVisible: true,
  },
};

export const WithCustomMessage: Story = {
  args: {
    isVisible: true,
    message: 'Connection lost. Working in offline mode.',
  },
};

export const WithCloseButton: Story = {
  args: {
    isVisible: true,
    showClose: true,
    onClose: () => console.log('Close clicked'),
  },
};

export const Hidden: Story = {
  args: {
    isVisible: false,
  },
};

export const AllFeatures: Story = {
  args: {
    isVisible: true,
    message: 'You are offline. Changes will sync when connection is restored.',
    showClose: true,
    onClose: () => console.log('Close clicked'),
  },
};

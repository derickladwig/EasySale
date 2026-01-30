import type { Meta, StoryObj } from '@storybook/react';
import { InlineWarningBanner } from './InlineWarningBanner';

const meta = {
  title: 'Admin/InlineWarningBanner',
  component: InlineWarningBanner,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    dismissible: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof InlineWarningBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    message: 'This is a warning message.',
  },
};

export const WithAction: Story = {
  args: {
    message: '6 users have missing store assignments.',
    actionLabel: 'Fix Now',
    onAction: () => console.log('Fix action clicked'),
  },
};

export const Dismissible: Story = {
  args: {
    message: 'This warning can be dismissed.',
    dismissible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const WithActionAndDismiss: Story = {
  args: {
    message: '6 users have missing store assignments.',
    actionLabel: 'Fix Now',
    onAction: () => console.log('Fix action clicked'),
    dismissible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const LongMessage: Story = {
  args: {
    message:
      'Multiple users in your system have incomplete configurations that may prevent them from logging in or performing their duties. This includes missing store assignments, unassigned stations, and incomplete role configurations.',
    actionLabel: 'Review Issues',
    onAction: () => console.log('Review action clicked'),
    dismissible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const ShortMessage: Story = {
  args: {
    message: 'Action required.',
    actionLabel: 'Fix',
    onAction: () => console.log('Fix action clicked'),
  },
};

export const NoAction: Story = {
  args: {
    message: 'This is an informational warning with no action button.',
    dismissible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const MultipleWarnings: Story = {
  args: {
    message: "Multiple warnings",
  },
  render: () => (
    <div className="space-y-4">
      <InlineWarningBanner
        message="6 users have missing store assignments."
        actionLabel="Fix Now"
        onAction={() => console.log('Fix store assignments')}
      />
      <InlineWarningBanner
        message="3 stations are offline."
        actionLabel="View Stations"
        onAction={() => console.log('View stations')}
        dismissible
        onDismiss={() => console.log('Dismissed')}
      />
      <InlineWarningBanner
        message="Backup has not run in 7 days."
        actionLabel="Run Backup"
        onAction={() => console.log('Run backup')}
      />
      <InlineWarningBanner
        message="System update available."
        dismissible
        onDismiss={() => console.log('Dismissed')}
      />
    </div>
  ),
};

export const AllVariations: Story = {
  args: {
    message: "Warning message",
  },
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Basic Warning</h3>
        <InlineWarningBanner message="This is a basic warning message." />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">With Action Button</h3>
        <InlineWarningBanner
          message="6 users have missing store assignments."
          actionLabel="Fix Now"
          onAction={() => console.log('Fix action clicked')}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Dismissible</h3>
        <InlineWarningBanner
          message="This warning can be dismissed."
          dismissible
          onDismiss={() => console.log('Dismissed')}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">With Action and Dismiss</h3>
        <InlineWarningBanner
          message="6 users have missing store assignments."
          actionLabel="Fix Now"
          onAction={() => console.log('Fix action clicked')}
          dismissible
          onDismiss={() => console.log('Dismissed')}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Long Message</h3>
        <InlineWarningBanner
          message="Multiple users in your system have incomplete configurations that may prevent them from logging in or performing their duties. This includes missing store assignments, unassigned stations, and incomplete role configurations."
          actionLabel="Review Issues"
          onAction={() => console.log('Review action clicked')}
          dismissible
          onDismiss={() => console.log('Dismissed')}
        />
      </div>
    </div>
  ),
};

export const UseCases: Story = {
  args: {
    message: "Use cases demo",
  },
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">User Management</h3>
        <InlineWarningBanner
          message="6 users have missing store assignments and cannot perform POS operations."
          actionLabel="Fix Issues"
          onAction={() => console.log('Fix user issues')}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">System Status</h3>
        <InlineWarningBanner
          message="3 stations have not synced in over 24 hours."
          actionLabel="View Stations"
          onAction={() => console.log('View stations')}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Backup Alert</h3>
        <InlineWarningBanner
          message="Automated backup has not run successfully in 7 days."
          actionLabel="Run Backup Now"
          onAction={() => console.log('Run backup')}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Configuration Issue</h3>
        <InlineWarningBanner
          message="Payment terminal is not configured. Cash-only transactions available."
          actionLabel="Configure Terminal"
          onAction={() => console.log('Configure terminal')}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Update Available</h3>
        <InlineWarningBanner
          message="A new system update is available with security improvements."
          actionLabel="View Update"
          onAction={() => console.log('View update')}
          dismissible
          onDismiss={() => console.log('Dismissed')}
        />
      </div>
    </div>
  ),
};

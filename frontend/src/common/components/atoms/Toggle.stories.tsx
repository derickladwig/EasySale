import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from './Toggle';
import { useState } from 'react';

const meta = {
  title: 'Atoms/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the toggle is checked',
    },
    onChange: {
      action: 'changed',
      description: 'Callback when toggle state changes',
    },
    label: {
      control: 'text',
      description: 'Label text for the toggle',
    },
    description: {
      control: 'text',
      description: 'Description text shown below the label',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the toggle is disabled',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for interactive stories
const ToggleWrapper = (args: any) => {
  const [checked, setChecked] = useState(args.checked || false);
  return <Toggle {...args} checked={checked} onChange={setChecked} />;
};

export const Default: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    label: 'Enable Feature',
    description: 'Turn this feature on or off',
    checked: false,
    onChange: () => {},
  },
};

export const WithoutLabel: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    checked: false,
    onChange: () => {},
  },
};

export const WithLabelOnly: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    label: 'Enable Notifications',
    checked: false,
    onChange: () => {},
  },
};

export const Checked: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    checked: true,
    label: 'Email Notifications',
    description: 'Receive notifications via email',
    onChange: () => {},
  },
};

export const Disabled: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    disabled: true,
    label: 'Disabled Feature',
    description: 'This feature cannot be toggled',
    checked: false,
    onChange: () => {},
  },
};

export const DisabledChecked: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    checked: true,
    disabled: true,
    label: 'Disabled Feature (Checked)',
    description: 'This feature is enabled but cannot be toggled',
    onChange: () => {},
  },
};

export const SmallSize: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    size: 'sm',
    label: 'Small Toggle',
    description: 'A smaller toggle switch',
    checked: false,
    onChange: () => {},
  },
};

export const MediumSize: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    size: 'md',
    label: 'Medium Toggle',
    description: 'Default medium size toggle',
    checked: false,
    onChange: () => {},
  },
};

export const LargeSize: Story = {
  render: (args) => <ToggleWrapper {...args} />,
  args: {
    size: 'lg',
    label: 'Large Toggle',
    description: 'A larger toggle switch',
    checked: false,
    onChange: () => {},
  },
};

export const AllSizes: Story = {
  args: {
    checked: false,
    onChange: () => {},
  },
  render: () => (
    <div className="space-y-6 w-96">
      <ToggleWrapper size="sm" label="Small" description="Small size toggle" />
      <ToggleWrapper size="md" label="Medium" description="Medium size toggle (default)" />
      <ToggleWrapper size="lg" label="Large" description="Large size toggle" />
    </div>
  ),
};

export const SettingsExample: Story = {
  args: {
    checked: false,
    onChange: () => {},
  },
  render: () => {
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [desktopNotifications, setDesktopNotifications] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [autoSave, setAutoSave] = useState(false);

    return (
      <div className="w-96 space-y-4 p-6 bg-background-secondary rounded-lg">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <Toggle
            checked={emailNotifications}
            onChange={setEmailNotifications}
            label="Email Notifications"
            description="Receive notifications via email"
          />
          <Toggle
            checked={desktopNotifications}
            onChange={setDesktopNotifications}
            label="Desktop Notifications"
            description="Show desktop notifications for important events"
          />
          <Toggle
            checked={soundEnabled}
            onChange={setSoundEnabled}
            label="Sound Effects"
            description="Play sounds for notifications and alerts"
          />
          <Toggle
            checked={autoSave}
            onChange={setAutoSave}
            label="Auto-save"
            description="Automatically save changes as you work"
          />
        </div>
      </div>
    );
  },
};

export const CompactList: Story = {
  args: {
    checked: false,
    onChange: () => {},
  },
  render: () => {
    const [feature1, setFeature1] = useState(true);
    const [feature2, setFeature2] = useState(false);
    const [feature3, setFeature3] = useState(true);

    return (
      <div className="w-96 space-y-3 p-6 bg-background-secondary rounded-lg">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Feature Flags</h3>
        <div className="space-y-3">
          <div className="p-3 bg-background-primary rounded-lg">
            <Toggle
              checked={feature1}
              onChange={setFeature1}
              label="Loyalty Program"
              description="Enable customer loyalty points and rewards"
            />
          </div>
          <div className="p-3 bg-background-primary rounded-lg">
            <Toggle
              checked={feature2}
              onChange={setFeature2}
              label="Service Orders"
              description="Track work orders and service appointments"
            />
          </div>
          <div className="p-3 bg-background-primary rounded-lg">
            <Toggle
              checked={feature3}
              onChange={setFeature3}
              label="E-commerce Sync"
              description="Synchronize with online store platforms"
            />
          </div>
        </div>
      </div>
    );
  },
};

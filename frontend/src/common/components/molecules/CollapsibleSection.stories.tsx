import type { Meta, StoryObj } from '@storybook/react';
import { CollapsibleSection } from './CollapsibleSection';
import { User, Lock, Palette, Bell, Globe, DollarSign } from 'lucide-react';
import { Input } from '../atoms/Input';

const meta = {
  title: 'Molecules/CollapsibleSection',
  component: CollapsibleSection,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CollapsibleSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default collapsible section with simple content
 */
export const Default: Story = {
  args: {
    title: 'Profile Settings',
    icon: User,
    children: (
      <div className="space-y-4">
        <p className="text-text-secondary">
          Manage your profile information and preferences.
        </p>
        <Input
          label="Display Name"
          value="John Doe"
          onChange={() => {}}
          placeholder="Enter your name"
        />
        <Input
          label="Email"
          type="email"
          value="john@example.com"
          onChange={() => {}}
          placeholder="Enter your email"
        />
      </div>
    ),
  },
};

/**
 * Section that starts closed
 */
export const DefaultClosed: Story = {
  args: {
    title: 'Advanced Settings',
    icon: Lock,
    defaultOpen: false,
    children: (
      <div className="space-y-4">
        <p className="text-text-secondary">
          These settings are for advanced users only.
        </p>
        <div className="p-4 bg-background-secondary rounded-lg">
          <p className="text-text-primary">Advanced configuration options...</p>
        </div>
      </div>
    ),
  },
};

/**
 * Section without icon
 */
export const WithoutIcon: Story = {
  args: {
    title: 'General Settings',
    children: (
      <div className="space-y-4">
        <p className="text-text-secondary">Basic configuration options.</p>
        <div className="flex items-center justify-between p-4 bg-background-secondary rounded-lg">
          <div>
            <div className="text-sm font-medium text-text-primary">Enable Notifications</div>
            <div className="text-xs text-text-tertiary mt-1">
              Receive notifications for important events
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-background-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-text-inverse after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-inverse after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>
      </div>
    ),
  },
};

/**
 * Multiple sections stacked
 */
export const MultipleSections: Story = {
  args: {
    title: "Multiple Sections",
    children: "Content"
  },
  render: () => (
    <div className="space-y-4 max-w-4xl">
      <CollapsibleSection title="Profile" icon={User} defaultOpen={true}>
        <div className="space-y-4">
          <Input
            label="Display Name"
            value="John Doe"
            onChange={() => {}}
            placeholder="Enter your name"
          />
          <Input
            label="Email"
            type="email"
            value="john@example.com"
            onChange={() => {}}
            placeholder="Enter your email"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Security" icon={Lock} defaultOpen={false}>
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value=""
            onChange={() => {}}
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            type="password"
            value=""
            onChange={() => {}}
            placeholder="Enter new password"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Appearance" icon={Palette} defaultOpen={false}>
        <div className="space-y-4">
          <p className="text-text-secondary">Customize the look and feel of the application.</p>
          <div className="grid grid-cols-3 gap-4">
            {['Light', 'Dark', 'Auto'].map((theme) => (
              <button
                key={theme}
                className="p-4 rounded-lg border-2 border-border-light bg-background-secondary hover:border-primary-500 transition-colors"
              >
                <div className="text-center">
                  <div className="text-sm font-medium text-text-primary">{theme}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Notifications" icon={Bell} defaultOpen={false}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-background-secondary rounded-lg">
            <div>
              <div className="text-sm font-medium text-text-primary">Email Notifications</div>
              <div className="text-xs text-text-tertiary mt-1">
                Receive notifications via email
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-background-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-text-inverse after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-inverse after:border-border-default after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  ),
};

/**
 * Section with complex content
 */
export const ComplexContent: Story = {
  args: {
    title: 'Localization',
    icon: Globe,
    children: (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Language</label>
            <select className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>English</option>
              <option>French</option>
              <option>Spanish</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Currency</label>
            <select className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>CAD - Canadian Dollar</option>
              <option>USD - US Dollar</option>
              <option>EUR - Euro</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-background-secondary rounded-lg border border-border-light">
          <div className="text-sm text-text-tertiary mb-2">Preview:</div>
          <div className="text-2xl font-bold text-text-primary">$1,234.56</div>
        </div>
      </div>
    ),
  },
};

/**
 * Section with long content to test scrolling
 */
export const LongContent: Story = {
  args: {
    title: 'Tax Configuration',
    icon: DollarSign,
    children: (
      <div className="space-y-4">
        <p className="text-text-secondary">Configure tax rates and rules for your business.</p>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 bg-background-secondary rounded-lg">
            <div className="font-medium text-text-primary mb-2">Tax Rule {i}</div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tax Name" value={`Tax ${i}`} onChange={() => {}} />
              <Input label="Rate (%)" value="13.00" onChange={() => {}} type="number" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
};

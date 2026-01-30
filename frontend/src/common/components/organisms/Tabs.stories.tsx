import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Tabs, TabItem } from './Tabs';
import { Home, Settings, Users, Package, FileText, BarChart, Bell, Shield, Database, Printer } from 'lucide-react';

const meta = {
  title: 'Organisms/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle state
function TabsWrapper({ items, variant = 'horizontal' }: { items: TabItem[]; variant?: 'horizontal' | 'vertical' }) {
  const [activeTab, setActiveTab] = useState(items[0].id);
  return <Tabs items={items} activeTab={activeTab} onTabChange={setActiveTab} variant={variant} />;
}

const basicTabs: TabItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'users', label: 'Users', icon: Users },
];

const manyTabs: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'hardware', label: 'Hardware', icon: Printer },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'users', label: 'Users', icon: Users },
];

const tabsWithDisabled: TabItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'settings', label: 'Settings', icon: Settings, disabled: true },
  { id: 'users', label: 'Users', icon: Users },
];

export const Horizontal: Story = {
  args: {
    items: basicTabs,
    activeTab: "dashboard",
    onTabChange: () => {}
  },
  render: () => <TabsWrapper items={basicTabs} variant="horizontal" />,
};

export const Vertical: Story = {
  args: {
    items: basicTabs,
    activeTab: "dashboard", 
    onTabChange: () => {}
  },
  render: () => <TabsWrapper items={basicTabs} variant="vertical" />,
};

export const WithoutIcons: Story = {
  args: {
    items: [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
    ],
    activeTab: "tab1",
    onTabChange: () => {}
  },
  render: () => {
    const items: TabItem[] = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
    ];
    return <TabsWrapper items={items} />;
  },
};

export const WithDisabledTab: Story = {
  args: {
    items: tabsWithDisabled,
    activeTab: "dashboard",
    onTabChange: () => {}
  },
  render: () => <TabsWrapper items={tabsWithDisabled} />,
};

export const ManyTabsScrolling: Story = {
  args: {
    items: manyTabs,
    activeTab: "tab1",
    onTabChange: () => {}
  },
  render: () => (
    <div className="max-w-2xl">
      <h3 className="text-lg font-medium mb-4 text-text-primary">
        Horizontal Scrolling (Resize window to see scrolling)
      </h3>
      <TabsWrapper items={manyTabs} variant="horizontal" />
      <p className="text-sm text-text-tertiary mt-4">
        When tabs don't fit in the container, they scroll horizontally. Try resizing your browser window to see the effect.
      </p>
    </div>
  ),
};

export const MobileView: Story = {
  args: {
    items: manyTabs,
    activeTab: "tab1",
    onTabChange: () => {}
  },
  render: () => (
    <div className="max-w-sm">
      <h3 className="text-lg font-medium mb-4 text-text-primary">Mobile View (320px width)</h3>
      <TabsWrapper items={manyTabs} variant="horizontal" />
      <p className="text-sm text-text-tertiary mt-4">
        On mobile devices, tabs scroll horizontally to accommodate all options.
      </p>
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const LongLabels: Story = {
  args: {
    items: [
      { id: 'tab1', label: 'Very Long Tab Label That Might Wrap', icon: Home },
      { id: 'tab2', label: 'Another Long Label', icon: Settings },
      { id: 'tab3', label: 'Short', icon: Users },
    ],
    activeTab: "tab1",
    onTabChange: () => {}
  },
  render: () => {
    const items: TabItem[] = [
      { id: 'tab1', label: 'Very Long Tab Label That Might Wrap', icon: Home },
      { id: 'tab2', label: 'Another Long Label', icon: Settings },
      { id: 'tab3', label: 'Short', icon: Users },
    ];
    return <TabsWrapper items={items} />;
  },
};

export const Interactive: Story = {
  args: {
    items: basicTabs,
    activeTab: "home",
    onTabChange: () => {}
  },
  render: () => {
    const [activeTab, setActiveTab] = useState('home');
    return (
      <div className="space-y-4">
        <Tabs items={basicTabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="p-4 bg-surface-base rounded-lg">
          <p className="text-text-primary">Active Tab: <strong>{activeTab}</strong></p>
        </div>
      </div>
    );
  },
};

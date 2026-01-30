import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from './Sidebar';
import { Home, ShoppingCart, Search, Package, Users, BarChart3, Settings } from 'lucide-react';

const meta = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'sell', label: 'Sell', icon: ShoppingCart, path: '/sell' },
  { id: 'lookup', label: 'Lookup', icon: Search, path: '/lookup' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
  { id: 'reporting', label: 'Reports', icon: BarChart3, path: '/reporting' },
  { id: 'admin', label: 'Admin', icon: Settings, path: '/admin' },
];

export const Default: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'home',
  },
};

export const HomeActive: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'home',
  },
};

export const SellActive: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'sell',
  },
};

export const WarehouseActive: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'inventory',
  },
};

export const AdminActive: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'admin',
  },
};

export const MobileOpen: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'home',
    isOpen: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const MobileClosed: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'home',
    isOpen: false,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletView: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'home',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const WithCustomStoreInfo: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'home',
    storeInfo: {
      name: 'Downtown Auto Parts',
      station: 'POS-002',
    },
  },
};

export const LimitedItems: Story = {
  args: {
    items: [
      { id: 'home', label: 'Home', icon: Home, path: '/' },
      { id: 'sell', label: 'Sell', icon: ShoppingCart, path: '/sell' },
      { id: 'lookup', label: 'Lookup', icon: Search, path: '/lookup' },
    ],
    activeItemId: 'sell',
  },
};

export const WithInteractions: Story = {
  args: {
    items: defaultItems,
    activeItemId: 'home',
    onItemClick: (item) => console.log('Clicked:', item.label),
  },
};

export const LongList: Story = {
  args: {
    items: [
      ...defaultItems,
      { id: 'invoices', label: 'Invoices', icon: BarChart3, path: '/invoices' },
      { id: 'quotes', label: 'Quotes', icon: BarChart3, path: '/quotes' },
      { id: 'orders', label: 'Orders', icon: Package, path: '/orders' },
      { id: 'suppliers', label: 'Suppliers', icon: Users, path: '/suppliers' },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
      { id: 'help', label: 'Help', icon: Settings, path: '/help' },
    ],
    activeItemId: 'home',
  },
};

export const WithBadges: Story = {
  args: {
    items: [
      { id: 'home', label: 'Home', icon: Home, path: '/' },
      { id: 'sell', label: 'Sell', icon: ShoppingCart, path: '/sell', badge: 3 },
      { id: 'lookup', label: 'Lookup', icon: Search, path: '/lookup' },
      { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory', badge: 12 },
      { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
      { id: 'reporting', label: 'Reports', icon: BarChart3, path: '/reporting', badge: 1 },
      { id: 'admin', label: 'Admin', icon: Settings, path: '/admin' },
    ],
    activeItemId: 'home',
  },
};

export const WithHighBadgeCounts: Story = {
  args: {
    items: [
      { id: 'home', label: 'Home', icon: Home, path: '/' },
      { id: 'sell', label: 'Sell', icon: ShoppingCart, path: '/sell', badge: 99 },
      { id: 'lookup', label: 'Lookup', icon: Search, path: '/lookup' },
      { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory', badge: 150 },
      { id: 'customers', label: 'Customers', icon: Users, path: '/customers', badge: 1000 },
      { id: 'reporting', label: 'Reports', icon: BarChart3, path: '/reporting' },
      { id: 'admin', label: 'Admin', icon: Settings, path: '/admin' },
    ],
    activeItemId: 'inventory',
  },
};

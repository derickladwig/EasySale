import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from './PageHeader';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Plus, Download, Filter } from 'lucide-react';

const meta = {
  title: 'Layout/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
  },
};

export const WithBreadcrumbs: Story = {
  args: {
    title: 'Product Details',
    breadcrumbs: [
      { label: 'Home', path: '/' },
      { label: 'Inventory', path: '/inventory' },
      { label: 'Products', path: '/inventory/products' },
      { label: 'Product Details' },
    ],
  },
};

export const WithDescription: Story = {
  args: {
    title: 'Inventory Management',
    description: 'Track and manage your product inventory across all locations',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Products',
    actions: (
      <>
        <Button variant="outline" size="md" leftIcon={<Icon icon={Filter} size="sm" />}>
          Filter
        </Button>
        <Button variant="outline" size="md" leftIcon={<Icon icon={Download} size="sm" />}>
          Export
        </Button>
        <Button variant="primary" size="md" leftIcon={<Icon icon={Plus} size="sm" />}>
          Add Product
        </Button>
      </>
    ),
  },
};

export const WithTabs: Story = {
  args: {
    title: 'Inventory',
    tabs: [
      { id: 'products', label: 'Products', icon: Plus },
      { id: 'receiving', label: 'Receiving', icon: Download },
      { id: 'stocktaking', label: 'Stocktaking', icon: Filter },
    ],
    activeTab: 'products',
    onTabChange: (tabId) => console.log('Tab changed:', tabId),
  },
};

export const Complete: Story = {
  args: {
    title: 'Product Management',
    description: 'Manage your product catalog, pricing, and inventory levels',
    breadcrumbs: [
      { label: 'Home', path: '/' },
      { label: 'Inventory', path: '/inventory' },
      { label: 'Products' },
    ],
    tabs: [
      { id: 'all', label: 'All Products' },
      { id: 'apparel', label: 'Apparel' },
      { id: 'accessories', label: 'Accessories' },
      { id: 'equipment', label: 'Equipment' },
    ],
    activeTab: 'all',
    onTabChange: (tabId) => console.log('Tab changed:', tabId),
    actions: (
      <>
        <Button variant="outline" size="md" leftIcon={<Icon icon={Filter} size="sm" />}>
          Filter
        </Button>
        <Button variant="outline" size="md" leftIcon={<Icon icon={Download} size="sm" />}>
          Export
        </Button>
        <Button variant="primary" size="md" leftIcon={<Icon icon={Plus} size="sm" />}>
          Add Product
        </Button>
      </>
    ),
  },
};

export const MobileView: Story = {
  args: {
    title: 'Product Management',
    description: 'Manage your product catalog, pricing, and inventory levels',
    breadcrumbs: [
      { label: 'Home', path: '/' },
      { label: 'Inventory', path: '/inventory' },
      { label: 'Products' },
    ],
    actions: (
      <>
        <Button variant="outline" size="md" leftIcon={<Icon icon={Filter} size="sm" />}>
          Filter
        </Button>
        <Button variant="primary" size="md" leftIcon={<Icon icon={Plus} size="sm" />}>
          Add
        </Button>
      </>
    ),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletView: Story = {
  args: {
    title: 'Product Management',
    description: 'Manage your product catalog, pricing, and inventory levels',
    breadcrumbs: [
      { label: 'Home', path: '/' },
      { label: 'Inventory', path: '/inventory' },
      { label: 'Products' },
    ],
    tabs: [
      { id: 'all', label: 'All Products' },
      { id: 'apparel', label: 'Apparel' },
      { id: 'accessories', label: 'Accessories' },
      { id: 'equipment', label: 'Equipment' },
    ],
    activeTab: 'all',
    onTabChange: (tabId) => console.log('Tab changed:', tabId),
    actions: (
      <>
        <Button variant="outline" size="md" leftIcon={<Icon icon={Filter} size="sm" />}>
          Filter
        </Button>
        <Button variant="primary" size="md" leftIcon={<Icon icon={Plus} size="sm" />}>
          Add Product
        </Button>
      </>
    ),
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Very Long Product Management Title That Should Truncate On Small Screens',
    description:
      'This is a very long description that demonstrates how the component handles lengthy text content and ensures proper wrapping and truncation behavior',
    breadcrumbs: [
      { label: 'Home', path: '/' },
      { label: 'Inventory', path: '/inventory' },
      { label: 'Products', path: '/inventory/products' },
      { label: 'Category', path: '/inventory/products/category' },
      { label: 'Very Long Product Name' },
    ],
  },
};

export const MinimalWithTabs: Story = {
  args: {
    title: 'Settings',
    tabs: [
      { id: 'general', label: 'General' },
      { id: 'display', label: 'Display' },
      { id: 'security', label: 'Security' },
      { id: 'integrations', label: 'Integrations' },
    ],
    activeTab: 'general',
    onTabChange: (tabId) => console.log('Tab changed:', tabId),
  },
};

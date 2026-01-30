/**
 * IntegrationCard Stories
 * 
 * Visual examples of the IntegrationCard component in different states.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { IntegrationCard } from './IntegrationCard';
import { ShoppingBag, DollarSign, CreditCard, Package } from 'lucide-react';
import { Input } from '@common/components/atoms/Input';

const meta = {
  title: 'Admin/IntegrationCard',
  component: IntegrationCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof IntegrationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Empty State (Not Connected)
export const EmptyState: Story = {
  args: {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Sync products, pricing, and orders with your online store',
    status: 'not_connected',
    icon: <ShoppingBag className="w-12 h-12 text-primary-400" />,
    actions: {
      onConnect: () => alert('Connect clicked'),
    },
  },
};

// Connected State
export const Connected: Story = {
  args: {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Sync products, pricing, and orders with your online store',
    status: 'connected',
    enabled: true,
    icon: <ShoppingBag className="w-12 h-12 text-success-400" />,
    config: {
      storeUrl: 'https://mystore.com',
      lastSync: new Date().toISOString(),
    },
    actions: {
      onConfigure: () => alert('Configure clicked'),
      onTestConnection: () => alert('Test clicked'),
      onDisconnect: () => alert('Disconnect clicked'),
      onToggle: (enabled) => alert(`Toggle: ${enabled}`),
    },
  },
};

// Error State
export const ErrorState: Story = {
  args: {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync accounting data with QuickBooks Online',
    status: 'error',
    enabled: true,
    icon: <DollarSign className="w-12 h-12 text-error-400" />,
    config: {
      errorMessage: 'Invalid API credentials. Please check your QuickBooks connection.',
    },
    actions: {
      onConfigure: () => alert('Configure clicked'),
      onTestConnection: () => alert('Test clicked'),
      onToggle: (enabled) => alert(`Toggle: ${enabled}`),
    },
  },
};

// Syncing State
export const Syncing: Story = {
  args: {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments with Stripe Terminal',
    status: 'syncing',
    enabled: true,
    icon: <CreditCard className="w-12 h-12 text-primary-400" />,
    config: {
      lastSync: new Date(Date.now() - 60000).toISOString(),
    },
    actions: {
      onConfigure: () => alert('Configure clicked'),
      onTestConnection: () => alert('Test clicked'),
      onToggle: (enabled) => alert(`Toggle: ${enabled}`),
    },
  },
};

// Disabled State (Capability Off)
export const Disabled: Story = {
  args: {
    id: 'square',
    name: 'Square',
    description: 'Accept payments with Square',
    status: 'not_connected',
    capabilityEnabled: false,
    disabledReason: 'Payment integrations require a premium subscription. Upgrade to enable this feature.',
    icon: <CreditCard className="w-12 h-12 text-text-disabled" />,
    actions: {
      onConnect: () => alert('Connect clicked'),
    },
  },
};

// Bug State (Capability On, Backend Missing)
export const BugState: Story = {
  args: {
    id: 'inventory-sync',
    name: 'Inventory Sync',
    description: 'Sync inventory with external inventory system',
    status: 'not_connected',
    capabilityEnabled: true,
    backendAvailable: false,
    icon: <Package className="w-12 h-12 text-warning-400" />,
    actions: {
      onConnect: () => alert('Connect clicked'),
    },
  },
};

// With Configuration Panel
export const WithConfigPanel: Story = {
  args: {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Sync products, pricing, and orders with your online store',
    status: 'not_connected',
    enabled: true,
    icon: <ShoppingBag className="w-12 h-12 text-primary-400" />,
    showConfig: true,
    configContent: (
      <div className="space-y-3">
        <Input
          label="Store URL"
          placeholder="https://yourstore.com"
          size="sm"
        />
        <Input
          label="Consumer Key"
          placeholder="ck_..."
          size="sm"
        />
        <Input
          label="Consumer Secret"
          type="password"
          placeholder="cs_..."
          size="sm"
        />
      </div>
    ),
    actions: {
      onConfigure: () => alert('Configure clicked'),
      onTestConnection: () => alert('Test clicked'),
      onToggle: (enabled) => alert(`Toggle: ${enabled}`),
    },
  },
};

// Grid Layout Example
export const GridLayout: Story = {
  args: {
    id: 'grid-example',
    name: 'Grid Example',
    description: 'Example showing multiple cards in a grid',
    status: 'not_connected',
  },
  render: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-background-primary">
      <IntegrationCard
        id="woocommerce"
        name="WooCommerce"
        description="Sync products, pricing, and orders"
        status="connected"
        enabled={true}
        icon={<ShoppingBag className="w-12 h-12 text-success-400" />}
        config={{
          storeUrl: 'https://mystore.com',
          lastSync: new Date().toISOString(),
        }}
        actions={{
          onConfigure: () => alert('Configure'),
          onTestConnection: () => alert('Test'),
          onDisconnect: () => alert('Disconnect'),
          onToggle: (enabled) => alert(`Toggle: ${enabled}`),
        }}
      />
      <IntegrationCard
        id="quickbooks"
        name="QuickBooks"
        description="Sync accounting data"
        status="error"
        enabled={true}
        icon={<DollarSign className="w-12 h-12 text-error-400" />}
        config={{
          errorMessage: 'Invalid credentials',
        }}
        actions={{
          onConfigure: () => alert('Configure'),
          onTestConnection: () => alert('Test'),
          onToggle: (enabled) => alert(`Toggle: ${enabled}`),
        }}
      />
      <IntegrationCard
        id="stripe"
        name="Stripe"
        description="Accept payments"
        status="not_connected"
        icon={<CreditCard className="w-12 h-12 text-text-disabled" />}
        actions={{
          onConnect: () => alert('Connect'),
        }}
      />
      <IntegrationCard
        id="square"
        name="Square"
        description="Accept payments"
        status="not_connected"
        capabilityEnabled={false}
        disabledReason="Premium subscription required"
        icon={<CreditCard className="w-12 h-12 text-text-disabled" />}
        actions={{
          onConnect: () => alert('Connect'),
        }}
      />
    </div>
  ),
};

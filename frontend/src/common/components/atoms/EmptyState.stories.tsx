import type { Meta, StoryObj } from '@storybook/react';
import { Package, Search, AlertCircle, ShoppingCart, Users, FileText, Plus, RefreshCw } from 'lucide-react';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Atoms/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The EmptyState component displays a helpful message when there's no data to show.
It includes an icon, heading, description, and optional action button.

**Requirements:**
- 13.1: Display a relevant icon or illustration
- 13.2: Include a clear heading explaining the situation
- 13.3: Provide helpful description text
- 13.4: Offer a primary action button when applicable
- 13.5: Use muted colors to avoid drawing too much attention
- 13.6: Center content vertically and horizontally
- 13.7: Adapt to container size responsively
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      description: 'Lucide icon component to display',
      control: false,
    },
    heading: {
      description: 'Main heading text',
      control: 'text',
    },
    description: {
      description: 'Description text providing context',
      control: 'text',
    },
    variant: {
      description: 'Visual variant of the empty state',
      control: 'select',
      options: ['default', 'no-results', 'error'],
    },
    action: {
      description: 'Primary action button configuration',
      control: 'object',
    },
    className: {
      description: 'Additional CSS classes',
      control: 'text',
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty state with an action button.
 * Used when there's no data and the user can take action to add some.
 */
export const Default: Story = {
  args: {
    icon: Package,
    heading: 'No products found',
    description: 'Get started by adding your first product to the inventory.',
    variant: 'default',
    action: {
      label: 'Add Product',
      onClick: () => alert('Add product clicked'),
      variant: 'primary',
    },
  },
};

/**
 * Empty state without an action button.
 * Used when there's no data but no immediate action is available.
 */
export const WithoutAction: Story = {
  args: {
    icon: Package,
    heading: 'No products available',
    description: 'Products will appear here once they are added to the system.',
    variant: 'default',
  },
};

/**
 * No results empty state.
 * Used when a search or filter returns no results.
 */
export const NoResults: Story = {
  args: {
    icon: Search,
    heading: 'No results found',
    description: 'Try adjusting your search or filter criteria to find what you\'re looking for.',
    variant: 'no-results',
  },
};

/**
 * Error empty state with retry action.
 * Used when data fails to load due to an error.
 */
export const Error: Story = {
  args: {
    icon: AlertCircle,
    heading: 'Failed to load data',
    description: 'An error occurred while loading the data. Please try again.',
    variant: 'error',
    action: {
      label: 'Retry',
      onClick: () => alert('Retry clicked'),
      variant: 'primary',
      leftIcon: <RefreshCw size={16} />,
    },
  },
};

/**
 * Empty shopping cart.
 */
export const EmptyCart: Story = {
  args: {
    icon: ShoppingCart,
    heading: 'Your cart is empty',
    description: 'Add items to your cart to get started with your purchase.',
    variant: 'default',
    action: {
      label: 'Browse Products',
      onClick: () => alert('Browse products clicked'),
      variant: 'primary',
    },
  },
};

/**
 * No customers found.
 */
export const NoCustomers: Story = {
  args: {
    icon: Users,
    heading: 'No customers yet',
    description: 'Start building your customer base by adding your first customer.',
    variant: 'default',
    action: {
      label: 'Add Customer',
      onClick: () => alert('Add customer clicked'),
      variant: 'primary',
      leftIcon: <Plus size={16} />,
    },
  },
};

/**
 * No invoices found.
 */
export const NoInvoices: Story = {
  args: {
    icon: FileText,
    heading: 'No invoices found',
    description: 'Invoices will appear here once you create them.',
    variant: 'default',
  },
};

/**
 * Empty state with long description.
 * Demonstrates how the component handles longer text content.
 */
export const LongDescription: Story = {
  args: {
    icon: Package,
    heading: 'No products in this category',
    description: 'This category is currently empty. You can add products to this category by creating new products and assigning them to this category. Products in this category will be displayed here once they are added to the system.',
    variant: 'default',
    action: {
      label: 'Add Product',
      onClick: () => alert('Add product clicked'),
      variant: 'primary',
    },
  },
};

/**
 * Empty state in a container.
 * Shows how the component adapts to its container size.
 */
export const InContainer: Story = {
  args: {
    icon: Package,
    heading: 'No data available',
    description: 'This area will display data once it becomes available.',
    variant: 'default',
  },
  decorators: [
    (Story) => (
      <div className="w-[600px] h-[400px] border-2 border-dashed border-border-DEFAULT rounded-lg">
        <Story />
      </div>
    ),
  ],
};

/**
 * Multiple empty states side by side.
 * Demonstrates responsive behavior in different layouts.
 */
export const MultipleStates: Story = {
  args: {
    icon: Package,
    heading: "Multiple States",
    description: "Multiple empty states side by side"
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
      <div className="border border-border-DEFAULT rounded-lg">
        <EmptyState
          icon={Package}
          heading="No products"
          description="Add your first product."
          action={{
            label: 'Add Product',
            onClick: () => alert('Add product'),
            variant: 'primary',
          }}
        />
      </div>
      <div className="border border-border-DEFAULT rounded-lg">
        <EmptyState
          icon={Users}
          heading="No customers"
          description="Add your first customer."
          action={{
            label: 'Add Customer',
            onClick: () => alert('Add customer'),
            variant: 'primary',
          }}
        />
      </div>
    </div>
  ),
};

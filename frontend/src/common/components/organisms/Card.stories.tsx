import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Button } from '../atoms/Button';

const meta = {
  title: 'Organisms/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined'],
    },
    interactive: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This is a default card with some content.</p>
      </div>
    ),
  },
};

export const WithHeader: Story = {
  args: {
    header: <h2 className="text-lg font-semibold text-text-primary">Card Title</h2>,
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This card has a header section.</p>
      </div>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    header: <h2 className="text-lg font-semibold text-text-primary">Card Title</h2>,
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This card has header and footer sections.</p>
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">
          Cancel
        </Button>
        <Button variant="primary" size="sm">
          Save
        </Button>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    header: <h2 className="text-lg font-semibold text-text-primary">Elevated Card</h2>,
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This card has an elevated shadow.</p>
      </div>
    ),
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    header: <h2 className="text-lg font-semibold text-text-primary">Outlined Card</h2>,
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This card has a visible border.</p>
      </div>
    ),
  },
};

export const Interactive: Story = {
  args: {
    interactive: true,
    header: <h2 className="text-lg font-semibold text-text-primary">Interactive Card</h2>,
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This card has hover effects. Try hovering over it!</p>
      </div>
    ),
  },
};

export const ProductCard: Story = {
  args: {
    children: "Product card content"
  },
  render: () => (
    <Card variant="elevated" interactive className="w-64">
      <div className="aspect-square bg-surface-elevated rounded-t-lg" />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-text-primary mb-1">Product Name</h3>
        <p className="text-sm text-text-tertiary mb-2">SKU: PROD-001</p>
        <p className="text-xl font-bold text-primary-400">$99.99</p>
      </div>
      <div className="px-4 pb-4">
        <Button variant="primary" fullWidth>
          Add to Cart
        </Button>
      </div>
    </Card>
  ),
};

export const WithActions: Story = {
  args: {
    header: <h2 className="text-lg font-semibold text-text-primary">Card with Actions</h2>,
    actions: (
      <>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
        <Button variant="ghost" size="sm">
          Delete
        </Button>
      </>
    ),
    children: (
      <div className="p-4">
        <p className="text-text-secondary">
          This card has action buttons in the header that are right-aligned.
        </p>
      </div>
    ),
  },
};

export const ActionsOnly: Story = {
  args: {
    actions: (
      <>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
        <Button variant="ghost" size="sm">
          Delete
        </Button>
      </>
    ),
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This card has actions without a header.</p>
      </div>
    ),
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    header: <h2 className="text-lg font-semibold text-text-primary">Loading Card</h2>,
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This content is hidden while loading.</p>
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">
          Cancel
        </Button>
        <Button variant="primary" size="sm">
          Save
        </Button>
      </div>
    ),
  },
};

export const LoadingSimple: Story = {
  args: {
    loading: true,
    children: (
      <div className="p-4">
        <p className="text-text-secondary">This content is hidden while loading.</p>
      </div>
    ),
  },
};

export const ResponsivePadding: Story = {
  args: {
    children: "Responsive content"
  },
  render: () => (
    <div className="space-y-4">
      <p className="text-text-secondary text-sm">
        Resize your browser to see responsive padding (16px on mobile, 24px on desktop)
      </p>
      <Card
        header={<h2 className="text-lg font-semibold text-text-primary">Responsive Padding</h2>}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button variant="primary" size="sm">
              Save
            </Button>
          </div>
        }
      >
        <div>
          <p className="text-text-secondary mb-4">
            This card demonstrates responsive padding. On mobile devices (width &lt; 640px), the
            padding is 16px. On larger screens, it increases to 24px for better spacing.
          </p>
          <p className="text-text-secondary">
            Try resizing your browser window to see the padding adjust automatically.
          </p>
        </div>
      </Card>
    </div>
  ),
};

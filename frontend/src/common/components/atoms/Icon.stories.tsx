import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './Icon';
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  Settings,
  Search,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  AlertCircle,
  Info,
  ChevronRight,
  Download,
} from 'lucide-react';

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    color: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Home,
    size: 'md',
  },
};

export const ExtraSmall: Story = {
  args: {
    icon: Home,
    size: 'xs',
  },
};

export const Small: Story = {
  args: {
    icon: Home,
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    icon: Home,
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    icon: Home,
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  args: {
    icon: Home,
    size: 'xl',
  },
};

export const WithColor: Story = {
  args: {
    icon: Check,
    size: 'lg',
    color: 'text-success-500',
  },
};

export const AllSizes: Story = {
  args: {
    icon: Home
  },
  render: () => (
    <div className="flex items-center gap-4">
      <Icon icon={Home} size="xs" />
      <Icon icon={Home} size="sm" />
      <Icon icon={Home} size="md" />
      <Icon icon={Home} size="lg" />
      <Icon icon={Home} size="xl" />
    </div>
  ),
};

export const CommonIcons: Story = {
  args: {
    icon: Home
  },
  render: () => (
    <div className="grid grid-cols-5 gap-4">
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Home} size="md" />
        <span className="text-xs text-text-tertiary">Home</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={ShoppingCart} size="md" />
        <span className="text-xs text-text-tertiary">Cart</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Package} size="md" />
        <span className="text-xs text-text-tertiary">Package</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Users} size="md" />
        <span className="text-xs text-text-tertiary">Users</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Settings} size="md" />
        <span className="text-xs text-text-tertiary">Settings</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Search} size="md" />
        <span className="text-xs text-text-tertiary">Search</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Plus} size="md" />
        <span className="text-xs text-text-tertiary">Plus</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Trash2} size="md" />
        <span className="text-xs text-text-tertiary">Trash</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Edit} size="md" />
        <span className="text-xs text-text-tertiary">Edit</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Check} size="md" />
        <span className="text-xs text-text-tertiary">Check</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={X} size="md" />
        <span className="text-xs text-text-tertiary">Close</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={AlertCircle} size="md" />
        <span className="text-xs text-text-tertiary">Alert</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Info} size="md" />
        <span className="text-xs text-text-tertiary">Info</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={ChevronRight} size="md" />
        <span className="text-xs text-text-tertiary">Chevron</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon icon={Download} size="md" />
        <span className="text-xs text-text-tertiary">Download</span>
      </div>
    </div>
  ),
};

export const ColoredIcons: Story = {
  args: {
    icon: Check
  },
  render: () => (
    <div className="flex gap-4">
      <Icon icon={Check} size="lg" color="text-success-500" />
      <Icon icon={AlertCircle} size="lg" color="text-warning-500" />
      <Icon icon={X} size="lg" color="text-error-500" />
      <Icon icon={Info} size="lg" color="text-info-500" />
    </div>
  ),
};

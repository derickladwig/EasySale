import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Icon } from './Icon';
import { Plus, Download, Trash2 } from 'lucide-react';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medium Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    children: 'Extra Large Button',
  },
};

export const WithLeftIcon: Story = {
  args: {
    variant: 'primary',
    leftIcon: <Icon icon={Plus} size="sm" />,
    children: 'Add Item',
  },
};

export const WithRightIcon: Story = {
  args: {
    variant: 'secondary',
    rightIcon: <Icon icon={Download} size="sm" />,
    children: 'Download',
  },
};

export const WithBothIcons: Story = {
  args: {
    variant: 'primary',
    leftIcon: <Icon icon={Plus} size="sm" />,
    rightIcon: <Icon icon={Download} size="sm" />,
    children: 'Add & Download',
  },
};

export const IconOnlyLeft: Story = {
  args: {
    variant: 'ghost',
    leftIcon: <Icon icon={Trash2} size="sm" />,
    'aria-label': 'Delete',
  },
};

export const IconOnlyRight: Story = {
  args: {
    variant: 'primary',
    rightIcon: <Icon icon={Plus} size="sm" />,
    'aria-label': 'Add',
  },
};

export const IconOnlyVariants: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="primary" leftIcon={<Icon icon={Plus} size="sm" />} aria-label="Add" />
      <Button variant="secondary" leftIcon={<Icon icon={Download} size="sm" />} aria-label="Download" />
      <Button variant="outline" leftIcon={<Icon icon={Trash2} size="sm" />} aria-label="Delete" />
      <Button variant="ghost" leftIcon={<Icon icon={Plus} size="sm" />} aria-label="More" />
      <Button variant="danger" leftIcon={<Icon icon={Trash2} size="sm" />} aria-label="Remove" />
    </div>
  ),
};

export const IconOnlySizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm" leftIcon={<Icon icon={Plus} size="sm" />} aria-label="Add small" />
      <Button size="md" leftIcon={<Icon icon={Plus} size="sm" />} aria-label="Add medium" />
      <Button size="lg" leftIcon={<Icon icon={Plus} size="md" />} aria-label="Add large" />
      <Button size="xl" leftIcon={<Icon icon={Plus} size="lg" />} aria-label="Add extra large" />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading...',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled Button',
  },
};

export const FullWidth: Story = {
  args: {
    variant: 'primary',
    fullWidth: true,
    children: 'Full Width Button',
  },
  parameters: {
    layout: 'padded',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';
import { Icon } from '../atoms/Icon';
import { Mail, Lock } from 'lucide-react';

const meta = {
  title: 'Molecules/FormField',
  component: FormField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search'],
    },
    required: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const Required: Story = {
  args: {
    label: 'Username',
    type: 'text',
    placeholder: 'Enter username',
    required: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    required: true,
    helperText: 'Must be at least 8 characters',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    error: 'This email is already registered',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    leftIcon: <Icon icon={Mail} size="sm" />,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Username',
    type: 'text',
    placeholder: 'Enter username',
    disabled: true,
    value: 'johndoe',
  },
};

export const LoginForm: Story = {
  args: {
    label: "Login Form",
    children: "Form content"
  },
  render: () => (
    <div className="w-80 space-y-4">
      <FormField
        label="Email"
        type="email"
        placeholder="you@example.com"
        leftIcon={<Icon icon={Mail} size="sm" />}
        required
      />
      <FormField
        label="Password"
        type="password"
        placeholder="Enter password"
        leftIcon={<Icon icon={Lock} size="sm" />}
        required
        helperText="Must be at least 8 characters"
      />
    </div>
  ),
};

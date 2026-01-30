import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { Icon } from './Icon';
import { Search, Mail, Lock, DollarSign } from 'lucide-react';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['default', 'error'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    helperText: 'Must be at least 8 characters',
  },
};

export const WithError: Story = {
  args: {
    label: 'Username',
    type: 'text',
    placeholder: 'Enter username',
    error: 'Username is already taken',
  },
};

export const WithLeftIcon: Story = {
  args: {
    placeholder: 'Search...',
    leftIcon: <Icon icon={Search} size="sm" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    type: 'number',
    placeholder: '0.00',
    rightIcon: <Icon icon={DollarSign} size="sm" />,
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    placeholder: 'Small input',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    placeholder: 'Medium input',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    placeholder: 'Large input',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    label: 'Email',
    placeholder: 'you@example.com',
    leftIcon: <Icon icon={Mail} size="sm" />,
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    label: 'Password',
    placeholder: 'Enter password',
    leftIcon: <Icon icon={Lock} size="sm" />,
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    label: 'Quantity',
    placeholder: '0',
  },
};

export const SearchInput: Story = {
  args: {
    type: 'search',
    placeholder: 'Search products...',
    leftIcon: <Icon icon={Search} size="sm" />,
  },
};

export const SuccessState: Story = {
  args: {
    label: 'Email',
    type: 'email',
    variant: 'success',
    value: 'valid@email.com',
    placeholder: 'you@example.com',
  },
  name: 'Success State (with checkmark)',
};

export const ErrorState: Story = {
  args: {
    label: 'Username',
    type: 'text',
    error: 'This username is already taken',
    value: 'invalid_user',
    placeholder: 'Enter username',
  },
  name: 'Error State (with shake animation)',
};

export const FocusState: Story = {
  args: {
    label: 'Focus Example',
    type: 'text',
    placeholder: 'Click to see focus state',
    helperText: 'Focus this input to see the blue border and glow',
  },
  name: 'Focus State (blue border and glow)',
};

export const DisabledWithLabel: Story = {
  args: {
    label: 'Disabled Field',
    type: 'text',
    value: 'Cannot edit this',
    disabled: true,
    helperText: 'This field is disabled',
  },
  name: 'Disabled State (with label)',
};

export const RequiredField: Story = {
  args: {
    label: 'Required Field',
    type: 'text',
    required: true,
    placeholder: 'This field is required',
    helperText: 'Fields marked with * are required',
  },
  name: 'Required Field (with asterisk)',
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <Input
        label="Default State"
        type="text"
        placeholder="Default input"
        helperText="This is a default input"
      />
      <Input
        label="Focus State"
        type="text"
        placeholder="Click to focus"
        helperText="Focus to see blue border and glow"
      />
      <Input
        label="Success State"
        type="email"
        variant="success"
        value="valid@email.com"
        helperText="Email is valid"
      />
      <Input
        label="Error State"
        type="text"
        error="This field has an error"
        value="invalid"
      />
      <Input
        label="Disabled State"
        type="text"
        value="Cannot edit"
        disabled
        helperText="This field is disabled"
      />
      <Input
        label="Required Field"
        type="text"
        required
        placeholder="Required field"
        helperText="This field is required"
      />
    </div>
  ),
  name: 'All States Showcase',
};

export const WithCharacterCount: Story = {
  args: {
    label: 'Description',
    type: 'text',
    placeholder: 'Enter description...',
    maxLength: 100,
    showCharacterCount: true,
    helperText: 'Brief description of the product',
  },
  name: 'With Character Count',
};

export const CharacterCountNearLimit: Story = {
  args: {
    label: 'Short Message',
    type: 'text',
    value: 'This is a message that is getting close to the limit',
    maxLength: 50,
    showCharacterCount: true,
  },
  name: 'Character Count Near Limit',
};

export const CharacterCountExceeded: Story = {
  args: {
    label: 'Tweet',
    type: 'text',
    value: 'This message exceeds the maximum allowed length and the counter turns red to indicate the error',
    maxLength: 50,
    showCharacterCount: true,
    error: 'Message exceeds maximum length',
  },
  name: 'Character Count Exceeded (red)',
};

export const CharacterCountWithHelperText: Story = {
  args: {
    label: 'Bio',
    type: 'text',
    value: 'Software developer',
    maxLength: 200,
    showCharacterCount: true,
    helperText: 'Tell us about yourself',
  },
  name: 'Character Count with Helper Text',
};

export const AllFeatures: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <Input
        label="Basic Character Count"
        type="text"
        value="Hello"
        maxLength={50}
        showCharacterCount
        placeholder="Type something..."
      />
      <Input
        label="With Helper Text"
        type="text"
        value="Sample text"
        maxLength={100}
        showCharacterCount
        helperText="This field has a character limit"
      />
      <Input
        label="Near Limit"
        type="text"
        value="This text is approaching the character limit"
        maxLength={50}
        showCharacterCount
      />
      <Input
        label="Exceeded Limit"
        type="text"
        value="This text has exceeded the maximum allowed character limit for this field"
        maxLength={50}
        showCharacterCount
        error="Text exceeds maximum length"
      />
      <Input
        label="With Icon and Count"
        type="text"
        value="Search query"
        maxLength={30}
        showCharacterCount
        leftIcon={<Icon icon={Search} size="sm" />}
      />
    </div>
  ),
  name: 'All Character Count Features',
};


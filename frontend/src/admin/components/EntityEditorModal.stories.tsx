import type { Meta, StoryObj } from '@storybook/react';
import { EntityEditorModal } from './EntityEditorModal';
import { useState } from 'react';
import { Button } from '@common/components/atoms';

const meta = {
  title: 'Admin/EntityEditorModal',
  component: EntityEditorModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EntityEditorModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample sections for user editor
const userSections = [
  {
    title: 'Profile',
    description: 'Basic user information',
    fields: [
      {
        name: 'firstName',
        label: 'First Name',
        type: 'text' as const,
        placeholder: 'Enter first name',
        required: true,
      },
      {
        name: 'lastName',
        label: 'Last Name',
        type: 'text' as const,
        placeholder: 'Enter last name',
        required: true,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email' as const,
        placeholder: 'user@example.com',
        required: true,
      },
    ],
  },
  {
    title: 'Access',
    description: 'User permissions and assignments',
    fields: [
      {
        name: 'role',
        label: 'Role',
        type: 'select' as const,
        options: [
          { value: 'admin', label: 'Admin' },
          { value: 'manager', label: 'Manager' },
          { value: 'cashier', label: 'Cashier' },
        ],
        required: true,
      },
      {
        name: 'store',
        label: 'Primary Store',
        type: 'select' as const,
        options: [
          { value: 'store1', label: 'Main Store' },
          { value: 'store2', label: 'Branch Store' },
        ],
        helpText: 'The store this user primarily works at',
      },
      {
        name: 'stationPolicy',
        label: 'Station Policy',
        type: 'radio' as const,
        options: [
          { value: 'any', label: 'Any Station - Can log in from any terminal' },
          { value: 'specific', label: 'Specific Station - Must use assigned terminal' },
          { value: 'none', label: 'No Station Required - Non-POS user' },
        ],
      },
    ],
  },
  {
    title: 'Security',
    description: 'Account security settings',
    fields: [
      {
        name: 'isActive',
        label: 'Active',
        type: 'toggle' as const,
        helpText: 'Inactive users cannot log in',
      },
      {
        name: 'requirePasswordChange',
        label: 'Require Password Change',
        type: 'toggle' as const,
        helpText: 'User must change password on next login',
      },
    ],
  },
];

// Sample sections for store editor
const storeSections = [
  {
    title: 'Store Information',
    description: 'Basic store details',
    fields: [
      {
        name: 'name',
        label: 'Store Name',
        type: 'text' as const,
        placeholder: 'Enter store name',
        required: true,
      },
      {
        name: 'address',
        label: 'Address',
        type: 'text' as const,
        placeholder: 'Street address',
      },
      {
        name: 'city',
        label: 'City',
        type: 'text' as const,
        placeholder: 'City',
      },
      {
        name: 'phone',
        label: 'Phone',
        type: 'text' as const,
        placeholder: '(555) 123-4567',
      },
    ],
  },
  {
    title: 'Settings',
    description: 'Store-specific configuration',
    fields: [
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'select' as const,
        options: [
          { value: 'America/New_York', label: 'Eastern Time' },
          { value: 'America/Chicago', label: 'Central Time' },
          { value: 'America/Denver', label: 'Mountain Time' },
          { value: 'America/Los_Angeles', label: 'Pacific Time' },
        ],
      },
      {
        name: 'currency',
        label: 'Currency',
        type: 'select' as const,
        options: [
          { value: 'USD', label: 'US Dollar (USD)' },
          { value: 'CAD', label: 'Canadian Dollar (CAD)' },
        ],
      },
      {
        name: 'receiptFooter',
        label: 'Receipt Footer',
        type: 'textarea' as const,
        placeholder: 'Thank you for your business!',
        helpText: 'Text to display at the bottom of receipts',
      },
    ],
  },
];

// Simple sections for minimal example
const simpleSections = [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text' as const,
        placeholder: 'Enter name',
        required: true,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea' as const,
        placeholder: 'Enter description',
      },
    ],
  },
];

// Wrapper component for interactive stories
function ModalWrapper({ sections, title, entity }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <EntityEditorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        entity={entity}
        sections={sections}
        onSave={async (data) => {
          console.log('Saved:', data);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }}
      />
    </div>
  );
}

export const CreateUser: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Add User",
    sections: [],
    onSave: async () => {},
  },
  render: () => (
    <ModalWrapper
      title="Add User"
      sections={userSections}
    />
  ),
};

export const EditUser: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Edit User",
    sections: [],
    onSave: async () => {},
  },
  render: () => (
    <ModalWrapper
      title="Edit User"
      sections={userSections}
      entity={{
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'manager',
        store: 'store1',
        stationPolicy: 'any',
        isActive: true,
        requirePasswordChange: false,
      }}
    />
  ),
};

export const CreateStore: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Add Store",
    sections: [],
    onSave: async () => {},
  },
  render: () => (
    <ModalWrapper
      title="Add Store"
      sections={storeSections}
    />
  ),
};

export const EditStore: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Edit Store",
    sections: [],
    onSave: async () => {},
  },
  render: () => (
    <ModalWrapper
      title="Edit Store"
      sections={storeSections}
      entity={{
        name: 'Main Store',
        address: '123 Main St',
        city: 'Springfield',
        phone: '(555) 123-4567',
        timezone: 'America/New_York',
        currency: 'USD',
        receiptFooter: 'Thank you for your business!',
      }}
    />
  ),
};

export const SimpleForm: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Simple Form",
    sections: [],
    onSave: async () => {},
  },
  render: () => (
    <ModalWrapper
      title="Simple Form"
      sections={simpleSections}
    />
  ),
};

export const WithValidation: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "With Validation",
    sections: [],
    onSave: async () => {},
  },
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>Open Modal with Validation</Button>
        <EntityEditorModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Add User"
          sections={userSections}
          onSave={async (data) => {
            console.log('Saved:', data);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }}
          validate={(data) => {
            const errors = [];
            if (!data.firstName) {
              errors.push({ field: 'firstName', message: 'First name is required' });
            }
            if (!data.lastName) {
              errors.push({ field: 'lastName', message: 'Last name is required' });
            }
            if (!data.email) {
              errors.push({ field: 'email', message: 'Email is required' });
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
              errors.push({ field: 'email', message: 'Invalid email format' });
            }
            if (!data.role) {
              errors.push({ field: 'role', message: 'Role is required' });
            }
            return errors;
          }}
        />
      </div>
    );
  },
};

export const AllFieldTypes: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "All Field Types",
    sections: [],
    onSave: async () => {},
  },
  render: () => (
    <ModalWrapper
      title="All Field Types"
      sections={[
        {
          title: 'Text Fields',
          fields: [
            { name: 'text', label: 'Text Input', type: 'text' as const, placeholder: 'Enter text' },
            { name: 'email', label: 'Email Input', type: 'email' as const, placeholder: 'user@example.com' },
            { name: 'password', label: 'Password Input', type: 'password' as const, placeholder: 'Enter password' },
            { name: 'textarea', label: 'Textarea', type: 'textarea' as const, placeholder: 'Enter long text' },
          ],
        },
        {
          title: 'Selection Fields',
          fields: [
            {
              name: 'select',
              label: 'Select Dropdown',
              type: 'select' as const,
              options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
              ],
            },
            {
              name: 'radio',
              label: 'Radio Buttons',
              type: 'radio' as const,
              options: [
                { value: 'choice1', label: 'Choice 1' },
                { value: 'choice2', label: 'Choice 2' },
                { value: 'choice3', label: 'Choice 3' },
              ],
            },
          ],
        },
        {
          title: 'Toggle Fields',
          fields: [
            { name: 'toggle1', label: 'Toggle Option 1', type: 'toggle' as const, helpText: 'Enable this feature' },
            { name: 'toggle2', label: 'Toggle Option 2', type: 'toggle' as const, helpText: 'Enable this feature' },
          ],
        },
      ]}
    />
  ),
};

export const Loading: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Loading",
    sections: [],
    onSave: async () => {},
    isLoading: true,
  },
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>Open Loading Modal</Button>
        <EntityEditorModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Loading..."
          sections={simpleSections}
          onSave={async (data) => {
            console.log('Saved:', data);
          }}
          isLoading={true}
        />
      </div>
    );
  },
};

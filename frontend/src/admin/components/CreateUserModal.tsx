/**
 * CreateUserModal - Modal for creating new users
 * 
 * Uses EntityEditorModal for consistent UI with edit modal.
 */

import { EntityEditorModal, EditorSection, ValidationError } from './EntityEditorModal';
import { CreateUserData } from '../hooks/useUsers';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: Array<{ id: string; name: string }>;
  stations: Array<{ id: string; name: string; store_id: string }>;
  onSave: (data: CreateUserData) => Promise<void>;
}

export function CreateUserModal({
  isOpen,
  onClose,
  stores,
  stations: _stations,
  onSave,
}: CreateUserModalProps) {
  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'specialist', label: 'Specialist' },
    { value: 'inventory_clerk', label: 'Inventory Clerk' },
    { value: 'technician', label: 'Technician' },
  ];

  const stationPolicies = [
    { value: 'any', label: 'Any Station' },
    { value: 'specific', label: 'Specific Station' },
    { value: 'none', label: 'No Station' },
  ];

  const sections: EditorSection[] = [
    {
      title: 'Profile',
      description: 'Basic user information',
      fields: [
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'Enter username',
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          placeholder: 'user@example.com',
        },
        {
          name: 'first_name',
          label: 'First Name',
          type: 'text',
          placeholder: 'John',
        },
        {
          name: 'last_name',
          label: 'Last Name',
          type: 'text',
          placeholder: 'Doe',
        },
      ],
    },
    {
      title: 'Security',
      description: 'Password for the new account',
      fields: [
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          helpText: 'Minimum 8 characters',
        },
        {
          name: 'confirm_password',
          label: 'Confirm Password',
          type: 'password',
          required: true,
        },
      ],
    },
    {
      title: 'Access',
      description: 'Role and location assignments',
      fields: [
        {
          name: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: roles,
          helpText: 'Determines what the user can do in the system',
        },
        {
          name: 'store_id',
          label: 'Store',
          type: 'select',
          options: stores.map((s) => ({ value: s.id, label: s.name })),
          helpText: 'Required for POS-related roles',
        },
        {
          name: 'station_policy',
          label: 'Station Policy',
          type: 'radio',
          options: stationPolicies,
          helpText: 'Controls which stations the user can log in from',
        },
      ],
    },
  ];

  const defaultValues = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    role: 'cashier',
    store_id: '',
    station_policy: 'any',
  };

  const validate = (data: Record<string, unknown>): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validate username
    if (!data.username || (data.username as string).length < 3) {
      errors.push({
        field: 'username',
        message: 'Username must be at least 3 characters',
      });
    }

    // Validate email format
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email as string)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
      });
    }

    // Validate password
    if (!data.password || (data.password as string).length < 8) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters',
      });
    }

    // Validate password confirmation
    if (data.password !== data.confirm_password) {
      errors.push({
        field: 'confirm_password',
        message: 'Passwords do not match',
      });
    }

    // Validate store requirement for POS roles
    const posRoles = ['cashier', 'manager', 'specialist', 'technician'];
    if (posRoles.includes(data.role as string) && !data.store_id) {
      errors.push({
        field: 'store_id',
        message: `Role "${data.role}" requires a store assignment`,
      });
    }

    return errors;
  };

  const handleSave = async (data: Record<string, unknown>) => {
    const createData: CreateUserData = {
      username: data.username as string,
      email: data.email as string,
      password: data.password as string,
      role: data.role as string,
      first_name: (data.first_name as string) || undefined,
      last_name: (data.last_name as string) || undefined,
      store_id: (data.store_id as string) || undefined,
      station_policy: (data.station_policy as string) || 'any',
    };

    await onSave(createData);
  };

  return (
    <EntityEditorModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New User"
      entity={defaultValues}
      sections={sections}
      onSave={handleSave}
      validate={validate}
    />
  );
}

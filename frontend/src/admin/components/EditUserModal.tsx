import { EntityEditorModal, EditorSection, ValidationError } from './EntityEditorModal';
import { User, UpdateUserData } from '../hooks/useUsers';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  stores: Array<{ id: string; name: string }>;
  stations: Array<{ id: string; name: string; store_id: string }>;
  onSave: (userId: string, data: UpdateUserData) => Promise<void>;
}

export function EditUserModal({
  isOpen,
  onClose,
  user,
  stores,
  stations,
  onSave,
}: EditUserModalProps) {
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

  // Filter stations by selected store
  const getAvailableStations = (storeId?: string) => {
    if (!storeId) return [];
    return stations.filter((s) => s.store_id === storeId);
  };

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
          disabled: true, // Username cannot be changed
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
        },
        {
          name: 'first_name',
          label: 'First Name',
          type: 'text',
        },
        {
          name: 'last_name',
          label: 'Last Name',
          type: 'text',
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
          required: true,
          options: stationPolicies,
          helpText: 'Controls which stations the user can log in from',
        },
        {
          name: 'station_id',
          label: 'Specific Station',
          type: 'select',
          options: user?.store_id
            ? getAvailableStations(user.store_id).map((s) => ({ value: s.id, label: s.name }))
            : [],
          helpText: 'Only required when station policy is "Specific Station"',
        },
      ],
    },
    {
      title: 'Security',
      description: 'Account status and security settings',
      fields: [
        {
          name: 'is_active',
          label: 'Active',
          type: 'toggle',
          helpText: 'Inactive users cannot log in',
        },
      ],
    },
  ];

interface UserFormData {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  store_id?: string;
  station_policy?: string;
  station_id?: string;
  is_active?: boolean;
}

  const validate = (data: UserFormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
      });
    }

    // Validate store requirement for POS roles
    const posRoles = ['cashier', 'manager', 'specialist', 'technician'];
    if (data.role && posRoles.includes(data.role) && !data.store_id) {
      errors.push({
        field: 'store_id',
        message: `Role "${data.role}" requires a store assignment`,
      });
    }

    // Validate station policy consistency
    if (data.station_policy === 'specific' && !data.station_id) {
      errors.push({
        field: 'station_id',
        message: 'Station policy "Specific Station" requires a station assignment',
      });
    }

    if (data.station_policy !== 'specific' && data.station_id) {
      errors.push({
        field: 'station_id',
        message: 'Station assignment is only allowed when policy is "Specific Station"',
      });
    }

    return errors;
  };

  const handleSave = async (data: UserFormData) => {
    if (!user) return;

    const updateData: UpdateUserData = {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      store_id: data.store_id || undefined,
      station_policy: data.station_policy,
      station_id: data.station_id || undefined,
      is_active: data.is_active,
    };

    await onSave(user.id, updateData);
  };

  return (
    <EntityEditorModal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? `Edit User: ${user.username}` : 'Edit User'}
      entity={user}
      sections={sections}
      onSave={handleSave}
      validate={validate}
    />
  );
}

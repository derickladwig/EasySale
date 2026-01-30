import { EntityEditorModal, EditorSection, ValidationError } from './EntityEditorModal';

interface Store {
  id?: number;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  receipt_footer: string;
  is_active: boolean;
}

interface StoreEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  store?: Store;
  onSave: (store: Store) => Promise<void>;
}

export function StoreEditorModal({ isOpen, onClose, store, onSave }: StoreEditorModalProps) {
  const sections: EditorSection[] = [
    {
      title: 'Store Details',
      description: 'Basic store information',
      fields: [
        {
          name: 'name',
          label: 'Store Name',
          type: 'text',
          placeholder: 'Main Store',
          required: true,
        },
        {
          name: 'code',
          label: 'Store Code',
          type: 'text',
          placeholder: 'MAIN',
          helpText: 'Unique identifier for this store',
          required: true,
        },
        {
          name: 'is_active',
          label: 'Active',
          type: 'toggle',
          helpText: 'Enable or disable this store',
        },
      ],
    },
    {
      title: 'Location',
      description: 'Store address and contact information',
      fields: [
        {
          name: 'address',
          label: 'Street Address',
          type: 'text',
          placeholder: '123 Main St',
        },
        {
          name: 'city',
          label: 'City',
          type: 'text',
          placeholder: 'New York',
        },
        {
          name: 'state',
          label: 'State/Province',
          type: 'text',
          placeholder: 'NY',
        },
        {
          name: 'zip',
          label: 'ZIP/Postal Code',
          type: 'text',
          placeholder: '10001',
        },
        {
          name: 'country',
          label: 'Country',
          type: 'text',
          placeholder: 'USA',
        },
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'text',
          placeholder: '(555) 123-4567',
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'email',
          placeholder: 'store@company.com',
        },
      ],
    },
    {
      title: 'Store Settings',
      description: 'Regional and operational settings',
      fields: [
        {
          name: 'timezone',
          label: 'Timezone',
          type: 'select',
          options: [
            { value: 'America/New_York', label: 'Eastern Time (ET)' },
            { value: 'America/Chicago', label: 'Central Time (CT)' },
            { value: 'America/Denver', label: 'Mountain Time (MT)' },
            { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
            { value: 'America/Toronto', label: 'Toronto (ET)' },
            { value: 'America/Vancouver', label: 'Vancouver (PT)' },
          ],
          required: true,
        },
        {
          name: 'currency',
          label: 'Currency',
          type: 'select',
          options: [
            { value: 'USD', label: 'US Dollar (USD)' },
            { value: 'CAD', label: 'Canadian Dollar (CAD)' },
            { value: 'EUR', label: 'Euro (EUR)' },
            { value: 'GBP', label: 'British Pound (GBP)' },
          ],
          required: true,
        },
        {
          name: 'receipt_footer',
          label: 'Receipt Footer',
          type: 'textarea',
          placeholder: 'Thank you for your business!',
          helpText: 'Text to display at the bottom of receipts',
        },
      ],
    },
  ];

  const validate = (data: Store): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Store name is required' });
    }

    if (!data.code || data.code.trim().length === 0) {
      errors.push({ field: 'code', message: 'Store code is required' });
    } else if (!/^[A-Z0-9_-]+$/i.test(data.code)) {
      errors.push({
        field: 'code',
        message: 'Store code can only contain letters, numbers, hyphens, and underscores',
      });
    }

    if (!data.timezone) {
      errors.push({ field: 'timezone', message: 'Timezone is required' });
    }

    if (!data.currency) {
      errors.push({ field: 'currency', message: 'Currency is required' });
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: 'email', message: 'Invalid email address' });
    }

    return errors;
  };

  return (
    <EntityEditorModal
      isOpen={isOpen}
      onClose={onClose}
      title={store ? 'Edit Store' : 'Add Store'}
      entity={store}
      sections={sections}
      onSave={onSave}
      validate={validate}
    />
  );
}

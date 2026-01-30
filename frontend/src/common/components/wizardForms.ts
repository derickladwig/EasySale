import { FormSchema } from './DynamicForm';

// ============================================================================
// Multi-Step Wizard Forms
// Complex forms broken into logical steps for better UX
// ============================================================================

/**
 * Business Onboarding Wizard
 * Multi-step form for setting up a new business account
 */
export interface OnboardingWizardSteps {
  businessInfo: FormSchema;
  contactInfo: FormSchema;
  preferences: FormSchema;
  review: FormSchema;
}

export const businessOnboardingWizard: OnboardingWizardSteps = {
  businessInfo: {
    id: 'onboarding-step-1',
    title: 'Business Information',
    description: 'Tell us about your business',
    submitLabel: 'Next',
    fields: [
      {
        name: 'businessName',
        label: 'Business Name',
        type: 'text',
        required: true,
        placeholder: 'Acme Corporation',
      },
      {
        name: 'businessType',
        label: 'Type of Business',
        type: 'select',
        required: true,
        options: [
          { value: 'retail', label: 'Retail Store' },
          { value: 'restaurant', label: 'Restaurant' },
          { value: 'service', label: 'Service Business' },
          { value: 'automotive', label: 'Automotive' },
          { value: 'healthcare', label: 'Healthcare' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        name: 'industry',
        label: 'Industry',
        type: 'text',
        required: true,
        placeholder: 'e.g., Automotive Parts & Supplies',
      },
      {
        name: 'taxId',
        label: 'Tax ID / EIN',
        type: 'text',
        required: true,
        placeholder: '12-3456789',
      },
      {
        name: 'website',
        label: 'Website',
        type: 'text',
        placeholder: 'https://www.example.com',
      },
    ],
  },
  contactInfo: {
    id: 'onboarding-step-2',
    title: 'Contact Information',
    description: 'How can we reach you?',
    submitLabel: 'Next',
    fields: [
      {
        name: 'address',
        label: 'Street Address',
        type: 'text',
        required: true,
        placeholder: '123 Main St',
      },
      {
        name: 'city',
        label: 'City',
        type: 'text',
        required: true,
      },
      {
        name: 'state',
        label: 'State/Province',
        type: 'text',
        required: true,
      },
      {
        name: 'zipCode',
        label: 'ZIP/Postal Code',
        type: 'text',
        required: true,
      },
      {
        name: 'country',
        label: 'Country',
        type: 'select',
        required: true,
        options: [
          { value: 'US', label: 'United States' },
          { value: 'CA', label: 'Canada' },
          { value: 'MX', label: 'Mexico' },
        ],
        default: 'US',
      },
      {
        name: 'phone',
        label: 'Business Phone',
        type: 'tel',
        required: true,
        placeholder: '(555) 123-4567',
      },
      {
        name: 'email',
        label: 'Business Email',
        type: 'email',
        required: true,
        placeholder: 'contact@example.com',
      },
    ],
  },
  preferences: {
    id: 'onboarding-step-3',
    title: 'Preferences',
    description: 'Customize your experience',
    submitLabel: 'Next',
    fields: [
      {
        name: 'currency',
        label: 'Currency',
        type: 'select',
        required: true,
        options: [
          { value: 'USD', label: 'US Dollar ($)' },
          { value: 'CAD', label: 'Canadian Dollar (C$)' },
          { value: 'EUR', label: 'Euro (€)' },
          { value: 'GBP', label: 'British Pound (£)' },
        ],
        default: 'USD',
      },
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'select',
        required: true,
        options: [
          { value: 'America/New_York', label: 'Eastern Time' },
          { value: 'America/Chicago', label: 'Central Time' },
          { value: 'America/Denver', label: 'Mountain Time' },
          { value: 'America/Los_Angeles', label: 'Pacific Time' },
        ],
      },
      {
        name: 'dateFormat',
        label: 'Date Format',
        type: 'radio',
        required: true,
        options: [
          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)' },
          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
        ],
        default: 'MM/DD/YYYY',
      },
      {
        name: 'enableModules',
        label: 'Enable Features',
        type: 'checkbox',
        helpText: 'Select the features you want to use',
      },
    ],
  },
  review: {
    id: 'onboarding-step-4',
    title: 'Review & Confirm',
    description: 'Please review your information',
    submitLabel: 'Complete Setup',
    fields: [],
  },
};

/**
 * Product Setup Wizard
 * Multi-step form for adding a new product with all details
 */
export interface ProductSetupWizardSteps {
  basicInfo: FormSchema;
  pricing: FormSchema;
  inventory: FormSchema;
  attributes: FormSchema;
}

export const productSetupWizard: ProductSetupWizardSteps = {
  basicInfo: {
    id: 'product-step-1',
    title: 'Basic Information',
    description: 'Enter product details',
    submitLabel: 'Next',
    fields: [
      {
        name: 'sku',
        label: 'SKU',
        type: 'text',
        required: true,
        placeholder: 'PROD-001',
        helpText: 'Unique product identifier',
      },
      {
        name: 'name',
        label: 'Product Name',
        type: 'text',
        required: true,
        placeholder: 'Premium Motor Oil 5W-30',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        rows: 4,
        placeholder: 'Detailed product description...',
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          { value: 'apparel', label: 'Apparel' },
          { value: 'accessories', label: 'Accessories' },
          { value: 'equipment', label: 'Equipment' },
          { value: 'supplies', label: 'Supplies' },
        ],
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        placeholder: 'e.g., Mobil 1',
      },
      {
        name: 'manufacturer',
        label: 'Manufacturer',
        type: 'text',
        placeholder: 'e.g., ExxonMobil',
      },
    ],
  },
  pricing: {
    id: 'product-step-2',
    title: 'Pricing',
    description: 'Set product prices',
    submitLabel: 'Next',
    fields: [
      {
        name: 'cost',
        label: 'Cost Price',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00',
        helpText: 'Your cost from supplier',
      },
      {
        name: 'retailPrice',
        label: 'Retail Price',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00',
      },
      {
        name: 'wholesalePrice',
        label: 'Wholesale Price',
        type: 'number',
        min: 0,
        step: 0.01,
        placeholder: '0.00',
        helpText: 'Optional - for wholesale customers',
      },
      {
        name: 'contractorPrice',
        label: 'Contractor Price',
        type: 'number',
        min: 0,
        step: 0.01,
        placeholder: '0.00',
        helpText: 'Optional - for contractors',
      },
      {
        name: 'taxable',
        label: 'Taxable',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'taxRate',
        label: 'Tax Rate (%)',
        type: 'number',
        min: 0,
        max: 100,
        step: 0.01,
        placeholder: '8.25',
        showIf: (formData) => formData.taxable === true,
      },
    ],
  },
  inventory: {
    id: 'product-step-3',
    title: 'Inventory',
    description: 'Set inventory levels',
    submitLabel: 'Next',
    fields: [
      {
        name: 'trackInventory',
        label: 'Track Inventory',
        type: 'checkbox',
        default: true,
        helpText: 'Enable stock tracking for this product',
      },
      {
        name: 'initialStock',
        label: 'Initial Stock',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0',
        showIf: (formData) => formData.trackInventory === true,
      },
      {
        name: 'reorderPoint',
        label: 'Reorder Point',
        type: 'number',
        min: 0,
        placeholder: '10',
        helpText: 'Alert when stock falls below this level',
        showIf: (formData) => formData.trackInventory === true,
      },
      {
        name: 'reorderQuantity',
        label: 'Reorder Quantity',
        type: 'number',
        min: 0,
        placeholder: '50',
        helpText: 'Suggested quantity to reorder',
        showIf: (formData) => formData.trackInventory === true,
      },
      {
        name: 'location',
        label: 'Storage Location',
        type: 'text',
        placeholder: 'e.g., Aisle 3, Shelf B',
      },
      {
        name: 'serialized',
        label: 'Track Serial Numbers',
        type: 'checkbox',
        default: false,
        helpText: 'For high-value items',
      },
    ],
  },
  attributes: {
    id: 'product-step-4',
    title: 'Attributes',
    description: 'Add product-specific attributes',
    submitLabel: 'Complete',
    fields: [
      {
        name: 'weight',
        label: 'Weight',
        type: 'number',
        min: 0,
        step: 0.01,
        placeholder: '0.00',
      },
      {
        name: 'weightUnit',
        label: 'Weight Unit',
        type: 'select',
        options: [
          { value: 'lb', label: 'Pounds (lb)' },
          { value: 'oz', label: 'Ounces (oz)' },
          { value: 'kg', label: 'Kilograms (kg)' },
          { value: 'g', label: 'Grams (g)' },
        ],
        default: 'lb',
      },
      {
        name: 'dimensions',
        label: 'Dimensions (L x W x H)',
        type: 'text',
        placeholder: '10 x 5 x 3',
      },
      {
        name: 'dimensionUnit',
        label: 'Dimension Unit',
        type: 'select',
        options: [
          { value: 'in', label: 'Inches' },
          { value: 'cm', label: 'Centimeters' },
        ],
        default: 'in',
      },
      {
        name: 'barcode',
        label: 'Barcode',
        type: 'text',
        placeholder: 'UPC/EAN code',
      },
      {
        name: 'warranty',
        label: 'Warranty Period',
        type: 'text',
        placeholder: 'e.g., 1 year',
      },
    ],
  },
};

/**
 * Customer Registration Wizard
 * Multi-step form for registering new customers
 */
export interface CustomerRegistrationWizardSteps {
  personalInfo: FormSchema;
  contactInfo: FormSchema;
  preferences: FormSchema;
  vehicle: FormSchema;
}

export const customerRegistrationWizard: CustomerRegistrationWizardSteps = {
  personalInfo: {
    id: 'customer-step-1',
    title: 'Personal Information',
    description: 'Tell us about yourself',
    submitLabel: 'Next',
    fields: [
      {
        name: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'John',
      },
      {
        name: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'Doe',
      },
      {
        name: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'date',
        helpText: 'Optional - for age verification',
      },
      {
        name: 'customerType',
        label: 'Customer Type',
        type: 'radio',
        required: true,
        options: [
          { value: 'individual', label: 'Individual' },
          { value: 'business', label: 'Business' },
        ],
        default: 'individual',
      },
      {
        name: 'companyName',
        label: 'Company Name',
        type: 'text',
        placeholder: 'Acme Corporation',
        showIf: (formData) => formData.customerType === 'business',
      },
      {
        name: 'taxId',
        label: 'Tax ID',
        type: 'text',
        placeholder: '12-3456789',
        showIf: (formData) => formData.customerType === 'business',
      },
    ],
  },
  contactInfo: {
    id: 'customer-step-2',
    title: 'Contact Information',
    description: 'How can we reach you?',
    submitLabel: 'Next',
    fields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'john@example.com',
      },
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'tel',
        required: true,
        placeholder: '(555) 123-4567',
      },
      {
        name: 'alternatePhone',
        label: 'Alternate Phone',
        type: 'tel',
        placeholder: '(555) 987-6543',
      },
      {
        name: 'address',
        label: 'Street Address',
        type: 'text',
        required: true,
        placeholder: '123 Main St',
      },
      {
        name: 'city',
        label: 'City',
        type: 'text',
        required: true,
      },
      {
        name: 'state',
        label: 'State/Province',
        type: 'text',
        required: true,
      },
      {
        name: 'zipCode',
        label: 'ZIP/Postal Code',
        type: 'text',
        required: true,
      },
    ],
  },
  preferences: {
    id: 'customer-step-3',
    title: 'Preferences',
    description: 'Set your preferences',
    submitLabel: 'Next',
    fields: [
      {
        name: 'pricingTier',
        label: 'Pricing Tier',
        type: 'select',
        required: true,
        options: [
          { value: 'retail', label: 'Retail' },
          { value: 'wholesale', label: 'Wholesale (10% off)' },
          { value: 'contractor', label: 'Contractor (15% off)' },
          { value: 'vip', label: 'VIP (20% off)' },
        ],
        default: 'retail',
      },
      {
        name: 'loyaltyProgram',
        label: 'Join Loyalty Program',
        type: 'checkbox',
        default: true,
        helpText: 'Earn points on every purchase',
      },
      {
        name: 'emailNotifications',
        label: 'Email Notifications',
        type: 'checkbox',
        default: true,
        helpText: 'Receive special offers and updates',
      },
      {
        name: 'smsNotifications',
        label: 'SMS Notifications',
        type: 'checkbox',
        default: false,
        helpText: 'Receive order updates via text',
      },
      {
        name: 'preferredContact',
        label: 'Preferred Contact Method',
        type: 'radio',
        options: [
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone' },
          { value: 'sms', label: 'SMS' },
        ],
        default: 'email',
      },
    ],
  },
  vehicle: {
    id: 'customer-step-4',
    title: 'Vehicle Information',
    description: 'Add your vehicle (optional)',
    submitLabel: 'Complete',
    // NOTE: This step contains automotive-specific fields (VIN, make, model, etc.)
    // It should only be included in the wizard when the automotive module is enabled.
    // The fields are already conditional on hasVehicle === 'yes', but the entire step
    // should be filtered out if config.modules.automotive.enabled === false
    fields: [
      {
        name: 'hasVehicle',
        label: 'Do you want to add a vehicle?',
        type: 'radio',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No, skip this step' },
        ],
        default: 'no',
      },
      {
        name: 'year',
        label: 'Year',
        type: 'number',
        min: 1900,
        max: new Date().getFullYear() + 1,
        placeholder: '2020',
        showIf: (formData) => formData.hasVehicle === 'yes',
      },
      {
        name: 'make',
        label: 'Make',
        type: 'text',
        placeholder: 'Honda',
        showIf: (formData) => formData.hasVehicle === 'yes',
      },
      {
        name: 'model',
        label: 'Model',
        type: 'text',
        placeholder: 'Civic',
        showIf: (formData) => formData.hasVehicle === 'yes',
      },
      {
        name: 'vin',
        label: 'VIN',
        type: 'text',
        placeholder: '17-character VIN',
        minLength: 17,
        maxLength: 17,
        showIf: (formData) => formData.hasVehicle === 'yes',
      },
      {
        name: 'licensePlate',
        label: 'License Plate',
        type: 'text',
        placeholder: 'ABC-1234',
        showIf: (formData) => formData.hasVehicle === 'yes',
      },
      {
        name: 'mileage',
        label: 'Current Mileage',
        type: 'number',
        min: 0,
        placeholder: '50000',
        showIf: (formData) => formData.hasVehicle === 'yes',
      },
    ],
  },
};

// ============================================================================
// Wizard Registry
// ============================================================================

export const wizardForms = {
  businessOnboarding: businessOnboardingWizard,
  productSetup: productSetupWizard,
  customerRegistration: customerRegistrationWizard,
};

export type WizardFormKey = keyof typeof wizardForms;

/**
 * Get a wizard form by key
 */
export function getWizardForm(key: WizardFormKey) {
  return wizardForms[key];
}

/**
 * Get all available wizard forms
 */
export function getAllWizardForms() {
  return wizardForms;
}

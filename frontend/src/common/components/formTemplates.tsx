import { FormSchema } from './DynamicForm';

// ============================================================================
// Form Template Library
// Pre-built, customizable forms for common business needs
// ============================================================================

/**
 * Contact Form
 * Standard contact form for customer inquiries
 */
export const contactFormTemplate: FormSchema = {
  id: 'contact-form',
  title: 'Contact Us',
  description: "Send us a message and we'll get back to you as soon as possible.",
  submitLabel: 'Send Message',
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
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
      placeholder: '(555) 123-4567',
      helpText: "Optional - we'll call you back if needed",
    },
    {
      name: 'subject',
      label: 'Subject',
      type: 'select',
      required: true,
      options: [
        { value: 'general', label: 'General Inquiry' },
        { value: 'support', label: 'Technical Support' },
        { value: 'sales', label: 'Sales Question' },
        { value: 'feedback', label: 'Feedback' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      rows: 6,
      placeholder: 'Tell us how we can help...',
      minLength: 10,
      maxLength: 1000,
    },
    {
      name: 'newsletter',
      label: 'Subscribe to our newsletter for updates and special offers',
      type: 'checkbox',
      default: false,
    },
  ],
};

/**
 * Sign Up Form
 * User registration form with account creation
 */
export const signUpFormTemplate: FormSchema = {
  id: 'sign-up-form',
  title: 'Create Your Account',
  description: 'Join us today and start enjoying exclusive benefits.',
  submitLabel: 'Create Account',
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
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'john@example.com',
      helpText: "We'll never share your email with anyone else",
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: true,
      placeholder: '(555) 123-4567',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      minLength: 8,
      helpText: 'Must be at least 8 characters',
    },
    {
      name: 'confirmPassword',
      label: 'Confirm Password',
      type: 'password',
      required: true,
      validate: (value, formData) => {
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return null;
      },
    },
    {
      name: 'accountType',
      label: 'Account Type',
      type: 'radio',
      required: true,
      options: [
        { value: 'personal', label: 'Personal Account' },
        { value: 'business', label: 'Business Account' },
      ],
      default: 'personal',
    },
    {
      name: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'Acme Corporation',
      showIf: (formData) => formData.accountType === 'business',
    },
    {
      name: 'terms',
      label: 'I agree to the Terms of Service and Privacy Policy',
      type: 'checkbox',
      required: true,
    },
  ],
};

/**
 * Customer Pricing Tier Application
 * Form for customers to apply for preferred/jobber pricing
 */
export const pricingTierApplicationTemplate: FormSchema = {
  id: 'pricing-tier-application',
  title: 'Apply for Preferred Pricing',
  description: 'Complete this form to apply for wholesale, contractor, or VIP pricing tiers.',
  submitLabel: 'Submit Application',
  fields: [
    {
      name: 'businessName',
      label: 'Business Name',
      type: 'text',
      required: true,
      placeholder: 'ABC Contractors Inc.',
    },
    {
      name: 'contactName',
      label: 'Contact Person',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
    {
      name: 'email',
      label: 'Business Email',
      type: 'email',
      required: true,
      placeholder: 'john@abccontractors.com',
    },
    {
      name: 'phone',
      label: 'Business Phone',
      type: 'tel',
      required: true,
      placeholder: '(555) 123-4567',
    },
    {
      name: 'address',
      label: 'Business Address',
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
      name: 'requestedTier',
      label: 'Requested Pricing Tier',
      type: 'select',
      required: true,
      options: [
        { value: 'wholesale', label: 'Wholesale (10% discount)' },
        { value: 'contractor', label: 'Contractor (15% discount)' },
        { value: 'vip', label: 'VIP (20% discount)' },
      ],
    },
    {
      name: 'businessType',
      label: 'Type of Business',
      type: 'select',
      required: true,
      options: [
        { value: 'contractor', label: 'General Contractor' },
        { value: 'mechanic', label: 'Auto Mechanic/Shop' },
        { value: 'bodyshop', label: 'Body Shop' },
        { value: 'fleet', label: 'Fleet Management' },
        { value: 'reseller', label: 'Reseller/Distributor' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'yearsInBusiness',
      label: 'Years in Business',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
    },
    {
      name: 'estimatedMonthlyPurchase',
      label: 'Estimated Monthly Purchase Volume',
      type: 'select',
      required: true,
      options: [
        { value: '0-500', label: '$0 - $500' },
        { value: '500-1000', label: '$500 - $1,000' },
        { value: '1000-2500', label: '$1,000 - $2,500' },
        { value: '2500-5000', label: '$2,500 - $5,000' },
        { value: '5000+', label: '$5,000+' },
      ],
    },
    {
      name: 'taxId',
      label: 'Tax ID / EIN',
      type: 'text',
      required: true,
      placeholder: '12-3456789',
      helpText: 'Required for tax-exempt purchases',
    },
    {
      name: 'resaleCertificate',
      label: 'Resale Certificate',
      type: 'file',
      helpText: 'Upload your resale certificate if applicable',
    },
    {
      name: 'references',
      label: 'Trade References',
      type: 'textarea',
      rows: 4,
      placeholder: 'Please provide 2-3 trade references with contact information',
      helpText: 'Include company name, contact person, phone, and email',
    },
    {
      name: 'additionalInfo',
      label: 'Additional Information',
      type: 'textarea',
      rows: 4,
      placeholder: "Tell us more about your business and why you're applying for this pricing tier",
    },
  ],
};

/**
 * Product Inquiry Form
 * Form for customers to inquire about specific products
 */
export const productInquiryTemplate: FormSchema = {
  id: 'product-inquiry',
  title: 'Product Inquiry',
  description: "Have questions about a product? We're here to help!",
  submitLabel: 'Send Inquiry',
  fields: [
    {
      name: 'name',
      label: 'Your Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
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
      placeholder: '(555) 123-4567',
    },
    {
      name: 'productName',
      label: 'Product Name or SKU',
      type: 'text',
      required: true,
      placeholder: 'e.g., Premium Motor Oil 5W-30',
      helpText: "Enter the product name or SKU you're inquiring about",
    },
    {
      name: 'inquiryType',
      label: 'Type of Inquiry',
      type: 'select',
      required: true,
      options: [
        { value: 'availability', label: 'Product Availability' },
        { value: 'pricing', label: 'Pricing Information' },
        { value: 'specifications', label: 'Technical Specifications' },
        { value: 'compatibility', label: 'Compatibility Question' },
        { value: 'bulk', label: 'Bulk Order Inquiry' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'quantity',
      label: 'Quantity Needed',
      type: 'number',
      min: 1,
      placeholder: '1',
      showIf: (formData) =>
        formData.inquiryType === 'bulk' || formData.inquiryType === 'availability',
    },
    {
      name: 'vehicleInfo',
      label: 'Vehicle Information',
      type: 'text',
      placeholder: 'e.g., 2020 Honda Civic',
      helpText: 'Year, Make, Model (if applicable)',
      showIf: (formData) => formData.inquiryType === 'compatibility',
    },
    {
      name: 'message',
      label: 'Your Question',
      type: 'textarea',
      required: true,
      rows: 5,
      placeholder: 'Please provide details about your inquiry...',
    },
    {
      name: 'urgency',
      label: 'How urgent is this inquiry?',
      type: 'radio',
      options: [
        { value: 'low', label: 'Not urgent - within a week is fine' },
        { value: 'medium', label: 'Moderately urgent - within 2-3 days' },
        { value: 'high', label: 'Urgent - need response within 24 hours' },
      ],
      default: 'medium',
    },
  ],
};

/**
 * Quote Request Form
 * Form for customers to request a custom quote
 */
export const quoteRequestTemplate: FormSchema = {
  id: 'quote-request',
  title: 'Request a Quote',
  description: "Fill out this form and we'll provide you with a detailed quote.",
  submitLabel: 'Request Quote',
  fields: [
    {
      name: 'companyName',
      label: 'Company Name',
      type: 'text',
      required: true,
    },
    {
      name: 'contactName',
      label: 'Contact Person',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: true,
    },
    {
      name: 'projectType',
      label: 'Project Type',
      type: 'select',
      required: true,
      options: [
        { value: 'new-construction', label: 'New Construction' },
        { value: 'renovation', label: 'Renovation' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'repair', label: 'Repair' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'projectDescription',
      label: 'Project Description',
      type: 'textarea',
      required: true,
      rows: 5,
      placeholder: 'Describe your project and what products/services you need...',
    },
    {
      name: 'itemsList',
      label: 'Items Needed',
      type: 'textarea',
      rows: 6,
      placeholder:
        'List the items you need with quantities:\n- Item 1 (Qty: 10)\n- Item 2 (Qty: 5)\n...',
      helpText: 'Include product names, SKUs, and quantities',
    },
    {
      name: 'budget',
      label: 'Budget Range',
      type: 'select',
      options: [
        { value: '0-1000', label: 'Under $1,000' },
        { value: '1000-5000', label: '$1,000 - $5,000' },
        { value: '5000-10000', label: '$5,000 - $10,000' },
        { value: '10000-25000', label: '$10,000 - $25,000' },
        { value: '25000+', label: '$25,000+' },
      ],
      helpText: 'Optional - helps us provide accurate recommendations',
    },
    {
      name: 'timeline',
      label: 'When do you need this?',
      type: 'select',
      required: true,
      options: [
        { value: 'asap', label: 'As soon as possible' },
        { value: '1-2weeks', label: 'Within 1-2 weeks' },
        { value: '1month', label: 'Within 1 month' },
        { value: '3months', label: 'Within 3 months' },
        { value: 'flexible', label: 'Flexible timeline' },
      ],
    },
    {
      name: 'deliveryAddress',
      label: 'Delivery Address',
      type: 'textarea',
      rows: 3,
      placeholder: 'Street address, City, State, ZIP',
      helpText: 'Where should we deliver the items?',
    },
    {
      name: 'attachments',
      label: 'Attachments',
      type: 'file',
      helpText: 'Upload any relevant documents, drawings, or specifications',
    },
  ],
};

/**
 * Service Request Form
 * Form for customers to request service or repairs
 */
export const serviceRequestTemplate: FormSchema = {
  id: 'service-request',
  title: 'Service Request',
  description: 'Schedule a service appointment or request repairs.',
  submitLabel: 'Submit Request',
  fields: [
    {
      name: 'customerName',
      label: 'Customer Name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: true,
    },
    {
      name: 'serviceType',
      label: 'Type of Service',
      type: 'select',
      required: true,
      options: [
        { value: 'maintenance', label: 'Routine Maintenance' },
        { value: 'repair', label: 'Repair' },
        { value: 'diagnostic', label: 'Diagnostic' },
        { value: 'installation', label: 'Installation' },
        { value: 'inspection', label: 'Inspection' },
      ],
    },
    {
      name: 'vehicleMake',
      label: 'Vehicle Make',
      type: 'text',
      required: true,
      placeholder: 'e.g., Honda',
    },
    {
      name: 'vehicleModel',
      label: 'Vehicle Model',
      type: 'text',
      required: true,
      placeholder: 'e.g., Civic',
    },
    {
      name: 'vehicleYear',
      label: 'Vehicle Year',
      type: 'number',
      required: true,
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
    {
      name: 'vin',
      label: 'VIN (Vehicle Identification Number)',
      type: 'text',
      placeholder: '17-character VIN',
      minLength: 17,
      maxLength: 17,
      helpText: 'Optional but helps us prepare for your service',
      // NOTE: Automotive-specific field - should be filtered out when automotive module is disabled
    },
    {
      name: 'mileage',
      label: 'Current Mileage',
      type: 'number',
      min: 0,
      placeholder: '50000',
    },
    {
      name: 'issueDescription',
      label: 'Describe the Issue',
      type: 'textarea',
      required: true,
      rows: 5,
      placeholder: 'Please describe the problem or service needed in detail...',
    },
    {
      name: 'preferredDate',
      label: 'Preferred Service Date',
      type: 'date',
      required: true,
    },
    {
      name: 'preferredTime',
      label: 'Preferred Time',
      type: 'select',
      required: true,
      options: [
        { value: 'morning', label: 'Morning (8 AM - 12 PM)' },
        { value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' },
        { value: 'evening', label: 'Evening (4 PM - 6 PM)' },
      ],
    },
    {
      name: 'dropOff',
      label: 'Will you drop off the vehicle?',
      type: 'radio',
      required: true,
      options: [
        { value: 'yes', label: "Yes, I'll drop it off" },
        { value: 'no', label: 'No, I need a pickup service' },
      ],
    },
    {
      name: 'pickupAddress',
      label: 'Pickup Address',
      type: 'textarea',
      rows: 2,
      placeholder: 'Street address, City, State, ZIP',
      showIf: (formData) => formData.dropOff === 'no',
    },
  ],
};

/**
 * Feedback Form
 * Form for collecting customer feedback
 */
export const feedbackFormTemplate: FormSchema = {
  id: 'feedback-form',
  title: 'We Value Your Feedback',
  description: 'Help us improve by sharing your experience.',
  submitLabel: 'Submit Feedback',
  fields: [
    {
      name: 'name',
      label: 'Your Name',
      type: 'text',
      placeholder: 'Optional',
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: "Optional - if you'd like us to follow up",
    },
    {
      name: 'rating',
      label: 'Overall Experience',
      type: 'radio',
      required: true,
      options: [
        { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
        { value: '4', label: '⭐⭐⭐⭐ Good' },
        { value: '3', label: '⭐⭐⭐ Average' },
        { value: '2', label: '⭐⭐ Below Average' },
        { value: '1', label: '⭐ Poor' },
      ],
    },
    {
      name: 'category',
      label: 'What is your feedback about?',
      type: 'select',
      required: true,
      options: [
        { value: 'product-quality', label: 'Product Quality' },
        { value: 'customer-service', label: 'Customer Service' },
        { value: 'pricing', label: 'Pricing' },
        { value: 'delivery', label: 'Delivery/Shipping' },
        { value: 'website', label: 'Website Experience' },
        { value: 'store', label: 'In-Store Experience' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'comments',
      label: 'Your Feedback',
      type: 'textarea',
      required: true,
      rows: 6,
      placeholder: 'Please share your thoughts, suggestions, or concerns...',
    },
    {
      name: 'recommend',
      label: 'Would you recommend us to others?',
      type: 'radio',
      required: true,
      options: [
        { value: 'yes', label: 'Yes, definitely' },
        { value: 'maybe', label: 'Maybe' },
        { value: 'no', label: 'No' },
      ],
    },
    {
      name: 'followUp',
      label: 'May we contact you about your feedback?',
      type: 'checkbox',
      default: false,
    },
  ],
};

// ============================================================================
// Template Registry (defined at end of file after all schemas)
// ============================================================================

export type FormTemplateKey =
  | 'contact'
  | 'signUp'
  | 'pricingTier'
  | 'productInquiry'
  | 'quoteRequest'
  | 'serviceRequest'
  | 'feedback'
  | 'appointmentBooking'
  | 'employeeApplication'
  | 'returnExchange'
  | 'supplierRegistration'
  | 'warrantyClaim';

/**
 * Get a form template by key
 */
export function getFormTemplate(key: FormTemplateKey): FormSchema {
  return allFormTemplates[key];
}

/**
 * Get all available form templates
 */
export function getAllFormTemplates(): Record<FormTemplateKey, FormSchema> {
  return allFormTemplates;
}

/**
 * Create a custom form by modifying a template
 */
export function customizeFormTemplate(
  baseTemplate: FormSchema,
  customizations: Partial<FormSchema>
): FormSchema {
  return {
    ...baseTemplate,
    ...customizations,
    fields: customizations.fields || baseTemplate.fields,
  };
}

/**
 * Appointment Booking Form
 * Form for scheduling service appointments
 */
export const appointmentBookingTemplate: FormSchema = {
  id: 'appointment-booking',
  title: 'Schedule an Appointment',
  description: 'Book a service appointment at your convenience.',
  submitLabel: 'Book Appointment',
  fields: [
    {
      name: 'customerName',
      label: 'Your Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
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
      name: 'serviceType',
      label: 'Type of Service',
      type: 'select',
      required: true,
      options: [
        { value: 'oil-change', label: 'Oil Change' },
        { value: 'tire-rotation', label: 'Tire Rotation' },
        { value: 'brake-service', label: 'Brake Service' },
        { value: 'diagnostic', label: 'Diagnostic' },
        { value: 'inspection', label: 'Inspection' },
        { value: 'repair', label: 'Repair' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'vehicleYear',
      label: 'Vehicle Year',
      type: 'number',
      required: true,
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
    {
      name: 'vehicleMake',
      label: 'Vehicle Make',
      type: 'text',
      required: true,
      placeholder: 'Honda',
    },
    {
      name: 'vehicleModel',
      label: 'Vehicle Model',
      type: 'text',
      required: true,
      placeholder: 'Civic',
    },
    {
      name: 'preferredDate',
      label: 'Preferred Date',
      type: 'date',
      required: true,
    },
    {
      name: 'preferredTime',
      label: 'Preferred Time',
      type: 'select',
      required: true,
      options: [
        { value: '08:00', label: '8:00 AM' },
        { value: '09:00', label: '9:00 AM' },
        { value: '10:00', label: '10:00 AM' },
        { value: '11:00', label: '11:00 AM' },
        { value: '12:00', label: '12:00 PM' },
        { value: '13:00', label: '1:00 PM' },
        { value: '14:00', label: '2:00 PM' },
        { value: '15:00', label: '3:00 PM' },
        { value: '16:00', label: '4:00 PM' },
        { value: '17:00', label: '5:00 PM' },
      ],
    },
    {
      name: 'notes',
      label: 'Additional Notes',
      type: 'textarea',
      rows: 4,
      placeholder: 'Any specific concerns or requests...',
    },
    {
      name: 'dropOff',
      label: 'Will you drop off the vehicle?',
      type: 'radio',
      required: true,
      options: [
        { value: 'yes', label: "Yes, I'll drop it off" },
        { value: 'no', label: 'No, I need a pickup service' },
      ],
    },
  ],
};

/**
 * Employee Application Form
 * Form for job applications
 */
export const employeeApplicationTemplate: FormSchema = {
  id: 'employee-application',
  title: 'Employment Application',
  description: 'Apply for a position with our team.',
  submitLabel: 'Submit Application',
  fields: [
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: true,
    },
    {
      name: 'address',
      label: 'Street Address',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      label: 'City',
      type: 'text',
      required: true,
    },
    {
      name: 'state',
      label: 'State',
      type: 'text',
      required: true,
    },
    {
      name: 'zipCode',
      label: 'ZIP Code',
      type: 'text',
      required: true,
    },
    {
      name: 'position',
      label: 'Position Applying For',
      type: 'select',
      required: true,
      options: [
        { value: 'cashier', label: 'Cashier' },
        { value: 'sales', label: 'Sales Associate' },
        { value: 'manager', label: 'Manager' },
        { value: 'technician', label: 'Technician' },
        { value: 'inventory', label: 'Inventory Staff' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'availability',
      label: 'Availability',
      type: 'select',
      required: true,
      options: [
        { value: 'full-time', label: 'Full-Time' },
        { value: 'part-time', label: 'Part-Time' },
        { value: 'flexible', label: 'Flexible' },
      ],
    },
    {
      name: 'startDate',
      label: 'Available Start Date',
      type: 'date',
      required: true,
    },
    {
      name: 'experience',
      label: 'Years of Experience',
      type: 'number',
      min: 0,
      max: 50,
      required: true,
    },
    {
      name: 'education',
      label: 'Highest Education Level',
      type: 'select',
      required: true,
      options: [
        { value: 'high-school', label: 'High School' },
        { value: 'associate', label: 'Associate Degree' },
        { value: 'bachelor', label: "Bachelor's Degree" },
        { value: 'master', label: "Master's Degree" },
        { value: 'doctorate', label: 'Doctorate' },
      ],
    },
    {
      name: 'resume',
      label: 'Resume',
      type: 'file',
      required: true,
      helpText: 'Upload your resume (PDF or Word)',
    },
    {
      name: 'coverLetter',
      label: 'Cover Letter',
      type: 'textarea',
      rows: 6,
      placeholder: "Tell us why you're a great fit for this position...",
    },
    {
      name: 'references',
      label: 'Professional References',
      type: 'textarea',
      rows: 4,
      placeholder: 'Please provide 2-3 professional references with contact information',
    },
  ],
};

/**
 * Return/Exchange Form
 * Form for processing returns and exchanges
 */
export const returnExchangeTemplate: FormSchema = {
  id: 'return-exchange',
  title: 'Return or Exchange',
  description: 'Process a return or exchange request.',
  submitLabel: 'Submit Request',
  fields: [
    {
      name: 'requestType',
      label: 'Request Type',
      type: 'radio',
      required: true,
      options: [
        { value: 'return', label: 'Return for Refund' },
        { value: 'exchange', label: 'Exchange for Different Item' },
      ],
    },
    {
      name: 'orderNumber',
      label: 'Order Number',
      type: 'text',
      required: true,
      placeholder: 'ORD-12345',
    },
    {
      name: 'purchaseDate',
      label: 'Purchase Date',
      type: 'date',
      required: true,
    },
    {
      name: 'customerName',
      label: 'Customer Name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: true,
    },
    {
      name: 'itemSku',
      label: 'Item SKU',
      type: 'text',
      required: true,
      placeholder: 'PROD-001',
    },
    {
      name: 'itemName',
      label: 'Item Name',
      type: 'text',
      required: true,
    },
    {
      name: 'quantity',
      label: 'Quantity',
      type: 'number',
      required: true,
      min: 1,
      default: 1,
    },
    {
      name: 'reason',
      label: 'Reason for Return/Exchange',
      type: 'select',
      required: true,
      options: [
        { value: 'defective', label: 'Defective/Damaged' },
        { value: 'wrong-item', label: 'Wrong Item Received' },
        { value: 'not-as-described', label: 'Not as Described' },
        { value: 'changed-mind', label: 'Changed Mind' },
        { value: 'better-price', label: 'Found Better Price' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'description',
      label: 'Detailed Description',
      type: 'textarea',
      required: true,
      rows: 5,
      placeholder: 'Please describe the issue or reason for return/exchange...',
    },
    {
      name: 'exchangeItem',
      label: 'Exchange Item SKU',
      type: 'text',
      placeholder: 'PROD-002',
      showIf: (formData) => formData.requestType === 'exchange',
      helpText: 'SKU of the item you want to exchange for',
    },
    {
      name: 'hasReceipt',
      label: 'Do you have the original receipt?',
      type: 'radio',
      required: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
    },
    {
      name: 'receiptPhoto',
      label: 'Receipt Photo',
      type: 'file',
      helpText: 'Upload a photo of your receipt',
      showIf: (formData) => formData.hasReceipt === 'yes',
    },
    {
      name: 'itemPhotos',
      label: 'Item Photos',
      type: 'file',
      helpText: 'Upload photos showing the issue (if applicable)',
    },
  ],
};

/**
 * Supplier Registration Form
 * Form for registering new suppliers
 */
export const supplierRegistrationTemplate: FormSchema = {
  id: 'supplier-registration',
  title: 'Supplier Registration',
  description: 'Register as a supplier for our business.',
  submitLabel: 'Submit Registration',
  fields: [
    {
      name: 'companyName',
      label: 'Company Name',
      type: 'text',
      required: true,
    },
    {
      name: 'taxId',
      label: 'Tax ID / EIN',
      type: 'text',
      required: true,
      placeholder: '12-3456789',
    },
    {
      name: 'contactPerson',
      label: 'Primary Contact Person',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Business Email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      label: 'Business Phone',
      type: 'tel',
      required: true,
    },
    {
      name: 'website',
      label: 'Website',
      type: 'text',
      placeholder: 'https://www.example.com',
    },
    {
      name: 'address',
      label: 'Business Address',
      type: 'text',
      required: true,
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
    },
    {
      name: 'productsSupplied',
      label: 'Products/Services Supplied',
      type: 'textarea',
      required: true,
      rows: 4,
      placeholder: 'List the products or services you can supply...',
    },
    {
      name: 'categories',
      label: 'Product Categories',
      type: 'select',
      required: true,
      options: [
        { value: 'automotive-parts', label: 'Automotive Parts' },
        { value: 'paint-supplies', label: 'Paint & Supplies' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'apparel', label: 'Apparel' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'minimumOrder',
      label: 'Minimum Order Amount',
      type: 'number',
      min: 0,
      step: 0.01,
      placeholder: '0.00',
    },
    {
      name: 'paymentTerms',
      label: 'Payment Terms',
      type: 'select',
      required: true,
      options: [
        { value: 'net-30', label: 'Net 30' },
        { value: 'net-60', label: 'Net 60' },
        { value: 'net-90', label: 'Net 90' },
        { value: 'cod', label: 'Cash on Delivery' },
        { value: 'prepaid', label: 'Prepaid' },
      ],
    },
    {
      name: 'leadTime',
      label: 'Typical Lead Time',
      type: 'text',
      placeholder: 'e.g., 2-3 weeks',
    },
    {
      name: 'certifications',
      label: 'Certifications',
      type: 'textarea',
      rows: 3,
      placeholder: 'List any relevant certifications (ISO, etc.)',
    },
    {
      name: 'references',
      label: 'Business References',
      type: 'textarea',
      rows: 4,
      placeholder: 'Provide 2-3 business references with contact information',
    },
  ],
};

/**
 * Warranty Claim Form
 * Form for submitting warranty claims
 */
export const warrantyClaimTemplate: FormSchema = {
  id: 'warranty-claim',
  title: 'Warranty Claim',
  description: 'Submit a warranty claim for a defective product.',
  submitLabel: 'Submit Claim',
  fields: [
    {
      name: 'customerName',
      label: 'Customer Name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: true,
    },
    {
      name: 'orderNumber',
      label: 'Order Number',
      type: 'text',
      required: true,
      placeholder: 'ORD-12345',
    },
    {
      name: 'purchaseDate',
      label: 'Purchase Date',
      type: 'date',
      required: true,
    },
    {
      name: 'productSku',
      label: 'Product SKU',
      type: 'text',
      required: true,
    },
    {
      name: 'productName',
      label: 'Product Name',
      type: 'text',
      required: true,
    },
    {
      name: 'serialNumber',
      label: 'Serial Number',
      type: 'text',
      placeholder: 'If applicable',
    },
    {
      name: 'issueType',
      label: 'Type of Issue',
      type: 'select',
      required: true,
      options: [
        { value: 'defective', label: 'Defective' },
        { value: 'malfunction', label: 'Malfunction' },
        { value: 'damaged', label: 'Damaged' },
        { value: 'missing-parts', label: 'Missing Parts' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'issueDescription',
      label: 'Describe the Issue',
      type: 'textarea',
      required: true,
      rows: 6,
      placeholder: 'Please provide a detailed description of the problem...',
    },
    {
      name: 'firstOccurrence',
      label: 'When did the issue first occur?',
      type: 'date',
      required: true,
    },
    {
      name: 'photos',
      label: 'Photos of Issue',
      type: 'file',
      helpText: 'Upload photos showing the defect or issue',
    },
    {
      name: 'receipt',
      label: 'Proof of Purchase',
      type: 'file',
      required: true,
      helpText: 'Upload receipt or invoice',
    },
    {
      name: 'resolution',
      label: 'Desired Resolution',
      type: 'radio',
      required: true,
      options: [
        { value: 'replacement', label: 'Replacement' },
        { value: 'repair', label: 'Repair' },
        { value: 'refund', label: 'Refund' },
      ],
    },
  ],
};

// Complete template registry
export const allFormTemplates = {
  contact: contactFormTemplate,
  signUp: signUpFormTemplate,
  pricingTier: pricingTierApplicationTemplate,
  productInquiry: productInquiryTemplate,
  quoteRequest: quoteRequestTemplate,
  serviceRequest: serviceRequestTemplate,
  feedback: feedbackFormTemplate,
  appointmentBooking: appointmentBookingTemplate,
  employeeApplication: employeeApplicationTemplate,
  returnExchange: returnExchangeTemplate,
  supplierRegistration: supplierRegistrationTemplate,
  warrantyClaim: warrantyClaimTemplate,
};

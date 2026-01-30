/**
 * Common types for Setup Wizard step components
 */

export interface StepContentProps<T = unknown> {
  /** Callback when step is completed with optional data */
  onComplete: (data?: T) => void;
  /** Previously saved data for this step */
  data?: T;
  /** Whether this step has been completed */
  isComplete: boolean;
}

export interface AdminStepData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
}

export interface TaxRate {
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface StoreStepData {
  storeName: string;
  currency: string;
  locale: string;
  timezone: string;
  // Tax configuration (consolidated from TaxesStepData)
  taxRegion: string;
  taxRates: TaxRate[];
}

// Kept for backwards compatibility
export interface TaxesStepData {
  taxRegion: string;
  taxRates: TaxRate[];
}

export interface LocationsStepData {
  locations: Array<{
    name: string;
    address?: string;
    registers: Array<{
      name: string;
      isDefault: boolean;
    }>;
  }>;
}

export interface BrandingStepData {
  logoLight?: string;
  logoDark?: string;
  accentColor?: string;
  themePreset?: 
    | 'default' 
    | 'blue' 
    | 'teal'
    | 'emerald'
    | 'green' 
    | 'lime'
    | 'indigo'
    | 'violet'
    | 'purple'
    | 'fuchsia'
    | 'pink'
    | 'rose'
    | 'red'
    | 'orange'
    | 'amber'
    | 'yellow'
    | 'cyan'
    | 'custom';
}

export interface IntegrationsStepData {
  woocommerce?: {
    enabled: boolean;
    connected?: boolean;
    storeUrl?: string;
  };
  quickbooks?: {
    enabled: boolean;
    connected?: boolean;
  };
}

export interface ImportStepData {
  productsImported: number;
  customersImported: number;
}

export interface TestStepData {
  printerTested: boolean;
  scannerTested: boolean;
  testSaleCompleted: boolean;
}

export type NetworkBindMode = 'localhost' | 'all-interfaces' | 'specific-ip';

export interface NetworkInterface {
  name: string;
  ip: string;
  isWireless: boolean;
}

export interface NetworkStepData {
  lanEnabled: boolean;
  bindMode: NetworkBindMode;
  selectedIp?: string;
  detectedInterfaces: NetworkInterface[];
}

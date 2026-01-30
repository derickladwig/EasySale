/**
 * Locale Defaults — Single Source of Truth
 * 
 * Canada-first defaults for store locale settings.
 * Used by:
 * - Setup Wizard (StoreStepContent)
 * - Localization Settings Page
 * - Default Config
 * 
 * Backend alignment: America/Edmonton is the default timezone in backend
 * (see: backend/crates/server/src/services/sync_scheduler.rs)
 */

// ============================================================================
// DEFAULT VALUES (Canada-first)
// ============================================================================

export const DEFAULT_STORE_LOCALE = {
  currency: 'CAD' as string,
  locale: 'en-CA' as string,
  timezone: 'America/Edmonton' as string,
  taxRegion: 'Canada - GST Only' as string,
};

// ============================================================================
// TAX REGION OPTIONS
// ============================================================================

export interface TaxRate {
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface TaxRegionOption {
  region: string;
  rates: TaxRate[];
  /** Associated timezones that should auto-select this tax region */
  timezones: string[];
  /** Associated currency code */
  currency: string;
}

export const TAX_REGION_OPTIONS: TaxRegionOption[] = [
  // Canadian tax regions
  { 
    region: 'Canada - GST Only', 
    rates: [{ name: 'GST', rate: 5.0, isDefault: true }],
    timezones: ['America/Edmonton', 'America/Yellowknife', 'America/Whitehorse'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - GST + PST (BC)', 
    rates: [
      { name: 'GST', rate: 5.0, isDefault: true },
      { name: 'PST', rate: 7.0, isDefault: false },
    ],
    timezones: ['America/Vancouver'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - GST + PST (SK)', 
    rates: [
      { name: 'GST', rate: 5.0, isDefault: true },
      { name: 'PST', rate: 6.0, isDefault: false },
    ],
    timezones: ['America/Regina'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - GST + PST (MB)', 
    rates: [
      { name: 'GST', rate: 5.0, isDefault: true },
      { name: 'RST', rate: 7.0, isDefault: false },
    ],
    timezones: ['America/Winnipeg'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - HST (Ontario)', 
    rates: [{ name: 'HST', rate: 13.0, isDefault: true }],
    timezones: ['America/Toronto'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - HST (Nova Scotia)', 
    rates: [{ name: 'HST', rate: 15.0, isDefault: true }],
    timezones: ['America/Halifax'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - HST (New Brunswick)', 
    rates: [{ name: 'HST', rate: 15.0, isDefault: true }],
    timezones: ['America/Moncton'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - HST (Newfoundland)', 
    rates: [{ name: 'HST', rate: 15.0, isDefault: true }],
    timezones: ['America/St_Johns'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - HST (PEI)', 
    rates: [{ name: 'HST', rate: 15.0, isDefault: true }],
    timezones: ['America/Charlottetown'],
    currency: 'CAD',
  },
  { 
    region: 'Canada - GST + QST (Quebec)', 
    rates: [
      { name: 'GST', rate: 5.0, isDefault: true },
      { name: 'QST', rate: 9.975, isDefault: false },
    ],
    timezones: ['America/Montreal'],
    currency: 'CAD',
  },
  // US tax regions
  { 
    region: 'US - No State Tax', 
    rates: [],
    timezones: [], // States like Oregon, Montana, Delaware
    currency: 'USD',
  },
  { 
    region: 'US - Standard', 
    rates: [{ name: 'Sales Tax', rate: 7.0, isDefault: true }],
    timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
    currency: 'USD',
  },
  // UK
  { 
    region: 'UK - VAT', 
    rates: [{ name: 'VAT', rate: 20.0, isDefault: true }],
    timezones: ['Europe/London'],
    currency: 'GBP',
  },
  // Custom (no auto-mapping)
  { 
    region: 'Custom', 
    rates: [],
    timezones: [],
    currency: '',
  },
];

// ============================================================================
// CURRENCY OPTIONS
// ============================================================================

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
];

// ============================================================================
// LOCALE OPTIONS
// ============================================================================

export interface LocaleOption {
  code: string;
  name: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en-CA', name: 'English (Canada)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'fr-CA', name: 'French (Canada)' },
  { code: 'es-US', name: 'Spanish (US)' },
];

// ============================================================================
// TIMEZONE OPTIONS
// ============================================================================

export interface TimezoneOption {
  /** IANA timezone ID (e.g., 'America/Edmonton') */
  id: string;
  /** Display label: "<Friendly Name> (<City>)" */
  label: string;
}

/**
 * Timezone options with Canada-first ordering.
 * Format: "<Friendly Name> (<Representative City>)"
 * 
 * Canadian timezones listed first, then US equivalents.
 */
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // Canadian timezones (primary)
  { id: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
  { id: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
  { id: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
  { id: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { id: 'America/Halifax', label: 'Atlantic Time (Halifax)' },
  { id: 'America/St_Johns', label: 'Newfoundland Time (St. John\'s)' },
  
  // US equivalents (for US-based stores)
  { id: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { id: 'America/Denver', label: 'Mountain Time (Denver)' },
  { id: 'America/Chicago', label: 'Central Time (Chicago)' },
  { id: 'America/New_York', label: 'Eastern Time (New York)' },
  
  // Other common timezones
  { id: 'Europe/London', label: 'Greenwich Mean Time (London)' },
  { id: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get timezone label by IANA ID.
 * Returns the ID itself if not found in options.
 */
export function getTimezoneLabel(timezoneId: string): string {
  const option = TIMEZONE_OPTIONS.find(tz => tz.id === timezoneId);
  return option?.label ?? timezoneId;
}

/**
 * Get currency option by code.
 */
export function getCurrencyOption(code: string): CurrencyOption | undefined {
  return CURRENCY_OPTIONS.find(c => c.code === code);
}

/**
 * Get locale option by code.
 */
export function getLocaleOption(code: string): LocaleOption | undefined {
  return LOCALE_OPTIONS.find(l => l.code === code);
}

/**
 * Get tax region by timezone.
 * Returns the best matching tax region for a given timezone.
 */
export function getTaxRegionByTimezone(timezoneId: string): TaxRegionOption | undefined {
  return TAX_REGION_OPTIONS.find(tr => tr.timezones.includes(timezoneId));
}

/**
 * Get suggested currency by timezone.
 * Returns the currency associated with the timezone's tax region.
 */
export function getCurrencyByTimezone(timezoneId: string): string {
  const taxRegion = getTaxRegionByTimezone(timezoneId);
  if (taxRegion?.currency) {
    return taxRegion.currency;
  }
  // Fallback based on timezone prefix
  if (timezoneId.startsWith('America/')) {
    // Check if it's a Canadian city
    const canadianCities = ['Vancouver', 'Edmonton', 'Winnipeg', 'Toronto', 'Halifax', 'St_Johns', 'Montreal', 'Regina', 'Yellowknife', 'Whitehorse', 'Moncton', 'Charlottetown'];
    const city = timezoneId.split('/')[1];
    if (canadianCities.includes(city)) {
      return 'CAD';
    }
    return 'USD';
  }
  if (timezoneId.startsWith('Europe/London')) {
    return 'GBP';
  }
  if (timezoneId.startsWith('Europe/')) {
    return 'EUR';
  }
  return DEFAULT_STORE_LOCALE.currency;
}

/**
 * Get suggested locale by timezone.
 */
export function getLocaleByTimezone(timezoneId: string): string {
  if (timezoneId.startsWith('America/')) {
    const canadianCities = ['Vancouver', 'Edmonton', 'Winnipeg', 'Toronto', 'Halifax', 'St_Johns', 'Regina', 'Yellowknife', 'Whitehorse', 'Moncton', 'Charlottetown'];
    const city = timezoneId.split('/')[1];
    if (canadianCities.includes(city)) {
      return 'en-CA';
    }
    if (city === 'Montreal') {
      return 'fr-CA';
    }
    return 'en-US';
  }
  if (timezoneId === 'Europe/London') {
    return 'en-GB';
  }
  return DEFAULT_STORE_LOCALE.locale;
}

/**
 * Get all settings suggestions based on timezone selection.
 * Returns suggested currency, locale, and tax region.
 */
export function getSettingsByTimezone(timezoneId: string): {
  currency: string;
  locale: string;
  taxRegion: string;
  taxRates: TaxRate[];
} {
  const taxRegionOption = getTaxRegionByTimezone(timezoneId);
  
  return {
    currency: getCurrencyByTimezone(timezoneId),
    locale: getLocaleByTimezone(timezoneId),
    taxRegion: taxRegionOption?.region || DEFAULT_STORE_LOCALE.taxRegion,
    taxRates: taxRegionOption?.rates || TAX_REGION_OPTIONS.find(tr => tr.region === DEFAULT_STORE_LOCALE.taxRegion)?.rates || [],
  };
}

/**
 * Apply defaults only to empty/undefined values.
 * Does NOT override existing persisted values.
 */
export function applyLocaleDefaults<T extends { currency?: string; locale?: string; timezone?: string }>(
  values: T
): T & { currency: string; locale: string; timezone: string } {
  return {
    ...values,
    currency: values.currency || DEFAULT_STORE_LOCALE.currency,
    locale: values.locale || DEFAULT_STORE_LOCALE.locale,
    timezone: values.timezone || DEFAULT_STORE_LOCALE.timezone,
  };
}

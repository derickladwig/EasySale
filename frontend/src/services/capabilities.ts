/**
 * Capabilities Service
 * 
 * Queries the backend /api/capabilities endpoint to determine which features
 * are available in the current build variant.
 */

export interface Capabilities {
  accounting_mode: 'disabled' | 'export_only' | 'sync';
  features: {
    export: boolean;
    sync: boolean;
    document_processing?: boolean;
    ocr?: boolean;
    document_cleanup?: boolean;
    integrations?: boolean;
    payments?: boolean;
    stripe?: boolean;
    square?: boolean;
    clover?: boolean;
    data_manager?: boolean;
    build_variant?: string;
  };
  version: string;
  build_hash: string;
}

let cachedCapabilities: Capabilities | null = null;

/**
 * Fetch capabilities from the backend
 */
export async function fetchCapabilities(): Promise<Capabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  try {
    const response = await fetch('/api/capabilities', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch capabilities: ${response.statusText}`);
    }
    
    const capabilities = await response.json();
    cachedCapabilities = capabilities;
    return capabilities;
  } catch (error) {
    console.error('Failed to fetch capabilities:', error);
    // Return default capabilities if fetch fails
    return {
      accounting_mode: 'disabled',
      features: {
        export: false,
        sync: false,
      },
      version: 'unknown',
      build_hash: 'unknown',
    };
  }
}

/**
 * Get cached capabilities (must call fetchCapabilities first)
 */
export function getCachedCapabilities(): Capabilities | null {
  return cachedCapabilities;
}

/**
 * Clear cached capabilities (useful for testing or after backend upgrade)
 */
export function clearCapabilitiesCache(): void {
  cachedCapabilities = null;
}

/**
 * Check if accounting features are available
 */
export function hasAccountingFeatures(capabilities: Capabilities): boolean {
  return capabilities.accounting_mode !== 'disabled';
}

/**
 * Check if export features are available
 */
export function hasExportFeatures(capabilities: Capabilities): boolean {
  return capabilities.features.export;
}

/**
 * Check if sync features are available
 */
export function hasSyncFeatures(capabilities: Capabilities): boolean {
  return capabilities.features.sync;
}

/**
 * Check if integrations features are available
 */
export function hasIntegrations(capabilities: Capabilities): boolean {
  return capabilities.features.integrations ?? false;
}

/**
 * Check if payments features are available
 */
export function hasPayments(capabilities: Capabilities): boolean {
  return capabilities.features.payments ?? false;
}

/**
 * Check if Stripe integration is available
 */
export function hasStripe(capabilities: Capabilities): boolean {
  return capabilities.features.stripe ?? false;
}

/**
 * Check if Square integration is available
 */
export function hasSquare(capabilities: Capabilities): boolean {
  return capabilities.features.square ?? false;
}

/**
 * Check if Clover integration is available
 */
export function hasClover(capabilities: Capabilities): boolean {
  return capabilities.features.clover ?? false;
}

/**
 * Check if Data Manager is available
 */
export function hasDataManager(capabilities: Capabilities): boolean {
  return capabilities.features.data_manager ?? false;
}

/**
 * Get the build variant
 */
export function getBuildVariant(capabilities: Capabilities): string {
  return capabilities.features.build_variant ?? 'lite';
}

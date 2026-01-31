/**
 * Branding API Service
 * 
 * Client for branding asset upload and management.
 * Supports image upload with cropping, favicon generation, and asset retrieval.
 */

import axios from 'axios';

// Determine API base URL dynamically
// Use relative URLs to go through Vite proxy (dev) or nginx proxy (prod)
// This ensures cookies are sent correctly (same-origin requests)
function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Use relative URLs - works in both dev (Vite proxy) and prod (nginx proxy)
  return '';
}

/**
 * Get CSRF token from cookie for state-changing requests
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include httpOnly cookies for authentication
});

// Add CSRF token to state-changing requests
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// ============================================================================
// Types
// ============================================================================

export type AssetType = 
  | 'logo_light'
  | 'logo_dark'
  | 'logo_master'
  | 'favicon'
  | 'icon'
  | 'app_icon';

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeneratedAsset {
  asset_type: string;
  size: string;
  url: string;
}

export interface AssetUrls {
  master: string;
  favicon?: string;
  favicon_ico?: string;
  pwa_192?: string;
  pwa_512?: string;
  apple_touch?: string;
}

export interface UploadResponse {
  success: boolean;
  asset_id: string;
  asset_type: string;
  original_filename: string;
  file_size: number;
  generated_assets: GeneratedAsset[];
  urls: AssetUrls;
}

export interface ListAssetsResponse {
  tenant_id: string;
  assets: string[];
}

export interface BrandingConfig {
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  icon?: string;
  accentColor?: string;
  themePreset?: string;
}

// ============================================================================
// API Functions
// ============================================================================

export const brandingApi = {
  /**
   * Upload a branding image
   * @param file - The image file to upload
   * @param assetType - Type of asset (logo_light, logo_dark, favicon, etc.)
   * @param crop - Optional crop region
   * @returns Upload result with generated asset URLs
   */
  async uploadImage(
    file: File,
    assetType: AssetType,
    crop?: CropRegion
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (crop) {
      formData.append('crop', JSON.stringify(crop));
    }

    const response = await api.post<UploadResponse>(
      `/api/branding/assets/upload?asset_type=${assetType}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Upload a logo and generate all variants
   * @param file - The logo image file
   * @param variant - 'light' or 'dark' theme variant
   * @param crop - Optional crop region
   */
  async uploadLogo(
    file: File,
    variant: 'light' | 'dark' = 'light',
    crop?: CropRegion
  ): Promise<UploadResponse> {
    const assetType: AssetType = variant === 'dark' ? 'logo_dark' : 'logo_light';
    return this.uploadImage(file, assetType, crop);
  },

  /**
   * Upload a favicon/icon and generate all sizes
   * @param file - The icon image file (should be square)
   * @param crop - Optional crop region
   */
  async uploadFavicon(file: File, crop?: CropRegion): Promise<UploadResponse> {
    return this.uploadImage(file, 'favicon', crop);
  },

  /**
   * Upload an app icon and generate PWA/Apple touch icons
   * @param file - The icon image file (should be square, at least 512x512)
   * @param crop - Optional crop region
   */
  async uploadAppIcon(file: File, crop?: CropRegion): Promise<UploadResponse> {
    return this.uploadImage(file, 'app_icon', crop);
  },

  /**
   * Get a branding asset URL
   * @param tenantId - Tenant ID
   * @param filename - Asset filename
   */
  getAssetUrl(tenantId: string, filename: string): string {
    return `${API_BASE_URL}/api/branding/assets/${tenantId}/${filename}`;
  },

  /**
   * List all branding assets for a tenant
   * @param tenantId - Tenant ID
   */
  async listAssets(tenantId: string): Promise<ListAssetsResponse> {
    const response = await api.get<ListAssetsResponse>(
      `/api/branding/assets/${tenantId}`
    );
    return response.data;
  },

  /**
   * Delete all branding assets for a tenant
   * @param tenantId - Tenant ID
   */
  async deleteAssets(tenantId: string): Promise<void> {
    await api.delete(`/api/branding/assets/${tenantId}`);
  },

  /**
   * Save branding configuration to theme settings
   * @param config - Branding configuration
   */
  async saveBrandingConfig(config: BrandingConfig): Promise<void> {
    const storeId = localStorage.getItem('store_id') || 'default';
    
    const themePayload = {
      scope: 'store',
      storeId,
      theme: {
        ...(config.logoLight && { logoLight: config.logoLight }),
        ...(config.logoDark && { logoDark: config.logoDark }),
        ...(config.favicon && { favicon: config.favicon }),
        ...(config.icon && { icon: config.icon }),
        ...(config.accentColor && { 
          accent: {
            '500': config.accentColor,
            '600': darkenColor(config.accentColor),
          }
        }),
      },
    };

    await api.post('/api/theme', themePayload);
  },

  /**
   * Get current branding configuration
   */
  async getBrandingConfig(): Promise<BrandingConfig> {
    const storeId = localStorage.getItem('store_id') || 'default';
    const response = await api.get('/api/theme', {
      params: { storeId },
    });
    
    const theme = response.data;
    return {
      logoLight: theme.logoLight,
      logoDark: theme.logoDark,
      favicon: theme.favicon,
      icon: theme.icon,
      accentColor: theme.accent?.['500'],
    };
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number = 15): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp'];
  
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Supported formats: PNG, JPEG, WebP, GIF, BMP',
    };
  }

  // Max 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB',
    };
  }

  return { valid: true };
}

/**
 * Load image dimensions from file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default brandingApi;

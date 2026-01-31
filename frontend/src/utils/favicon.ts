/**
 * Dynamic Favicon and Title Management
 * 
 * Manages favicon, app icons, and page title based on configuration
 */

export interface FaviconConfig {
  favicon?: string;
  icon?: string;
  appleTouchIcon?: string;
  title?: string;
}

/**
 * Update the page favicon and related icons
 */
export function updateFavicon(config: FaviconConfig): void {
  // Update favicon
  if (config.favicon) {
    updateLinkTag('icon', config.favicon, 'image/png');
  }

  // Update app icon (for PWA/mobile)
  if (config.icon) {
    updateLinkTag('apple-touch-icon', config.icon);
  }

  // Update page title
  if (config.title) {
    document.title = config.title;
  }
}

/**
 * Update or create a link tag in the document head
 */
function updateLinkTag(rel: string, href: string, type?: string): void {
  // Remove existing link tag
  const existing = document.querySelector(`link[rel="${rel}"]`);
  if (existing) {
    existing.remove();
  }

  // Create new link tag
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (type) {
    link.type = type;
  }

  // Add to document head
  document.head.appendChild(link);
}

/**
 * Configuration type for branding settings
 */
interface BrandingConfig {
  branding?: {
    company?: {
      favicon?: string;
      icon?: string;
      logo?: string;
      name?: string;
    };
  };
}

/**
 * Get favicon URL from configuration with fallbacks
 */
export function getFaviconUrl(config: BrandingConfig | null | undefined): string {
  // Try configuration favicon first
  if (config?.branding?.company?.favicon) {
    return config.branding.company.favicon;
  }

  // Fallback to default
  return '/assets/icons/favicon.png';
}

/**
 * Get app icon URL from configuration with fallbacks
 */
export function getAppIconUrl(config: BrandingConfig | null | undefined): string {
  // Try configuration icon first
  if (config?.branding?.company?.icon && typeof config.branding.company.icon === 'string') {
    return config.branding.company.icon;
  }

  // Try logo as fallback
  if (config?.branding?.company?.logo) {
    return config.branding.company.logo;
  }

  // Fallback to default
  return '/assets/icons/icon.png';
}

/**
 * Get page title from configuration with fallbacks
 */
export function getPageTitle(config: BrandingConfig | null | undefined): string {
  // Try configuration company name first
  if (config?.branding?.company?.name) {
    return config.branding.company.name;
  }

  // Fallback to default
  return 'EasySale';
}

/**
 * Initialize favicon system with configuration
 */
export function initializeFavicon(config: BrandingConfig | null | undefined): void {
  const faviconConfig: FaviconConfig = {
    favicon: getFaviconUrl(config),
    icon: getAppIconUrl(config),
    title: getPageTitle(config),
  };

  updateFavicon(faviconConfig);
}

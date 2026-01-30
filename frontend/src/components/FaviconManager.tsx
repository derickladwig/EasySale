/**
 * FaviconManager Component
 * 
 * Dynamically manages the browser favicon based on branding configuration.
 * Updates the favicon link elements when branding changes.
 * 
 * Features:
 * - Loads favicon from branding config
 * - Falls back to default if not configured
 * - Updates Apple touch icon
 * - Supports theme-aware icons (light/dark)
 */

import { useEffect, useRef } from 'react';
import { useConfig } from '../config/ConfigProvider';

interface FaviconManagerProps {
  /** Default favicon path if none configured */
  defaultFavicon?: string;
  /** Default Apple touch icon path */
  defaultAppleTouchIcon?: string;
}

/**
 * Updates the favicon and related icons based on branding configuration
 */
export function FaviconManager({
  defaultFavicon = '/assets/icons/favicon.png',
  defaultAppleTouchIcon = '/assets/icons/icon.png',
}: FaviconManagerProps) {
  const { branding } = useConfig();
  const previousFavicon = useRef<string | null>(null);

  useEffect(() => {
    // Get favicon URL from branding or use default
    const faviconUrl = branding?.company?.favicon || defaultFavicon;
    const appleTouchUrl = branding?.company?.icon || defaultAppleTouchIcon;

    // Skip if favicon hasn't changed
    if (previousFavicon.current === faviconUrl) {
      return;
    }
    previousFavicon.current = faviconUrl;

    // Update favicon link
    updateLinkElement('icon', faviconUrl, 'image/png');
    
    // Update Apple touch icon
    updateLinkElement('apple-touch-icon', appleTouchUrl, 'image/png');

    // Update shortcut icon (for older browsers)
    updateLinkElement('shortcut icon', faviconUrl, 'image/png');

  }, [branding, defaultFavicon, defaultAppleTouchIcon]);

  // This component doesn't render anything
  return null;
}

/**
 * Update or create a link element in the document head
 */
function updateLinkElement(rel: string, href: string, type: string) {
  // Find existing link element
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (link) {
    // Update existing link
    link.href = href;
    link.type = type;
  } else {
    // Create new link element
    link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    link.type = type;
    document.head.appendChild(link);
  }
}

/**
 * Hook to get the current favicon URL
 */
export function useFavicon(): string {
  const { branding } = useConfig();
  return branding?.company?.favicon || '/assets/icons/favicon.png';
}

/**
 * Hook to get the current icon URL
 */
export function useIcon(): string {
  const { branding } = useConfig();
  return branding?.company?.icon || '/assets/icons/icon.png';
}

/**
 * Programmatically set the favicon
 * Useful for temporary favicon changes (e.g., notifications)
 */
export function setFavicon(url: string) {
  updateLinkElement('icon', url, 'image/png');
  updateLinkElement('shortcut icon', url, 'image/png');
}

/**
 * Set a notification badge on the favicon
 * Creates a canvas with the favicon and a badge overlay
 */
export function setFaviconBadge(count: number, faviconUrl: string) {
  if (count <= 0) {
    // Reset to original favicon
    setFavicon(faviconUrl);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Draw original favicon
    ctx.drawImage(img, 0, 0, 32, 32);

    // Draw badge circle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(24, 8, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Draw badge text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count > 9 ? '9+' : count.toString(), 24, 8);

    // Update favicon
    const dataUrl = canvas.toDataURL('image/png');
    setFavicon(dataUrl);
  };
  img.src = faviconUrl;
}

export default FaviconManager;

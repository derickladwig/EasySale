/**
 * ARIA Announcements Hook
 *
 * Provides screen reader announcements for status changes and important events.
 * Ensures all interactive elements have proper ARIA labels.
 *
 * Validates Requirements 10.3, 10.6
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

type AnnounceType = 'polite' | 'assertive';

interface AriaAnnouncementsOptions {
  /**
   * Whether announcements are enabled
   */
  enabled?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useAriaAnnouncements({ enabled = true }: AriaAnnouncementsOptions = {}) {
  const politeRegionRef = useRef<HTMLDivElement | null>(null);
  const assertiveRegionRef = useRef<HTMLDivElement | null>(null);

  /**
   * Initialize ARIA live regions
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Create polite live region if it doesn't exist
    if (!politeRegionRef.current) {
      const politeRegion = document.createElement('div');
      politeRegion.setAttribute('role', 'status');
      politeRegion.setAttribute('aria-live', 'polite');
      politeRegion.setAttribute('aria-atomic', 'true');
      politeRegion.style.position = 'absolute';
      politeRegion.style.left = '-10000px';
      politeRegion.style.width = '1px';
      politeRegion.style.height = '1px';
      politeRegion.style.overflow = 'hidden';
      document.body.appendChild(politeRegion);
      politeRegionRef.current = politeRegion;
    }

    // Create assertive live region if it doesn't exist
    if (!assertiveRegionRef.current) {
      const assertiveRegion = document.createElement('div');
      assertiveRegion.setAttribute('role', 'alert');
      assertiveRegion.setAttribute('aria-live', 'assertive');
      assertiveRegion.setAttribute('aria-atomic', 'true');
      assertiveRegion.style.position = 'absolute';
      assertiveRegion.style.left = '-10000px';
      assertiveRegion.style.width = '1px';
      assertiveRegion.style.height = '1px';
      assertiveRegion.style.overflow = 'hidden';
      document.body.appendChild(assertiveRegion);
      assertiveRegionRef.current = assertiveRegion;
    }

    // Cleanup on unmount
    return () => {
      if (politeRegionRef.current) {
        document.body.removeChild(politeRegionRef.current);
        politeRegionRef.current = null;
      }
      if (assertiveRegionRef.current) {
        document.body.removeChild(assertiveRegionRef.current);
        assertiveRegionRef.current = null;
      }
    };
  }, [enabled]);

  /**
   * Announce a message to screen readers
   */
  const announce = useCallback(
    (message: string, type: AnnounceType = 'polite') => {
      if (!enabled) {
        return;
      }

      const region = type === 'assertive' ? assertiveRegionRef.current : politeRegionRef.current;

      if (region) {
        // Clear the region first to ensure the announcement is read
        region.textContent = '';

        // Use setTimeout to ensure the screen reader picks up the change
        setTimeout(() => {
          region.textContent = message;
        }, 100);
      }
    },
    [enabled]
  );

  /**
   * Announce a polite message (doesn't interrupt current speech)
   */
  const announcePolite = useCallback(
    (message: string) => {
      announce(message, 'polite');
    },
    [announce]
  );

  /**
   * Announce an assertive message (interrupts current speech)
   */
  const announceAssertive = useCallback(
    (message: string) => {
      announce(message, 'assertive');
    },
    [announce]
  );

  return {
    announce,
    announcePolite,
    announceAssertive,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate ARIA label for authentication method
 */
export function getAuthMethodAriaLabel(method: string): string {
  const labels: Record<string, string> = {
    pin: 'Enter your PIN code',
    password: 'Enter your password',
    badge: 'Scan your badge',
  };
  return labels[method] || `Enter your ${method}`;
}

/**
 * Generate ARIA label for status indicator
 */
export function getStatusAriaLabel(status: string, label: string): string {
  const statusLabels: Record<string, string> = {
    online: 'Online',
    offline: 'Offline',
    syncing: 'Syncing',
    error: 'Error',
  };
  const statusText = statusLabels[status] || status;
  return `${label}: ${statusText}`;
}

/**
 * Generate ARIA label for form field
 */
export function getFieldAriaLabel(
  fieldName: string,
  isRequired: boolean = false,
  error?: string
): string {
  let label = fieldName;
  if (isRequired) {
    label += ', required';
  }
  if (error) {
    label += `, error: ${error}`;
  }
  return label;
}

/**
 * Generate ARIA description for button
 */
export function getButtonAriaDescription(action: string, context?: string): string {
  if (context) {
    return `${action} ${context}`;
  }
  return action;
}

// ============================================================================
// Exports
// ============================================================================

export type { AnnounceType, AriaAnnouncementsOptions };

/**
 * Feature Status Types
 * 
 * Centralized type definitions for feature availability status.
 * Used by tabs, navigation items, and capability-gated UI elements.
 * 
 * Requirements:
 * - Ready: Feature is fully implemented and available
 * - Beta: Feature is available but may have rough edges
 * - ComingSoon: Feature is planned but not yet implemented
 * - Hidden: Feature is not shown at all (for truly not-started features)
 */

export type FeatureStatus = 'ready' | 'beta' | 'comingSoon' | 'hidden';

/**
 * Tab definition with feature status support
 */
export interface TabDef {
  /** Unique identifier for the tab */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon (Lucide icon component) */
  icon?: React.ReactNode;
  /** Feature availability status */
  status: FeatureStatus;
  /** Route path (only for ready/beta tabs) */
  route?: string;
  /** Tooltip/modal hint for coming soon features */
  hint?: string;
  /** Optional badge count */
  badge?: number;
  /** Optional capability requirement from backend */
  capability?: string;
}

/**
 * Navigation item with feature status
 */
export interface NavItemDef {
  id: string;
  label: string;
  icon: string;
  path?: string;
  status: FeatureStatus;
  hint?: string;
  permission?: string;
  capability?: string;
  badge?: number;
  badgeKey?: string;
}

/**
 * Check if a feature status allows navigation
 */
export function isNavigable(status: FeatureStatus): boolean {
  return status === 'ready' || status === 'beta';
}

/**
 * Check if a feature should be visible
 */
export function isVisible(status: FeatureStatus): boolean {
  return status !== 'hidden';
}

/**
 * Get status badge label
 */
export function getStatusBadgeLabel(status: FeatureStatus): string | null {
  switch (status) {
    case 'beta':
      return 'Beta';
    case 'comingSoon':
      return 'Coming Soon';
    default:
      return null;
  }
}

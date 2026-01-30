/**
 * NavItem - Standardized navigation item component
 * 
 * Features:
 * - Increased hit target height (44-48px)
 * - Active state: strong background + left accent bar
 * - Icons: consistent size + alignment
 * - Keyboard focus ring visible
 * - Text contrast increased (tokens)
 * - Status badges for beta/comingSoon
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { FeatureStatus } from './navConfig';

// ============================================
// Types
// ============================================

export interface NavItemProps {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Route path */
  route: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Feature status for gating */
  featureStatus: FeatureStatus;
  /** Tooltip for non-ready items */
  tooltip?: string;
  /** Whether sidebar is collapsed */
  isCollapsed?: boolean;
  /** Badge count (optional) */
  badge?: number;
  /** Click handler for non-ready items */
  onComingSoonClick?: () => void;
}

// ============================================
// Status Badge
// ============================================

const StatusBadge: React.FC<{ status: FeatureStatus; collapsed?: boolean }> = ({ 
  status, 
  collapsed 
}) => {
  if (status === 'ready' || status === 'hidden') return null;
  if (collapsed) return null;

  const styles = {
    beta: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    comingSoon: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };

  const labels = {
    beta: 'β',
    comingSoon: '🔒',
  };

  return (
    <span className={`ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// ============================================
// Count Badge
// ============================================

const CountBadge: React.FC<{ count: number; collapsed?: boolean }> = ({ count, collapsed }) => {
  if (count <= 0) return null;

  if (collapsed) {
    return (
      <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
    );
  }

  return (
    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-500 text-white min-w-[18px] text-center">
      {count > 99 ? '99+' : count}
    </span>
  );
};

// ============================================
// Main Component
// ============================================

export const NavItem: React.FC<NavItemProps> = ({
  id: _id,
  label,
  route,
  icon: Icon,
  featureStatus,
  tooltip,
  isCollapsed = false,
  badge,
  onComingSoonClick,
}) => {
  // Don't render hidden items
  if (featureStatus === 'hidden') return null;

  const isDisabled = featureStatus === 'comingSoon';

  // Base classes for all states
  const baseClasses = `
    relative flex items-center gap-3 w-full
    min-h-[44px] px-3 py-2.5
    rounded-lg transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
    ${isCollapsed ? 'justify-center px-2' : ''}
  `;

  // Active state classes
  const activeClasses = `
    bg-blue-50 dark:bg-blue-900/30
    text-blue-700 dark:text-blue-300
    font-semibold
    before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
    before:w-1 before:h-6 before:bg-blue-500 before:rounded-r-full
  `;

  // Inactive state classes
  const inactiveClasses = `
    text-gray-700 dark:text-gray-300
    hover:bg-gray-100 dark:hover:bg-gray-800
    hover:text-gray-900 dark:hover:text-white
  `;

  // Disabled state classes
  const disabledClasses = `
    text-gray-400 dark:text-gray-500
    cursor-not-allowed
    opacity-60
  `;

  // Handle click for coming soon items
  const handleClick = (e: React.MouseEvent) => {
    if (isDisabled) {
      e.preventDefault();
      onComingSoonClick?.();
    }
  };

  // Render as button for disabled items, NavLink for active items
  if (isDisabled) {
    return (
      <button
        className={`${baseClasses} ${disabledClasses}`}
        onClick={handleClick}
        title={tooltip || `${label} - Coming Soon`}
        aria-disabled="true"
      >
        <Icon 
          className={`shrink-0 ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} 
          aria-hidden="true" 
        />
        {!isCollapsed && (
          <>
            <span className="truncate">{label}</span>
            <StatusBadge status={featureStatus} collapsed={isCollapsed} />
          </>
        )}
      </button>
    );
  }

  return (
    <NavLink
      to={route}
      className={({ isActive }) => `
        ${baseClasses}
        ${isActive ? activeClasses : inactiveClasses}
      `}
      title={isCollapsed ? label : tooltip}
      onClick={handleClick}
    >
      {({ isActive }) => (
        <>
          <Icon 
            className={`shrink-0 ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} ${
              isActive ? 'text-blue-600 dark:text-blue-400' : ''
            }`} 
            aria-hidden="true" 
          />
          {!isCollapsed && (
            <>
              <span className="truncate">{label}</span>
              {badge !== undefined && badge > 0 ? (
                <CountBadge count={badge} collapsed={isCollapsed} />
              ) : (
                <StatusBadge status={featureStatus} collapsed={isCollapsed} />
              )}
            </>
          )}
          {isCollapsed && badge !== undefined && badge > 0 && (
            <CountBadge count={badge} collapsed={isCollapsed} />
          )}
        </>
      )}
    </NavLink>
  );
};

export default NavItem;

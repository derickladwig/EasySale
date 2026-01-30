/**
 * NavGroup - Collapsible navigation group component
 * 
 * Features:
 * - Clean collapse/expand animation
 * - Keyboard accessible
 * - Remembers collapsed state
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface NavGroupProps {
  /** Group identifier */
  id: string;
  /** Group label */
  label: string;
  /** Whether group is collapsible */
  collapsible: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Whether sidebar is collapsed */
  isSidebarCollapsed?: boolean;
  /** Children nav items */
  children: React.ReactNode;
}

// ============================================
// Main Component
// ============================================

export const NavGroup: React.FC<NavGroupProps> = ({
  id,
  label,
  collapsible,
  defaultCollapsed = false,
  isSidebarCollapsed = false,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = useCallback(() => {
    if (collapsible) {
      setIsCollapsed((prev) => !prev);
    }
  }, [collapsible]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCollapse();
    }
  }, [toggleCollapse]);

  // Don't show group header when sidebar is collapsed
  if (isSidebarCollapsed) {
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <div className="mb-2">
      {/* Group Header */}
      {collapsible ? (
        <button
          className={`
            w-full flex items-center justify-between
            px-3 py-2 text-xs font-semibold uppercase tracking-wider
            text-gray-500 dark:text-gray-400
            hover:text-gray-700 dark:hover:text-gray-300
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            rounded-md transition-colors
          `}
          onClick={toggleCollapse}
          onKeyDown={handleKeyDown}
          aria-expanded={!isCollapsed}
          aria-controls={`nav-group-${id}`}
        >
          <span>{label}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      ) : (
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </div>
      )}

      {/* Group Content */}
      <div
        id={`nav-group-${id}`}
        className={`
          space-y-1 overflow-hidden transition-all duration-200
          ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}
        `}
        aria-hidden={isCollapsed}
      >
        {children}
      </div>
    </div>
  );
};

export default NavGroup;

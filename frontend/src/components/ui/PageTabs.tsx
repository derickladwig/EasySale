/**
 * PageTabs - Standardized tab component for page-level navigation
 * 
 * Features:
 * - Segmented pills with larger padding
 * - Bold active label with subtle underline/background
 * - Optional badge counts
 * - Status badges (beta/comingSoon)
 * - Consistent hover/focus outline
 * - Minimum contrast in dark mode (token-based)
 * 
 * Usage:
 * ```tsx
 * <PageTabs
 *   tabs={[
 *     { id: 'summary', label: 'Summary' },
 *     { id: 'cleanup', label: 'Cleanup', badge: 3 },
 *     { id: 'extraction', label: 'Extraction', status: 'beta' },
 *   ]}
 *   activeTab="summary"
 *   onTabChange={(id) => setActiveTab(id)}
 * />
 * ```
 */

import React from 'react';

// ============================================
// Types
// ============================================

export type TabStatus = 'ready' | 'beta' | 'comingSoon' | 'hidden';

export interface TabDefinition {
  /** Unique identifier for the tab */
  id: string;
  /** Display label */
  label: string;
  /** Optional badge count */
  badge?: number;
  /** Tab status for gating */
  status?: TabStatus;
  /** Tooltip text for non-ready tabs */
  tooltip?: string;
  /** Icon component (optional) */
  icon?: React.ReactNode;
  /** Whether tab is disabled */
  disabled?: boolean;
}

export interface PageTabsProps {
  /** Tab definitions */
  tabs: TabDefinition[];
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tabId: string) => void;
  /** Visual variant */
  variant?: 'pills' | 'underline' | 'segmented';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Status Badge Component
// ============================================

const StatusBadge: React.FC<{ status: TabStatus }> = ({ status }) => {
  if (status === 'ready' || status === 'hidden') return null;

  const styles = {
    beta: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    comingSoon: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  };

  const labels = {
    beta: 'Beta',
    comingSoon: 'Soon',
  };

  return (
    <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// ============================================
// Count Badge Component
// ============================================

const CountBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;

  return (
    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-500 text-white min-w-[18px] text-center">
      {count > 99 ? '99+' : count}
    </span>
  );
};

// ============================================
// Main Component
// ============================================

export const PageTabs: React.FC<PageTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'pills',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  // Filter out hidden tabs
  const visibleTabs = tabs.filter((tab) => tab.status !== 'hidden');

  // Size classes
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  // Container classes based on variant
  const containerClasses = {
    pills: 'inline-flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg',
    underline: 'inline-flex gap-0 border-b border-gray-200 dark:border-gray-700',
    segmented: 'inline-flex gap-0 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg',
  };

  // Tab classes based on variant and state
  const getTabClasses = (tab: TabDefinition, isActive: boolean) => {
    const base = `
      relative flex items-center justify-center font-medium transition-all duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
      ${sizeClasses[size]}
      ${fullWidth ? 'flex-1' : ''}
    `;

    const disabled = tab.disabled || tab.status === 'comingSoon';

    if (disabled) {
      return `${base} cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500`;
    }

    switch (variant) {
      case 'pills':
        return isActive
          ? `${base} bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm rounded-md font-semibold`
          : `${base} text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-md`;

      case 'underline':
        return isActive
          ? `${base} text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-px font-semibold`
          : `${base} text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 -mb-px`;

      case 'segmented':
        return isActive
          ? `${base} bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm rounded-md font-semibold`
          : `${base} text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md`;

      default:
        return base;
    }
  };

  const handleTabClick = (tab: TabDefinition) => {
    if (tab.disabled || tab.status === 'comingSoon') {
      // Could show a modal or tooltip here
      return;
    }
    onTabChange(tab.id);
  };

  return (
    <div
      className={`${containerClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      role="tablist"
      aria-label="Page tabs"
    >
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled || tab.status === 'comingSoon';

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            tabIndex={isDisabled ? -1 : 0}
            className={getTabClasses(tab, isActive)}
            onClick={() => handleTabClick(tab)}
            title={tab.tooltip}
          >
            {/* Icon */}
            {tab.icon && <span className="mr-1.5">{tab.icon}</span>}

            {/* Label */}
            <span>{tab.label}</span>

            {/* Count Badge */}
            {tab.badge !== undefined && <CountBadge count={tab.badge} />}

            {/* Status Badge */}
            {tab.status && <StatusBadge status={tab.status} />}

            {/* Active indicator for underline variant */}
            {variant === 'underline' && isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ============================================
// Exports
// ============================================

export default PageTabs;

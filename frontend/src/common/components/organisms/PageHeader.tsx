import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';
import { Tabs, TabItem } from './Tabs';

export interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: React.ReactNode;
  description?: string;
  className?: string;
}

/**
 * PageHeader component for page titles and navigation
 *
 * Features:
 * - Breadcrumbs for navigation hierarchy
 * - Page title and description
 * - Action buttons (top-right)
 * - Tabs for sub-navigation
 * - Responsive behavior (stack on mobile)
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbs,
  tabs,
  activeTab,
  onTabChange,
  actions,
  description,
  className = '',
}) => {
  return (
    <div className={`bg-background-primary border-b border-border ${className}`}>
      <div className="px-4 py-4 md:px-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-3">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        {/* Title and Actions */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary truncate">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-text-secondary line-clamp-2">{description}</p>
            )}
          </div>

          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && onTabChange && (
        <div className="px-4 md:px-6">
          <Tabs
            items={tabs}
            activeTab={activeTab || ''}
            onTabChange={onTabChange}
            variant="horizontal"
          />
        </div>
      )}
    </div>
  );
};

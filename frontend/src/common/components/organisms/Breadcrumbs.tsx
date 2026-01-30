import React from 'react';
import { Icon } from '../atoms/Icon';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  className?: string;
}

/**
 * Breadcrumbs component for showing navigation hierarchy
 *
 * Features:
 * - Shows current location hierarchy
 * - Clickable links for navigation
 * - Customizable separator
 * - Truncation for long paths
 * - Responsive design
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator,
  maxItems,
  className = '',
}) => {
  // Truncate items if maxItems is specified
  const displayItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return items;
    }

    // Show first item, ellipsis, and last (maxItems - 1) items
    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 1));

    return [firstItem, { label: '...', path: undefined }, ...lastItems];
  }, [items, maxItems]);

  const defaultSeparator = <Icon icon={ChevronRight} size="xs" className="text-text-tertiary" />;

  const handleItemClick = (item: BreadcrumbItem, index: number) => {
    // Don't navigate if it's the last item (current page)
    if (index === displayItems.length - 1) {
      return;
    }

    if (item.onClick) {
      item.onClick();
    }
  };

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center ${className}`}>
      <ol className="flex items-center flex-wrap gap-2">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {isEllipsis ? (
                <span className="text-text-tertiary text-sm">...</span>
              ) : isLast ? (
                <span
                  className="text-text-primary text-sm font-medium truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={() => handleItemClick(item, index)}
                  className="text-primary-400 hover:text-primary-300 text-sm transition-colors truncate max-w-[200px]"
                >
                  {item.label}
                </button>
              )}

              {!isLast && <span aria-hidden="true">{separator || defaultSeparator}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

import React from 'react';
import { LucideIcon, MoreHorizontal } from 'lucide-react';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  badge?: string | number;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  activeItem?: string;
  maxVisibleItems?: number;
  onMoreClick?: () => void;
  className?: string;
}

/**
 * BottomNav component for mobile navigation
 *
 * Features:
 * - Fixed bottom positioning for mobile
 * - Icon + label for each item (consistent 24px icons)
 * - Active state highlighting with blue accent
 * - Hover states with subtle background change
 * - Badge support for notifications
 * - Overflow handling with "More" button
 * - Limited to 4-5 items with overflow
 * - Smooth transitions (300ms)
 */
export const BottomNav: React.FC<BottomNavProps> = ({
  items,
  activeItem,
  maxVisibleItems = 4,
  onMoreClick,
  className = '',
}) => {
  // Split items into visible and overflow
  const visibleItems = React.useMemo(() => {
    if (items.length <= maxVisibleItems) {
      return items;
    }
    return items.slice(0, maxVisibleItems - 1);
  }, [items, maxVisibleItems]);

  const hasOverflow = items.length > maxVisibleItems;

  const handleItemClick = (item: BottomNavItem) => {
    if (item.onClick) {
      item.onClick();
    }
  };

  const renderNavItem = (item: BottomNavItem) => {
    const isActive = activeItem === item.id;
    const IconComponent = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        className={`
          flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200
          active:scale-95 active:bg-surface-base
          ${isActive ? 'text-primary-400' : 'text-text-secondary hover:text-primary-400 hover:bg-surface-base'}
        `}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
      >
        <div className="relative">
          <IconComponent size={24} className="flex-shrink-0" />
          {item.badge !== undefined && Number(item.badge) > 0 && (
            <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 text-[10px] font-semibold rounded-full bg-error-500 text-white flex items-center justify-center">
              {Number(item.badge) > 99 ? '99+' : item.badge}
            </span>
          )}
        </div>
        <span className="text-xs font-medium truncate max-w-full px-1">{item.label}</span>
      </button>
    );
  };

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 bg-background-primary border-t border-border z-50
        md:hidden
        ${className}
      `}
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch">
        {visibleItems.map(renderNavItem)}

        {hasOverflow && (
          <button
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-text-secondary transition-all duration-200 hover:text-primary-400 hover:bg-surface-base active:scale-95 active:bg-surface-base"
            aria-label="More options"
          >
            <MoreHorizontal size={24} className="flex-shrink-0" />
            <span className="text-xs font-medium">More</span>
          </button>
        )}
      </div>
    </nav>
  );
};

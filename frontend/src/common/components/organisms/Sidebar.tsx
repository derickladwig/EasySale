import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/classNames';
import { Badge } from '../atoms/Badge';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  onClick?: () => void;
  badge?: number;
  /** Optional section header - if set, this item acts as a group header */
  isHeader?: boolean;
}

export interface SidebarProps {
  /** Navigation items to display */
  items: NavItem[];
  /** Currently active item ID */
  activeItemId?: string;
  /** Whether the sidebar is open (mobile/tablet) */
  isOpen?: boolean;
  /** Whether the sidebar is collapsed (tablet) */
  isCollapsed?: boolean;
  /** Callback when an item is clicked */
  onItemClick?: (item: NavItem) => void;
  /** Store information to display at bottom */
  storeInfo?: {
    name: string;
    station: string;
  };
  /** Whether to show the sidebar (desktop: always, mobile: controlled) */
  className?: string;
}

/**
 * Sidebar component for navigation
 *
 * Features:
 * - Navigation items with icons (consistent 20px size)
 * - Active state with left accent bar + filled background pill
 * - Hover states with subtle background glow
 * - Badge support for notifications
 * - Store information at bottom
 * - Touch-friendly hit targets (44px min height)
 * - Responsive behavior:
 *   - Desktop (lg+): Full width sidebar (224px)
 *   - Tablet (md-lg): Collapsible sidebar (64px collapsed, 224px expanded)
 *   - Mobile (<md): Hidden, replaced by bottom navigation
 * - Smooth transitions (200ms)
 * - Focus states for keyboard navigation
 */
export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItemId,
  isOpen = false,
  isCollapsed = false,
  onItemClick,
  storeInfo,
  className = '',
}) => {
  return (
    <aside
      className={cn(
        'flex-shrink-0 bg-surface-base flex flex-col',
        // Subtle right border
        'border-r border-border/50',
        // Width: full (224px) when expanded, collapsed (64px) on tablet when collapsed
        'transition-all duration-200 ease-out',
        isCollapsed ? 'w-16' : 'w-56',
        // Mobile: fixed overlay, hidden by default
        'fixed md:static inset-y-0 left-0 top-14 md:top-0',
        'md:translate-x-0',
        // Mobile: slide in/out based on isOpen
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        className
      )}
      style={{ zIndex: 'var(--z-sidebar)' }}
    >
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItemId === item.id;
          
          // Render section header
          if (item.isHeader) {
            return (
              <div
                key={item.id}
                className={cn(
                  'px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-text-muted',
                  isCollapsed && 'hidden'
                )}
              >
                {item.label}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className={cn(
                // Base styles - larger hit targets for POS
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                'min-h-[44px] transition-all duration-200 text-sm relative',
                // Focus state for keyboard navigation
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
                // Active press feedback
                'active:scale-[0.98]',
                
                // Active state - filled pill with left accent
                isActive && [
                  'bg-primary-600/15 text-primary-400',
                  // Left accent bar
                  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                  'before:w-1 before:h-6 before:bg-primary-500 before:rounded-r-full',
                ],
                
                // Inactive state
                !isActive && [
                  'text-text-secondary',
                  'hover:bg-surface-elevated hover:text-text-primary',
                ],
                
                // Center icon when collapsed
                isCollapsed && 'justify-center px-0'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon 
                size={20} 
                className={cn(
                  'flex-shrink-0 transition-colors duration-200',
                  isActive ? 'text-primary-400' : 'text-text-tertiary group-hover:text-text-secondary'
                )} 
              />
              {!isCollapsed && (
                <>
                  <span className={cn(
                    'font-medium flex-1 transition-colors duration-200',
                    isActive && 'text-primary-300'
                  )}>
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge 
                      variant="error" 
                      size="sm" 
                      count={item.badge}
                      className="ml-auto"
                    />
                  )}
                </>
              )}
              {/* Show badge dot when collapsed */}
              {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full ring-2 ring-surface-base" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Store info at bottom - hide when collapsed */}
      {!isCollapsed && storeInfo && (
        <div className="p-3 border-t border-border/30 bg-surface-secondary/30">
          <div className="text-xs">
            <div className="font-medium text-text-secondary truncate">{storeInfo.name}</div>
            <div className="text-text-muted truncate">Station: {storeInfo.station}</div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

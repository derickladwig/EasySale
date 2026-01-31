import React, { useState } from 'react';
import { LucideIcon, Lock, Sparkles } from 'lucide-react';
import { cn } from '../../utils/classNames';
import type { FeatureStatus } from '../../types/featureStatus';
import { isNavigable, isVisible, getStatusBadgeLabel } from '../../types/featureStatus';

export interface PageTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  status?: FeatureStatus;
  hint?: string;
  badge?: number;
  route?: string;
}

export interface PageTabsProps {
  items: PageTabItem[];
  activeTab: string;
  onTabChange: (tabId: string, route?: string) => void;
  className?: string;
}

/**
 * PageTabs - Enhanced tab component for page sub-navigation
 * 
 * Features:
 * - Pill-style tabs in a subtle container
 * - Feature status support (ready, beta, comingSoon, hidden)
 * - Coming soon tabs show lock icon and tooltip
 * - Beta tabs show sparkle badge
 * - Badge counts for notifications
 * - Touch-friendly sizing (44px min height)
 * - Keyboard navigation
 */
export const PageTabs: React.FC<PageTabsProps> = ({
  items,
  activeTab,
  onTabChange,
  className = '',
}) => {
  const [tooltipTab, setTooltipTab] = useState<string | null>(null);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Filter out hidden items
  const visibleItems = items.filter(item => isVisible(item.status ?? 'ready'));

  const handleTabClick = (item: PageTabItem) => {
    const status = item.status ?? 'ready';
    
    if (!isNavigable(status)) {
      // Show tooltip for coming soon tabs
      setTooltipTab(item.id);
      setTimeout(() => setTooltipTab(null), 2000);
      return;
    }
    
    onTabChange(item.id, item.route);
  };

  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;

    if (event.key === 'ArrowLeft') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleItems.length - 1;
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      nextIndex = currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0;
      event.preventDefault();
    }

    // Skip non-navigable tabs
    const item = visibleItems[nextIndex];
    while (!isNavigable(item?.status ?? 'ready') && nextIndex !== currentIndex) {
      nextIndex = event.key === 'ArrowLeft'
        ? nextIndex > 0 ? nextIndex - 1 : visibleItems.length - 1
        : nextIndex < visibleItems.length - 1 ? nextIndex + 1 : 0;
    }

    if (nextIndex !== currentIndex && isNavigable(visibleItems[nextIndex]?.status ?? 'ready')) {
      tabRefs.current[nextIndex]?.focus();
      onTabChange(visibleItems[nextIndex].id, visibleItems[nextIndex].route);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Tab container with subtle background */}
      <div 
        role="tablist"
        aria-orientation="horizontal"
        className="inline-flex items-center gap-1 p-1 bg-surface-secondary/50 rounded-lg border border-border/30"
      >
        {visibleItems.map((item, index) => {
          const isActive = activeTab === item.id;
          const status = item.status ?? 'ready';
          const navigable = isNavigable(status);
          const statusBadge = getStatusBadgeLabel(status);
          const Icon = item.icon;
          const showTooltip = tooltipTab === item.id;

          return (
            <div key={item.id} className="relative">
              <button
                ref={(el) => { tabRefs.current[index] = el; }}
                role="tab"
                aria-selected={isActive}
                aria-disabled={!navigable}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleTabClick(item)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  // Base styles - pill shape with good touch targets
                  'flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium',
                  'min-h-[44px] transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                  
                  // Active state - filled pill
                  isActive && navigable && [
                    'bg-primary-600 text-white shadow-sm',
                    'hover:bg-primary-700',
                  ],
                  
                  // Inactive navigable state
                  !isActive && navigable && [
                    'text-text-secondary bg-transparent',
                    'hover:bg-surface-elevated hover:text-text-primary',
                  ],
                  
                  // Coming soon state - disabled appearance
                  !navigable && [
                    'text-text-muted bg-transparent cursor-not-allowed',
                    'opacity-60',
                  ],
                )}
                title={!navigable ? item.hint : undefined}
              >
                {/* Icon */}
                {Icon && (
                  <Icon 
                    size={18} 
                    className={cn(
                      'flex-shrink-0',
                      isActive && navigable ? 'text-white' : 'text-current'
                    )} 
                  />
                )}
                
                {/* Label */}
                <span>{item.label}</span>
                
                {/* Lock icon for coming soon */}
                {status === 'comingSoon' && (
                  <Lock size={14} className="text-text-muted ml-1" />
                )}
                
                {/* Beta badge */}
                {status === 'beta' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-warning-500/20 text-warning-400 rounded">
                    <Sparkles size={10} />
                    Beta
                  </span>
                )}
                
                {/* Count badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full',
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-error-500 text-white'
                  )}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>

              {/* Tooltip for coming soon - uses tooltip z-index token */}
              {showTooltip && item.hint && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2"
                  style={{ zIndex: 'var(--z-tooltip)' }}
                >
                  <div 
                    className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-secondary whitespace-nowrap"
                    style={{ boxShadow: 'var(--shadow-dropdown)' }}
                  >
                    {item.hint}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageTabs;

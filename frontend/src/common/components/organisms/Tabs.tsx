import React from 'react';
import { Icon } from '../atoms/Icon';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export type TabsVariant = 'horizontal' | 'vertical';

export interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: TabsVariant;
  className?: string;
}

/**
 * Tabs component for sub-navigation
 *
 * Features:
 * - Horizontal and vertical variants
 * - Active state highlighting
 * - Icon support
 * - Keyboard navigation (arrow keys)
 * - Disabled state
 * - Horizontal scrolling on mobile when tabs don't fit
 * - Smooth scroll behavior with scroll indicators
 */
export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onTabChange,
  variant = 'horizontal',
  className = '',
}) => {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = React.useState(false);
  const [showRightScroll, setShowRightScroll] = React.useState(false);

  // Check scroll position to show/hide scroll indicators
  const checkScrollPosition = React.useCallback(() => {
    if (!scrollContainerRef.current || variant !== 'horizontal') return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
  }, [variant]);

  // Set up scroll listener and initial check
  React.useEffect(() => {
    if (variant !== 'horizontal') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollPosition();

    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [variant, checkScrollPosition]);

  // Scroll active tab into view when it changes
  React.useEffect(() => {
    if (variant !== 'horizontal') return;

    const activeIndex = items.findIndex((item) => item.id === activeTab);
    if (activeIndex === -1) return;

    const activeTabElement = tabRefs.current[activeIndex];
    if (!activeTabElement || !scrollContainerRef.current) return;

    // Scroll the active tab into view with smooth behavior
    // Check if scrollIntoView is available (not available in some test environments)
    if (typeof activeTabElement.scrollIntoView === 'function') {
      activeTabElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab, items, variant]);

  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;

    if (variant === 'horizontal') {
      if (event.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        event.preventDefault();
      }
    } else {
      if (event.key === 'ArrowUp') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        event.preventDefault();
      }
    }

    // Skip disabled tabs
    while (items[nextIndex]?.disabled && nextIndex !== currentIndex) {
      if (variant === 'horizontal') {
        nextIndex =
          event.key === 'ArrowLeft'
            ? nextIndex > 0
              ? nextIndex - 1
              : items.length - 1
            : nextIndex < items.length - 1
              ? nextIndex + 1
              : 0;
      } else {
        nextIndex =
          event.key === 'ArrowUp'
            ? nextIndex > 0
              ? nextIndex - 1
              : items.length - 1
            : nextIndex < items.length - 1
              ? nextIndex + 1
              : 0;
      }
    }

    if (nextIndex !== currentIndex && !items[nextIndex]?.disabled) {
      tabRefs.current[nextIndex]?.focus();
      onTabChange(items[nextIndex].id);
    }
  };

  const handleTabClick = (item: TabItem) => {
    if (!item.disabled) {
      onTabChange(item.id);
    }
  };

  const isHorizontal = variant === 'horizontal';

  return (
    <div className={`relative ${className}`}>
      {/* Left scroll indicator */}
      {isHorizontal && showLeftScroll && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background-secondary to-transparent z-10 pointer-events-none" />
      )}

      {/* Right scroll indicator */}
      {isHorizontal && showRightScroll && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background-secondary to-transparent z-10 pointer-events-none" />
      )}

      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-orientation={variant}
        className={`
          ${isHorizontal ? 'flex border-b border-border-light overflow-x-auto' : 'flex flex-col border-r border-border-light'}
          ${isHorizontal ? 'scrollbar-thin scrollbar-thumb-border-DEFAULT scrollbar-track-background-primary' : ''}
        `}
        style={
          isHorizontal
            ? {
                scrollbarWidth: 'thin',
                scrollbarColor: '#475569 #1e293b',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
              }
            : undefined
        }
      >
        {items.map((item, index) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              ref={(el) => {
                if (el) tabRefs.current[index] = el;
              }}
              role="tab"
              aria-selected={isActive}
              aria-disabled={item.disabled}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabClick(item)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={item.disabled}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap
                ${isHorizontal ? 'border-b-2 flex-shrink-0' : 'border-r-2'}
                ${
                  isActive
                    ? `${isHorizontal ? 'border-primary-500' : 'border-primary-500'} text-primary-400 bg-background-tertiary`
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
                }
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isHorizontal ? 'min-w-[120px] sm:min-w-0' : ''}
              `}
            >
              {item.icon && (
                <Icon
                  icon={item.icon}
                  size="sm"
                  className={isActive ? 'text-primary-400' : 'text-text-tertiary'}
                />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

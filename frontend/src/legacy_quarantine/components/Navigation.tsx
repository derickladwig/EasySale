/**
 * QUARANTINED: Navigation Component
 * 
 * Original Location: frontend/src/common/components/Navigation.tsx
 * Quarantined: 2026-01-26
 * Reason: Duplicate navigation system - AppLayout already provides navigation
 * Replacement: AppLayout sidebar (already exists)
 * Last Known Routes: Used by HomePage, SellPage via AppShell
 * 
 * This file is preserved per NO DELETES policy.
 * DO NOT import this file in active code.
 * 
 * Features that were merged into AppLayout:
 * - Capability filtering (useCapabilities())
 * - Dynamic badge counts (useDocumentStats())
 * - Badge key support (badgeKey field)
 */

import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../common/contexts/PermissionsContext';
import { navigationItems, filterNavigationByPermissions } from '../config/navigation';
import { Badge } from '../../common/components/atoms/Badge';
import styles from '../styles/Navigation.module.css';
import { useDocumentStats } from '../../features/review/hooks/useReviewApi';
import { useCapabilities } from '../../features/admin/hooks/useCapabilities';

interface NavigationProps {
  variant?: 'sidebar' | 'mobile';
  onNavigate?: () => void;
}

/**
 * Dynamic navigation component that filters menu items based on user permissions and backend capabilities.
 * Supports both sidebar (desktop) and mobile bottom navigation variants.
 * 
 * Features:
 * - Consistent icon sizes (24px)
 * - Active state highlighting using design tokens (accent color, border, background)
 * - Hover states with subtle background change
 * - Badge support for notifications
 * - Smooth transitions using design token durations
 * - Works correctly in both light and dark themes
 * - Capability-driven visibility (items with capability requirements only shown if backend supports them)
 */
export function Navigation({ variant = 'sidebar', onNavigate }: NavigationProps) {
  const { hasPermission } = usePermissions();
  const location = useLocation();
  
  // Fetch dynamic badge counts
  const { data: stats } = useDocumentStats();
  
  // Fetch backend capabilities for capability-driven navigation
  const { data: capabilities } = useCapabilities();

  // Filter navigation items based on user permissions and capabilities
  const visibleItems = filterNavigationByPermissions(navigationItems, hasPermission, capabilities);
  
  // Helper function to get badge count for an item
  const getBadgeCount = (item: typeof navigationItems[0]): number | undefined => {
    if (item.badge !== undefined) {
      return item.badge;
    }
    if (item.badgeKey && stats) {
      return stats[item.badgeKey as keyof typeof stats];
    }
    return undefined;
  };

  if (variant === 'mobile') {
    return (
      <div className={styles.mobileNav}>
        {visibleItems.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.path;
          const badgeCount = getBadgeCount(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
            >
              <span className={styles.navIcon}>
                {item.icon}
              </span>
              <span className={styles.mobileNavLabel}>{item.label}</span>
              {badgeCount !== undefined && badgeCount > 0 && (
                <Badge 
                  variant="error" 
                  size="sm" 
                  count={badgeCount}
                  className={styles.navBadge}
                />
              )}
            </Link>
          );
        })}
        {visibleItems.length > 4 && (
          <button className={styles.mobileNavItem}>
            <span className={styles.navIcon}>⋮</span>
            <span className={styles.mobileNavLabel}>More</span>
          </button>
        )}
      </div>
    );
  }

  // Sidebar variant (desktop)
  return (
    <nav className={styles.sidebarNav}>
      <h2 className={styles.navTitle}>Navigation</h2>
      <ul className={styles.navList}>
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          const badgeCount = getBadgeCount(item);
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={onNavigate}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                title={item.description}
              >
                <span className={styles.navIcon}>
                  {item.icon}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
                {badgeCount !== undefined && badgeCount > 0 && (
                  <Badge 
                    variant="error" 
                    size="sm" 
                    count={badgeCount}
                    className={styles.navBadge}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

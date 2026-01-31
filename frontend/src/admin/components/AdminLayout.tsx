/**
 * AdminLayout Component
 * 
 * Provides a layout shell for admin pages with sub-navigation.
 * This component renders admin sub-navigation items as tabs or side list
 * when the user is on /admin/* routes.
 * 
 * Design Reference: .kiro/specs/navigation-consolidation/design.md
 * Requirements: 4.1
 */

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@common/utils/classNames';
import { usePermissions } from '@common/contexts/PermissionsContext';
import { useCapabilities } from '@common/contexts/CapabilitiesContext';
import { adminSubNavItems, filterNavigationByPermissions, NavigationItem } from '../../config/navigation';
import { DynamicIcon } from '../../config';

/**
 * AdminLayout provides sub-navigation for admin pages.
 * 
 * Features:
 * - Renders admin sub-navigation items from navigation config
 * - Filters items by permission and capability
 * - Highlights active route
 * - Responsive: side list on desktop, horizontal tabs on mobile/tablet
 * - Renders child content via Outlet
 */
export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { capabilities } = useCapabilities();

  // Filter admin sub-navigation items by permissions and capabilities
  const filteredAdminItems = filterNavigationByPermissions(
    adminSubNavItems,
    hasPermission,
    capabilities ?? undefined
  );

  // Determine active item based on current path
  const getIsActive = (item: NavigationItem): boolean => {
    // Exact match for the path
    if (location.pathname === item.path) {
      return true;
    }
    // For nested routes, check if current path starts with item path
    // But only if it's not the base /admin path (to avoid false positives)
    if (item.path !== '/admin' && location.pathname.startsWith(item.path + '/')) {
      return true;
    }
    return false;
  };

  // Handle navigation click
  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background-primary">
      {/* Left Panel - Admin Sub-Navigation (Desktop) */}
      <div className="hidden lg:block lg:w-64 bg-surface-base border-r border-border flex-shrink-0">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-text-primary">Admin</h1>
          <p className="text-text-tertiary text-sm">System administration</p>
        </div>
        <nav className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {filteredAdminItems.map((item) => {
            const isActive = getIsActive(item);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors mb-1',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                )}
                title={item.description}
              >
                <DynamicIcon 
                  name={typeof item.icon === 'string' ? item.icon : undefined} 
                  size={20} 
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div
                    className={cn(
                      'text-xs truncate',
                      isActive ? 'text-primary-200' : 'text-text-tertiary'
                    )}
                  >
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Top Tabs - Admin Sub-Navigation (Mobile/Tablet) */}
      <div className="lg:hidden bg-surface-base border-b border-border">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-text-primary">Admin</h1>
          <p className="text-text-tertiary text-sm">System administration</p>
        </div>
        <div className="overflow-x-auto">
          <nav className="flex gap-1 p-2 min-w-max">
            {filteredAdminItems.map((item) => {
              const isActive = getIsActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  )}
                  title={item.description}
                >
                  <DynamicIcon 
                    name={typeof item.icon === 'string' ? item.icon : undefined} 
                    size={18} 
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Right Panel - Admin Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;

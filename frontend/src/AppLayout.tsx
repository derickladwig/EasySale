import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { Menu, X, Wifi, WifiOff, RefreshCw, Bell, Search, User } from 'lucide-react';
import { usePermissions } from './common/contexts/PermissionsContext';
import { cn } from './common/utils/classNames';
import { useConfig, useTheme, DynamicIcon } from './config';
import { BottomNav, BottomNavItem } from './common/components/organisms/BottomNav';
import { DemoModeIndicator } from './components/DemoModeIndicator';
import { ProfileMenu } from './common/components/molecules/ProfileMenu';
import { LogoWithFallback } from './common/components/atoms/LogoWithFallback';

import { Permission } from './common/contexts/PermissionsContext';

/**
 * AppLayout - Single Source of Navigation
 * 
 * This is the SINGLE layout shell for all authenticated routes.
 * It provides:
 * - Sidebar navigation from navigation config (ConfigProvider)
 * - Header with branding (logo, company name)
 * - ProfileMenu for user actions
 * - Mobile responsive navigation
 * 
 * Design Reference: .kiro/specs/navigation-consolidation/design.md
 * Requirements: 2.1, 2.2, 3.1
 * 
 * IMPORTANT: Pages should NOT wrap content in AppShell with sidebar.
 * AppLayout is the SINGLE source of sidebar navigation.
 */

export function AppLayout() {
  const { hasPermission } = usePermissions();
  const { brandConfig, navigation, getLogo } = useConfig();
  const { mode: themeMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [syncStatus] = useState<'online' | 'syncing' | 'offline'>('online');

  // Filter navigation items by permissions
  const filteredNavItems = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission as Permission)
  );

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  // Check if a nav item is active (supports nested routes like /admin/*)
  const isNavItemActive = useCallback((itemRoute: string): boolean => {
    // Exact match
    if (location.pathname === itemRoute) return true;
    // Nested route match (e.g., /admin/* matches /admin)
    if (itemRoute !== '/' && location.pathname.startsWith(itemRoute + '/')) return true;
    return false;
  }, [location.pathname]);

  // Get logo URL with theme-aware fallback
  // Use dark logo in dark mode, light logo in light mode
  const logoUrl = getLogo(themeMode === 'dark');

  return (
    <div className="h-screen flex flex-col bg-background-primary text-text-primary overflow-hidden">
      {/* Demo Mode Indicator - Shows only in demo mode */}
      <DemoModeIndicator />

      {/* Top Bar - Full width, fixed height */}
      <header className="h-14 flex-shrink-0 bg-surface-base border-b border-border flex items-center px-4 gap-4 z-50">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Toggle menu"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo and Branding */}
        <div className="flex items-center gap-2">
          {/* Logo - Shows image if available, text fallback otherwise */}
          <LogoWithFallback
            logoUrl={logoUrl}
            companyName={brandConfig.company.name}
            shortName={brandConfig.company.shortName}
            icon={brandConfig.company.icon}
            size="md"
            testId="app-layout-logo"
          />
          <span className="text-lg font-bold text-text-primary hidden sm:block">
            {brandConfig.appName}
          </span>
        </div>

        {/* Search bar - desktop */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
            <input
              type="search"
              placeholder="Search products, customers, orders..."
              className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side items */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Sync Status */}
          <div
            className={cn(
              'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
              syncStatus === 'online' && 'bg-success-500/20 text-success-400',
              syncStatus === 'syncing' && 'bg-primary-500/20 text-primary-400',
              syncStatus === 'offline' && 'bg-error-500/20 text-error-400'
            )}
          >
            {syncStatus === 'online' && <Wifi size={14} />}
            {syncStatus === 'syncing' && <RefreshCw size={14} className="animate-spin" />}
            {syncStatus === 'offline' && <WifiOff size={14} />}
            <span className="hidden md:inline">
              {syncStatus === 'online' && 'Online'}
              {syncStatus === 'syncing' && 'Syncing...'}
              {syncStatus === 'offline' && 'Offline'}
            </span>
          </div>

          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" />
          </button>

          {/* User menu - Profile dropdown with preferences */}
          <div className="pl-2 border-l border-border">
            <ProfileMenu showName={true} />
          </div>
        </div>
      </header>

      {/* Main area - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop: static, Tablet: collapsible, Mobile: overlay */}
        <aside
          className={cn(
            'flex-shrink-0 bg-surface-base border-r border-border flex flex-col z-40',
            // Width: full (224px) when expanded, collapsed (64px) on tablet when collapsed
            'transition-all duration-300 ease-in-out',
            isSidebarCollapsed ? 'w-16' : 'w-56',
            // Mobile: fixed overlay, Tablet+: static
            'fixed md:static inset-y-0 left-0 top-14 md:top-0',
            // Mobile: slide in/out based on isOpen, Tablet+: always visible
            'md:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
        >
          {/* Collapse toggle button - visible on tablet and desktop */}
          <div className="hidden md:flex justify-end p-2 border-b border-border">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = isNavItemActive(item.route);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.route)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 text-sm relative',
                    'active:scale-95 active:shadow-sm',
                    isActive
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
                    // Center icon when collapsed
                    isSidebarCollapsed && 'justify-center'
                  )}
                  title={isSidebarCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon && <DynamicIcon name={item.icon} size={24} />}
                  {!isSidebarCollapsed && (
                    <>
                      <span className="font-medium flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {/* Show badge dot when collapsed */}
                  {isSidebarCollapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Store info at bottom - hide when collapsed */}
          {!isSidebarCollapsed && (
            <div className="p-3 border-t border-border bg-surface-elevated">
              <div className="text-xs text-text-tertiary">
                <div className="font-medium text-text-secondary">{brandConfig.store?.name || 'Store'}</div>
                <div>Station: {brandConfig.store?.station || 'POS-001'}</div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-background-primary pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation - Mobile only */}
      <BottomNav
        items={filteredNavItems.slice(0, 5).map((item): BottomNavItem => ({
          id: item.id,
          label: item.label,
          icon: item.icon ? () => <DynamicIcon name={item.icon!} size={24} /> : User,
          onClick: () => handleNavClick(item.route),
          badge: item.badge,
        }))}
        activeItem={filteredNavItems.find(item => isNavItemActive(item.route))?.id}
        maxVisibleItems={4}
      />
    </div>
  );
}

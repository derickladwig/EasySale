import React from 'react';
import { Search, Wifi, WifiOff, RefreshCw, Bell, User, LogOut, Menu, X } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface TopBarProps {
  /** Whether the mobile sidebar is open */
  isSidebarOpen?: boolean;
  /** Callback when mobile menu button is clicked */
  onMenuClick?: () => void;
  /** Current sync status */
  syncStatus?: 'online' | 'syncing' | 'offline';
  /** User information */
  user?: {
    firstName?: string;
    username: string;
    role: string;
  };
  /** Callback when logout is clicked */
  onLogout?: () => void;
  /** Whether to show the search bar */
  showSearch?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Callback when search input changes */
  onSearchChange?: (value: string) => void;
  /** Number of unread notifications */
  notificationCount?: number;
  /** Callback when notifications button is clicked */
  onNotificationsClick?: () => void;
  /** Callback when user profile button is clicked */
  onProfileClick?: () => void;
  /** Custom logo element */
  logo?: React.ReactNode;
  /** Custom store name */
  storeName?: string;
  className?: string;
}

/**
 * TopBar component for application header
 *
 * Features:
 * - Mobile menu toggle
 * - Logo and store name
 * - Search bar (desktop)
 * - Sync status indicator
 * - Notifications
 * - User menu with logout
 * - Responsive behavior
 */
export const TopBar: React.FC<TopBarProps> = ({
  isSidebarOpen = false,
  onMenuClick,
  syncStatus = 'online',
  user,
  onLogout,
  showSearch = true,
  searchPlaceholder = 'Search products, customers, orders...',
  onSearchChange,
  notificationCount = 0,
  onNotificationsClick,
  onProfileClick,
  logo,
  storeName, // Remove default value - should come from config
  className = '',
}) => {
  return (
    <header
      className={cn(
        'h-14 flex-shrink-0 bg-surface-base border-b border-border flex items-center px-4 gap-4 z-50',
        className
      )}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Logo */}
      {logo || (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CP</span>
          </div>
          <span className="text-lg font-bold text-white hidden sm:block">{storeName}</span>
        </div>
      )}

      {/* Search bar - desktop */}
      {showSearch && (
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
            <input
              type="search"
              placeholder={searchPlaceholder}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

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
        <button
          onClick={onNotificationsClick}
          className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-white transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" />
          )}
        </button>

        {/* User menu */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          {user && (
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-white">
                {user.firstName || user.username}
              </div>
              <div className="text-xs text-text-tertiary capitalize">{user.role}</div>
            </div>
          )}
          <button
            onClick={onProfileClick}
            className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-white transition-colors"
            aria-label="User profile"
          >
            <User size={18} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-error-400 transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

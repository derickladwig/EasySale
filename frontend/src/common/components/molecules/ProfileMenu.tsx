/**
 * ProfileMenu Component
 * 
 * Dropdown menu for user profile actions including:
 * - My Profile
 * - Preferences (user settings)
 * - Sign Out
 * 
 * Design Reference: .kiro/specs/navigation-consolidation/design.md
 * Requirements: 3.4
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sliders, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/classNames';
import { profileMenuItems } from '../../../config/navigation';

interface ProfileMenuProps {
  /** Whether to show the user name (hidden on mobile) */
  showName?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProfileMenu renders a dropdown with user profile actions.
 * Uses profileMenuItems from navigation config for consistency.
 */
export function ProfileMenu({ showName = true, className }: ProfileMenuProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleItemClick = (item: typeof profileMenuItems[0]) => {
    setIsOpen(false);
    
    if (item.action === 'logout') {
      logout();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  // Map icon names to components
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'User':
        return User;
      case 'Sliders':
        return Sliders;
      case 'LogOut':
        return LogOut;
      default:
        return User;
    }
  };

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          'hover:bg-surface-elevated text-text-secondary hover:text-text-primary',
          isOpen && 'bg-surface-elevated text-text-primary'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
          <span className="text-white font-medium text-sm">
            {user?.firstName?.[0] || user?.username?.[0] || 'U'}
          </span>
        </div>
        {showName && (
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-text-primary">
              {user?.firstName || user?.username}
            </div>
            <div className="text-xs text-text-tertiary capitalize">{user?.role}</div>
          </div>
        )}
        <ChevronDown 
          size={16} 
          className={cn(
            'text-text-tertiary transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {/* Dropdown menu - uses popover z-index token and elevated surface */}
      {isOpen && (
        <div 
          className={cn(
            'absolute right-0 top-full mt-2 w-56 py-2',
            'bg-surface-elevated border border-border rounded-xl',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
          style={{ 
            zIndex: 'var(--z-popover)',
            boxShadow: 'var(--shadow-dropdown)'
          }}
          role="menu"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="font-medium text-text-primary">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-sm text-text-tertiary">{user?.email}</div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {profileMenuItems.map((item, index) => {
              const Icon = getIcon(item.icon);
              const isLogout = item.action === 'logout';
              
              return (
                <button
                  key={item.path || item.action || index}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    isLogout
                      ? 'text-error-400 hover:bg-error-500/10'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  )}
                  role="menuitem"
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;

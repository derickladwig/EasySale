/**
 * NavItem Component - Handles capability-gated navigation items
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Clock } from 'lucide-react';
import type { NavItem as NavItemType, FeatureStatus } from '../navConfig';

interface NavItemProps {
  item: NavItemType;
  capabilities?: Record<string, { status: string; enabled: boolean; reason?: string }>;
  hasPermission?: boolean;
  collapsed?: boolean;
  onComingSoonClick?: (item: NavItemType) => void;
}

/**
 * Get effective status considering both feature status and capability
 */
function getEffectiveStatus(
  item: NavItemType,
  capabilities?: Record<string, { status: string; enabled: boolean }>
): FeatureStatus {
  // If item has a capability key, check its status
  if (item.capabilityKey && capabilities) {
    const cap = capabilities[item.capabilityKey];
    if (cap) {
      if (cap.status === 'hidden') return 'hidden';
      if (cap.status === 'comingSoon') return 'comingSoon';
      if (!cap.enabled) return 'comingSoon';
    }
  }
  return item.featureStatus;
}

export function NavItem({ 
  item, 
  capabilities, 
  hasPermission = true,
  collapsed = false,
  onComingSoonClick 
}: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === item.route || 
    (item.route !== '/' && location.pathname.startsWith(item.route));
  
  const effectiveStatus = getEffectiveStatus(item, capabilities);
  const Icon = item.icon;
  
  // Hidden items are not rendered
  if (effectiveStatus === 'hidden') {
    return null;
  }
  
  // Base classes
  const baseClasses = `
    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
    min-h-[44px] text-sm font-medium
  `;
  
  // Active state classes
  const activeClasses = isActive
    ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-0.5 pl-[calc(0.75rem+2px)]'
    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground';
  
  // Disabled state (no permission)
  if (!hasPermission) {
    return (
      <div
        className={`${baseClasses} opacity-50 cursor-not-allowed`}
        title="You don't have permission to access this feature"
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </div>
    );
  }
  
  // Coming Soon state
  if (effectiveStatus === 'comingSoon') {
    const reason = item.capabilityKey && capabilities?.[item.capabilityKey]?.reason;
    
    return (
      <button
        onClick={() => onComingSoonClick?.(item)}
        className={`${baseClasses} ${activeClasses} w-full text-left`}
        title={reason || 'Coming soon'}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded">
              <Clock className="h-3 w-3" />
              Soon
            </span>
          </>
        )}
      </button>
    );
  }
  
  // Beta state
  if (effectiveStatus === 'beta') {
    return (
      <Link
        to={item.route}
        className={`${baseClasses} ${activeClasses}`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
              Beta
            </span>
          </>
        )}
      </Link>
    );
  }
  
  // Ready state (default)
  return (
    <Link
      to={item.route}
      className={`${baseClasses} ${activeClasses}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span className="flex-1">{item.label}</span>}
    </Link>
  );
}

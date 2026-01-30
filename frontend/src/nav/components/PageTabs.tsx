/**
 * PageTabs Component - Standardized tab navigation with capability gating
 */

import React from 'react';
import { Clock } from 'lucide-react';
import type { TabItem, FeatureStatus } from '../tabsConfig';

interface PageTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  capabilities?: Record<string, { status: string; enabled: boolean; reason?: string }>;
  onComingSoonClick?: (tab: TabItem) => void;
}

/**
 * Get effective status considering both feature status and capability
 */
function getEffectiveStatus(
  tab: TabItem,
  capabilities?: Record<string, { status: string; enabled: boolean }>
): FeatureStatus {
  if (tab.capabilityKey && capabilities) {
    const cap = capabilities[tab.capabilityKey];
    if (cap) {
      if (cap.status === 'hidden') return 'hidden';
      if (cap.status === 'comingSoon') return 'comingSoon';
      if (!cap.enabled) return 'comingSoon';
    }
  }
  return tab.featureStatus;
}

export function PageTabs({
  tabs,
  activeTab,
  onTabChange,
  capabilities,
  onComingSoonClick,
}: PageTabsProps) {
  const visibleTabs = tabs.filter(tab => {
    const status = getEffectiveStatus(tab, capabilities);
    return status !== 'hidden';
  });

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      {visibleTabs.map((tab) => {
        const effectiveStatus = getEffectiveStatus(tab, capabilities);
        const isActive = activeTab === tab.id;
        
        // Base classes for all tabs
        const baseClasses = `
          relative px-4 py-2 text-sm font-medium rounded-md transition-all
          focus:outline-none focus:ring-2 focus:ring-primary/50
          min-w-[80px] text-center
        `;
        
        // Active state
        const activeClasses = isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50';
        
        // Coming Soon tab
        if (effectiveStatus === 'comingSoon') {
          const reason = tab.capabilityKey && capabilities?.[tab.capabilityKey]?.reason;
          
          return (
            <button
              key={tab.id}
              onClick={() => onComingSoonClick?.(tab)}
              className={`${baseClasses} ${activeClasses} cursor-pointer`}
              title={reason || 'Coming soon'}
            >
              <span className="flex items-center justify-center gap-1.5">
                {tab.label}
                <Clock className="h-3 w-3 text-amber-500" />
              </span>
              {tab.badge && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }
        
        // Beta tab
        if (effectiveStatus === 'beta') {
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`${baseClasses} ${activeClasses}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {tab.label}
                <span className="px-1 py-0.5 text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                  β
                </span>
              </span>
              {tab.badge && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }
        
        // Ready tab (default)
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${baseClasses} ${activeClasses}`}
          >
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

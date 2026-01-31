import React from 'react';
import { Globe, Building2, Monitor, User } from 'lucide-react';

export type SettingScope = 'global' | 'store' | 'station' | 'user';

interface ScopeBadgeProps {
  scope: SettingScope;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const scopeConfig = {
  global: {
    label: 'Global',
    icon: Globe,
    color: 'bg-info-500/20 text-info-400 border-info-500/30',
  },
  store: {
    label: 'Store',
    icon: Building2,
    color: 'bg-success-500/20 text-success-400 border-success-500/30',
  },
  station: {
    label: 'Station',
    icon: Monitor,
    color: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
  },
  user: {
    label: 'User',
    icon: User,
    color: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
  },
};

const sizeConfig = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export const ScopeBadge: React.FC<ScopeBadgeProps> = ({ scope, size = 'sm', showIcon = true }) => {
  const config = scopeConfig[scope];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${config.color} ${sizeConfig[size]}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      <span>{config.label}</span>
    </span>
  );
};

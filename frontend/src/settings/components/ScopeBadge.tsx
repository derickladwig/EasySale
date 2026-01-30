/**
 * Scope Badge Component
 * Displays the scope of a setting value (store, user, or default)
 */

import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { SettingScope } from '../types';

export interface ScopeBadgeProps {
  scope: SettingScope;
  className?: string;
}

const SCOPE_LABELS: Record<SettingScope, string> = {
  store: 'Store',
  user: 'Personal',
  default: 'Default',
};

const SCOPE_VARIANTS: Record<SettingScope, 'default' | 'primary' | 'info'> = {
  store: 'primary',
  user: 'info',
  default: 'default',
};

export function ScopeBadge({ scope, className }: ScopeBadgeProps) {
  return (
    <Badge variant={SCOPE_VARIANTS[scope]} className={className}>
      {SCOPE_LABELS[scope]}
    </Badge>
  );
}

import React from 'react';
import { Building2, Monitor, User } from 'lucide-react';

interface ContextInfo {
  store?: {
    id: number;
    name: string;
  };
  station?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
    role: string;
  };
}

interface ContextDisplayProps {
  context: ContextInfo;
  compact?: boolean;
}

export const ContextDisplay: React.FC<ContextDisplayProps> = ({ context, compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        {context.store && (
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Building2 className="w-4 h-4" />
            <span>{context.store.name}</span>
          </div>
        )}
        {context.station && (
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Monitor className="w-4 h-4" />
            <span>{context.station.name}</span>
          </div>
        )}
        {context.user && (
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <User className="w-4 h-4" />
            <span>{context.user.name}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-base border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-3">Current Context</h3>
      <div className="space-y-2">
        {context.store && (
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary-400" />
            <div>
              <div className="text-xs text-text-disabled">Store</div>
              <div className="text-sm font-medium text-text-primary">{context.store.name}</div>
            </div>
          </div>
        )}

        {context.station && (
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-primary-400" />
            <div>
              <div className="text-xs text-text-disabled">Station</div>
              <div className="text-sm font-medium text-text-primary">{context.station.name}</div>
            </div>
          </div>
        )}

        {context.user && (
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary-400" />
            <div>
              <div className="text-xs text-text-disabled">User</div>
              <div className="text-sm font-medium text-text-primary">
                {context.user.name}
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded">
                  {context.user.role}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

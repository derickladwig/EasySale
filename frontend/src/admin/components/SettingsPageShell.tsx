import { ReactNode, useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { Input, Button } from '@common/components/atoms';

export interface FilterChip {
  label: string;
  active: boolean;
  onClick: () => void;
}

export interface PrimaryAction {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SettingsPageShellProps {
  title: string;
  subtitle?: string;
  scope?: 'global' | 'store' | 'station' | 'user';
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filters?: FilterChip[];
  problemCount?: number;
  primaryAction?: PrimaryAction;
  children: ReactNode;
}

const SCOPE_BADGES = {
  global: { label: 'Global', className: 'bg-info-100 text-info-dark' },
  store: { label: 'Store', className: 'bg-green-100 text-green-800' },
  station: { label: 'Station', className: 'bg-purple-100 text-purple-800' },
  user: { label: 'User', className: 'bg-orange-100 text-orange-800' },
};

export function SettingsPageShell({
  title,
  subtitle,
  scope,
  searchPlaceholder = 'Search...',
  onSearch,
  filters = [],
  problemCount = 0,
  primaryAction,
  children,
}: SettingsPageShellProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      // Debounce search - wait 300ms after user stops typing
      const timeoutId = setTimeout(() => {
        onSearch(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-secondary-900">{title}</h1>
            {scope && (
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${SCOPE_BADGES[scope].className}`}
              >
                {SCOPE_BADGES[scope].label}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-sm text-secondary-600">{subtitle}</p>}
        </div>
        {primaryAction && (
          <Button onClick={primaryAction.onClick} variant="primary">
            {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />}
            {primaryAction.label}
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      {(onSearch || filters.length > 0 || problemCount > 0) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          {onSearch && (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Filter Chips */}
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter, index) => (
                <button
                  key={index}
                  onClick={filter.onClick}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    filter.active
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {/* Problems Badge */}
          {problemCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-50 text-warning-800 rounded-lg border border-warning-200">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{problemCount} issues</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}

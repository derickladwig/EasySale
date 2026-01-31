import React, { useEffect, useCallback } from 'react';
import { Building2, Globe } from 'lucide-react';

const STORAGE_KEY = 'easysale_sync_scope';

export interface ScopeSelectorStore {
  id: string;
  name: string;
}

export interface ScopeSelectorProps {
  /** Current scope value - 'all' or a store ID */
  value: 'all' | string;
  /** Callback when scope changes */
  onChange: (scope: 'all' | string) => void;
  /** List of available stores */
  stores: ScopeSelectorStore[];
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether stores are still loading */
  loading?: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * Persist scope to sessionStorage
 */
export function persistScope(scope: 'all' | string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, scope);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load scope from sessionStorage, validating against available stores
 */
export function loadPersistedScope(stores: ScopeSelectorStore[]): 'all' | string {
  try {
    const persisted = sessionStorage.getItem(STORAGE_KEY);
    if (!persisted) return 'all';
    if (persisted === 'all') return 'all';
    // Validate that the persisted store still exists
    const storeExists = stores.some(s => s.id === persisted);
    return storeExists ? persisted : 'all';
  } catch {
    return 'all';
  }
}

/**
 * ScopeSelector component for selecting tenant/store context.
 * Persists selection to sessionStorage for continuity across page navigations.
 * 
 * Validates: Requirements 10.1, 10.5
 */
export const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  value,
  onChange,
  stores,
  disabled = false,
  loading = false,
  className = '',
}) => {
  // Initialize from sessionStorage on mount
  useEffect(() => {
    if (stores.length > 0) {
      const persisted = loadPersistedScope(stores);
      if (persisted !== value) {
        onChange(persisted);
      }
    }
  }, [stores]); // Only run when stores change

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScope = e.target.value as 'all' | string;
    persistScope(newScope);
    onChange(newScope);
  }, [onChange]);

  // Don't render if only one store (no need for scope selection)
  if (stores.length <= 1 && !loading) {
    return null;
  }

  const selectedStore = stores.find(s => s.id === value);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-text-tertiary">
        {value === 'all' ? (
          <Globe className="w-4 h-4" />
        ) : (
          <Building2 className="w-4 h-4" />
        )}
      </div>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled || loading}
        className="px-3 py-1.5 bg-surface-elevated border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
        aria-label="Select scope"
      >
        <option value="all">All Stores</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
      {loading && (
        <span className="text-xs text-text-tertiary">Loading...</span>
      )}
    </div>
  );
};

export default ScopeSelector;

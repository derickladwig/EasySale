/**
 * DocumentFilters Component
 * 
 * Filter controls for the Document Center
 * Requirements: 1.5
 */

import React from 'react';
import { X } from 'lucide-react';

interface DocumentFiltersProps {
  filters: {
    state?: string;
    vendor?: string;
    dateFrom?: string;
    dateTo?: string;
    onlyMine: boolean;
  };
  onFilterChange: (filters: Partial<DocumentFiltersProps['filters']>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">Status:</label>
        <select
          value={filters.state || ''}
          onChange={(e) => onFilterChange({ state: e.target.value || undefined })}
          className="px-3 py-1.5 bg-surface-elevated text-white rounded border border-border focus:border-primary-500 focus:outline-none text-sm"
        >
          <option value="">All</option>
          <option value="NeedsReview">Needs Review</option>
          <option value="InReview">In Review</option>
          <option value="Processing">Processing</option>
          <option value="Queued">Queued</option>
          <option value="Failed">Failed</option>
          <option value="Approved">Approved</option>
          <option value="AutoApproved">Auto Approved</option>
          <option value="Exported">Exported</option>
        </select>
      </div>

      {/* Vendor Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">Vendor:</label>
        <input
          type="text"
          value={filters.vendor || ''}
          onChange={(e) => onFilterChange({ vendor: e.target.value || undefined })}
          placeholder="All vendors"
          className="px-3 py-1.5 bg-surface-elevated text-white rounded border border-border focus:border-primary-500 focus:outline-none text-sm w-48"
        />
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">Date:</label>
        <select
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'custom') {
              // For now, just clear the filter
              onFilterChange({ dateFrom: undefined, dateTo: undefined });
            } else if (value === 'today') {
              const today = new Date().toISOString().split('T')[0];
              onFilterChange({ dateFrom: today, dateTo: today });
            } else if (value === 'week') {
              const today = new Date();
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              onFilterChange({ 
                dateFrom: weekAgo.toISOString().split('T')[0], 
                dateTo: today.toISOString().split('T')[0] 
              });
            } else if (value === 'month') {
              const today = new Date();
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              onFilterChange({ 
                dateFrom: monthAgo.toISOString().split('T')[0], 
                dateTo: today.toISOString().split('T')[0] 
              });
            } else {
              onFilterChange({ dateFrom: undefined, dateTo: undefined });
            }
          }}
          className="px-3 py-1.5 bg-surface-elevated text-white rounded border border-border focus:border-primary-500 focus:outline-none text-sm"
        >
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
      </div>

      {/* Only Mine Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.onlyMine}
          onChange={(e) => onFilterChange({ onlyMine: e.target.checked })}
          className="w-4 h-4 rounded border-border bg-surface-elevated text-primary-600 focus:ring-primary-500 focus:ring-offset-surface-base"
        />
        <span className="text-sm text-text-secondary">Only mine</span>
      </label>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="ml-auto px-3 py-1.5 text-sm text-text-tertiary hover:text-white transition-colors flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Clear filters
        </button>
      )}
    </div>
  );
};

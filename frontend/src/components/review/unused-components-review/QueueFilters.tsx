import React from 'react';

interface Filters {
  state: string;
  vendor: string;
  min_confidence: number;
  max_confidence: number;
}

interface QueueFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const QueueFilters: React.FC<QueueFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const handleFilterChange = (key: keyof Filters, value: string | number) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleReset = () => {
    onFiltersChange({
      state: 'pending',
      vendor: '',
      min_confidence: 0,
      max_confidence: 100,
    });
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Filters</h3>
        <button
          onClick={handleReset}
          className="text-xs text-accent hover:text-info-dark"
        >
          Reset
        </button>
      </div>

      <div className="space-y-3">
        {/* State Filter */}
        <div>
          <label className="block text-sm font-medium mb-1">State:</label>
          <select
            value={filters.state}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="">All States</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Vendor Filter */}
        <div>
          <label className="block text-sm font-medium mb-1">Vendor:</label>
          <input
            type="text"
            value={filters.vendor}
            onChange={(e) => handleFilterChange('vendor', e.target.value)}
            placeholder="Search vendor..."
            className="w-full p-2 border rounded text-sm"
          />
        </div>

        {/* Confidence Range */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Confidence Range: {filters.min_confidence}% - {filters.max_confidence}%
          </label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-secondary">Min:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.min_confidence}
                onChange={(e) => handleFilterChange('min_confidence', Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Max:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.max_confidence}
                onChange={(e) => handleFilterChange('max_confidence', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div>
          <label className="block text-sm font-medium mb-2">Quick Filters:</label>
          <div className="space-y-1">
            <button
              onClick={() =>
                onFiltersChange({
                  state: 'pending',
                  vendor: '',
                  min_confidence: 0,
                  max_confidence: 85,
                })
              }
              className="w-full text-left px-3 py-2 bg-error-50 hover:bg-error-100 rounded text-sm"
            >
              🔴 Low Confidence (&lt; 85%)
            </button>
            <button
              onClick={() =>
                onFiltersChange({
                  state: 'pending',
                  vendor: '',
                  min_confidence: 0,
                  max_confidence: 100,
                })
              }
              className="w-full text-left px-3 py-2 bg-warning-50 hover:bg-warning-100 rounded text-sm"
            >
              🟡 All Pending
            </button>
            <button
              onClick={() =>
                onFiltersChange({
                  state: 'in_review',
                  vendor: '',
                  min_confidence: 0,
                  max_confidence: 100,
                })
              }
              className="w-full text-left px-3 py-2 bg-info-50 hover:bg-info-100 rounded text-sm"
            >
              🔵 In Review
            </button>
            <button
              onClick={() =>
                onFiltersChange({
                  state: 'approved',
                  vendor: '',
                  min_confidence: 90,
                  max_confidence: 100,
                })
              }
              className="w-full text-left px-3 py-2 bg-success-50 hover:bg-success-100 rounded text-sm"
            >
              🟢 High Confidence Approved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

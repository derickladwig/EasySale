import React, { useState, useEffect } from 'react';
import { QueueFilters } from './QueueFilters';
import { useReviewQueue, type QueueFilters as ApiFilters } from '../../review/hooks/useReviewApi';
import { FlagChips } from './FlagChips';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { getErrorMessage } from '../../common/utils/errorUtils';

interface ReviewQueueProps {
  onSelectCase: (caseId: string) => void;
  initialStateFilter?: string;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ onSelectCase, initialStateFilter }) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ApiFilters>({
    state: initialStateFilter || 'NeedsReview',
    vendor: '',
    min_conf: 0,
    sort: 'created_at',
    page: 1,
    per_page: 20,
  });
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);

  // Update filter when initialStateFilter changes
  useEffect(() => {
    if (initialStateFilter) {
      setFilters(prev => ({ ...prev, state: initialStateFilter, page: 1 }));
    }
  }, [initialStateFilter]);

  const { data, isLoading, error, refetch } = useReviewQueue(filters);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      const key = event.key.toLowerCase();
      
      switch (key) {
        case 'n': // Next case
          event.preventDefault();
          if (data?.cases && data.cases.length > 0) {
            const nextIndex = (selectedCaseIndex + 1) % data.cases.length;
            setSelectedCaseIndex(nextIndex);
            onSelectCase(data.cases[nextIndex].case_id);
          }
          break;
        
        case 'a': // Assign to me
          event.preventDefault();
          if (data?.cases && data.cases.length > 0) {
            const currentCase = data.cases[selectedCaseIndex];
            if (currentCase) {
              // TODO: Implement assign to me functionality
              // This would call an API endpoint to assign the case to the current user
              console.log('Assign to me:', currentCase.case_id);
              // Navigate to the case detail page for manual assignment
              navigate(`/review/${currentCase.case_id}`);
            }
          }
          break;
        
        case 'e': // Export
          event.preventDefault();
          if (data?.cases && data.cases.length > 0) {
            const currentCase = data.cases[selectedCaseIndex];
            if (currentCase) {
              // TODO: Implement export functionality
              // This would call an API endpoint to export the case
              console.log('Export case:', currentCase.case_id);
              // Navigate to exports page
              navigate('/exports');
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [data, selectedCaseIndex, onSelectCase]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      NeedsReview: 'bg-yellow-100 text-yellow-800',
      InReview: 'bg-info-100 text-info-dark',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      AutoApproved: 'bg-green-200 text-green-900',
      Exported: 'bg-gray-100 text-gray-800',
    };
    return colors[state] || 'bg-gray-100 text-gray-800';
  };

  const getDisplayState = (state: string) => {
    switch (state) {
      case 'NeedsReview': return 'Needs Review';
      case 'InReview': return 'In Review';
      case 'AutoApproved': return 'Auto Approved';
      default: return state;
    }
  };

  const handleFilterChange = (newFilters: Partial<ApiFilters>) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Filters & Stats */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        {/* Stats */}
        {data && (
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3">Queue Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Cases:</span>
                <span className="font-semibold">{data.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current Page:</span>
                <span className="font-semibold">{data.page} of {Math.ceil(data.total / data.per_page)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <QueueFilters 
          filters={{
            state: filters.state || '',
            vendor: filters.vendor || '',
            min_confidence: filters.min_conf || 0,
            max_confidence: 100,
          }} 
          onFiltersChange={(newFilters) => handleFilterChange({
            state: newFilters.state,
            vendor: newFilters.vendor,
            min_conf: newFilters.min_confidence,
          })} 
        />
      </div>

      {/* Main Content - Queue List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Review Queue</h2>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 bg-accent text-white rounded hover:bg-accent-hover text-sm"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              value={filters.sort || 'created_at'}
              onChange={(e) => handleFilterChange({ sort: e.target.value })}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="created_at">Date Created</option>
              <option value="confidence">Confidence</option>
              <option value="vendor_name">Vendor</option>
            </select>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                Error loading review queue: {getErrorMessage(error)}
              </div>
            </div>
          ) : !data?.cases?.length ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No cases found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.cases.map((c, index) => (
                <div
                  key={c.case_id}
                  onClick={() => {
                    setSelectedCaseIndex(index);
                    onSelectCase(c.case_id);
                  }}
                  className={`bg-surface-base p-4 rounded-lg shadow-sm border border-border hover:border-primary-500 cursor-pointer transition-colors ${
                    index === selectedCaseIndex ? 'border-primary-500 ring-2 ring-primary-500/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-text-primary">{c.case_id}</h3>
                      <p className="text-sm text-text-secondary">{c.vendor_name || 'Unknown Vendor'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getConfidenceColor(c.confidence)}`}>
                        {c.confidence}%
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${getStateColor(c.state)}`}>
                        {getDisplayState(c.state)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Fields needing attention: {c.fields_needing_attention}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      {/* Export button for approved cases - Requirement 11.11 */}
                      {(c.state === 'Approved' || c.state === 'AutoApproved') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/exports');
                          }}
                          className="px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs flex items-center gap-1"
                          title="Export this case"
                        >
                          <Download className="w-3 h-3" />
                          Export
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Flag chips */}
                  {c.validation_result && (
                    <FlagChips
                      hardFlags={c.validation_result.hard_flags}
                      softFlags={c.validation_result.soft_flags}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.total > data.per_page && (
          <div className="p-4 bg-white border-t">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handlePageChange(Math.max(1, data.page - 1))}
                disabled={data.page === 1}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {data.page} of {Math.ceil(data.total / data.per_page)}
              </span>
              <button
                onClick={() => handlePageChange(Math.min(Math.ceil(data.total / data.per_page), data.page + 1))}
                disabled={data.page >= Math.ceil(data.total / data.per_page)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Footer */}
        <div className="p-3 bg-gray-50 border-t">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono">N</kbd>
              <span>Next case</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono">A</kbd>
              <span>Assign to me</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono">E</kbd>
              <span>Export</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * DocumentsPage Component
 * 
 * Central hub for managing all uploaded documents (backed by /api/cases).
 * This is a presentation layer on top of the cases API, providing a different
 * view of the same data used by the Review page.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.10
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDocuments } from '../hooks/useDocuments';
import { useDocumentStats } from '../../review/hooks/useReviewApi';
import { StatsCards } from '../../review/components/StatsCards';
import { NextActionCenter } from '../../review/components/NextActionCenter';
import { DocumentTable } from '../components/DocumentTable';
import { DocumentFilters } from '../components/DocumentFilters';
import { ProcessingQueueTab } from '../components/ProcessingQueueTab';
import { EmptyState } from '../../components/common/EmptyState';
import { FileText, Upload } from 'lucide-react';
import { getErrorMessage } from '@common/utils/errorUtils';

type TabType = 'documents' | 'jobs';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get active tab from URL or default to 'documents'
  const activeTab = (searchParams.get('tab') as TabType) || 'documents';
  
  // Filter state
  const [filters, setFilters] = useState({
    state: undefined as string | undefined,
    vendor: undefined as string | undefined,
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined,
    onlyMine: false,
  });

  // Fetch data
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useDocumentStats();
  const { data: casesData, isLoading: isLoadingCases, error, refetch: refetchCases } = useDocuments({
    state: filters.state,
    vendor: filters.vendor,
    // Add date and assignee filters when backend supports them
  });

  const handleRefresh = () => {
    refetchCases();
    refetchStats();
  };

  const handleTabChange = (tab: TabType) => {
    setSearchParams({ tab });
  };

  const handleStatsCardClick = (filter: 'NeedsReview' | 'Processing' | 'Failed') => {
    // Map the filter to the appropriate state value
    const stateMap: Record<string, string> = {
      'NeedsReview': 'NeedsReview',
      'Processing': 'Processing',
      'Failed': 'Failed',
    };
    setFilters(prev => ({ ...prev, state: stateMap[filter] }));
    // Ensure we're on the documents tab
    if (activeTab !== 'documents') {
      handleTabChange('documents');
    }
  };

  const handleNextAction = (action: 'reviewFailed' | 'reviewCases' | 'checkProcessing' | 'upload') => {
    switch (action) {
      case 'reviewFailed':
        setFilters(prev => ({ ...prev, state: 'Failed' }));
        handleTabChange('documents');
        break;
      case 'reviewCases':
        setFilters(prev => ({ ...prev, state: 'NeedsReview' }));
        handleTabChange('documents');
        break;
      case 'checkProcessing':
        handleTabChange('jobs');
        break;
      case 'upload':
        navigate('/vendor-bills/upload');
        break;
    }
  };

  const handleDocumentClick = (caseId: string, state: string) => {
    // Navigate based on case status (Requirement 1.7)
    if (state === 'Failed') {
      // For failed cases, show error detail (will be implemented in case detail page)
      navigate(`/review/${caseId}`);
    } else if (['NeedsReview', 'InReview', 'Approved', 'AutoApproved'].includes(state)) {
      navigate(`/review/${caseId}`);
    } else {
      // For other states, go to review page
      navigate(`/review/${caseId}`);
    }
  };

  const handleUploadClick = () => {
    navigate('/vendor-bills/upload');
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({
      state: undefined,
      vendor: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      onlyMine: false,
    });
  };

  // Check if we have any active filters
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== false);

  return (
    <div className="h-screen flex flex-col bg-background-primary">
      {/* Header */}
      <div className="p-6 bg-surface-base border-b border-border-default">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text-primary">Documents</h1>
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 bg-primary-500 text-text-inverse rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload
          </button>
        </div>

        {/* Stats Cards - Requirement 1.2 */}
        {stats && (
          <>
            <StatsCards 
              stats={stats} 
              isLoading={isLoadingStats}
              onCardClick={handleStatsCardClick}
            />
            
            {/* Next Action Center - Requirement 1.12 */}
            <div className="mt-4">
              <NextActionCenter 
                stats={stats}
                onAction={handleNextAction}
              />
            </div>
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-surface-base border-b border-border-default">
        <div className="px-6">
          <div className="flex gap-4">
            <button
              onClick={() => handleTabChange('documents')}
              className={`
                px-4 py-3 font-medium transition-colors relative
                ${activeTab === 'documents' 
                  ? 'text-primary-400 border-b-2 border-primary-400' 
                  : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              Documents
            </button>
            <button
              onClick={() => handleTabChange('jobs')}
              className={`
                px-4 py-3 font-medium transition-colors relative
                ${activeTab === 'jobs' 
                  ? 'text-primary-400 border-b-2 border-primary-400' 
                  : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              Processing Queue
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'documents' ? (
          <div className="h-full flex flex-col">
            {/* Filters - Requirement 1.5 */}
            <div className="p-4 bg-surface-base border-b border-border-default">
              <DocumentFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            {/* Document Table or Empty State */}
            <div className="flex-1 overflow-auto p-6">
              {error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-error-400 mb-4">Failed to load documents</p>
                    <p className="text-text-tertiary text-sm mb-4">{getErrorMessage(error)}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-primary-500 text-text-inverse rounded-lg hover:bg-primary-600"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : isLoadingCases ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-surface-elevated rounded" />
                  ))}
                </div>
              ) : !casesData || casesData.cases.length === 0 ? (
                // Empty State - Requirement 1.4
                <EmptyState
                  icon={<FileText className="w-16 h-16" />}
                  title={hasActiveFilters ? "No documents match your filters" : "No documents yet"}
                  description={
                    hasActiveFilters 
                      ? "Try adjusting your filters to see more results."
                      : "Start by uploading a vendor invoice PDF to begin processing."
                  }
                  action={{
                    label: hasActiveFilters ? "Clear Filters" : "Upload Document",
                    onClick: hasActiveFilters ? handleClearFilters : handleUploadClick,
                  }}
                />
              ) : (
                // Document Table - Requirement 1.3
                <DocumentTable
                  cases={casesData.cases}
                  onDocumentClick={handleDocumentClick}
                  onRefresh={handleRefresh}
                />
              )}
            </div>
          </div>
        ) : (
          // Processing Queue Tab - Requirement 15.4
          <ProcessingQueueTab />
        )}
      </div>
    </div>
  );
};

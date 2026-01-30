import React, { useState } from 'react';
import { ReviewQueue as ReviewQueueIntegrated } from '../../components/review/ReviewQueueIntegrated';
import { GuidedReviewView as GuidedReviewViewIntegrated } from '../../components/review/GuidedReviewViewIntegrated';
import { useReviewCase, useDocumentStats } from '../hooks/useReviewApi';
import { StatsCards } from '../components/StatsCards';
import { NextActionCenter } from '../components/NextActionCenter';
import { useNavigate } from 'react-router-dom';

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string | undefined>(undefined);
  const { data: caseDetail, isLoading } = useReviewCase(selectedCaseId || '');
  const { data: stats, isLoading: isLoadingStats } = useDocumentStats();

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const handleBackToQueue = () => {
    setSelectedCaseId(null);
  };

  const handleStatsCardClick = (filter: 'NeedsReview' | 'Processing' | 'Failed') => {
    // Map the filter to the appropriate state value
    const stateMap: Record<string, string> = {
      'NeedsReview': 'NeedsReview',
      'Processing': 'Processing', // Note: Processing includes both Processing and Queued states
      'Failed': 'Failed',
    };
    setStateFilter(stateMap[filter]);
  };

  const handleNextAction = (action: 'reviewFailed' | 'reviewCases' | 'checkProcessing' | 'upload') => {
    switch (action) {
      case 'reviewFailed':
        setStateFilter('Failed');
        break;
      case 'reviewCases':
        setStateFilter('NeedsReview');
        break;
      case 'checkProcessing':
        setStateFilter('Processing');
        break;
      case 'upload':
        // Navigate to the existing upload page
        navigate('/vendor-bills/upload');
        break;
    }
  };

  if (selectedCaseId) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-elevated rounded w-48 mb-4"></div>
            <div className="h-64 bg-surface-elevated rounded"></div>
          </div>
        </div>
      );
    }

    if (!caseDetail) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">Case not found</p>
            <button
              onClick={handleBackToQueue}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
            >
              Back to Queue
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col">
        <div className="p-4 bg-surface-base border-b border-border">
          <button
            onClick={handleBackToQueue}
            className="px-4 py-2 bg-surface-elevated text-text-primary rounded hover:bg-surface-overlay mb-2"
          >
            ← Back to Queue
          </button>
          <h1 className="text-xl font-semibold text-text-primary">Review Case: {caseDetail.case_id}</h1>
        </div>
        <div className="flex-1">
          <GuidedReviewViewIntegrated 
            caseId={selectedCaseId}
            caseDetail={caseDetail}
            onComplete={handleBackToQueue}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 bg-surface-base">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Review Queue</h1>
          <button
            onClick={() => navigate('/vendor-bills/upload')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </button>
        </div>
        {stats && (
          <>
            <StatsCards 
              stats={stats} 
              isLoading={isLoadingStats}
              onCardClick={handleStatsCardClick}
            />
            <div className="mt-4">
              <NextActionCenter 
                stats={stats}
                onAction={handleNextAction}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <ReviewQueueIntegrated 
          onSelectCase={handleSelectCase}
          initialStateFilter={stateFilter}
        />
      </div>
    </div>
  );
};

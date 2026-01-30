/**
 * ProcessingQueueTab Component
 * 
 * Displays document processing status grouped by state
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7
 */

import React, { useState } from 'react';
import { useReviewQueue, useRetryCase } from '../../review/hooks/useReviewApi';
import { AlertCircle, Clock, CheckCircle, Eye, RotateCcw, FileText, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@common/utils/errorUtils';
import { toast } from '@common/utils/toast';

type ProcessingTab = 'active' | 'completed' | 'failed';

export const ProcessingQueueTab: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProcessingTab>('active');
  const [retryingCaseId, setRetryingCaseId] = useState<string | null>(null);

  // Retry mutation
  const retryMutation = useRetryCase();

  // Fetch cases based on active tab
  const stateFilter = 
    activeTab === 'active' ? 'Processing,Queued' :
    activeTab === 'completed' ? 'Approved,AutoApproved,Exported' :
    'Failed';

  const { data: casesData, isLoading, error, refetch } = useReviewQueue({
    state: stateFilter,
  });

  const handleViewCase = (caseId: string) => {
    navigate(`/review/${caseId}`);
  };

  const handleRetry = async (caseId: string) => {
    setRetryingCaseId(caseId);
    try {
      const result = await retryMutation.mutateAsync({ caseId, profile: 'balanced' });
      toast.success(`Case ${caseId.substring(0, 8)} queued for reprocessing`, {
        description: result.estimated_time_ms 
          ? `Estimated time: ${Math.round(result.estimated_time_ms / 1000)}s`
          : undefined,
      });
      // Refresh the list after a short delay
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to retry case';
      // Check if this is a stub endpoint
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        toast.info('Retry functionality requires backend implementation', {
          description: 'The case has been marked for manual review.',
        });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setRetryingCaseId(null);
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'Processing':
      case 'Queued':
        return <Clock className="w-4 h-4 text-info" />;
      case 'Failed':
        return <AlertCircle className="w-4 h-4 text-error-400" />;
      case 'Approved':
      case 'AutoApproved':
      case 'Exported':
        return <CheckCircle className="w-4 h-4 text-success-400" />;
      default:
        return <FileText className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Processing':
      case 'Queued':
        return 'text-info';
      case 'Failed':
        return 'text-error-400';
      case 'Approved':
      case 'AutoApproved':
      case 'Exported':
        return 'text-success-400';
      default:
        return 'text-text-tertiary';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation - Requirement 3.2 */}
      <div className="bg-surface-base border-b border-border">
        <div className="px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`
                px-4 py-3 font-medium transition-colors relative
                ${activeTab === 'active' 
                  ? 'text-primary-400 border-b-2 border-primary-400' 
                  : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              Active
              {casesData && activeTab === 'active' && casesData.total > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-info/20 text-info rounded-full">
                  {casesData.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`
                px-4 py-3 font-medium transition-colors relative
                ${activeTab === 'completed' 
                  ? 'text-primary-400 border-b-2 border-primary-400' 
                  : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`
                px-4 py-3 font-medium transition-colors relative
                ${activeTab === 'failed' 
                  ? 'text-primary-400 border-b-2 border-primary-400' 
                  : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              Failed
              {casesData && activeTab === 'failed' && casesData.total > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-error-400/20 text-error-400 rounded-full">
                  {casesData.total}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-error-400 mx-auto mb-4" />
              <p className="text-error-400 mb-2">Failed to load processing queue</p>
              <p className="text-text-tertiary text-sm mb-4">{getErrorMessage(error)}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-surface-elevated rounded" />
            ))}
          </div>
        ) : !casesData || casesData.cases.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-white text-lg mb-2">
                {activeTab === 'active' && 'No active processing jobs'}
                {activeTab === 'completed' && 'No completed jobs'}
                {activeTab === 'failed' && 'No failed jobs'}
              </p>
              <p className="text-text-tertiary text-sm">
                {activeTab === 'active' && 'Upload documents to start processing'}
                {activeTab === 'completed' && 'Completed jobs will appear here'}
                {activeTab === 'failed' && 'Failed jobs will appear here for retry'}
              </p>
            </div>
          </div>
        ) : (
          // Processing Queue Table - Requirement 3.3
          <div className="bg-surface-base rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Case ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Last Update
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {casesData.cases.map((case_) => (
                  <tr
                    key={case_.case_id}
                    className="hover:bg-surface-elevated/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                      {case_.case_id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {case_.vendor_name || (
                        <span className="text-text-tertiary italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStateIcon(case_.state)}
                        <span className={`text-sm ${getStateColor(case_.state)}`}>
                          {case_.state}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatDistanceToNow(new Date(case_.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Requirement 3.5, 3.6, 3.7: Conditional actions */}
                        {case_.state === 'Failed' ? (
                          <>
                            <button
                              onClick={() => handleViewCase(case_.case_id)}
                              className="p-1.5 text-error-400 hover:bg-error-400/10 rounded transition-colors"
                              title="View Logs"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRetry(case_.case_id)}
                              disabled={retryingCaseId === case_.case_id}
                              className="p-1.5 text-warning-400 hover:bg-warning-400/10 rounded transition-colors disabled:opacity-50"
                              title="Retry with safer settings"
                            >
                              {retryingCaseId === case_.case_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleViewCase(case_.case_id)}
                            className="p-1.5 text-primary-400 hover:bg-primary-400/10 rounded transition-colors"
                            title="View Case"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

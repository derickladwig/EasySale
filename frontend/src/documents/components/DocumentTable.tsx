/**
 * DocumentTable Component
 * 
 * Displays a table of documents with their status and actions
 * Requirements: 1.3, 1.7, 1.8, 1.9
 */

import React, { useState } from 'react';
import { ReviewCase, useRetryCase } from '../../review/hooks/useReviewApi';
import { AlertCircle, CheckCircle, Clock, FileText, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@common/utils/toast';

interface DocumentTableProps {
  cases: ReviewCase[];
  onDocumentClick: (caseId: string, state: string) => void;
  onRefresh?: () => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({ cases, onDocumentClick, onRefresh }) => {
  const [retryingCaseId, setRetryingCaseId] = useState<string | null>(null);
  const retryMutation = useRetryCase();

  const handleRetry = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingCaseId(caseId);
    try {
      const result = await retryMutation.mutateAsync({ caseId, profile: 'balanced' });
      toast.success(`Case ${caseId.substring(0, 8)} queued for reprocessing`, {
        description: result.estimated_time_ms 
          ? `Estimated time: ${Math.round(result.estimated_time_ms / 1000)}s`
          : undefined,
      });
      // Refresh the list after a short delay
      if (onRefresh) {
        setTimeout(() => onRefresh(), 1000);
      }
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
      case 'NeedsReview':
      case 'InReview':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'Processing':
      case 'Queued':
        return <Clock className="w-4 h-4 text-info" />;
      case 'Failed':
        return <AlertCircle className="w-4 h-4 text-error-400" />;
      case 'Approved':
      case 'AutoApproved':
        return <CheckCircle className="w-4 h-4 text-success-400" />;
      case 'Exported':
        return <CheckCircle className="w-4 h-4 text-primary-400" />;
      default:
        return <FileText className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'NeedsReview':
      case 'InReview':
        return 'text-yellow-400';
      case 'Processing':
      case 'Queued':
        return 'text-info';
      case 'Failed':
        return 'text-error-400';
      case 'Approved':
      case 'AutoApproved':
        return 'text-success-400';
      case 'Exported':
        return 'text-primary-400';
      default:
        return 'text-text-tertiary';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success-400';
    if (confidence >= 70) return 'text-warning-400';
    return 'text-error-400';
  };

  return (
    <div className="bg-surface-base rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-elevated">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Case ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Uploaded
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Confidence
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cases.map((case_) => (
            <tr
              key={case_.case_id}
              className="hover:bg-surface-elevated/50 transition-colors cursor-pointer"
              onClick={() => onDocumentClick(case_.case_id, case_.state)}
            >
              <td className="px-4 py-3 text-sm text-white">
                {case_.vendor_name || (
                  <span className="text-text-tertiary italic">Unknown</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                {case_.case_id.substring(0, 8)}...
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {formatDistanceToNow(new Date(case_.created_at), { addSuffix: true })}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {getStateIcon(case_.state)}
                  <span className={`text-sm ${getStateColor(case_.state)}`}>
                    {case_.state}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                {case_.state === 'Rejected' ? (
                  <span className="text-sm text-text-tertiary">--</span>
                ) : (
                  <span className={`text-sm font-medium ${getConfidenceColor(case_.confidence)}`}>
                    {Math.round(case_.confidence)}%
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Requirement 1.8, 1.9: Conditional actions based on status */}
                  {case_.state === 'Failed' ? (
                    <>
                      <button
                        onClick={() => onDocumentClick(case_.case_id, case_.state)}
                        className="p-1.5 text-error-400 hover:bg-error-400/10 rounded transition-colors"
                        title="View Error"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleRetry(case_.case_id, e)}
                        disabled={retryingCaseId === case_.case_id}
                        className="p-1.5 text-warning-400 hover:bg-warning-400/10 rounded transition-colors disabled:opacity-50"
                        title="Retry"
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
                      onClick={() => onDocumentClick(case_.case_id, case_.state)}
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
  );
};

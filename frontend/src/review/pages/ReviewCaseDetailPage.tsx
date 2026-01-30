import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReviewCase, useDecideField, useApproveCase, useUndoDecision, useReviewQueue } from '../hooks/useReviewApi';
import { useExportCase } from '../../exports/hooks/useExportsApi';
import { FlagChips } from '../../components/review/FlagChips';
import { ReOcrTool } from '../../components/review/ReOcrTool';
import { MaskTool } from '../../components/review/MaskTool';
import { toast } from '@common/utils/toast';

interface ExtractedFieldWithEvidence {
  name: string;
  label: string;
  value: string;
  confidence: number;
  source: 'ocr' | 'template' | 'manual';
}

interface DecisionHistoryItem {
  id: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  decidedBy: string;
  decidedAt: string;
  source: string;
}

export const ReviewCaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [bulkThreshold, setBulkThreshold] = useState(90);
  const [selectedPage, setSelectedPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showReOcrTool, setShowReOcrTool] = useState(false);
  const [showMaskTool, setShowMaskTool] = useState(false);

  // Fetch case detail
  const { data: caseDetail, isLoading, error } = useReviewCase(caseId || '');
  
  // Fetch queue for next/previous navigation
  const { data: queueData } = useReviewQueue({ state: 'NeedsReview' });
  
  // Mutations
  const decideFieldMutation = useDecideField();
  const approveCaseMutation = useApproveCase();
  const _undoDecisionMutation = useUndoDecision();
  const exportCaseMutation = useExportCase();

  // Extract fields from case detail
  const extractedFields: ExtractedFieldWithEvidence[] = caseDetail ? [
    { name: 'invoice_number', label: 'Invoice Number', value: caseDetail.extracted.invoice_number || '', confidence: caseDetail.confidence, source: 'ocr' as const },
    { name: 'invoice_date', label: 'Invoice Date', value: caseDetail.extracted.invoice_date || '', confidence: caseDetail.confidence, source: 'ocr' as const },
    { name: 'vendor_name', label: 'Vendor Name', value: caseDetail.extracted.vendor_name || '', confidence: caseDetail.confidence, source: 'ocr' as const },
    { name: 'subtotal', label: 'Subtotal', value: caseDetail.extracted.subtotal?.toString() || '', confidence: caseDetail.confidence, source: 'ocr' as const },
    { name: 'tax', label: 'Tax', value: caseDetail.extracted.tax?.toString() || '', confidence: caseDetail.confidence, source: 'ocr' as const },
    { name: 'total', label: 'Total', value: caseDetail.extracted.total?.toString() || '', confidence: caseDetail.confidence, source: 'ocr' as const },
  ].filter(field => field.value) : [];

  // Mock decision history (would come from backend in real implementation)
  const decisionHistory: DecisionHistoryItem[] = [];

  // Find current case index in queue for next/previous navigation
  const currentCaseIndex = queueData?.cases.findIndex(c => c.case_id === caseId) ?? -1;
  const hasNext = currentCaseIndex >= 0 && currentCaseIndex < (queueData?.cases.length ?? 0) - 1;
  const hasPrevious = currentCaseIndex > 0;

  const handleFieldApprove = async (fieldName: string, value: string) => {
    if (!caseId) return;
    try {
      await decideFieldMutation.mutateAsync({
        caseId,
        field: fieldName,
        chosen_value: value,
        source: 'manual_approval',
      });
    } catch (error) {
      console.error('Failed to approve field:', error);
    }
  };

  const handleFieldReject = async (fieldName: string) => {
    if (!caseId) return;
    try {
      await decideFieldMutation.mutateAsync({
        caseId,
        field: fieldName,
        chosen_value: '',
        source: 'manual_rejection',
      });
    } catch (error) {
      console.error('Failed to reject field:', error);
    }
  };

  const handleBulkApprove = async () => {
    if (!caseId) return;
    const fieldsToApprove = extractedFields.filter(f => f.confidence >= bulkThreshold);
    
    try {
      for (const field of fieldsToApprove) {
        await decideFieldMutation.mutateAsync({
          caseId,
          field: field.name,
          chosen_value: field.value,
          source: 'bulk_approval',
        });
      }
    } catch (error) {
      console.error('Failed to bulk approve:', error);
    }
  };

  const handleApproveCase = async () => {
    if (!caseId) return;
    try {
      await approveCaseMutation.mutateAsync(caseId);
      navigate('/review');
    } catch (error) {
      console.error('Failed to approve case:', error);
    }
  };

  const handleExportCase = async () => {
    if (!caseId) return;
    try {
      const result = await exportCaseMutation.mutateAsync({
        caseId,
        format: 'csv',
        includeLineItems: true,
      });
      
      // If we got a download URL, trigger download
      if (result.exportUrl) {
        window.open(result.exportUrl, '_blank');
        toast.success('Export ready for download');
      } else {
        toast.success('Export initiated successfully');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to export case';
      // Check if this is a stub endpoint
      if (errorMsg.includes('not yet fully implemented') || errorMsg.includes('404')) {
        toast.info('Export functionality requires backend implementation', {
          description: 'Navigate to the Exports page to see available options.',
        });
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const handleNext = () => {
    if (hasNext && queueData) {
      const nextCase = queueData.cases[currentCaseIndex + 1];
      navigate(`/review/${nextCase.case_id}`);
    }
  };

  const handlePrevious = () => {
    if (hasPrevious && queueData) {
      const previousCase = queueData.cases[currentCaseIndex - 1];
      navigate(`/review/${previousCase.case_id}`);
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background-primary">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-elevated rounded w-64" />
          <div className="h-96 bg-surface-elevated rounded w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !caseDetail) {
    return (
      <div className="h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <div className="text-error-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Case not found</h3>
          <p className="text-text-tertiary mb-6">The case you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/review"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-block"
          >
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background-primary">
      {/* Header with breadcrumb and navigation */}
      <div className="bg-surface-base border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/review"
              className="text-text-tertiary hover:text-white transition-colors"
            >
              ← Back to Queue
            </Link>
            <span className="text-text-disabled">/</span>
            <h1 className="text-xl font-semibold text-white">
              Case: {caseDetail.case_id}
            </h1>
            {caseDetail.validation_result && (
              <FlagChips
                hardFlags={caseDetail.validation_result.hard_flags}
                softFlags={caseDetail.validation_result.soft_flags}
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="px-3 py-2 bg-surface-elevated text-white rounded-lg hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous case (Left arrow)"
            >
              ← Prev
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="px-3 py-2 bg-surface-elevated text-white rounded-lg hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next case (Right arrow)"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Document Viewer */}
        <div className="w-1/3 bg-surface-base border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-white mb-4">Document</h2>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleZoomOut}
                className="px-3 py-1 bg-surface-elevated text-white rounded hover:bg-surface-overlay text-sm"
                title="Zoom out"
              >
                −
              </button>
              <span className="text-text-tertiary text-sm min-w-[60px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-3 py-1 bg-surface-elevated text-white rounded hover:bg-surface-overlay text-sm"
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={handleResetZoom}
                className="px-3 py-1 bg-surface-elevated text-white rounded hover:bg-surface-overlay text-sm ml-2"
                title="Reset zoom"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Document Preview */}
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-surface-elevated rounded-lg p-8 text-center">
              <svg className="w-24 h-24 mx-auto text-text-disabled mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-text-tertiary">Document preview not available</p>
              <p className="text-text-disabled text-sm mt-2">
                Source: {caseDetail.case_id}
              </p>
            </div>

            {/* Page Thumbnails */}
            <div className="mt-4 flex gap-2 justify-center">
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  onClick={() => setSelectedPage(page)}
                  className={`w-12 h-16 rounded border-2 ${
                    selectedPage === page
                      ? 'border-primary-500 bg-primary-900/20'
                      : 'border-border bg-surface-elevated hover:border-border'
                  } flex items-center justify-center text-text-tertiary text-sm transition-colors`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Extracted Fields */}
        <div className="flex-1 bg-background-primary flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-white">Extracted Fields</h2>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {extractedFields.map((field) => (
              <div
                key={field.name}
                className="bg-surface-base rounded-lg p-4 border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm text-text-tertiary mb-1">{field.label}</div>
                    <div className="text-white font-medium">{field.value}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleFieldApprove(field.name, field.value)}
                      disabled={decideFieldMutation.isPending}
                      className="px-3 py-1 bg-success-600 text-white rounded hover:bg-success-700 disabled:opacity-50 text-sm transition-colors"
                      title="Approve field"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleFieldReject(field.name)}
                      disabled={decideFieldMutation.isPending}
                      className="px-3 py-1 bg-error-600 text-white rounded hover:bg-error-700 disabled:opacity-50 text-sm transition-colors"
                      title="Reject field"
                    >
                      ✗
                    </button>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                    <span>Confidence</span>
                    <span>{Math.round(field.confidence)}%</span>
                  </div>
                  <div className="w-full bg-surface-elevated rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        field.confidence >= 90
                          ? 'bg-success-500'
                          : field.confidence >= 70
                          ? 'bg-warning-500'
                          : 'bg-error-500'
                      }`}
                      style={{ width: `${field.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Line Items */}
            {caseDetail.extracted.line_items.length > 0 && (
              <div className="bg-surface-base rounded-lg p-4 border border-border">
                <h3 className="text-white font-medium mb-3">Line Items ({caseDetail.extracted.line_items.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {caseDetail.extracted.line_items.map((item, index) => (
                    <div key={index} className="bg-surface-elevated rounded p-3 text-sm">
                      <div className="text-white font-medium mb-1">{item.description}</div>
                      <div className="text-text-tertiary">
                        Qty: {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.line_total.toFixed(2)}
                      </div>
                      {item.sku && <div className="text-text-disabled text-xs mt-1">SKU: {item.sku}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions Panel */}
        <div className="w-80 bg-surface-base border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-white">Actions</h2>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Bulk Approval */}
            <div className="bg-surface-elevated rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Bulk Approval</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-text-tertiary mb-2 block">
                    Accept all above {bulkThreshold}% confidence
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={bulkThreshold}
                    onChange={(e) => setBulkThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-text-disabled mt-1">
                    <span>50%</span>
                    <span>{bulkThreshold}%</span>
                    <span>100%</span>
                  </div>
                </div>
                <button
                  onClick={handleBulkApprove}
                  disabled={decideFieldMutation.isPending}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Apply Bulk Approval
                </button>
                <p className="text-xs text-text-tertiary">
                  Will approve {extractedFields.filter(f => f.confidence >= bulkThreshold).length} of {extractedFields.length} fields
                </p>
              </div>
            </div>

            {/* Case Actions */}
            <div className="space-y-2">
              <button
                onClick={handleApproveCase}
                disabled={!caseDetail.validation_result.can_approve || approveCaseMutation.isPending}
                className="w-full px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {approveCaseMutation.isPending ? 'Approving...' : '✓ Approve Case'}
              </button>

              <button
                onClick={() => navigate('/review')}
                className="w-full px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors"
              >
                ✗ Reject Case
              </button>
            </div>

            {/* Advanced Tools */}
            <div className="space-y-2">
              <button
                onClick={() => setShowReOcrTool(true)}
                className="w-full px-4 py-2 bg-surface-overlay text-white rounded-lg hover:bg-surface-overlay transition-colors"
                title="Re-OCR specific regions"
              >
                🔄 Re-OCR Region
              </button>

              <button
                onClick={() => setShowMaskTool(true)}
                className="w-full px-4 py-2 bg-surface-overlay text-white rounded-lg hover:bg-surface-overlay transition-colors"
                title="Add mask to exclude regions"
              >
                🎭 Add Mask
              </button>

              <button
                onClick={handleExportCase}
                disabled={exportCaseMutation.isPending}
                className="w-full px-4 py-2 bg-surface-overlay text-white rounded-lg hover:bg-surface-overlay transition-colors disabled:opacity-50"
                title="Export this case"
              >
                {exportCaseMutation.isPending ? '📤 Exporting...' : '📤 Export'}
              </button>
            </div>

            {/* Audit Trail */}
            <div className="bg-surface-elevated rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Audit Trail</h3>
              {decisionHistory.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {decisionHistory.map((decision) => (
                    <div key={decision.id} className="text-sm">
                      <div className="text-text-tertiary">{decision.fieldName}</div>
                      <div className="text-text-disabled text-xs">
                        {decision.oldValue} → {decision.newValue}
                      </div>
                      <div className="text-text-disabled text-xs">
                        by {decision.decidedBy} at {new Date(decision.decidedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-tertiary text-sm">No decisions yet</p>
              )}
            </div>

            {/* Validation Issues */}
            {caseDetail.validation_result && (
              <>
                {caseDetail.validation_result.hard_flags.length > 0 && (
                  <div className="bg-error-900/20 border border-error-700 rounded-lg p-4">
                    <h3 className="text-error-400 font-medium mb-2">Hard Flags</h3>
                    <ul className="text-sm text-error-300 space-y-1">
                      {caseDetail.validation_result.hard_flags.map((flag, index) => (
                        <li key={index}>• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {caseDetail.validation_result.soft_flags.length > 0 && (
                  <div className="bg-warning-900/20 border border-warning-700 rounded-lg p-4">
                    <h3 className="text-warning-400 font-medium mb-2">Soft Flags</h3>
                    <ul className="text-sm text-warning-300 space-y-1">
                      {caseDetail.validation_result.soft_flags.map((flag, index) => (
                        <li key={index}>• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Re-OCR Tool Modal */}
      {showReOcrTool && caseId && (
        <ReOcrTool
          caseId={caseId}
          onComplete={() => setShowReOcrTool(false)}
        />
      )}

      {/* Mask Tool Modal */}
      {showMaskTool && caseId && (
        <MaskTool
          caseId={caseId}
          onComplete={() => setShowMaskTool(false)}
        />
      )}
    </div>
  );
};

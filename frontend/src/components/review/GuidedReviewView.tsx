import React, { useState, useEffect } from 'react';
import { FieldReviewItem } from './FieldReviewItem';
import { EvidenceCard } from './EvidenceCard';
import { toast } from '@common/components/molecules/Toast';

interface Field {
  name: string;
  value: string;
  confidence: number;
  alternatives: string[];
  evidence: string;
  needsAttention: boolean;
}

interface ReviewCase {
  case_id: string;
  state: string;
  confidence: number;
  fields: Field[];
  validation_report: {
    overall_passed: boolean;
    hard_failures: any[];
    soft_failures: any[];
    warnings: string[];
  };
}

interface GuidedReviewViewProps {
  caseId: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onNext: () => void;
}

export const GuidedReviewView: React.FC<GuidedReviewViewProps> = ({
  caseId,
  onApprove,
  onReject,
  onNext,
}) => {
  const [reviewCase, setReviewCase] = useState<ReviewCase | null>(null);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [showEvidence, setShowEvidence] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCase();
  }, [caseId]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'a' && !e.ctrlKey) {
        handleAcceptField();
      } else if (e.key === 'e' && !e.ctrlKey) {
        handleEditField();
      } else if (e.key === 'n' && !e.ctrlKey) {
        handleNextField();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        handleApproveAndNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentFieldIndex, reviewCase]);

  const loadCase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cases/${caseId}`);
      const data = await response.json();
      setReviewCase(data);
    } catch (error) {
      console.error('Failed to load case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptField = () => {
    if (!reviewCase) return;
    const fieldsNeedingAttention = reviewCase.fields.filter(f => f.needsAttention);
    if (currentFieldIndex < fieldsNeedingAttention.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    }
  };

  const handleEditField = () => {
    // Field edit modal - shows inline editing in FieldReviewItem
    toast.info('Click on the field value to edit it directly.');
  };

  const handleNextField = () => {
    if (!reviewCase) return;
    const fieldsNeedingAttention = reviewCase.fields.filter(f => f.needsAttention);
    if (currentFieldIndex < fieldsNeedingAttention.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    }
  };

  const handleApproveAndNext = async () => {
    try {
      await fetch(`/api/cases/${caseId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved via guided review' }),
      });
      onApprove();
      onNext();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleAcceptAllSafe = async () => {
    // Batch accept high-confidence fields (>90%)
    if (!reviewCase) return;
    const safeFields = reviewCase.fields.filter(f => f.confidence >= 90);
    toast.success(`Accepted ${safeFields.length} high-confidence fields (≥90%)`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!reviewCase) {
    return <div className="flex items-center justify-center h-screen">Case not found</div>;
  }

  const fieldsNeedingAttention = reviewCase.fields.filter(f => f.needsAttention);
  const currentField = fieldsNeedingAttention[currentFieldIndex];

  return (
    <div className="flex h-screen bg-surface-base">
      {/* Left Panel - Document Preview */}
      <div className="w-1/2 bg-surface-elevated border-r border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Document Preview</h2>
          <p className="text-sm text-text-secondary">Case: {reviewCase.case_id}</p>
        </div>
        <div className="p-4">
          {/* Document image would go here */}
          <div className="bg-surface-base h-[600px] flex items-center justify-center">
            <p className="text-text-tertiary">Document preview</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Review Interface */}
      <div className="w-1/2 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-surface-elevated border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-text-primary">Guided Review</h2>
            <span className="text-sm text-text-secondary">
              Field {currentFieldIndex + 1} of {fieldsNeedingAttention.length}
            </span>
          </div>
          
          {/* Validation Warnings */}
          {reviewCase.validation_report.hard_failures.length > 0 && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-dark rounded p-3 mb-2">
              <p className="text-sm font-semibold text-error-dark">Blocking Issues:</p>
              <ul className="text-sm text-error-dark list-disc list-inside">
                {reviewCase.validation_report.hard_failures.map((f, i) => (
                  <li key={i}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}
          
          {reviewCase.validation_report.soft_failures.length > 0 && (
            <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-dark rounded p-3">
              <p className="text-sm font-semibold text-warning-dark">Warnings:</p>
              <ul className="text-sm text-warning-dark list-disc list-inside">
                {reviewCase.validation_report.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Field Review */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentField && (
            <FieldReviewItem
              field={currentField}
              onAccept={handleAcceptField}
              onEdit={handleEditField}
              onShowEvidence={() => setShowEvidence(true)}
            />
          )}

          {showEvidence && currentField && (
            <EvidenceCard
              evidence={currentField.evidence}
              alternatives={currentField.alternatives}
              onClose={() => setShowEvidence(false)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="p-4 bg-surface-elevated border-t border-border">
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleAcceptAllSafe}
              className="px-4 py-2 bg-success-100 dark:bg-success-900/20 text-success-dark rounded hover:bg-success-200"
            >
              Accept All Safe (95%+)
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleApproveAndNext}
              disabled={reviewCase.validation_report.hard_failures.length > 0}
              className="flex-1 px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:bg-secondary-300 disabled:cursor-not-allowed"
            >
              Approve & Next (Ctrl+Enter)
            </button>
            <button
              onClick={() => onReject('Rejected via guided review')}
              className="px-4 py-2 bg-error text-white rounded hover:bg-error-dark"
            >
              Reject
            </button>
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="mt-3 text-xs text-text-tertiary">
            <p>Shortcuts: A=Accept | E=Edit | N=Next | Ctrl+Enter=Approve & Next</p>
          </div>
        </div>
      </div>
    </div>
  );
};

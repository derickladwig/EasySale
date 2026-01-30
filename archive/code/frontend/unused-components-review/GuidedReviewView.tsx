import React, { useState, useEffect } from 'react';
import { FieldReviewItem } from './FieldReviewItem';
import { EvidenceCard } from './EvidenceCard';

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
    // Open edit modal
    console.log('Edit field');
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

  const handleAcceptAllSafe = () => {
    // Accept all fields with confidence > 95%
    console.log('Accept all safe fields');
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
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Document Preview */}
      <div className="w-1/2 bg-white border-r">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Document Preview</h2>
          <p className="text-sm text-gray-600">Case: {reviewCase.case_id}</p>
        </div>
        <div className="p-4">
          {/* Document image would go here */}
          <div className="bg-gray-100 h-[600px] flex items-center justify-center">
            <p className="text-gray-500">Document preview</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Review Interface */}
      <div className="w-1/2 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Guided Review</h2>
            <span className="text-sm text-gray-600">
              Field {currentFieldIndex + 1} of {fieldsNeedingAttention.length}
            </span>
          </div>
          
          {/* Validation Warnings */}
          {reviewCase.validation_report.hard_failures.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
              <p className="text-sm font-semibold text-red-800">Blocking Issues:</p>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {reviewCase.validation_report.hard_failures.map((f, i) => (
                  <li key={i}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}
          
          {reviewCase.validation_report.soft_failures.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm font-semibold text-yellow-800">Warnings:</p>
              <ul className="text-sm text-yellow-700 list-disc list-inside">
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
        <div className="p-4 bg-white border-t">
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleAcceptAllSafe}
              className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Accept All Safe (95%+)
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleApproveAndNext}
              disabled={reviewCase.validation_report.hard_failures.length > 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Approve & Next (Ctrl+Enter)
            </button>
            <button
              onClick={() => onReject('Rejected via guided review')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reject
            </button>
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="mt-3 text-xs text-gray-500">
            <p>Shortcuts: A=Accept | E=Edit | N=Next | Ctrl+Enter=Approve & Next</p>
          </div>
        </div>
      </div>
    </div>
  );
};

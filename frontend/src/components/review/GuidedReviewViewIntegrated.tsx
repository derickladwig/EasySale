import React, { useState } from 'react';
import { FieldReviewItem as FieldReviewItemIntegrated } from './FieldReviewItemIntegrated';
import { useDecideField, useApproveCase, useUndoDecision, type CaseDetail } from '../../review/hooks/useReviewApi';

interface GuidedReviewViewProps {
  caseId: string;
  caseDetail: CaseDetail;
  onComplete: () => void;
}

export const GuidedReviewView: React.FC<GuidedReviewViewProps> = ({
  caseId,
  caseDetail,
  onComplete,
}) => {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [showEvidence, setShowEvidence] = useState(false);
  
  const decideFieldMutation = useDecideField();
  const approveCaseMutation = useApproveCase();
  const undoDecisionMutation = useUndoDecision();

  // Extract fields from the case detail
  const fields = [
    { name: 'invoice_number', value: caseDetail.extracted.invoice_number || '', label: 'Invoice Number' },
    { name: 'invoice_date', value: caseDetail.extracted.invoice_date || '', label: 'Invoice Date' },
    { name: 'vendor_name', value: caseDetail.extracted.vendor_name || '', label: 'Vendor Name' },
    { name: 'subtotal', value: caseDetail.extracted.subtotal?.toString() || '', label: 'Subtotal' },
    { name: 'tax', value: caseDetail.extracted.tax?.toString() || '', label: 'Tax' },
    { name: 'total', value: caseDetail.extracted.total?.toString() || '', label: 'Total' },
  ].filter(field => field.value); // Only show fields that have values

  const currentField = fields[currentFieldIndex];
  const hasValidationIssues = caseDetail.validation_result.hard_flags.length > 0 || 
                              caseDetail.validation_result.soft_flags.length > 0;

  const handleFieldDecision = async (field: string, value: string, source: string) => {
    try {
      await decideFieldMutation.mutateAsync({
        caseId,
        field,
        chosen_value: value,
        source,
      });
      
      // Move to next field if not the last one
      if (currentFieldIndex < fields.length - 1) {
        setCurrentFieldIndex(currentFieldIndex + 1);
      }
    } catch (error) {
      console.error('Failed to decide field:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await approveCaseMutation.mutateAsync(caseId);
      onComplete();
    } catch (error) {
      console.error('Failed to approve case:', error);
    }
  };

  const handleUndo = async () => {
    try {
      await undoDecisionMutation.mutateAsync(caseId);
      // Move back to previous field if possible
      if (currentFieldIndex > 0) {
        setCurrentFieldIndex(currentFieldIndex - 1);
      }
    } catch (error) {
      console.error('Failed to undo decision:', error);
    }
  };

  const handleNext = () => {
    if (currentFieldIndex < fields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
    }
  };

  if (!currentField) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No fields to review</p>
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Review Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Field {currentFieldIndex + 1} of {fields.length}: {currentField.label}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentFieldIndex === 0}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                ← Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentFieldIndex >= fields.length - 1}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                Next →
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentFieldIndex + 1) / fields.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Field Review */}
        <div className="flex-1 p-4">
          <FieldReviewItemIntegrated
            field={currentField.name}
            label={currentField.label}
            currentValue={currentField.value}
            alternatives={[]} // TODO: Add alternatives from OCR candidates
            confidence={caseDetail.confidence}
            onDecide={(value, source) => handleFieldDecision(currentField.name, value, source)}
            isLoading={decideFieldMutation.isPending}
          />
        </div>

        {/* Actions */}
        <div className="p-4 bg-white border-t">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={undoDecisionMutation.isPending}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300"
              >
                ↶ Undo Last
              </button>
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {showEvidence ? 'Hide' : 'Show'} Evidence
              </button>
            </div>
            
            <div className="flex gap-2">
              {hasValidationIssues && (
                <div className="text-sm text-red-600 mr-4">
                  ⚠️ {caseDetail.validation_result.hard_flags.length} hard flags, {caseDetail.validation_result.soft_flags.length} soft flags
                </div>
              )}
              
              <button
                onClick={handleApprove}
                disabled={!caseDetail.validation_result.can_approve || approveCaseMutation.isPending}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {approveCaseMutation.isPending ? 'Approving...' : 'Approve Case'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Panel */}
      {showEvidence && (
        <div className="w-96 bg-white border-l">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Evidence & Validation</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Validation Issues */}
            {caseDetail.validation_result.hard_flags.length > 0 && (
              <div className="bg-red-50 p-3 rounded">
                <h4 className="font-semibold text-red-800 mb-2">Hard Flags</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {caseDetail.validation_result.hard_flags.map((flag, index) => (
                    <li key={index}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {caseDetail.validation_result.soft_flags.length > 0 && (
              <div className="bg-yellow-50 p-3 rounded">
                <h4 className="font-semibold text-yellow-800 mb-2">Soft Flags</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {caseDetail.validation_result.soft_flags.map((flag, index) => (
                    <li key={index}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Line Items */}
            {caseDetail.extracted.line_items.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Line Items</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {caseDetail.extracted.line_items.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                      <div className="font-medium">{item.description}</div>
                      <div className="text-gray-600">
                        Qty: {item.quantity} × ${item.unit_price} = ${item.line_total}
                      </div>
                      {item.sku && <div className="text-gray-500">SKU: {item.sku}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { toast } from '@common/components/molecules/Toast';

interface Field {
  name: string;
  value: string;
  confidence: number;
  alternatives: string[];
  evidence: string;
  needsAttention: boolean;
}

interface FieldReviewItemProps {
  field: Field;
  onAccept: () => void;
  onEdit?: () => void;
  onShowEvidence: () => void;
}

export const FieldReviewItem: React.FC<FieldReviewItemProps> = ({
  field,
  onAccept,
  onEdit: _onEdit,
  onShowEvidence,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.value);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success-dark bg-success-50 dark:bg-success-900/20';
    if (confidence >= 70) return 'text-warning-dark bg-warning-50 dark:bg-warning-900/20';
    return 'text-error-dark bg-error-50 dark:bg-error-900/20';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 90) return '🟢';
    if (confidence >= 70) return '🟡';
    return '🔴';
  };

  const handleSaveEdit = () => {
    // Save field value - in Full build this calls the API
    toast.success(`Field "${field.name}" updated to "${editValue}"`);
    setIsEditing(false);
  };

  const handleLocateOnPage = () => {
    // Document highlight feature - requires Full build with document viewer
    toast.info(`Locating "${field.name}" on document. This feature requires the Full build with document viewer.`);
  };

  return (
    <div className="bg-surface-elevated rounded-lg shadow-sm border border-border p-4 mb-4">
      {/* Field Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold capitalize text-text-primary">
            {field.name.replace(/_/g, ' ')}
          </span>
          <span className={`px-2 py-1 rounded text-sm font-medium ${getConfidenceColor(field.confidence)}`}>
            {getConfidenceIcon(field.confidence)} {field.confidence}%
          </span>
        </div>
        <button
          onClick={handleLocateOnPage}
          className="text-sm text-accent hover:text-info-dark"
        >
          📍 Locate
        </button>
      </div>

      {/* Field Value */}
      {!isEditing ? (
        <div className="mb-3">
          <div className="text-2xl font-mono bg-surface-base p-3 rounded text-text-primary">
            {field.value}
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-2xl font-mono bg-surface-base p-3 rounded border-2 border-accent text-text-primary"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
            }}
          />
        </div>
      )}

      {/* Alternatives */}
      {field.alternatives.length > 1 && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-text-secondary mb-1">Alternatives:</p>
          <div className="flex flex-wrap gap-2">
            {field.alternatives.slice(0, 3).map((alt, i) => (
              <button
                key={i}
                onClick={() => setEditValue(alt)}
                className="px-3 py-1 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded text-sm text-text-primary"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Preview */}
      <div className="mb-3">
        <button
          onClick={onShowEvidence}
          className="text-sm text-accent hover:text-info-dark"
        >
          📋 View Evidence
        </button>
        <p className="text-sm text-text-secondary mt-1">{field.evidence}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isEditing ? (
          <>
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-2 bg-success text-white rounded hover:bg-success-dark"
            >
              ✓ Accept (A)
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
            >
              ✏️ Edit (E)
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleSaveEdit}
              className="flex-1 px-4 py-2 bg-success text-white rounded hover:bg-success-dark"
            >
              💾 Save (Enter)
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditValue(field.value);
              }}
              className="px-4 py-2 bg-secondary-600 text-white rounded hover:bg-secondary-700"
            >
              Cancel (Esc)
            </button>
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';

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
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 90) return '🟢';
    if (confidence >= 70) return '🟡';
    return '🔴';
  };

  const handleSaveEdit = () => {
    // Save edited value
    console.log('Save edit:', editValue);
    setIsEditing(false);
  };

  const handleLocateOnPage = () => {
    // Highlight field on document
    console.log('Locate on page:', field.name);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      {/* Field Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold capitalize">
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
          <div className="text-2xl font-mono bg-gray-50 p-3 rounded">
            {field.value}
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-2xl font-mono bg-gray-50 p-3 rounded border-2 border-accent"
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
          <p className="text-sm font-semibold text-gray-700 mb-1">Alternatives:</p>
          <div className="flex flex-wrap gap-2">
            {field.alternatives.slice(0, 3).map((alt, i) => (
              <button
                key={i}
                onClick={() => setEditValue(alt)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
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
        <p className="text-sm text-gray-600 mt-1">{field.evidence}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isEditing ? (
          <>
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              💾 Save (Enter)
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditValue(field.value);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel (Esc)
            </button>
          </>
        )}
      </div>
    </div>
  );
};

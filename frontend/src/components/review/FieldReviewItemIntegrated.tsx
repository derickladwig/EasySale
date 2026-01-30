import React, { useState } from 'react';

interface FieldReviewItemProps {
  field?: string;
  label: string;
  currentValue: string;
  alternatives: string[];
  confidence: number;
  onDecide: (value: string, source: string) => void;
  isLoading?: boolean;
}

export const FieldReviewItem: React.FC<FieldReviewItemProps> = ({
  field: _field,
  label,
  currentValue,
  alternatives,
  confidence,
  onDecide,
  isLoading = false,
}) => {
  const [customValue, setCustomValue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleAcceptCurrent = () => {
    onDecide(currentValue, 'ocr_primary');
  };

  const handleSelectAlternative = (value: string, index: number) => {
    onDecide(value, `ocr_candidate_${index}`);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onDecide(customValue.trim(), 'manual_entry');
      setCustomValue('');
      setShowCustomInput(false);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'text-green-600';
    if (conf >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">{label}</h3>
        <p className="text-sm text-gray-600">
          Review the extracted value and choose the correct option
        </p>
      </div>

      {/* Current Value */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Extracted Value</span>
          <span className={`text-sm font-semibold ${getConfidenceColor(confidence)}`}>
            {confidence}% confidence
          </span>
        </div>
        <div className="bg-info-50 border border-info-200 rounded p-4 mb-3">
          <div className="text-lg font-mono">{currentValue || '(empty)'}</div>
        </div>
        <button
          onClick={handleAcceptCurrent}
          disabled={isLoading || !currentValue}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : '✓ Accept This Value'}
        </button>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Alternative Values</h4>
          <div className="space-y-2">
            {alternatives.map((alt, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 border rounded p-3">
                <span className="font-mono">{alt}</span>
                <button
                  onClick={() => handleSelectAlternative(alt, index)}
                  disabled={isLoading}
                  className="px-3 py-1 bg-accent text-white rounded hover:bg-accent-hover disabled:bg-gray-300 text-sm"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Input */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Manual Entry</h4>
        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ✏️ Enter Custom Value
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}...`}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-accent focus:border-accent"
              onKeyPress={(e) => e.key === 'Enter' && handleCustomSubmit()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCustomSubmit}
                disabled={!customValue.trim() || isLoading}
                className="flex-1 px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:bg-gray-300"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomValue('');
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-6 pt-4 border-t text-xs text-gray-500">
        <p><kbd className="bg-gray-100 px-1 rounded">Enter</kbd> Accept current value</p>
        <p><kbd className="bg-gray-100 px-1 rounded">Tab</kbd> Next field</p>
        <p><kbd className="bg-gray-100 px-1 rounded">Shift+Tab</kbd> Previous field</p>
      </div>
    </div>
  );
};

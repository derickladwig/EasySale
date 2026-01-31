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
    if (conf >= 90) return 'text-success-dark';
    if (conf >= 70) return 'text-warning-dark';
    return 'text-error-dark';
  };

  return (
    <div className="bg-surface-elevated rounded-lg shadow-sm border border-border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary mb-2">{label}</h3>
        <p className="text-sm text-text-secondary">
          Review the extracted value and choose the correct option
        </p>
      </div>

      {/* Current Value */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-secondary">Extracted Value</span>
          <span className={`text-sm font-semibold ${getConfidenceColor(confidence)}`}>
            {confidence}% confidence
          </span>
        </div>
        <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-dark rounded p-4 mb-3">
          <div className="text-lg font-mono text-text-primary">{currentValue || '(empty)'}</div>
        </div>
        <button
          onClick={handleAcceptCurrent}
          disabled={isLoading || !currentValue}
          className="w-full px-4 py-2 bg-success text-white rounded hover:bg-success-dark disabled:bg-secondary-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : '✓ Accept This Value'}
        </button>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-text-secondary mb-2">Alternative Values</h4>
          <div className="space-y-2">
            {alternatives.map((alt, index) => (
              <div key={index} className="flex items-center justify-between bg-surface-base border border-border rounded p-3">
                <span className="font-mono text-text-primary">{alt}</span>
                <button
                  onClick={() => handleSelectAlternative(alt, index)}
                  disabled={isLoading}
                  className="px-3 py-1 bg-accent text-white rounded hover:bg-accent-hover disabled:bg-secondary-300 text-sm"
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
        <h4 className="text-sm font-medium text-text-secondary mb-2">Manual Entry</h4>
        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className="w-full px-4 py-2 bg-secondary-600 text-white rounded hover:bg-secondary-700"
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
              className="w-full px-3 py-2 border border-border rounded bg-surface-base text-text-primary focus:ring-2 focus:ring-accent focus:border-accent"
              onKeyPress={(e) => e.key === 'Enter' && handleCustomSubmit()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCustomSubmit}
                disabled={!customValue.trim() || isLoading}
                className="flex-1 px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:bg-secondary-300"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomValue('');
                }}
                className="px-4 py-2 bg-secondary-400 text-white rounded hover:bg-secondary-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-6 pt-4 border-t border-border text-xs text-text-tertiary">
        <p><kbd className="bg-surface-base px-1 rounded">Enter</kbd> Accept current value</p>
        <p><kbd className="bg-surface-base px-1 rounded">Tab</kbd> Next field</p>
        <p><kbd className="bg-surface-base px-1 rounded">Shift+Tab</kbd> Previous field</p>
      </div>
    </div>
  );
};

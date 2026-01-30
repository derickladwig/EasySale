import React from 'react';

interface EvidenceCardProps {
  evidence: string;
  alternatives: string[];
  onClose: () => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  alternatives,
  onClose,
}) => {
  // Parse evidence string into structured data
  const evidenceItems = evidence.split(',').map(e => e.trim());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-base rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Evidence Breakdown</h3>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary text-2xl"
          >
            ×
          </button>
        </div>

        {/* Evidence Details */}
        <div className="p-4">
          <div className="mb-4">
            <h4 className="font-semibold text-text-primary mb-2">Why this value was chosen:</h4>
            <div className="space-y-2">
              {evidenceItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <p className="text-text-secondary">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Types */}
          <div className="mb-4">
            <h4 className="font-semibold text-text-primary mb-2">Evidence Types:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-info-50 dark:bg-info-900/20 p-3 rounded">
                <p className="text-sm font-semibold text-info-dark">Lexicon Match</p>
                <p className="text-xs text-accent">Matched known pattern</p>
              </div>
              <div className="bg-success-50 dark:bg-success-900/20 p-3 rounded">
                <p className="text-sm font-semibold text-success-dark">Proximity</p>
                <p className="text-xs text-success">Found near label text</p>
              </div>
              <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded">
                <p className="text-sm font-semibold text-primary-700">Zone Prior</p>
                <p className="text-xs text-primary-600">Expected in this zone</p>
              </div>
              <div className="bg-warning-50 dark:bg-warning-900/20 p-3 rounded">
                <p className="text-sm font-semibold text-warning-dark">Consensus</p>
                <p className="text-xs text-warning">Multiple passes agreed</p>
              </div>
            </div>
          </div>

          {/* Alternatives */}
          {alternatives.length > 1 && (
            <div className="mb-4">
              <h4 className="font-semibold text-text-primary mb-2">Alternative Values:</h4>
              <div className="space-y-2">
                {alternatives.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface-elevated p-2 rounded">
                    <span className="font-mono text-text-primary">{alt}</span>
                    <span className="text-sm text-text-tertiary">
                      {i === 0 ? 'Selected' : `Alternative ${i}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence Explanation */}
          <div className="bg-info-50 dark:bg-info-900/20 p-3 rounded">
            <h4 className="font-semibold text-info-dark mb-1">Confidence Score</h4>
            <p className="text-sm text-info-dark">
              The confidence score is calculated based on the strength of evidence,
              consensus across OCR passes, and historical accuracy for this vendor.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-elevated">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

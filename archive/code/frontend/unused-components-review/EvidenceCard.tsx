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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Evidence Breakdown</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Evidence Details */}
        <div className="p-4">
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Why this value was chosen:</h4>
            <div className="space-y-2">
              {evidenceItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <p className="text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Types */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Evidence Types:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm font-semibold text-blue-800">Lexicon Match</p>
                <p className="text-xs text-blue-600">Matched known pattern</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm font-semibold text-green-800">Proximity</p>
                <p className="text-xs text-green-600">Found near label text</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-sm font-semibold text-purple-800">Zone Prior</p>
                <p className="text-xs text-purple-600">Expected in this zone</p>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <p className="text-sm font-semibold text-orange-800">Consensus</p>
                <p className="text-xs text-orange-600">Multiple passes agreed</p>
              </div>
            </div>
          </div>

          {/* Alternatives */}
          {alternatives.length > 1 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Alternative Values:</h4>
              <div className="space-y-2">
                {alternatives.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="font-mono">{alt}</span>
                    <span className="text-sm text-gray-500">
                      {i === 0 ? 'Selected' : `Alternative ${i}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence Explanation */}
          <div className="bg-blue-50 p-3 rounded">
            <h4 className="font-semibold text-blue-800 mb-1">Confidence Score</h4>
            <p className="text-sm text-blue-700">
              The confidence score is calculated based on the strength of evidence,
              consensus across OCR passes, and historical accuracy for this vendor.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

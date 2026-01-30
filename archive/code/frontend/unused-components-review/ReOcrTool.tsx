import React, { useState } from 'react';
import { RegionSelector } from './RegionSelector';

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ReOcrToolProps {
  caseId: string;
  onComplete: () => void;
}

export const ReOcrTool: React.FC<ReOcrToolProps> = ({ caseId, onComplete }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedProfile, setSelectedProfile] = useState('balanced');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStartSelection = () => {
    setIsSelecting(true);
  };

  const handleRegionSelected = (region: Region) => {
    setSelectedRegion(region);
    setIsSelecting(false);
  };

  const handleReOcr = async () => {
    if (!selectedRegion) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Call re-OCR API
      const response = await fetch(`/api/cases/${caseId}/reocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: selectedRegion,
          profile: selectedProfile,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    } catch (error) {
      console.error('Re-OCR failed:', error);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Targeted Re-OCR</h3>
          <button
            onClick={onComplete}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded mb-4">
            <p className="text-sm text-blue-800">
              Select a region on the document to re-process with a different OCR profile.
              This is useful for low-quality scans or unusual fonts.
            </p>
          </div>

          {/* Document with Region Selector */}
          <div className="mb-4">
            <RegionSelector
              isSelecting={isSelecting}
              selectedRegion={selectedRegion}
              onRegionSelected={handleRegionSelected}
            />
          </div>

          {/* Region Info */}
          {selectedRegion && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm font-semibold mb-1">Selected Region:</p>
              <p className="text-xs text-gray-600">
                Position: ({selectedRegion.x}, {selectedRegion.y}) | 
                Size: {selectedRegion.width} × {selectedRegion.height}
              </p>
            </div>
          )}

          {/* Profile Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">OCR Profile:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedProfile('fast')}
                className={`p-3 rounded border-2 ${
                  selectedProfile === 'fast'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="font-semibold">Fast</p>
                <p className="text-xs text-gray-600">~2 seconds</p>
              </button>
              <button
                onClick={() => setSelectedProfile('balanced')}
                className={`p-3 rounded border-2 ${
                  selectedProfile === 'balanced'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="font-semibold">Balanced</p>
                <p className="text-xs text-gray-600">~5 seconds</p>
              </button>
              <button
                onClick={() => setSelectedProfile('high_accuracy')}
                className={`p-3 rounded border-2 ${
                  selectedProfile === 'high_accuracy'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="font-semibold">High Accuracy</p>
                <p className="text-xs text-gray-600">~10 seconds</p>
              </button>
            </div>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">Processing...</span>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            {!selectedRegion ? (
              <button
                onClick={handleStartSelection}
                disabled={isSelecting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSelecting ? 'Selecting Region...' : 'Select Region'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setSelectedRegion(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300"
                >
                  Clear
                </button>
                <button
                  onClick={handleReOcr}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
                >
                  {isProcessing ? 'Processing...' : 'Re-OCR Region'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

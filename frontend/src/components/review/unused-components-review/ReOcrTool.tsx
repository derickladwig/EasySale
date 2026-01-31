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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-base rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Targeted Re-OCR</h3>
          <button
            onClick={onComplete}
            className="text-text-tertiary hover:text-text-primary text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Instructions */}
          <div className="bg-info-50 p-3 rounded mb-4">
            <p className="text-sm text-info-dark">
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
            <div className="mb-4 p-3 bg-surface-base rounded">
              <p className="text-sm font-semibold mb-1">Selected Region:</p>
              <p className="text-xs text-text-secondary">
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
                    ? 'border-accent bg-info-50'
                    : 'border-border-light hover:bg-surface-base'
                }`}
              >
                <p className="font-semibold">Fast</p>
                <p className="text-xs text-text-secondary">~2 seconds</p>
              </button>
              <button
                onClick={() => setSelectedProfile('balanced')}
                className={`p-3 rounded border-2 ${
                  selectedProfile === 'balanced'
                    ? 'border-accent bg-info-50'
                    : 'border-border-light hover:bg-surface-base'
                }`}
              >
                <p className="font-semibold">Balanced</p>
                <p className="text-xs text-text-secondary">~5 seconds</p>
              </button>
              <button
                onClick={() => setSelectedProfile('high_accuracy')}
                className={`p-3 rounded border-2 ${
                  selectedProfile === 'high_accuracy'
                    ? 'border-accent bg-info-50'
                    : 'border-border-light hover:bg-surface-base'
                }`}
              >
                <p className="font-semibold">High Accuracy</p>
                <p className="text-xs text-text-secondary">~10 seconds</p>
              </button>
            </div>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">Processing...</span>
                <span className="text-sm text-text-secondary">{progress}%</span>
              </div>
              <div className="w-full bg-secondary-200 rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-surface-base">
          <div className="flex gap-2">
            {!selectedRegion ? (
              <button
                onClick={handleStartSelection}
                disabled={isSelecting}
                className="flex-1 px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:bg-secondary-300"
              >
                {isSelecting ? 'Selecting Region...' : 'Select Region'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setSelectedRegion(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-secondary-600 text-white rounded hover:bg-secondary-700 disabled:bg-secondary-300"
                >
                  Clear
                </button>
                <button
                  onClick={handleReOcr}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-success-600 text-white rounded hover:bg-success-700 disabled:bg-secondary-300"
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

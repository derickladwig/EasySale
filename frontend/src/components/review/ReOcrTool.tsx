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
  const [error, setError] = useState<string | null>(null);
  const [isStubbed, setIsStubbed] = useState(false);

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
    setError(null);
    setIsStubbed(false);

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
        const data = await response.json();
        
        // Check if this is a stub response
        if (data.message && data.message.includes('not yet implemented')) {
          setIsStubbed(true);
          setError('Re-OCR requires backend implementation. You can continue your workflow.');
        } else {
          // Success - real implementation
          setTimeout(() => {
            onComplete();
          }, 500);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        setError(errorData.message || 'Failed to re-OCR region');
      }
    } catch (error) {
      console.error('Re-OCR failed:', error);
      setError('Network error: Unable to connect to server');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-base rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Targeted Re-OCR</h3>
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
          <div className="bg-info-50 dark:bg-info-900/20 p-3 rounded mb-4">
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
            <div className="mb-4 p-3 bg-surface-elevated rounded">
              <p className="text-sm font-semibold text-text-primary mb-1">Selected Region:</p>
              <p className="text-xs text-text-secondary">
                Position: ({selectedRegion.x}, {selectedRegion.y}) | 
                Size: {selectedRegion.width} × {selectedRegion.height}
              </p>
            </div>
          )}

          {/* Profile Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-text-primary mb-2">OCR Profile:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedProfile('fast')}
                className={`p-3 rounded border-2 ${
                  selectedProfile === 'fast'
                    ? 'border-accent bg-info-50 dark:bg-info-900/20'
                    : 'border-border hover:bg-surface-elevated'
                }`}
              >
                <p className="font-semibold text-text-primary">Fast</p>
                <p className="text-xs text-text-secondary">~2 seconds</p>
              </button>
              <button
                onClick={() => setSelectedProfile('balanced')}
                className={`p-3 rounded border-2 ${
                  selectedProfile === 'balanced'
                    ? 'border-accent bg-info-50 dark:bg-info-900/20'
                    : 'border-border hover:bg-surface-elevated'
                }`}
              >
                <p className="font-semibold text-text-primary">Balanced</p>
                <p className="text-xs text-text-secondary">~5 seconds</p>
              </button>
              <button
                onClick={() => setSelectedProfile('high_accuracy')}
                className={`p-3 rounded border-2 ${
                  selectedProfile === 'high_accuracy'
                    ? 'border-accent bg-info-50 dark:bg-info-900/20'
                    : 'border-border hover:bg-surface-elevated'
                }`}
              >
                <p className="font-semibold text-text-primary">High Accuracy</p>
                <p className="text-xs text-text-secondary">~10 seconds</p>
              </button>
            </div>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-text-primary">Processing...</span>
                <span className="text-sm text-text-secondary">{progress}%</span>
              </div>
              <div className="w-full bg-surface-elevated rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error/Stub Message */}
          {error && (
            <div className={`mb-4 p-3 rounded ${isStubbed ? 'bg-warning-50 border border-warning-200' : 'bg-error-50 border border-error-200'}`}>
              <div className="flex items-start gap-2">
                <span className={`text-lg ${isStubbed ? 'text-warning-600' : 'text-error-600'}`}>
                  {isStubbed ? '⚠️' : '❌'}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isStubbed ? 'text-warning-800' : 'text-error-800'} mb-1`}>
                    {isStubbed ? 'Feature Not Available' : 'Error'}
                  </p>
                  <p className={`text-sm ${isStubbed ? 'text-warning-700' : 'text-error-700'}`}>
                    {error}
                  </p>
                  {isStubbed && (
                    <p className="text-xs text-warning-600 mt-2">
                      This feature requires backend implementation. You can continue your workflow.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-elevated">
          <div className="flex gap-2">
            {!selectedRegion ? (
              <button
                onClick={handleStartSelection}
                disabled={isSelecting}
                className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover disabled:bg-secondary-500 disabled:opacity-50"
              >
                {isSelecting ? 'Selecting Region...' : 'Select Region'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setSelectedRegion(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-secondary-600 text-text-primary rounded hover:bg-secondary-700 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  onClick={handleReOcr}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-success text-accent-foreground rounded hover:bg-success-dark disabled:opacity-50"
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

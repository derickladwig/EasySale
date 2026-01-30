import React, { useState } from 'react';
import { ZoneEditor } from './ZoneEditor';
import { RawOcrViewer } from './RawOcrViewer';

interface PowerModeViewProps {
  caseId: string;
}

export const PowerModeView: React.FC<PowerModeViewProps> = ({ caseId }) => {
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [showAllFields, setShowAllFields] = useState(true);
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Document with Zones */}
      <div className="w-1/2 bg-white border-r">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Power Mode</h2>
          <p className="text-sm text-gray-600">Advanced review controls</p>
        </div>
        
        <div className="p-4">
          {/* Document with zone overlays */}
          <div className="bg-gray-100 h-[600px] relative">
            <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500">
              Document with zone overlays
            </p>
            
            {/* Zone overlays would be rendered here */}
            <div className="absolute top-10 left-10 w-40 h-20 border-2 border-accent bg-info-100 bg-opacity-30">
              <span className="text-xs bg-accent text-white px-1">Header</span>
            </div>
            <div className="absolute bottom-10 right-10 w-40 h-20 border-2 border-green-500 bg-green-100 bg-opacity-30">
              <span className="text-xs bg-green-500 text-white px-1">Totals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Controls */}
      <div className="w-1/2 flex flex-col overflow-y-auto">
        {/* Confidence Threshold Control */}
        <div className="p-4 bg-white border-b">
          <h3 className="font-semibold mb-2">Confidence Threshold</h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="flex-1"
            />
            <span className="font-mono text-lg">{confidenceThreshold}%</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Show fields with confidence below this threshold
          </p>
        </div>

        {/* View Options */}
        <div className="p-4 bg-white border-b">
          <h3 className="font-semibold mb-2">View Options</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showAllFields}
                onChange={(e) => setShowAllFields(e.target.checked)}
                className="rounded"
              />
              <span>Show all fields (including high confidence)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showZoneEditor}
                onChange={(e) => setShowZoneEditor(e.target.checked)}
                className="rounded"
              />
              <span>Show zone editor</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showRawOcr}
                onChange={(e) => setShowRawOcr(e.target.checked)}
                className="rounded"
              />
              <span>Show raw OCR output</span>
            </label>
          </div>
        </div>

        {/* Zone Editor */}
        {showZoneEditor && (
          <div className="p-4 bg-white border-b">
            <ZoneEditor
              caseId={caseId}
              selectedZone={selectedZone}
              onZoneSelect={setSelectedZone}
            />
          </div>
        )}

        {/* Raw OCR Viewer */}
        {showRawOcr && (
          <div className="p-4 bg-white border-b">
            <RawOcrViewer caseId={caseId} />
          </div>
        )}

        {/* Evidence Breakdown */}
        <div className="p-4 bg-white border-b">
          <h3 className="font-semibold mb-2">Evidence Breakdown</h3>
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Lexicon Matches</span>
                <span className="text-sm text-gray-600">8/10 fields</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-accent h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Consensus</span>
                <span className="text-sm text-gray-600">7/10 fields</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Zone Priors</span>
                <span className="text-sm text-gray-600">9/10 fields</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Template Override */}
        <div className="p-4 bg-white border-b">
          <h3 className="font-semibold mb-2">Vendor Template</h3>
          <select className="w-full p-2 border rounded">
            <option>Default Template</option>
            <option>Acme Corp Template</option>
            <option>Custom Template 1</option>
            <option>Custom Template 2</option>
          </select>
          <button className="mt-2 w-full px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover">
            Apply Template
          </button>
        </div>

        {/* Advanced Actions */}
        <div className="p-4 bg-white">
          <h3 className="font-semibold mb-2">Advanced Actions</h3>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Export Debug Data
            </button>
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              View Artifact Chain
            </button>
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Recalibrate Confidence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

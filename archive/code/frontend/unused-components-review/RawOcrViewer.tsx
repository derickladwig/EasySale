import React, { useState, useEffect } from 'react';

interface OcrArtifact {
  id: string;
  variant: string;
  zone: string;
  profile: string;
  text: string;
  confidence: number;
  word_count: number;
}

interface RawOcrViewerProps {
  caseId: string;
}

export const RawOcrViewer: React.FC<RawOcrViewerProps> = ({ caseId }) => {
  const [artifacts, setArtifacts] = useState<OcrArtifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [filterVariant, setFilterVariant] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');

  useEffect(() => {
    // Load OCR artifacts
    // Mock data for now
    setArtifacts([
      {
        id: 'ocr-1',
        variant: 'grayscale',
        zone: 'HeaderFields',
        profile: 'balanced',
        text: 'Invoice #: INV-12345\nDate: 2026-01-25\nVendor: Acme Corp',
        confidence: 95,
        word_count: 8,
      },
      {
        id: 'ocr-2',
        variant: 'adaptive_threshold',
        zone: 'HeaderFields',
        profile: 'high_accuracy',
        text: 'Invoice #: INV-I2345\nDate: 2026-01-25\nVendor: Acme Corp',
        confidence: 88,
        word_count: 8,
      },
      {
        id: 'ocr-3',
        variant: 'grayscale',
        zone: 'TotalsBox',
        profile: 'balanced',
        text: 'Subtotal: $1,000.00\nTax: $100.00\nTotal: $1,100.00',
        confidence: 92,
        word_count: 9,
      },
    ]);
  }, [caseId]);

  const filteredArtifacts = artifacts.filter((a) => {
    if (filterVariant !== 'all' && a.variant !== filterVariant) return false;
    if (filterZone !== 'all' && a.zone !== filterZone) return false;
    return true;
  });

  const selectedArtifactData = artifacts.find((a) => a.id === selectedArtifact);

  return (
    <div>
      <h3 className="font-semibold mb-3">Raw OCR Output</h3>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs text-gray-600">Variant:</label>
          <select
            value={filterVariant}
            onChange={(e) => setFilterVariant(e.target.value)}
            className="w-full p-1 text-sm border rounded"
          >
            <option value="all">All Variants</option>
            <option value="grayscale">Grayscale</option>
            <option value="adaptive_threshold">Adaptive Threshold</option>
            <option value="denoise">Denoise</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Zone:</label>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="w-full p-1 text-sm border rounded"
          >
            <option value="all">All Zones</option>
            <option value="HeaderFields">Header</option>
            <option value="TotalsBox">Totals</option>
            <option value="LineItemsTable">Line Items</option>
          </select>
        </div>
      </div>

      {/* Artifact List */}
      <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
        {filteredArtifacts.map((artifact) => (
          <div
            key={artifact.id}
            className={`p-2 rounded border cursor-pointer ${
              selectedArtifact === artifact.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedArtifact(artifact.id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">
                {artifact.variant} / {artifact.zone}
              </span>
              <span className="text-xs text-gray-600">{artifact.confidence}%</span>
            </div>
            <div className="text-xs text-gray-500">
              Profile: {artifact.profile} | Words: {artifact.word_count}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Artifact Details */}
      {selectedArtifactData && (
        <div className="bg-gray-50 p-3 rounded border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">OCR Output</h4>
            <button
              onClick={() => navigator.clipboard.writeText(selectedArtifactData.text)}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Copy
            </button>
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap bg-white p-2 rounded border">
            {selectedArtifactData.text}
          </pre>
          <div className="mt-2 text-xs text-gray-600">
            <p>Variant: {selectedArtifactData.variant}</p>
            <p>Zone: {selectedArtifactData.zone}</p>
            <p>Profile: {selectedArtifactData.profile}</p>
            <p>Confidence: {selectedArtifactData.confidence}%</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
        <p className="text-blue-800">
          Showing {filteredArtifacts.length} of {artifacts.length} OCR artifacts
        </p>
      </div>
    </div>
  );
};

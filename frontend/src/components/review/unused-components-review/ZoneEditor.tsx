import React, { useState } from 'react';

interface Zone {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface ZoneEditorProps {
  caseId?: string;
  selectedZone: string | null;
  onZoneSelect: (zoneId: string | null) => void;
}

export const ZoneEditor: React.FC<ZoneEditorProps> = ({
  caseId: _caseId,
  selectedZone,
  onZoneSelect,
}) => {
  const [zones] = useState<Zone[]>([
    { id: 'zone-1', type: 'HeaderFields', x: 10, y: 10, width: 200, height: 100, confidence: 95 },
    { id: 'zone-2', type: 'TotalsBox', x: 300, y: 400, width: 150, height: 80, confidence: 92 },
    { id: 'zone-3', type: 'LineItemsTable', x: 10, y: 150, width: 400, height: 200, confidence: 88 },
  ]);

  const [isAddingZone, setIsAddingZone] = useState(false);

  const handleAddZone = () => {
    setIsAddingZone(true);
    // Enable drawing mode on document
  };

  const handleDeleteZone = (zoneId: string) => {
    // Delete zone
    console.log('Delete zone:', zoneId);
  };

  const handleAdjustZone = (zoneId: string) => {
    // Enable adjustment mode
    console.log('Adjust zone:', zoneId);
  };

  const getZoneColor = (type: string) => {
    const colors: Record<string, string> = {
      HeaderFields: 'border-accent bg-info-100',
      TotalsBox: 'border-green-500 bg-green-100',
      LineItemsTable: 'border-purple-500 bg-purple-100',
      FooterNotes: 'border-orange-500 bg-orange-100',
    };
    return colors[type] || 'border-gray-500 bg-gray-100';
  };

  return (
    <div>
      <h3 className="font-semibold mb-3">Zone Editor</h3>

      {/* Zone List */}
      <div className="space-y-2 mb-4">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`p-3 rounded border-2 cursor-pointer ${
              selectedZone === zone.id ? 'border-accent bg-info-50' : 'border-gray-200'
            }`}
            onClick={() => onZoneSelect(zone.id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{zone.type}</span>
              <span className="text-sm text-gray-600">{zone.confidence}%</span>
            </div>
            <div className="text-xs text-gray-500">
              Position: ({zone.x}, {zone.y}) Size: {zone.width}×{zone.height}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdjustZone(zone.id);
                }}
                className="text-xs px-2 py-1 bg-info-100 text-info-dark rounded hover:bg-info-200"
              >
                Adjust
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteZone(zone.id);
                }}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Zone */}
      <button
        onClick={handleAddZone}
        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        + Add New Zone
      </button>

      {isAddingZone && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            Click and drag on the document to create a new zone
          </p>
          <button
            onClick={() => setIsAddingZone(false)}
            className="mt-2 text-sm text-yellow-700 hover:text-yellow-900"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Zone Types */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Zone Types:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`p-2 rounded ${getZoneColor('HeaderFields')}`}>
            HeaderFields
          </div>
          <div className={`p-2 rounded ${getZoneColor('TotalsBox')}`}>
            TotalsBox
          </div>
          <div className={`p-2 rounded ${getZoneColor('LineItemsTable')}`}>
            LineItemsTable
          </div>
          <div className={`p-2 rounded ${getZoneColor('FooterNotes')}`}>
            FooterNotes
          </div>
        </div>
      </div>
    </div>
  );
};

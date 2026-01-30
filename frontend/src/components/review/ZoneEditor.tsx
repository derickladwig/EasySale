import React, { useState, useMemo } from 'react';

interface Zone {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface ShieldOverlap {
  shieldId: string;
  shieldType: string;
  overlapRatio: number;
  isCritical: boolean;
}

interface ZoneEditorProps {
  caseId?: string;
  selectedZone: string | null;
  onZoneSelect: (zoneId: string | null) => void;
  /** Optional: shields to check for overlaps */
  shields?: Array<{
    id: string;
    shield_type: string;
    normalized_bbox: { x: number; y: number; width: number; height: number };
  }>;
}

// Critical zones that trigger warnings when shields overlap
const CRITICAL_ZONE_TYPES = ['TotalsBox', 'LineItemsTable'];
const OVERLAP_WARN_THRESHOLD = 0.05; // 5%
const OVERLAP_CRITICAL_THRESHOLD = 0.10; // 10%

// Calculate overlap ratio between two bounding boxes
function calculateOverlapRatio(
  shield: { x: number; y: number; width: number; height: number },
  zone: { x: number; y: number; width: number; height: number }
): number {
  const xOverlap = Math.max(0, Math.min(shield.x + shield.width, zone.x + zone.width) - Math.max(shield.x, zone.x));
  const yOverlap = Math.max(0, Math.min(shield.y + shield.height, zone.y + zone.height) - Math.max(shield.y, zone.y));
  const intersection = xOverlap * yOverlap;
  const shieldArea = shield.width * shield.height;
  return shieldArea > 0 ? intersection / shieldArea : 0;
}

export const ZoneEditor: React.FC<ZoneEditorProps> = ({
  caseId: _caseId,
  selectedZone,
  onZoneSelect,
  shields = [],
}) => {
  const [zones] = useState<Zone[]>([
    { id: 'zone-1', type: 'HeaderFields', x: 10, y: 10, width: 200, height: 100, confidence: 95 },
    { id: 'zone-2', type: 'TotalsBox', x: 300, y: 400, width: 150, height: 80, confidence: 92 },
    { id: 'zone-3', type: 'LineItemsTable', x: 10, y: 150, width: 400, height: 200, confidence: 88 },
  ]);

  const [isAddingZone, setIsAddingZone] = useState(false);

  // Calculate shield overlaps for each zone
  const zoneOverlaps = useMemo(() => {
    const overlaps: Record<string, ShieldOverlap[]> = {};
    
    zones.forEach((zone) => {
      const zoneOverlapList: ShieldOverlap[] = [];
      const isCriticalZone = CRITICAL_ZONE_TYPES.includes(zone.type);
      
      // Normalize zone coordinates (assuming 500x600 canvas for demo)
      const normalizedZone = {
        x: zone.x / 500,
        y: zone.y / 600,
        width: zone.width / 500,
        height: zone.height / 600,
      };
      
      shields.forEach((shield) => {
        const ratio = calculateOverlapRatio(shield.normalized_bbox, normalizedZone);
        if (ratio >= OVERLAP_WARN_THRESHOLD) {
          zoneOverlapList.push({
            shieldId: shield.id,
            shieldType: shield.shield_type,
            overlapRatio: ratio,
            isCritical: isCriticalZone && ratio >= OVERLAP_CRITICAL_THRESHOLD,
          });
        }
      });
      
      if (zoneOverlapList.length > 0) {
        overlaps[zone.id] = zoneOverlapList;
      }
    });
    
    return overlaps;
  }, [zones, shields]);

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

  // Zone colors using CSS tokens where available
  const getZoneColor = (type: string) => {
    const colors: Record<string, string> = {
      HeaderFields: 'border-accent bg-info-100 dark:bg-info-900/20',
      TotalsBox: 'border-green-500 bg-green-100 dark:bg-green-900/20',
      LineItemsTable: 'border-purple-500 bg-purple-100 dark:bg-purple-900/20',
      FooterNotes: 'border-orange-500 bg-orange-100 dark:bg-orange-900/20',
    };
    return colors[type] || 'border-gray-500 bg-gray-100 dark:bg-gray-800';
  };

  return (
    <div>
      <h3 className="font-semibold mb-3 text-text-primary">Zone Editor</h3>

      {/* Zone List */}
      <div className="space-y-2 mb-4">
        {zones.map((zone) => {
          const overlaps = zoneOverlaps[zone.id] || [];
          const hasCriticalOverlap = overlaps.some((o) => o.isCritical);
          const hasWarningOverlap = overlaps.length > 0 && !hasCriticalOverlap;
          
          return (
            <div
              key={zone.id}
              className={`p-3 rounded border-2 cursor-pointer transition-all ${
                selectedZone === zone.id 
                  ? 'border-accent bg-info-50 dark:bg-info-900/20' 
                  : hasCriticalOverlap
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                    : hasWarningOverlap
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => onZoneSelect(zone.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-text-primary">{zone.type}</span>
                <span className="text-sm text-text-secondary">{zone.confidence}%</span>
              </div>
              <div className="text-xs text-text-muted">
                Position: ({zone.x}, {zone.y}) Size: {zone.width}×{zone.height}
              </div>
              
              {/* Overlap Warnings */}
              {overlaps.length > 0 && (
                <div className={`mt-2 p-2 rounded text-xs ${
                  hasCriticalOverlap 
                    ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' 
                    : 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
                }`}>
                  <p className={`font-medium mb-1 ${
                    hasCriticalOverlap ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {hasCriticalOverlap ? '⚠️ Critical Zone Overlap' : '⚡ Shield Overlap Detected'}
                  </p>
                  {overlaps.map((overlap, i) => (
                    <p key={i} className={hasCriticalOverlap ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}>
                      {overlap.shieldType} shield: {Math.round(overlap.overlapRatio * 100)}% overlap
                      {overlap.isCritical && ' - Forced to Suggested'}
                    </p>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjustZone(zone.id);
                  }}
                  className="text-xs px-2 py-1 bg-info-100 dark:bg-info-900/30 text-info-dark rounded hover:bg-info-200 dark:hover:bg-info-900/50"
                >
                  Adjust
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteZone(zone.id);
                  }}
                  className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
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

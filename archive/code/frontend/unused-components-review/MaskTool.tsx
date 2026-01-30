import React, { useState } from 'react';

interface Mask {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vendor_specific: boolean;
}

interface MaskToolProps {
  caseId: string;
  onComplete: () => void;
}

export const MaskTool: React.FC<MaskToolProps> = ({ caseId, onComplete }) => {
  const [masks, setMasks] = useState<Mask[]>([
    { id: 'mask-1', type: 'logo', x: 20, y: 20, width: 100, height: 50, vendor_specific: true },
  ]);
  const [isAddingMask, setIsAddingMask] = useState(false);
  const [selectedMaskType, setSelectedMaskType] = useState('logo');
  const [rememberForVendor, setRememberForVendor] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddMask = () => {
    setIsAddingMask(true);
  };

  const handleMaskDrawn = async (region: { x: number; y: number; width: number; height: number }) => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/masks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          region,
          mask_type: selectedMaskType,
          remember_for_vendor: rememberForVendor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMasks([
          ...masks,
          {
            id: data.mask_id,
            type: selectedMaskType,
            ...region,
            vendor_specific: rememberForVendor,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to add mask:', error);
    } finally {
      setIsProcessing(false);
      setIsAddingMask(false);
    }
  };

  const handleRemoveMask = async (maskId: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/masks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          mask_id: maskId,
        }),
      });

      if (response.ok) {
        setMasks(masks.filter((m) => m.id !== maskId));
      }
    } catch (error) {
      console.error('Failed to remove mask:', error);
    }
  };

  const getMaskColor = (type: string) => {
    const colors: Record<string, string> = {
      logo: 'border-red-500 bg-red-200',
      watermark: 'border-orange-500 bg-orange-200',
      header: 'border-blue-500 bg-blue-200',
      footer: 'border-green-500 bg-green-200',
      custom: 'border-purple-500 bg-purple-200',
    };
    return colors[type] || 'border-gray-500 bg-gray-200';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Mask Management</h3>
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
              Add masks to hide noise regions like logos, watermarks, or repetitive headers/footers.
              Masks improve OCR accuracy by preventing false readings.
            </p>
          </div>

          {/* Document with Masks */}
          <div className="mb-4 relative bg-gray-100 h-[400px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">Document with mask overlays</p>
            </div>

            {/* Render masks */}
            {masks.map((mask) => (
              <div
                key={mask.id}
                className={`absolute border-2 bg-opacity-50 ${getMaskColor(mask.type)}`}
                style={{
                  left: `${mask.x}px`,
                  top: `${mask.y}px`,
                  width: `${mask.width}px`,
                  height: `${mask.height}px`,
                }}
              >
                <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <span>{mask.type}</span>
                  {mask.vendor_specific && <span>🔒</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Mask List */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Active Masks ({masks.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {masks.map((mask) => (
                <div key={mask.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium capitalize">{mask.type}</span>
                    <span className="text-xs text-gray-600 ml-2">
                      ({mask.x}, {mask.y}) {mask.width}×{mask.height}
                    </span>
                    {mask.vendor_specific && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2">
                        Vendor-specific
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveMask(mask.id)}
                    className="text-sm px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Mask Controls */}
          {!isAddingMask ? (
            <div>
              <h4 className="font-semibold mb-2">Add New Mask</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm mb-1">Mask Type:</label>
                  <select
                    value={selectedMaskType}
                    onChange={(e) => setSelectedMaskType(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="logo">Logo</option>
                    <option value="watermark">Watermark</option>
                    <option value="header">Header</option>
                    <option value="footer">Footer</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberForVendor}
                      onChange={(e) => setRememberForVendor(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Remember for this vendor</span>
                  </label>
                </div>
              </div>
              <button
                onClick={handleAddMask}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Draw Mask on Document
              </button>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800 mb-2">
                Click and drag on the document to create a mask region
              </p>
              <button
                onClick={() => setIsAddingMask(false)}
                className="text-sm text-yellow-700 hover:text-yellow-900"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="mt-3 p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                Processing mask and reprocessing document...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onComplete}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

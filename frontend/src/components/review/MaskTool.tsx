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
  caseId?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [isStubbed, setIsStubbed] = useState(false);

  const handleAddMask = () => {
    setIsAddingMask(true);
  };

  const _handleMaskDrawn = async (region: { x: number; y: number; width: number; height: number }) => {
    setIsProcessing(true);
    setError(null);
    setIsStubbed(false);

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
        
        // Check if this is a stub response
        if (data.message && data.message.includes('not yet implemented')) {
          setIsStubbed(true);
          setError('Mask creation requires backend implementation. You can continue your workflow.');
        } else {
          // Success - real implementation
          setMasks([
            ...masks,
            {
              id: data.mask_id || `mask-${Date.now()}`,
              type: selectedMaskType,
              ...region,
              vendor_specific: rememberForVendor,
            },
          ]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        setError(errorData.message || 'Failed to add mask');
      }
    } catch (error) {
      console.error('Failed to add mask:', error);
      setError('Network error: Unable to connect to server');
    } finally {
      setIsProcessing(false);
      setIsAddingMask(false);
    }
  };

  const handleRemoveMask = async (maskId: string) => {
    setError(null);
    setIsStubbed(false);

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
        const data = await response.json();
        
        // Check if this is a stub response
        if (data.message && data.message.includes('not yet implemented')) {
          setIsStubbed(true);
          setError('Mask removal requires backend implementation. You can continue your workflow.');
        } else {
          // Success - real implementation
          setMasks(masks.filter((m) => m.id !== maskId));
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        setError(errorData.message || 'Failed to remove mask');
      }
    } catch (error) {
      console.error('Failed to remove mask:', error);
      setError('Network error: Unable to connect to server');
    }
  };

  const getMaskColor = (type: string) => {
    const colors: Record<string, string> = {
      logo: 'border-red-500 bg-red-200',
      watermark: 'border-orange-500 bg-orange-200',
      header: 'border-accent bg-info-200',
      footer: 'border-green-500 bg-green-200',
      custom: 'border-purple-500 bg-purple-200',
    };
    return colors[type] || 'border-gray-500 bg-gray-200';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-base rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Mask Management</h3>
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
              Add masks to hide noise regions like logos, watermarks, or repetitive headers/footers.
              Masks improve OCR accuracy by preventing false readings.
            </p>
          </div>

          {/* Document with Masks */}
          <div className="mb-4 relative bg-surface-elevated h-[400px] rounded">
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-text-tertiary">Document with mask overlays</p>
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
                <div className="absolute -top-6 left-0 bg-error text-accent-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                  <span>{mask.type}</span>
                  {mask.vendor_specific && <span>🔒</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Mask List */}
          <div className="mb-4">
            <h4 className="font-semibold text-text-primary mb-2">Active Masks ({masks.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {masks.map((mask) => (
                <div key={mask.id} className="flex items-center justify-between p-2 bg-surface-elevated rounded">
                  <div>
                    <span className="font-medium capitalize text-text-primary">{mask.type}</span>
                    <span className="text-xs text-text-secondary ml-2">
                      ({mask.x}, {mask.y}) {mask.width}×{mask.height}
                    </span>
                    {mask.vendor_specific && (
                      <span className="text-xs bg-info-100 dark:bg-info-900/20 text-info-dark px-2 py-0.5 rounded ml-2">
                        Vendor-specific
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveMask(mask.id)}
                    className="text-sm px-2 py-1 bg-error-100 dark:bg-error-900/20 text-error rounded hover:bg-error-200"
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
              <h4 className="font-semibold text-text-primary mb-2">Add New Mask</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Mask Type:</label>
                  <select
                    value={selectedMaskType}
                    onChange={(e) => setSelectedMaskType(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-surface-elevated text-text-primary"
                  >
                    <option value="logo">Logo</option>
                    <option value="watermark">Watermark</option>
                    <option value="header">Header</option>
                    <option value="footer">Footer</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberForVendor}
                      onChange={(e) => setRememberForVendor(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-text-secondary">Apply to vendor</span>
                  </label>
                </div>
              </div>
              
              {/* Vendor toggle explanation */}
              {rememberForVendor && (
                <div className="mb-3 p-2 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-dark rounded">
                  <p className="text-xs text-info-dark">
                    ℹ️ This mask will be saved for all future documents from this vendor
                  </p>
                </div>
              )}
              <button
                onClick={handleAddMask}
                className="w-full px-4 py-2 bg-success text-accent-foreground rounded hover:bg-success-dark"
              >
                + Draw Mask on Document
              </button>
            </div>
          ) : (
            <div className="p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-dark rounded">
              <p className="text-sm text-warning-dark mb-2">
                Click and drag on the document to create a mask region
              </p>
              <button
                onClick={() => setIsAddingMask(false)}
                className="text-sm text-warning-dark hover:text-warning"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="mt-3 p-3 bg-info-50 rounded">
              <p className="text-sm text-info-dark">
                Processing mask and reprocessing document...
              </p>
            </div>
          )}

          {/* Error/Stub Message */}
          {error && (
            <div className={`mt-3 p-3 rounded ${isStubbed ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-2">
                <span className={`text-lg ${isStubbed ? 'text-yellow-600' : 'text-red-600'}`}>
                  {isStubbed ? '⚠️' : '❌'}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isStubbed ? 'text-yellow-800' : 'text-red-800'} mb-1`}>
                    {isStubbed ? 'Feature Not Available' : 'Error'}
                  </p>
                  <p className={`text-sm ${isStubbed ? 'text-yellow-700' : 'text-red-700'}`}>
                    {error}
                  </p>
                  {isStubbed && (
                    <p className="text-xs text-yellow-600 mt-2">
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
          <button
            onClick={onComplete}
            className="w-full px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * CleanupTab - Cleanup Shield Editor Tab for Review Workspace
 * 
 * Provides the Cleanup tab content for the Review Workspace with:
 * - Toggle between resolved shields and auto-detected suggestions
 * - Per-shield quick actions (Apply/Suggest/Disable)
 * - Scope controls (page targeting, zone targeting)
 * - Save options (Vendor Rule, Template Rule, Session)
 * - Re-run extraction button
 * - Precedence explanations and warnings
 * 
 * @see docs/ux/REVIEW_STATE_MACHINE.md
 */

import React, { useState } from 'react';
import {
  useReviewStateMachine,
  CleanupShield,
  ShieldType,
  ApplyMode,
  PageTarget,
  ZoneTarget,
} from './useReviewStateMachine';

// ============================================
// Types
// ============================================

interface CleanupTabProps {
  caseId: string;
  vendorId?: string;
  templateId?: string;
  /** Callback when shields change (for parent to update overlay) */
  onShieldsChange?: (shields: CleanupShield[]) => void;
  /** Callback when re-extraction completes */
  onExtractionComplete?: () => void;
}

// ============================================
// Constants
// ============================================

const SHIELD_TYPE_LABELS: Record<ShieldType, string> = {
  Logo: 'Logo',
  Watermark: 'Watermark',
  RepetitiveHeader: 'Header',
  RepetitiveFooter: 'Footer',
  Stamp: 'Stamp',
  UserDefined: 'Custom',
  VendorSpecific: 'Vendor',
  TemplateSpecific: 'Template',
};

const PAGE_TARGET_OPTIONS: Array<{ value: PageTarget['type']; label: string }> = [
  { value: 'All', label: 'All Pages' },
  { value: 'First', label: 'First Page Only' },
  { value: 'Last', label: 'Last Page Only' },
];

const ZONE_OPTIONS = [
  { id: 'LineItems', label: 'Line Items', critical: true },
  { id: 'Totals', label: 'Totals', critical: true },
  { id: 'Header', label: 'Header', critical: false },
  { id: 'Footer', label: 'Footer', critical: false },
  { id: 'Barcode', label: 'Barcode', critical: false },
];

// ============================================
// Sub-Components
// ============================================

interface ShieldCardProps {
  shield: CleanupShield;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSetApplyMode: (mode: ApplyMode) => void;
  onSetPageTarget: (target: PageTarget) => void;
  onSetZoneTarget: (target: ZoneTarget) => void;
  onRemove: () => void;
}

const ShieldCard: React.FC<ShieldCardProps> = ({
  shield,
  isExpanded,
  onToggleExpand,
  onSetApplyMode,
  onSetPageTarget,
  onSetZoneTarget,
  onRemove,
}) => {
  const [showZoneSelector, setShowZoneSelector] = useState(false);

  const getModeButtonClass = (mode: ApplyMode) => {
    const isActive = shield.apply_mode === mode;
    const baseClass = 'px-2 py-1 text-xs rounded transition-colors';
    
    if (isActive) {
      switch (mode) {
        case 'Applied':
          return `${baseClass} bg-green-500 text-white`;
        case 'Suggested':
          return `${baseClass} bg-yellow-500 text-white`;
        case 'Disabled':
          return `${baseClass} bg-gray-500 text-white`;
      }
    }
    return `${baseClass} bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700`;
  };

  const getPageTargetLabel = (target: PageTarget): string => {
    switch (target.type) {
      case 'All': return 'All Pages';
      case 'First': return 'First Page';
      case 'Last': return 'Last Page';
      case 'Specific': return `Pages: ${target.pages.join(', ')}`;
    }
  };

  return (
    <div className={`border rounded-lg transition-all ${
      shield.risk_level === 'High' 
        ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div 
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
          <span className="font-medium text-text-primary">
            {SHIELD_TYPE_LABELS[shield.shield_type]}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            shield.apply_mode === 'Applied' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
            shield.apply_mode === 'Suggested' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
            'bg-gray-100 dark:bg-gray-800 text-gray-500'
          }`}>
            {shield.apply_mode}
          </span>
          {shield.risk_level === 'High' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              ⚠️ High Risk
            </span>
          )}
        </div>
        <span className="text-sm text-text-secondary">
          {Math.round(shield.confidence * 100)}%
        </span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
          {/* Quick Actions */}
          <div>
            <label className="text-xs text-text-muted mb-1 block">Apply Mode:</label>
            <div className="flex gap-1">
              {(['Applied', 'Suggested', 'Disabled'] as ApplyMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onSetApplyMode(mode)}
                  className={getModeButtonClass(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Page Targeting */}
          <div>
            <label className="text-xs text-text-muted mb-1 block">Page Scope:</label>
            <select
              value={shield.page_target.type}
              onChange={(e) => {
                const type = e.target.value as PageTarget['type'];
                if (type === 'Specific') {
                  onSetPageTarget({ type: 'Specific', pages: [1] });
                } else {
                  onSetPageTarget({ type } as PageTarget);
                }
              }}
              className="w-full p-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-surface-base text-text-primary"
            >
              {PAGE_TARGET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              <option value="Specific">Specific Pages...</option>
            </select>
            {shield.page_target.type === 'Specific' && (
              <input
                type="text"
                placeholder="e.g., 1, 3, 5"
                defaultValue={shield.page_target.pages.join(', ')}
                onChange={(e) => {
                  const pages = e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
                  if (pages.length > 0) {
                    onSetPageTarget({ type: 'Specific', pages });
                  }
                }}
                className="mt-1 w-full p-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-surface-base text-text-primary"
              />
            )}
          </div>

          {/* Zone Targeting */}
          <div>
            <label className="text-xs text-text-muted mb-1 block">Zone Scope:</label>
            <button
              onClick={() => setShowZoneSelector(!showZoneSelector)}
              className="w-full p-1.5 text-sm text-left border border-gray-200 dark:border-gray-700 rounded bg-surface-base text-text-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {shield.zone_target.exclude_zones.length > 0
                ? `Excluding: ${shield.zone_target.exclude_zones.join(', ')}`
                : 'All Zones'}
              <span className="float-right">▼</span>
            </button>
            {showZoneSelector && (
              <div className="mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded bg-surface-base">
                {ZONE_OPTIONS.map((zone) => (
                  <label key={zone.id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!shield.zone_target.exclude_zones.includes(zone.id)}
                      onChange={(e) => {
                        const newExclude = e.target.checked
                          ? shield.zone_target.exclude_zones.filter((z) => z !== zone.id)
                          : [...shield.zone_target.exclude_zones, zone.id];
                        onSetZoneTarget({
                          ...shield.zone_target,
                          exclude_zones: newExclude,
                        });
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-text-primary">{zone.label}</span>
                    {zone.critical && (
                      <span className="text-xs text-red-500">Critical</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Provenance Info */}
          <div className="text-xs text-text-muted">
            <p>Source: {shield.provenance.source}</p>
            {shield.why_detected && <p>Reason: {shield.why_detected}</p>}
          </div>

          {/* Remove Button */}
          <button
            onClick={onRemove}
            className="w-full px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
          >
            Remove Shield
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const CleanupTab: React.FC<CleanupTabProps> = ({
  caseId,
  vendorId,
  templateId,
  onShieldsChange,
  onExtractionComplete,
}) => {
  const {
    state,
    isLoading,
    isSaving,
    isRerunning,
    hasError,
    hasUnsavedChanges,
    loadCase,
    saveAsVendorRule,
    saveAsTemplateRule,
    rerunExtraction,
    removeShield,
    setApplyMode,
    setPageTarget,
    setZoneTarget,
    retry,
    dismissError,
  } = useReviewStateMachine({ caseId, vendorId, templateId });

  const [viewMode, setViewMode] = useState<'resolved' | 'suggestions'>('resolved');
  const [expandedShieldId, setExpandedShieldId] = useState<string | null>(null);

  // Load case on mount
  React.useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Notify parent of shield changes
  React.useEffect(() => {
    onShieldsChange?.(state.shields);
  }, [state.shields, onShieldsChange]);

  // Filter shields based on view mode
  const displayedShields = viewMode === 'resolved'
    ? state.shields.filter((s) => s.apply_mode !== 'Disabled')
    : state.shields.filter((s) => s.provenance.source === 'AutoDetected');

  const isOperating = isLoading || isSaving || isRerunning;

  const handleRerunExtraction = async () => {
    await rerunExtraction();
    onExtractionComplete?.();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('resolved')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'resolved'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200'
            }`}
          >
            Resolved ({state.shields.filter((s) => s.apply_mode !== 'Disabled').length})
          </button>
          <button
            onClick={() => setViewMode('suggestions')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'suggestions'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200'
            }`}
          >
            Suggestions ({state.shields.filter((s) => s.provenance.source === 'AutoDetected').length})
          </button>
        </div>
        {hasUnsavedChanges && (
          <span className="text-xs px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
            Unsaved
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
            <p className="text-sm text-text-muted">Loading shields...</p>
          </div>
        </div>
      )}

      {/* Shield List */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {displayedShields.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p className="mb-2">No shields to display</p>
              <p className="text-xs">
                {viewMode === 'resolved' 
                  ? 'Draw a region on the document to add a shield'
                  : 'No auto-detected suggestions available'}
              </p>
            </div>
          ) : (
            displayedShields.map((shield) => (
              <ShieldCard
                key={shield.id}
                shield={shield}
                isExpanded={expandedShieldId === shield.id}
                onToggleExpand={() => setExpandedShieldId(
                  expandedShieldId === shield.id ? null : shield.id
                )}
                onSetApplyMode={(mode) => setApplyMode(shield.id, mode)}
                onSetPageTarget={(target) => setPageTarget(shield.id, target)}
                onSetZoneTarget={(target) => setZoneTarget(shield.id, target)}
                onRemove={() => removeShield(shield.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Precedence Explanations */}
      {state.precedenceExplanations.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 text-sm">
            Precedence Applied
          </h4>
          {state.precedenceExplanations.slice(0, 3).map((exp, i) => (
            <p key={i} className="text-xs text-blue-700 dark:text-blue-300">
              {exp.reason}
            </p>
          ))}
          {state.precedenceExplanations.length > 3 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              +{state.precedenceExplanations.length - 3} more...
            </p>
          )}
        </div>
      )}

      {/* Zone Conflicts Warning */}
      {state.zoneConflicts.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-2 text-sm">
            ⚠️ Critical Zone Conflicts
          </h4>
          {state.zoneConflicts.map((conflict, i) => (
            <p key={i} className="text-xs text-red-700 dark:text-red-300">
              Shield overlaps {conflict.zone_id} ({Math.round(conflict.overlap_ratio * 100)}%)
            </p>
          ))}
        </div>
      )}

      {/* Error Display */}
      {hasError && state.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-600">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{state.error}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Your changes are preserved locally.
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={retry}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
              <button
                onClick={dismissError}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-text-primary text-sm">Save As:</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={saveAsVendorRule}
            disabled={isOperating || !vendorId}
            className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Vendor Rule'}
          </button>
          <button
            onClick={saveAsTemplateRule}
            disabled={isOperating || !templateId}
            className="px-3 py-2 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Template Rule
          </button>
        </div>
        <p className="text-xs text-text-muted">
          Session changes persist until you navigate away.
        </p>

        <button
          onClick={handleRerunExtraction}
          disabled={isOperating}
          className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mt-2"
        >
          {isRerunning ? 'Processing...' : '🔄 Re-run Extraction'}
        </button>
      </div>
    </div>
  );
};

export default CleanupTab;

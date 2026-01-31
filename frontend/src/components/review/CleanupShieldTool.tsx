/**
 * CleanupShieldTool - Document Cleanup Engine UI Component
 * 
 * Replaces the legacy MaskTool with new terminology and API integration.
 * Uses the Review State Machine for fail-safe state management.
 * 
 * @see docs/ux/REVIEW_STATE_MACHINE.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useReviewStateMachine, CleanupShield, ShieldType, ApplyMode, PageTarget } from './useReviewStateMachine';

// ============================================
// Types
// ============================================

interface CleanupShieldToolProps {
  caseId: string;
  vendorId?: string;
  templateId?: string;
  onComplete: () => void;
}

// ============================================
// Shield Type Colors (using CSS tokens)
// ============================================

const SHIELD_TYPE_STYLES: Record<ShieldType, { bg: string; border: string; label: string }> = {
  Logo: { bg: 'var(--cleanup-logo)', border: 'var(--cleanup-logo-border)', label: 'Logo' },
  Watermark: { bg: 'var(--cleanup-watermark)', border: 'var(--cleanup-watermark-border)', label: 'Watermark' },
  RepetitiveHeader: { bg: 'var(--cleanup-header)', border: 'var(--cleanup-header-border)', label: 'Header' },
  RepetitiveFooter: { bg: 'var(--cleanup-footer)', border: 'var(--cleanup-footer-border)', label: 'Footer' },
  Stamp: { bg: 'var(--cleanup-stamp)', border: 'var(--cleanup-stamp-border)', label: 'Stamp' },
  UserDefined: { bg: 'var(--cleanup-user)', border: 'var(--cleanup-user-border)', label: 'Custom' },
  VendorSpecific: { bg: 'var(--cleanup-vendor)', border: 'var(--cleanup-vendor-border)', label: 'Vendor' },
  TemplateSpecific: { bg: 'var(--cleanup-template)', border: 'var(--cleanup-template-border)', label: 'Template' },
};

const APPLY_MODE_STYLES: Record<ApplyMode, { bg: string; text: string; icon: string }> = {
  Applied: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-dark', icon: '✓' },
  Suggested: { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-dark', icon: '?' },
  Disabled: { bg: 'bg-secondary-100 dark:bg-secondary-800', text: 'text-text-tertiary', icon: '✗' },
};

// ============================================
// Helper Components
// ============================================

interface ShieldListItemProps {
  shield: CleanupShield;
  isSelected: boolean;
  onSelect: () => void;
  onSetApplyMode: (mode: ApplyMode) => void;
  onRemove: () => void;
}

const ShieldListItem: React.FC<ShieldListItemProps> = ({
  shield,
  isSelected,
  onSelect,
  onSetApplyMode,
  onRemove,
}) => {
  const typeStyle = SHIELD_TYPE_STYLES[shield.shield_type];
  const modeStyle = APPLY_MODE_STYLES[shield.apply_mode];

  return (
    <div
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-accent bg-info-50 dark:bg-info-900/20'
          : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: typeStyle.border }}
          />
          <span className="font-medium text-text-primary">{typeStyle.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${modeStyle.bg} ${modeStyle.text}`}>
            {modeStyle.icon} {shield.apply_mode}
          </span>
        </div>
        <span className="text-sm text-text-secondary">
          {Math.round(shield.confidence * 100)}%
        </span>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-1 mt-2">
        {(['Applied', 'Suggested', 'Disabled'] as ApplyMode[]).map((mode) => (
          <button
            key={mode}
            onClick={(e) => {
              e.stopPropagation();
              onSetApplyMode(mode);
            }}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              shield.apply_mode === mode
                ? 'bg-accent text-white'
                : 'bg-secondary-100 dark:bg-secondary-800 text-text-secondary hover:bg-secondary-200 dark:hover:bg-secondary-700'
            }`}
          >
            {mode}
          </button>
        ))}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-xs px-2 py-1 rounded bg-error-100 dark:bg-error-900/30 text-error-dark hover:bg-error-200 dark:hover:bg-error-900/50 ml-auto"
        >
          Remove
        </button>
      </div>

      {/* Risk Warning */}
      {shield.risk_level === 'High' && (
        <div className="mt-2 p-2 rounded bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800">
          <p className="text-xs text-error-dark">
            ⚠️ High risk: Overlaps critical zone
          </p>
        </div>
      )}

      {/* Provenance */}
      <div className="mt-2 text-xs text-text-muted">
        Source: {shield.provenance.source}
        {shield.provenance.vendor_id && ` • Vendor: ${shield.provenance.vendor_id}`}
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const CleanupShieldTool: React.FC<CleanupShieldToolProps> = ({
  caseId,
  vendorId,
  templateId,
  onComplete,
}) => {
  const {
    state,
    isLoading,
    isReady: _isReady, // TODO: Use to show loading state before document is ready
    isSaving,
    isRerunning,
    hasError,
    hasUnsavedChanges,
    loadCase,
    saveAsVendorRule,
    saveAsTemplateRule,
    rerunExtraction,
    addShield,
    removeShield,
    setApplyMode,
    retry,
    dismissError,
  } = useReviewStateMachine({ caseId, vendorId, templateId });

  const [selectedShieldId, setSelectedShieldId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newShieldType, setNewShieldType] = useState<ShieldType>('UserDefined');
  const [viewMode, setViewMode] = useState<'resolved' | 'suggestions'>('resolved');

  // Load case on mount
  useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Handle drawing completion - TODO: Wire up to canvas/document interaction
  const _handleDrawComplete = useCallback(
    (bbox: { x: number; y: number; width: number; height: number }) => {
      const newShield: CleanupShield = {
        id: `shield-${Date.now()}`,
        shield_type: newShieldType,
        normalized_bbox: bbox,
        page_target: { type: 'All' },
        zone_target: { include_zones: null, exclude_zones: [] },
        apply_mode: 'Suggested',
        risk_level: 'Low',
        confidence: 1.0,
        min_confidence: 0.6,
        why_detected: 'User-defined region',
        provenance: {
          source: 'SessionOverride',
          user_id: null, // Would come from auth context
          vendor_id: vendorId ?? null,
          template_id: templateId ?? null,
          created_at: new Date().toISOString(),
          updated_at: null,
        },
      };
      addShield(newShield);
      setIsDrawing(false);
    },
    [newShieldType, vendorId, templateId, addShield]
  );

  // Filter shields based on view mode
  const displayedShields = viewMode === 'resolved'
    ? state.shields.filter((s) => s.apply_mode !== 'Disabled')
    : state.shields.filter((s) => s.provenance.source === 'AutoDetected');

  const isOperating = isLoading || isSaving || isRerunning;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-base rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden border border-border flex flex-col" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-text-primary">Cleanup Shields</h3>
            {hasUnsavedChanges && (
              <span className="text-xs px-2 py-1 rounded bg-warning-100 dark:bg-warning-900/30 text-warning-dark">
                Unsaved changes
              </span>
            )}
          </div>
          <button
            onClick={onComplete}
            className="text-text-tertiary hover:text-text-primary text-2xl leading-none"
            disabled={isOperating}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Document Viewer */}
          <div className="flex-1 p-4 border-r border-border overflow-auto">
            {/* View Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setViewMode('resolved')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'resolved'
                    ? 'bg-accent text-white'
                    : 'bg-secondary-100 dark:bg-secondary-800 text-text-secondary hover:bg-secondary-200'
                }`}
              >
                Show Shields (Resolved)
              </button>
              <button
                onClick={() => setViewMode('suggestions')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'suggestions'
                    ? 'bg-accent text-white'
                    : 'bg-secondary-100 dark:bg-secondary-800 text-text-secondary hover:bg-secondary-200'
                }`}
              >
                Show Suggestions (Auto)
              </button>
            </div>

            {/* Document Preview with Overlays */}
            <div
              className={`relative bg-secondary-100 dark:bg-secondary-800 h-[400px] rounded-lg ${
                isDrawing ? 'cursor-crosshair' : 'cursor-default'
              }`}
            >
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-text-tertiary">
                      {isDrawing ? 'Click and drag to draw shield region' : 'Document preview with shield overlays'}
                    </p>
                  </div>

                  {/* Render shield overlays */}
                  {displayedShields.map((shield) => {
                    const style = SHIELD_TYPE_STYLES[shield.shield_type];
                    const bbox = shield.normalized_bbox;
                    return (
                      <div
                        key={shield.id}
                        className={`absolute border-2 transition-opacity ${
                          selectedShieldId === shield.id ? 'opacity-100' : 'opacity-70'
                        }`}
                        style={{
                          left: `${bbox.x * 100}%`,
                          top: `${bbox.y * 100}%`,
                          width: `${bbox.width * 100}%`,
                          height: `${bbox.height * 100}%`,
                          backgroundColor: style.bg,
                          borderColor: style.border,
                        }}
                        onClick={() => setSelectedShieldId(shield.id)}
                      >
                        <div
                          className="absolute -top-6 left-0 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap"
                          style={{ backgroundColor: style.border }}
                        >
                          {style.label}
                          {shield.provenance.source === 'VendorRule' && ' 🔒'}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Drawing Controls */}
            {isDrawing ? (
              <div className="mt-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                <p className="text-sm text-warning-dark mb-2">
                  Click and drag on the document to create a shield region
                </p>
                <button
                  onClick={() => setIsDrawing(false)}
                  className="text-sm text-warning-dark hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-4 flex gap-3">
                <select
                  value={newShieldType}
                  onChange={(e) => setNewShieldType(e.target.value as ShieldType)}
                  className="flex-1 p-2 border border-border rounded bg-surface-elevated text-text-primary"
                  disabled={isOperating}
                >
                  <option value="UserDefined">Custom Region</option>
                  <option value="Logo">Logo</option>
                  <option value="Watermark">Watermark</option>
                  <option value="RepetitiveHeader">Header</option>
                  <option value="RepetitiveFooter">Footer</option>
                  <option value="Stamp">Stamp</option>
                </select>
                <button
                  onClick={() => setIsDrawing(true)}
                  className="px-4 py-2 bg-success text-white rounded hover:bg-success-dark disabled:opacity-50"
                  disabled={isOperating}
                >
                  + Draw Shield
                </button>
              </div>
            )}
          </div>

          {/* Right: Shield List & Controls */}
          <div className="w-80 p-4 overflow-auto">
            <h4 className="font-semibold text-text-primary mb-3">
              Active Shields ({displayedShields.length})
            </h4>

            {/* Shield List */}
            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
              {displayedShields.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">
                  No shields detected. Draw a region to add one.
                </p>
              ) : (
                displayedShields.map((shield) => (
                  <ShieldListItem
                    key={shield.id}
                    shield={shield}
                    isSelected={selectedShieldId === shield.id}
                    onSelect={() => setSelectedShieldId(shield.id)}
                    onSetApplyMode={(mode) => setApplyMode(shield.id, mode)}
                    onRemove={() => removeShield(shield.id)}
                  />
                ))
              )}
            </div>

            {/* Zone Conflicts */}
            {state.zoneConflicts.length > 0 && (
              <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
                <h5 className="font-medium text-error-dark mb-2">
                  ⚠️ Critical Zone Conflicts
                </h5>
                {state.zoneConflicts.map((conflict, i) => (
                  <p key={i} className="text-xs text-error-dark">
                    Shield overlaps {conflict.zone_id} ({Math.round(conflict.overlap_ratio * 100)}%)
                    - {conflict.action_taken}
                  </p>
                ))}
              </div>
            )}

            {/* Save Options */}
            <div className="space-y-2">
              <h5 className="font-medium text-text-primary text-sm">Save As:</h5>
              <button
                onClick={saveAsVendorRule}
                disabled={isOperating || !vendorId}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Vendor Rule'}
              </button>
              <button
                onClick={saveAsTemplateRule}
                disabled={isOperating || !templateId}
                className="w-full px-4 py-2 bg-info text-white rounded hover:bg-info-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Template Rule
              </button>
              <p className="text-xs text-text-muted">
                Session-only changes are preserved until you close this dialog.
              </p>
            </div>

            {/* Re-run Extraction */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={rerunExtraction}
                disabled={isOperating}
                className="w-full px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
              >
                {isRerunning ? 'Processing...' : 'Re-run Extraction'}
              </button>
              <p className="text-xs text-text-muted mt-1">
                Apply current shields and re-process document
              </p>
            </div>
          </div>
        </div>

        {/* Error Toast */}
        {hasError && state.error && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-error text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-medium text-error-dark">Operation Failed</p>
                <p className="text-sm text-error-dark">{state.error}</p>
                <p className="text-xs text-error mt-1">
                  Your changes are preserved. You can retry or continue editing.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={retry}
                  className="px-3 py-1 text-sm bg-error text-white rounded hover:bg-error-dark"
                >
                  Retry
                </button>
                <button
                  onClick={dismissError}
                  className="px-3 py-1 text-sm bg-secondary-200 dark:bg-secondary-700 text-text-primary rounded hover:bg-secondary-300 dark:hover:bg-secondary-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-elevated shrink-0">
          <button
            onClick={onComplete}
            className="w-full px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover disabled:opacity-50"
            disabled={isOperating}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CleanupShieldTool;

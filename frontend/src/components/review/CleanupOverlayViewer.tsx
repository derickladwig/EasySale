/**
 * CleanupOverlayViewer - Document viewer with shield overlays and drawing tool
 * 
 * Features:
 * - Overlay toggles: resolved vs suggestions
 * - Draw new shield (normalized coords)
 * - Snap helpers (optional)
 * - Works at any zoom/rotate and produces stable normalized bbox
 * 
 * @see docs/ux/REVIEW_STATE_MACHINE.md
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CleanupShield, ShieldType, NormalizedBBox } from './useReviewStateMachine';

// ============================================
// Types
// ============================================

interface CleanupOverlayViewerProps {
  /** Document image URL */
  imageUrl?: string;
  /** Shields to display as overlays */
  shields: CleanupShield[];
  /** Currently selected shield ID */
  selectedShieldId: string | null;
  /** Callback when shield is selected */
  onShieldSelect: (shieldId: string | null) => void;
  /** Whether drawing mode is active */
  isDrawing: boolean;
  /** Shield type for new drawings */
  drawingShieldType: ShieldType;
  /** Callback when drawing completes */
  onDrawComplete: (bbox: NormalizedBBox) => void;
  /** View mode: resolved or suggestions */
  viewMode: 'resolved' | 'suggestions';
  /** Enable snap helpers */
  enableSnap?: boolean;
  /** Zoom level (1.0 = 100%) */
  zoom?: number;
  /** Rotation in degrees */
  rotation?: number;
}

// ============================================
// Shield Colors (using CSS custom properties)
// ============================================

const SHIELD_COLORS: Record<ShieldType, { fill: string; stroke: string }> = {
  Logo: { fill: 'var(--cleanup-logo)', stroke: 'var(--cleanup-logo-border)' },
  Watermark: { fill: 'var(--cleanup-watermark)', stroke: 'var(--cleanup-watermark-border)' },
  RepetitiveHeader: { fill: 'var(--cleanup-header)', stroke: 'var(--cleanup-header-border)' },
  RepetitiveFooter: { fill: 'var(--cleanup-footer)', stroke: 'var(--cleanup-footer-border)' },
  Stamp: { fill: 'var(--cleanup-stamp)', stroke: 'var(--cleanup-stamp-border)' },
  UserDefined: { fill: 'var(--cleanup-user)', stroke: 'var(--cleanup-user-border)' },
  VendorSpecific: { fill: 'var(--cleanup-vendor)', stroke: 'var(--cleanup-vendor-border)' },
  TemplateSpecific: { fill: 'var(--cleanup-template)', stroke: 'var(--cleanup-template-border)' },
};

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

// ============================================
// Snap Helpers
// ============================================

interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number; // Normalized 0-1
  label?: string;
}

const DEFAULT_SNAP_LINES: SnapLine[] = [
  { type: 'horizontal', position: 0.1, label: 'Top margin' },
  { type: 'horizontal', position: 0.9, label: 'Bottom margin' },
  { type: 'vertical', position: 0.05, label: 'Left margin' },
  { type: 'vertical', position: 0.95, label: 'Right margin' },
];

const SNAP_THRESHOLD = 0.02; // 2% of dimension

function snapToLine(value: number, lines: SnapLine[], type: 'horizontal' | 'vertical'): number {
  for (const line of lines) {
    if (line.type === type && Math.abs(value - line.position) < SNAP_THRESHOLD) {
      return line.position;
    }
  }
  return value;
}

// ============================================
// Main Component
// ============================================

export const CleanupOverlayViewer: React.FC<CleanupOverlayViewerProps> = ({
  imageUrl,
  shields,
  selectedShieldId,
  onShieldSelect,
  isDrawing,
  drawingShieldType,
  onDrawComplete,
  viewMode,
  enableSnap = true,
  zoom = 1,
  rotation = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 800 });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [showSnapLines, setShowSnapLines] = useState(false);

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Convert pixel coordinates to normalized (accounting for zoom/rotation)
  const pixelToNormalized = useCallback((px: number, py: number): { x: number; y: number } => {
    // Account for zoom
    const x = px / (containerSize.width * zoom);
    const y = py / (containerSize.height * zoom);
    
    // Clamp to 0-1
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  }, [containerSize, zoom]);

  // Convert normalized to pixel for display
  const normalizedToPixel = useCallback((nx: number, ny: number): { x: number; y: number } => {
    return {
      x: nx * containerSize.width * zoom,
      y: ny * containerSize.height * zoom,
    };
  }, [containerSize, zoom]);

  // Mouse handlers for drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
    setShowSnapLines(enableSnap);
  }, [isDrawing, enableSnap]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    
    // Apply snapping if enabled
    if (enableSnap) {
      const normalized = pixelToNormalized(x, y);
      const snappedX = snapToLine(normalized.x, DEFAULT_SNAP_LINES, 'vertical');
      const snappedY = snapToLine(normalized.y, DEFAULT_SNAP_LINES, 'horizontal');
      const snappedPixel = normalizedToPixel(snappedX, snappedY);
      x = snappedPixel.x;
      y = snappedPixel.y;
    }
    
    setDrawCurrent({ x, y });
  }, [isDrawing, drawStart, enableSnap, pixelToNormalized, normalizedToPixel]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setDrawStart(null);
      setDrawCurrent(null);
      setShowSnapLines(false);
      return;
    }
    
    // Calculate normalized bbox
    const startNorm = pixelToNormalized(drawStart.x, drawStart.y);
    const endNorm = pixelToNormalized(drawCurrent.x, drawCurrent.y);
    
    const x = Math.min(startNorm.x, endNorm.x);
    const y = Math.min(startNorm.y, endNorm.y);
    const width = Math.abs(endNorm.x - startNorm.x);
    const height = Math.abs(endNorm.y - startNorm.y);
    
    // Minimum size threshold (1% of dimension)
    if (width > 0.01 && height > 0.01) {
      onDrawComplete({ x, y, width, height });
    }
    
    setDrawStart(null);
    setDrawCurrent(null);
    setShowSnapLines(false);
  }, [isDrawing, drawStart, drawCurrent, pixelToNormalized, onDrawComplete]);

  // Filter shields based on view mode
  const visibleShields = viewMode === 'resolved'
    ? shields.filter((s) => s.apply_mode !== 'Disabled')
    : shields.filter((s) => s.provenance.source === 'AutoDetected');

  // Calculate current drawing rectangle
  const drawingRect = drawStart && drawCurrent ? {
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    width: Math.abs(drawCurrent.x - drawStart.x),
    height: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  return (
    <div
      ref={containerRef}
      className={`relative bg-gray-100 dark:bg-gray-800 overflow-hidden ${
        isDrawing ? 'cursor-crosshair' : 'cursor-default'
      }`}
      style={{
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        transformOrigin: 'top left',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Document Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Document"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-text-tertiary">
            {isDrawing ? 'Click and drag to draw shield region' : 'Document preview'}
          </p>
        </div>
      )}

      {/* Snap Lines (when drawing) */}
      {showSnapLines && enableSnap && (
        <>
          {DEFAULT_SNAP_LINES.map((line, i) => (
            <div
              key={i}
              className="absolute bg-blue-400/50 pointer-events-none"
              style={line.type === 'horizontal' ? {
                left: 0,
                right: 0,
                top: `${line.position * 100}%`,
                height: '1px',
              } : {
                top: 0,
                bottom: 0,
                left: `${line.position * 100}%`,
                width: '1px',
              }}
            />
          ))}
        </>
      )}

      {/* Shield Overlays */}
      {visibleShields.map((shield) => {
        const colors = SHIELD_COLORS[shield.shield_type];
        const bbox = shield.normalized_bbox;
        const isSelected = selectedShieldId === shield.id;
        
        return (
          <div
            key={shield.id}
            className={`absolute border-2 transition-all cursor-pointer ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
            } ${shield.apply_mode === 'Disabled' ? 'opacity-30' : 'opacity-80'}`}
            style={{
              left: `${bbox.x * 100}%`,
              top: `${bbox.y * 100}%`,
              width: `${bbox.width * 100}%`,
              height: `${bbox.height * 100}%`,
              backgroundColor: colors.fill,
              borderColor: colors.stroke,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDrawing) {
                onShieldSelect(isSelected ? null : shield.id);
              }
            }}
          >
            {/* Shield Label */}
            <div
              className="absolute -top-5 left-0 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none"
              style={{ backgroundColor: colors.stroke }}
            >
              {SHIELD_TYPE_LABELS[shield.shield_type]}
              {shield.provenance.source === 'VendorRule' && ' 🔒'}
              {shield.provenance.source === 'TemplateRule' && ' 📋'}
            </div>

            {/* Confidence Badge */}
            <div className="absolute -bottom-5 right-0 text-xs px-1 py-0.5 rounded bg-black/50 text-white pointer-events-none">
              {Math.round(shield.confidence * 100)}%
            </div>

            {/* Risk Indicator */}
            {shield.risk_level === 'High' && (
              <div className="absolute top-1 right-1 text-red-500 text-sm pointer-events-none">
                ⚠️
              </div>
            )}
          </div>
        );
      })}

      {/* Current Drawing Rectangle */}
      {drawingRect && drawingRect.width > 5 && drawingRect.height > 5 && (
        <div
          className="absolute border-2 border-dashed pointer-events-none"
          style={{
            left: `${drawingRect.x}px`,
            top: `${drawingRect.y}px`,
            width: `${drawingRect.width}px`,
            height: `${drawingRect.height}px`,
            backgroundColor: SHIELD_COLORS[drawingShieldType].fill,
            borderColor: SHIELD_COLORS[drawingShieldType].stroke,
          }}
        >
          <div
            className="absolute -top-5 left-0 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{ backgroundColor: SHIELD_COLORS[drawingShieldType].stroke }}
          >
            {SHIELD_TYPE_LABELS[drawingShieldType]} (drawing)
          </div>
          <div className="absolute -bottom-5 left-0 text-xs px-1 py-0.5 rounded bg-black/70 text-white">
            {Math.round(drawingRect.width)}×{Math.round(drawingRect.height)}px
          </div>
        </div>
      )}

      {/* Drawing Mode Indicator */}
      {isDrawing && !drawStart && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
          Drawing: {SHIELD_TYPE_LABELS[drawingShieldType]}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs p-2 rounded">
        <div className="font-medium mb-1">Shield Types:</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {Object.entries(SHIELD_TYPE_LABELS).slice(0, 6).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: SHIELD_COLORS[type as ShieldType].stroke }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CleanupOverlayViewer;

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Normalized region coordinates (0.0 to 1.0)
 * Resolution-independent for portability across different image sizes
 */
interface NormalizedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pixel-based region for internal calculations
 */
interface PixelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegionSelectorProps {
  isSelecting: boolean;
  /** Selected region in normalized coordinates (0.0-1.0) */
  selectedRegion: NormalizedRegion | null;
  /** Callback with normalized coordinates */
  onRegionSelected: (region: NormalizedRegion) => void;
  /** Optional: canvas dimensions for display (defaults to container size) */
  canvasWidth?: number;
  canvasHeight?: number;
  /** Optional: show coordinate system indicator */
  showCoordinates?: boolean;
}

/**
 * Convert pixel coordinates to normalized (0.0-1.0)
 */
function normalizeRegion(pixel: PixelRegion, containerWidth: number, containerHeight: number): NormalizedRegion {
  return {
    x: Math.max(0, Math.min(1, pixel.x / containerWidth)),
    y: Math.max(0, Math.min(1, pixel.y / containerHeight)),
    width: Math.max(0, Math.min(1, pixel.width / containerWidth)),
    height: Math.max(0, Math.min(1, pixel.height / containerHeight)),
  };
}

/**
 * Convert normalized coordinates to pixels for display
 */
function denormalizeRegion(normalized: NormalizedRegion, containerWidth: number, containerHeight: number): PixelRegion {
  return {
    x: normalized.x * containerWidth,
    y: normalized.y * containerHeight,
    width: normalized.width * containerWidth,
    height: normalized.height * containerHeight,
  };
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  isSelecting,
  selectedRegion,
  onRegionSelected,
  canvasWidth,
  canvasHeight,
  showCoordinates = false,
}) => {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 500, height: 500 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setContainerSize({
          width: canvasWidth ?? rect.width,
          height: canvasHeight ?? rect.height,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    if (!isSelecting) {
      setStartPoint(null);
      setCurrentPoint(null);
    }
  }, [isSelecting]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
  }, [isSelecting]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !startPoint) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setCurrentPoint({ x, y });
  }, [isSelecting, startPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !startPoint || !currentPoint) return;

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    // Minimum size threshold (10px)
    if (width > 10 && height > 10) {
      // Convert to normalized coordinates before callback
      const normalized = normalizeRegion(
        { x, y, width, height },
        containerSize.width,
        containerSize.height
      );
      onRegionSelected(normalized);
    }

    setStartPoint(null);
    setCurrentPoint(null);
  }, [isSelecting, startPoint, currentPoint, containerSize, onRegionSelected]);

  const getSelectionBox = (): PixelRegion | null => {
    if (!startPoint || !currentPoint) return null;

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    return { x, y, width, height };
  };

  const selectionBox = getSelectionBox();
  
  // Convert selected region from normalized to pixels for display
  const displayRegion = selectedRegion 
    ? denormalizeRegion(selectedRegion, containerSize.width, containerSize.height)
    : null;

  return (
    <div
      ref={canvasRef}
      className={`relative bg-surface-base dark:bg-surface-elevated h-[500px] ${
        isSelecting ? 'cursor-crosshair' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Document placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-text-tertiary">
          {isSelecting ? 'Click and drag to select region' : 'Document preview'}
        </p>
      </div>

      {/* Coordinate system indicator */}
      {showCoordinates && (
        <div className="absolute top-2 right-2 text-xs text-text-muted bg-surface-base/80 px-2 py-1 rounded">
          Normalized coords (0.0-1.0)
        </div>
      )}

      {/* Current selection (while drawing) */}
      {selectionBox && (
        <div
          className="absolute border-2 border-accent bg-info-200/30 dark:bg-info-800/30 pointer-events-none"
          style={{
            left: `${selectionBox.x}px`,
            top: `${selectionBox.y}px`,
            width: `${selectionBox.width}px`,
            height: `${selectionBox.height}px`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-accent text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {Math.round(selectionBox.width)} × {Math.round(selectionBox.height)}px
            {showCoordinates && (
              <span className="ml-2 opacity-75">
                ({(selectionBox.x / containerSize.width).toFixed(2)}, {(selectionBox.y / containerSize.height).toFixed(2)})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Selected region (persistent, from normalized coords) */}
      {displayRegion && !isSelecting && (
        <div
          className="absolute border-2 border-success-500 bg-success-200/30 dark:bg-success-800/30"
          style={{
            left: `${displayRegion.x}px`,
            top: `${displayRegion.y}px`,
            width: `${displayRegion.width}px`,
            height: `${displayRegion.height}px`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-success-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Selected: {Math.round(displayRegion.width)} × {Math.round(displayRegion.height)}px
            {showCoordinates && selectedRegion && (
              <span className="ml-2 opacity-75">
                norm: ({selectedRegion.x.toFixed(3)}, {selectedRegion.y.toFixed(3)})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegionSelectorProps {
  isSelecting: boolean;
  selectedRegion: Region | null;
  onRegionSelected: (region: Region) => void;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  isSelecting,
  selectedRegion,
  onRegionSelected,
}) => {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSelecting) {
      setStartPoint(null);
      setCurrentPoint(null);
    }
  }, [isSelecting]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !startPoint) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPoint({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !startPoint || !currentPoint) return;

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    if (width > 10 && height > 10) {
      onRegionSelected({ x, y, width, height });
    }

    setStartPoint(null);
    setCurrentPoint(null);
  };

  const getSelectionBox = () => {
    if (!startPoint || !currentPoint) return null;

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    return { x, y, width, height };
  };

  const selectionBox = getSelectionBox();

  return (
    <div
      ref={canvasRef}
      className={`relative bg-gray-100 h-[500px] ${
        isSelecting ? 'cursor-crosshair' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Document placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-gray-500">
          {isSelecting ? 'Click and drag to select region' : 'Document preview'}
        </p>
      </div>

      {/* Current selection */}
      {selectionBox && (
        <div
          className="absolute border-2 border-accent bg-info-200 bg-opacity-30"
          style={{
            left: `${selectionBox.x}px`,
            top: `${selectionBox.y}px`,
            width: `${selectionBox.width}px`,
            height: `${selectionBox.height}px`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-accent text-white text-xs px-2 py-1 rounded">
            {Math.round(selectionBox.width)} × {Math.round(selectionBox.height)}
          </div>
        </div>
      )}

      {/* Selected region (persistent) */}
      {selectedRegion && !isSelecting && (
        <div
          className="absolute border-2 border-green-500 bg-green-200 bg-opacity-30"
          style={{
            left: `${selectedRegion.x}px`,
            top: `${selectedRegion.y}px`,
            width: `${selectedRegion.width}px`,
            height: `${selectedRegion.height}px`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded">
            Selected: {Math.round(selectedRegion.width)} × {Math.round(selectedRegion.height)}
          </div>
        </div>
      )}
    </div>
  );
};

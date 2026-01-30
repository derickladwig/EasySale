import { ReactNode, useState } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

export interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultRatio?: number; // 0-100, percentage for left pane
  minLeftWidth?: number; // pixels
  minRightWidth?: number; // pixels
  resizable?: boolean;
}

export function SplitPane({
  left,
  right,
  defaultRatio = 50,
  minLeftWidth = 200,
  minRightWidth = 200,
  resizable = true,
}: SplitPaneProps) {
  const { isMobile, isTablet } = useBreakpoint();
  const [leftWidth, setLeftWidth] = useState(defaultRatio);
  const [isDragging, setIsDragging] = useState(false);

  // Mobile: Stack vertically
  if (isMobile) {
    return (
      <div className="flex flex-col h-full space-y-4">
        <div className="flex-1 overflow-auto">{left}</div>
        <div className="flex-1 overflow-auto">{right}</div>
      </div>
    );
  }

  // Tablet: Fixed ratio, no resize
  if (isTablet) {
    return (
      <div className="flex h-full">
        <div className="w-[60%] overflow-auto border-r border-border">{left}</div>
        <div className="w-[40%] overflow-auto">{right}</div>
      </div>
    );
  }

  // Desktop: Resizable
  const handleMouseDown = () => {
    if (resizable) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && resizable) {
      const container = e.currentTarget as HTMLElement;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;

      // Enforce min widths
      const minLeftRatio = (minLeftWidth / rect.width) * 100;
      const maxLeftRatio = 100 - (minRightWidth / rect.width) * 100;

      if (newRatio >= minLeftRatio && newRatio <= maxLeftRatio) {
        setLeftWidth(newRatio);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="flex h-full relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left Pane */}
      <div className="overflow-auto" style={{ width: `${leftWidth}%` }}>
        {left}
      </div>

      {/* Resizer */}
      {resizable && (
        <div
          className={`w-1 bg-border hover:bg-primary-500 cursor-col-resize transition-colors ${
            isDragging ? 'bg-primary-500' : ''
          }`}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Right Pane */}
      <div className="overflow-auto" style={{ width: `${100 - leftWidth}%` }}>
        {right}
      </div>
    </div>
  );
}

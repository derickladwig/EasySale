import React from 'react';
import type { Density } from '@common/hooks/useDisplaySettings';
import { cn } from '@common/utils/classNames';

export interface DensityPreviewProps {
  density: Density;
  className?: string;
}

const DENSITY_MULTIPLIERS: Record<Density, number> = {
  compact: 0.75,
  comfortable: 1.0,
  spacious: 1.25,
};

/**
 * DensityPreview component showing sample layout at different densities
 *
 * Features:
 * - Shows form fields with different spacing
 * - Shows button groups with different gaps
 * - Visual representation of spacing changes
 */
export const DensityPreview: React.FC<DensityPreviewProps> = ({ density, className = '' }) => {
  const multiplier = DENSITY_MULTIPLIERS[density];
  const spacing = `${multiplier}rem`;

  return (
    <div className={cn('p-6 bg-surface-base rounded-lg border border-border space-y-4', className)}>
      <div className="text-xs text-text-tertiary mb-4">
        Preview at {(multiplier * 100).toFixed(0)}% spacing:
      </div>

      {/* Form Fields Preview */}
      <div className="space-y-2" style={{ gap: spacing }}>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-secondary">Field Label</label>
          <div
            className="h-10 bg-surface-elevated rounded border border-border"
            style={{ padding: `${multiplier * 0.5}rem ${multiplier * 0.75}rem` }}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-secondary">Another Field</label>
          <div
            className="h-10 bg-surface-elevated rounded border border-border"
            style={{ padding: `${multiplier * 0.5}rem ${multiplier * 0.75}rem` }}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-secondary">Third Field</label>
          <div
            className="h-10 bg-surface-elevated rounded border border-border"
            style={{ padding: `${multiplier * 0.5}rem ${multiplier * 0.75}rem` }}
          />
        </div>
      </div>

      {/* Button Group Preview */}
      <div className="pt-4 border-t border-border">
        <div className="text-xs text-text-tertiary mb-2">Button spacing:</div>
        <div className="flex" style={{ gap: spacing }}>
          <div
            className="px-4 py-2 bg-primary-600 rounded text-white text-sm"
            style={{ padding: `${multiplier * 0.5}rem ${multiplier}rem` }}
          >
            Primary
          </div>
          <div
            className="px-4 py-2 bg-surface-elevated rounded text-text-secondary text-sm border border-border"
            style={{ padding: `${multiplier * 0.5}rem ${multiplier}rem` }}
          >
            Secondary
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-text-tertiary">Spacing multiplier:</span>
            <span className="text-text-secondary ml-2 font-mono">{multiplier}x</span>
          </div>
          <div>
            <span className="text-text-tertiary">Base spacing:</span>
            <span className="text-text-secondary ml-2 font-mono">{spacing}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { TextSize } from '@common/hooks/useDisplaySettings';
import { cn } from '@common/utils/classNames';

export interface TextSizePreviewProps {
  textSize: TextSize;
  className?: string;
}

const TEXT_SIZE_MULTIPLIERS: Record<TextSize, number> = {
  small: 0.875,
  medium: 1.0,
  large: 1.125,
  'extra-large': 1.25,
};

/**
 * TextSizePreview component showing sample text at different sizes
 *
 * Features:
 * - Shows heading, paragraph, and small text
 * - Applies text size multiplier
 * - Visual representation of how text will appear
 */
export const TextSizePreview: React.FC<TextSizePreviewProps> = ({ textSize, className = '' }) => {
  const multiplier = TEXT_SIZE_MULTIPLIERS[textSize];

  return (
    <div className={cn('p-6 bg-surface-base rounded-lg border border-border space-y-4', className)}>
      <div className="text-xs text-text-tertiary mb-4">
        Preview at {(multiplier * 100).toFixed(0)}% size:
      </div>

      <div style={{ fontSize: `${multiplier}rem` }}>
        <h3 className="text-2xl font-bold text-text-primary mb-2">Sample Heading</h3>
        <p className="text-base text-text-secondary mb-2">
          This is a paragraph of text showing how content will appear at the selected text size. The
          quick brown fox jumps over the lazy dog.
        </p>
        <p className="text-sm text-text-secondary">
          Small text: Product SKU, timestamps, and helper text will appear at this size.
        </p>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-text-tertiary">Base font size:</span>
            <span className="text-text-secondary ml-2 font-mono">{multiplier}rem</span>
          </div>
          <div>
            <span className="text-text-tertiary">Percentage:</span>
            <span className="text-text-secondary ml-2 font-mono">{(multiplier * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

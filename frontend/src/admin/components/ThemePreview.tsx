import React from 'react';
import type { Theme } from '@common/hooks/useDisplaySettings';
import { cn } from '@common/utils/classNames';

export interface ThemePreviewProps {
  theme: Theme;
  className?: string;
}

/**
 * ThemePreview component showing color swatches for the theme
 *
 * Features:
 * - Shows primary, dark theme, and status colors
 * - Visual representation of the color palette
 * - Indicates current theme selection
 */
export const ThemePreview: React.FC<ThemePreviewProps> = ({ theme, className = '' }) => {
  return (
    <div className={cn('p-6 bg-surface-base rounded-lg border border-border space-y-4', className)}>
      <div className="text-xs text-text-tertiary mb-4">
        {theme === 'auto'
          ? 'Theme will match your system preferences'
          : `Preview of ${theme} theme colors:`}
      </div>

      {/* Primary Colors */}
      <div>
        <div className="text-sm font-medium text-text-secondary mb-2">Primary Colors</div>
        <div className="grid grid-cols-6 gap-2">
          <div className="space-y-1">
            <div className="h-12 bg-primary-50 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">50</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-primary-100 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">100</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-primary-200 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">200</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-primary-400 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">400</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-primary-600 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">600</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-primary-800 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">800</div>
          </div>
        </div>
      </div>

      {/* Dark Theme Colors */}
      <div>
        <div className="text-sm font-medium text-text-secondary mb-2">Background Colors</div>
        <div className="grid grid-cols-6 gap-2">
          <div className="space-y-1">
            <div className="h-12 bg-secondary-50 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">50</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-secondary-100 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">100</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-secondary-300 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">300</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-surface-overlay rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">600</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-surface-base rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">800</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-background-primary rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">900</div>
          </div>
        </div>
      </div>

      {/* Status Colors */}
      <div>
        <div className="text-sm font-medium text-text-secondary mb-2">Status Colors</div>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <div className="h-12 bg-success-500 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">Success</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-warning-500 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">Warning</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-error-500 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">Error</div>
          </div>
          <div className="space-y-1">
            <div className="h-12 bg-info-500 rounded border border-border" />
            <div className="text-xs text-text-tertiary text-center">Info</div>
          </div>
        </div>
      </div>

      {/* Sample UI */}
      <div className="pt-4 border-t border-border">
        <div className="text-sm font-medium text-text-secondary mb-2">Sample UI</div>
        <div className="p-4 bg-background-primary rounded border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-text-primary">Card Title</h4>
            <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded">Active</span>
          </div>
          <p className="text-sm text-text-secondary mb-3">
            This is sample content showing how text and UI elements appear in the selected theme.
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700">
              Primary
            </button>
            <button className="px-3 py-1.5 bg-surface-elevated text-text-secondary text-sm rounded border border-border hover:bg-surface-overlay">
              Secondary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useDisplaySettings } from '@common/hooks/useDisplaySettings';
import type {
  TextSize,
  Density,
  SidebarWidth,
  Theme,
  AnimationSpeed,
} from '@common/hooks/useDisplaySettings';
import { Button } from '@common/components/atoms/Button';
import { Card } from '@common/components/organisms/Card';
import { Alert } from '@common/components/organisms/Alert';
import { TextSizePreview } from './TextSizePreview';
import { DensityPreview } from './DensityPreview';
import { ThemePreview } from './ThemePreview';
import { AnimationPreview } from './AnimationPreview';
import { cn } from '@common/utils/classNames';

export interface DisplaySettingsProps {
  className?: string;
}

/**
 * DisplaySettings component for managing user display preferences
 *
 * Features:
 * - Text size adjustment (small to extra-large)
 * - Density control (compact to spacious)
 * - Sidebar width customization
 * - Theme selection (light/dark/auto)
 * - Animation speed control
 * - Live preview of changes
 * - Reset to defaults
 * - Save confirmation
 */
export const DisplaySettings: React.FC<DisplaySettingsProps> = ({ className = '' }) => {
  const { settings, updateSettings, resetSettings } = useDisplaySettings();
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const handleTextSizeChange = (value: string) => {
    updateSettings({ textSize: value as TextSize });
    showConfirmation();
  };

  const handleDensityChange = (value: string) => {
    updateSettings({ density: value as Density });
    showConfirmation();
  };

  const handleSidebarWidthChange = (value: string) => {
    updateSettings({ sidebarWidth: value as SidebarWidth });
    showConfirmation();
  };

  const handleThemeChange = (value: string) => {
    updateSettings({ theme: value as Theme });
    showConfirmation();
  };

  const handleAnimationSpeedChange = (value: string) => {
    updateSettings({ animationSpeed: value as AnimationSpeed });
    showConfirmation();
  };

  const handleReset = () => {
    resetSettings();
    showConfirmation();
  };

  const showConfirmation = () => {
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 3000);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Save Confirmation */}
      {showSaveConfirmation && (
        <Alert
          variant="success"
          title="Settings saved successfully"
          dismissible
          onDismiss={() => setShowSaveConfirmation(false)}
        />
      )}

      {/* Text Size */}
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Text Size</h3>
            <p className="text-sm text-text-secondary mt-1">
              Adjust the size of text throughout the application
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Size</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['small', 'medium', 'large', 'extra-large'] as TextSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => handleTextSizeChange(size)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                    settings.textSize === size
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-surface-base border-border text-text-secondary hover:border-primary-500'
                  )}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <TextSizePreview textSize={settings.textSize} />
        </div>
      </Card>

      {/* Density */}
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Spacing Density</h3>
            <p className="text-sm text-text-secondary mt-1">
              Control the amount of spacing between elements
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Density</label>
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'comfortable', 'spacious'] as Density[]).map((density) => (
                <button
                  key={density}
                  onClick={() => handleDensityChange(density)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                    settings.density === density
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-surface-base border-border text-text-secondary hover:border-primary-500'
                  )}
                >
                  {density.charAt(0).toUpperCase() + density.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <DensityPreview density={settings.density} />
        </div>
      </Card>

      {/* Sidebar Width */}
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Sidebar Width</h3>
            <p className="text-sm text-text-secondary mt-1">Adjust the width of the navigation sidebar</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Width</label>
            <div className="grid grid-cols-3 gap-2">
              {(['narrow', 'medium', 'wide'] as SidebarWidth[]).map((width) => (
                <button
                  key={width}
                  onClick={() => handleSidebarWidthChange(width)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                    settings.sidebarWidth === width
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-surface-base border-border text-text-secondary hover:border-primary-500'
                  )}
                >
                  {width.charAt(0).toUpperCase() + width.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-surface-base rounded-lg border border-border">
            <p className="text-text-secondary mb-2 text-xs">Preview:</p>
            <div className="flex gap-2">
              <div
                className="bg-surface-elevated rounded h-24"
                style={{ width: getSidebarWidth(settings.sidebarWidth) }}
              />
              <div className="flex-1 bg-surface-elevated rounded h-24" />
            </div>
          </div>
        </div>
      </Card>

      {/* Theme */}
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Theme</h3>
            <p className="text-sm text-text-secondary mt-1">Choose your preferred color theme</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'auto'] as Theme[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                    settings.theme === theme
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-surface-base border-border text-text-secondary hover:border-primary-500'
                  )}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-text-tertiary">
            {settings.theme === 'auto'
              ? 'Theme will match your system preferences'
              : `Currently using ${settings.theme} theme`}
          </p>

          {/* Preview */}
          <ThemePreview theme={settings.theme} />
        </div>
      </Card>

      {/* Animation Speed */}
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Animation Speed</h3>
            <p className="text-sm text-text-secondary mt-1">
              Control the speed of animations and transitions
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Speed</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['none', 'reduced', 'normal', 'enhanced'] as AnimationSpeed[]).map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleAnimationSpeedChange(speed)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                    settings.animationSpeed === speed
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-surface-base border-border text-text-secondary hover:border-primary-500'
                  )}
                >
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {settings.reducedMotion && (
            <Alert
              variant="info"
              title="Reduced Motion Enabled"
              description="Your system preferences indicate reduced motion. Animations are automatically reduced."
            />
          )}

          {/* Preview */}
          <AnimationPreview
            animationSpeed={settings.animationSpeed}
            reducedMotion={settings.reducedMotion}
          />
        </div>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
};

// Helper function for sidebar width preview
function getSidebarWidth(sidebarWidth: SidebarWidth): string {
  const widths = {
    narrow: '200px',
    medium: '240px',
    wide: '280px',
  };
  return widths[sidebarWidth];
}

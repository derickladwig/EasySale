/**
 * Store Theme Configuration Component
 * Allows store administrators to configure theme settings and locks
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Stack } from '../../components/ui/Stack';
import { Inline } from '../../components/ui/Inline';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useTheme } from '../../config/ThemeProvider';
import { useConfig } from '../../config/ConfigProvider';
import { useToast } from '@common/contexts/ToastContext';
import { LogoWithFallback } from '@common/components/atoms/LogoWithFallback';
import type { ThemeConfig } from '../../config/types';

interface StoreThemeConfigProps {
  storeId?: string;
  onSave?: () => void;
}

export const StoreThemeConfig: React.FC<StoreThemeConfigProps> = ({ storeId: _storeId, onSave }) => {
  const { theme, setTheme } = useTheme();
  const { branding, brandConfig, getLogo } = useConfig();
  const toast = useToast();

  // Local state for theme configuration - initialized from config
  const [mode, setMode] = useState<'light' | 'dark' | 'auto'>(theme?.mode || 'light');
  const [accentColor, setAccentColor] = useState<string>('#14b8a6');
  const [lockMode, setLockMode] = useState(false);
  const [lockAccent, setLockAccent] = useState(false);
  const [lockContrast, setLockContrast] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize from config on mount
  useEffect(() => {
    const configCompanyName = branding?.company?.name || brandConfig?.company?.name || '';
    const configLogoUrl = getLogo(theme?.mode === 'dark') || '';
    
    setCompanyName(configCompanyName);
    setLogoUrl(configLogoUrl);
  }, [branding, brandConfig, getLogo, theme?.mode]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Generate a full color scale from the accent color
      const colorScale = generateColorScale(accentColor);

      // Build theme configuration
      const themeConfig: Partial<ThemeConfig> = {
        mode,
        colors: theme?.colors ? {
          ...theme.colors,
          // Set both primary and accent to the chosen color
          // This ensures all bg-primary-* and accent classes use the same color
          primary: colorScale,
          accent: colorScale,
        } : undefined,
      };

      // Save theme preferences
      await setTheme(themeConfig);

      // Save locks and branding to backend
      try {
        await fetch('/api/config/theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            accent_color: accentColor,
            locks: { lock_mode: lockMode, lock_accent: lockAccent, lock_contrast: lockContrast },
            logo_url: logoUrl,
            company_name: companyName,
          })
        });
      } catch {
        // Theme was saved locally, backend save is optional
        console.warn('Could not save theme to backend, local settings applied');
      }

      toast.success('Store theme configuration saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Failed to save store theme:', error);
      toast.error('Failed to save store theme configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="6">
      <SectionHeader
        title="Store Theme Configuration"
        helperText="Configure the default theme for this store and control user customization"
      />

      {/* Theme Mode */}
      <Card padding="lg">
        <Stack gap="4">
          <h3 className="text-lg font-semibold text-text-primary">Theme Mode</h3>

          <Select
            label="Default Mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'light' | 'dark' | 'auto')}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto (System Preference)' },
            ]}
            helperText="Choose the default theme mode for this store"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={lockMode}
              onChange={(e) => setLockMode(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-border-DEFAULT"
            />
            <span className="text-sm text-text-primary">
              Lock theme mode (prevent users from changing)
            </span>
          </label>
        </Stack>
      </Card>

      {/* Accent Color */}
      <Card padding="lg">
        <Stack gap="4">
          <h3 className="text-lg font-semibold text-text-primary">Accent Color</h3>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input
                type="color"
                label="Accent Color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                helperText="Choose the primary accent color for buttons and highlights"
              />
            </div>
            <div
              className="w-16 h-10 rounded border-2 border-border-DEFAULT"
              style={{ backgroundColor: accentColor }}
              title="Preview"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-text-secondary">Quick colors:</span>
            {[
              { name: 'Teal', value: '#14b8a6' },
              { name: 'Blue', value: '#3b82f6' },
              { name: 'Green', value: '#10b981' },
              { name: 'Orange', value: '#f97316' },
              { name: 'Purple', value: '#a855f7' },
              { name: 'Red', value: '#ef4444' },
            ].map((color) => (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                className="w-8 h-8 rounded border-2 border-border-DEFAULT hover:border-accent transition-colors"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={lockAccent}
              onChange={(e) => setLockAccent(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-border-DEFAULT"
            />
            <span className="text-sm text-text-primary">
              Lock accent color (prevent users from changing)
            </span>
          </label>
        </Stack>
      </Card>

      {/* Contrast & Accessibility */}
      <Card padding="lg">
        <Stack gap="4">
          <h3 className="text-lg font-semibold text-text-primary">Contrast & Accessibility</h3>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={lockContrast}
              onChange={(e) => setLockContrast(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-border-DEFAULT"
            />
            <span className="text-sm text-text-primary">
              Lock contrast settings (prevent users from changing)
            </span>
          </label>

          <p className="text-sm text-text-secondary">
            Contrast settings control high-contrast mode and other accessibility features.
          </p>
        </Stack>
      </Card>

      {/* Branding */}
      <Card padding="lg">
        <Stack gap="4">
          <h3 className="text-lg font-semibold text-text-primary">Branding</h3>

          <Input
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            helperText="Displayed in the application header and login screen"
          />

          <Input
            label="Logo URL"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            helperText="URL to your company logo (recommended: 200x50px PNG with transparent background)"
          />

          {logoUrl && (
            <div className="p-4 bg-surface-2 rounded border border-border-DEFAULT">
              <p className="text-sm text-text-secondary mb-2">Logo Preview:</p>
              <LogoWithFallback
                logoUrl={logoUrl}
                companyName={companyName || 'Company'}
                size="lg"
                className="max-h-12"
                testId="logo-preview"
              />
            </div>
          )}
        </Stack>
      </Card>

      {/* Actions */}
      <Card padding="lg">
        <Inline gap="2" justify="end">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Theme Configuration'}
          </Button>
        </Inline>
      </Card>
    </Stack>
  );
};

/**
 * Adjust color brightness by a percentage
 * @param color - Hex color string (e.g., '#3b82f6')
 * @param percent - Percentage to adjust (-100 to 100)
 */
function adjustColorBrightness(color: string, percent: number): string {
  // Remove # if present
  const hex = color.replace('#', '');

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  const adjust = (value: number) => {
    const adjusted = value + (value * percent) / 100;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  // Convert back to hex
  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Generate a full color scale from a base color
 * Creates shades from 50 (lightest) to 950 (darkest)
 * @param baseColor - Hex color string (e.g., '#14b8a6')
 */
function generateColorScale(baseColor: string): {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
} {
  return {
    50: adjustColorBrightness(baseColor, 90),
    100: adjustColorBrightness(baseColor, 75),
    200: adjustColorBrightness(baseColor, 55),
    300: adjustColorBrightness(baseColor, 35),
    400: adjustColorBrightness(baseColor, 15),
    500: baseColor,
    600: adjustColorBrightness(baseColor, -12),
    700: adjustColorBrightness(baseColor, -25),
    800: adjustColorBrightness(baseColor, -40),
    900: adjustColorBrightness(baseColor, -55),
    950: adjustColorBrightness(baseColor, -70),
  };
}

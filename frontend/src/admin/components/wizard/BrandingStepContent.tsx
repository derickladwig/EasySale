/**
 * BrandingStepContent - Branding Configuration
 * 
 * Optional step for uploading logo and setting colors.
 * Validates: Requirements 6.1, 6.5
 */

import React, { useState, useRef } from 'react';
import { CheckCircle2, Upload, Image, Palette } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { cn } from '@common/utils/classNames';
import { toast } from '@common/components/molecules/Toast';
import type { StepContentProps, BrandingStepData } from './types';

// Determine API base URL dynamically
function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return ''; // Relative URLs - nginx will proxy to backend
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:8923`;
}

// Default accent color - teal to match tokens.css source of truth
const DEFAULT_ACCENT_COLOR = '#14b8a6';
const DEFAULT_ACCENT_600 = '#0d9488';
const DEFAULT_ACCENT_PRESET = 'teal';

// Neutral color for custom preset placeholder
const NEUTRAL_COLOR = '#64748b';
const NEUTRAL_COLOR_DARK = '#475569';

const THEME_PRESETS = [
  { id: 'teal', name: 'Teal', color: '#14b8a6', accent500: '#14b8a6', accent600: '#0d9488' },
  { id: 'emerald', name: 'Emerald', color: '#10b981', accent500: '#10b981', accent600: '#059669' },
  { id: 'green', name: 'Green', color: '#22c55e', accent500: '#22c55e', accent600: '#16a34a' },
  { id: 'lime', name: 'Lime', color: '#84cc16', accent500: '#84cc16', accent600: '#65a30d' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4', accent500: '#06b6d4', accent600: '#0891b2' },
  { id: 'blue', name: 'Blue', color: '#3b82f6', accent500: '#3b82f6', accent600: '#2563eb' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1', accent500: '#6366f1', accent600: '#4f46e5' },
  { id: 'violet', name: 'Violet', color: '#8b5cf6', accent500: '#8b5cf6', accent600: '#7c3aed' },
  { id: 'purple', name: 'Purple', color: '#a855f7', accent500: '#a855f7', accent600: '#9333ea' },
  { id: 'fuchsia', name: 'Fuchsia', color: '#d946ef', accent500: '#d946ef', accent600: '#c026d3' },
  { id: 'pink', name: 'Pink', color: '#ec4899', accent500: '#ec4899', accent600: '#db2777' },
  { id: 'rose', name: 'Rose', color: '#f43f5e', accent500: '#f43f5e', accent600: '#e11d48' },
  { id: 'red', name: 'Red', color: '#ef4444', accent500: '#ef4444', accent600: '#dc2626' },
  { id: 'orange', name: 'Orange', color: '#f97316', accent500: '#f97316', accent600: '#ea580c' },
  { id: 'amber', name: 'Amber', color: '#f59e0b', accent500: '#f59e0b', accent600: '#d97706' },
  { id: 'yellow', name: 'Yellow', color: '#eab308', accent500: '#eab308', accent600: '#ca8a04' },
  { id: 'custom', name: 'Custom', color: NEUTRAL_COLOR, accent500: NEUTRAL_COLOR, accent600: NEUTRAL_COLOR_DARK },
];

// Helper to generate darker shade for accent600
function darkenColor(hex: string, percent: number = 15): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export function BrandingStepContent({
  onComplete,
  data,
  isComplete,
}: StepContentProps<BrandingStepData>) {
  const [formData, setFormData] = useState<BrandingStepData>({
    logoLight: data?.logoLight || '',
    logoDark: data?.logoDark || '',
    accentColor: data?.accentColor || DEFAULT_ACCENT_COLOR,
    themePreset: data?.themePreset || DEFAULT_ACCENT_PRESET,
  });
  const [customHex, setCustomHex] = useState(data?.accentColor || DEFAULT_ACCENT_COLOR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lightLogoRef = useRef<HTMLInputElement>(null);
  const darkLogoRef = useRef<HTMLInputElement>(null);

  // Validate hex color
  const isValidHex = (hex: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(hex);

  // Max file size: 2MB
  const MAX_LOGO_SIZE = 2 * 1024 * 1024;

  const handleLogoUpload = (type: 'light' | 'dark') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > MAX_LOGO_SIZE) {
        toast.error('Logo file is too large. Maximum size is 2MB.');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, SVG, etc.)');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          [type === 'light' ? 'logoLight' : 'logoDark']: reader.result as string,
        }));
      };
      reader.onerror = () => {
        toast.error('Failed to read logo file');
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply accent colors to CSS variables for real-time preview
  const applyAccentPreview = (accent500: string, accent600: string) => {
    const root = document.documentElement;
    
    // Generate color scale
    const scale = generateColorScale(accent500, accent600);
    
    // Apply to both accent and primary CSS variables
    ['accent', 'primary'].forEach(prefix => {
      Object.entries(scale).forEach(([shade, color]) => {
        root.style.setProperty(`--color-${prefix}-${shade}`, color);
      });
    });
    
    // Also set action colors for buttons
    root.style.setProperty('--color-action-primary-bg', accent500);
    root.style.setProperty('--color-action-primary-hover', accent600);
    // Use CSS variable for inverse text color (white on dark backgrounds)
    root.style.setProperty('--color-action-primary-fg', 'var(--color-text-inverse, #ffffff)');
    
    // Update theme accent variable used by wizard
    root.style.setProperty('--theme-accent', accent500);
    root.style.setProperty('--theme-accent-hover', accent600);
  };
  
  // Generate full color scale from accent colors
  const generateColorScale = (accent500: string, accent600: string): Record<string, string> => {
    const adjustBrightness = (color: string, percent: number): string => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      const adjust = (value: number) => {
        const adjusted = value + (value * percent) / 100;
        return Math.max(0, Math.min(255, Math.round(adjusted)));
      };
      
      const toHex = (value: number) => value.toString(16).padStart(2, '0');
      return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
    };
    
    return {
      '50': adjustBrightness(accent500, 90),
      '100': adjustBrightness(accent500, 75),
      '200': adjustBrightness(accent500, 55),
      '300': adjustBrightness(accent500, 35),
      '400': adjustBrightness(accent500, 15),
      '500': accent500,
      '600': accent600,
      '700': adjustBrightness(accent600, -15),
      '800': adjustBrightness(accent600, -30),
      '900': adjustBrightness(accent600, -45),
      '950': adjustBrightness(accent600, -60),
    };
  };

  const handlePresetSelect = (preset: typeof THEME_PRESETS[0]) => {
    if (preset.id === 'custom') {
      // For custom, use the current customHex value
      setFormData((prev) => ({
        ...prev,
        themePreset: 'custom',
        accentColor: customHex,
      }));
      // Apply preview immediately
      if (isValidHex(customHex)) {
        applyAccentPreview(customHex, darkenColor(customHex));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        themePreset: preset.id as BrandingStepData['themePreset'],
        accentColor: preset.color,
      }));
      setCustomHex(preset.color);
      // Apply preview immediately
      applyAccentPreview(preset.accent500, preset.accent600);
    }
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    if (isValidHex(hex)) {
      setFormData((prev) => ({
        ...prev,
        themePreset: 'custom',
        accentColor: hex,
      }));
      // Apply preview immediately for valid hex
      applyAccentPreview(hex, darkenColor(hex));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Determine accent colors
      let accent500 = formData.accentColor || DEFAULT_ACCENT_COLOR;
      let accent600 = darkenColor(accent500);
      
      // If using a preset, use its predefined colors
      if (formData.themePreset && formData.themePreset !== 'custom') {
        const selectedPreset = THEME_PRESETS.find(p => p.id === formData.themePreset);
        if (selectedPreset) {
          accent500 = selectedPreset.accent500;
          accent600 = selectedPreset.accent600;
        }
      }
      
      const storeId = localStorage.getItem('store_id') || 'default';
      
      const themePayload = {
        scope: 'store',
        storeId,
        theme: {
          mode: 'dark', // Default to dark mode
          accent: {
            '500': accent500,
            '600': accent600,
          },
          density: 'comfortable',
          ...(formData.logoLight && { logoLight: formData.logoLight }),
          ...(formData.logoDark && { logoDark: formData.logoDark }),
        },
      };
      
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('auth_token');
      
      // Use POST method (matches backend route registration)
      const response = await fetch(`${apiBaseUrl}/api/theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(themePayload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save theme');
      }
      
      // Update localStorage to prevent flickering on reload
      localStorage.setItem('theme_accent_500', accent500);
      localStorage.setItem('theme_accent_600', accent600);
      localStorage.setItem('theme_preset', formData.themePreset || 'blue');
      
      toast.success('Branding saved successfully');
      onComplete(formData);
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast.error('Failed to save branding. Settings will be saved locally.');
      // Still complete the step with local data
      onComplete(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="bg-success-500/10 border border-success-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success-400" />
          <div>
            <h3 className="text-lg font-medium text-success-300">
              Branding Configured
            </h3>
            <p className="text-success-400/80 text-sm mt-1">
              Theme: {data?.themePreset || 'default'}
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Logo Upload - Compact Design */}
      <div className="bg-surface-base border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Image className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium text-white">Logo</h3>
          <span className="text-xs text-text-tertiary">(optional)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Light Logo */}
          <div>
            <input
              ref={lightLogoRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload('light')}
              className="hidden"
            />
            <div
              onClick={() => lightLogoRef.current?.click()}
              className={cn(
                'border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all hover:bg-surface-elevated',
                formData.logoLight
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-border'
              )}
            >
              {formData.logoLight ? (
                <img
                  src={formData.logoLight}
                  alt="Light logo"
                  className="max-h-10 mx-auto"
                />
              ) : (
                <div className="text-text-tertiary">
                  <Upload className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs">Light theme</p>
                </div>
              )}
            </div>
          </div>

          {/* Dark Logo */}
          <div>
            <input
              ref={darkLogoRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload('dark')}
              className="hidden"
            />
            <div
              onClick={() => darkLogoRef.current?.click()}
              className={cn(
                'border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all bg-background-primary hover:bg-surface-base',
                formData.logoDark
                  ? 'border-accent/50'
                  : 'border-border'
              )}
            >
              {formData.logoDark ? (
                <img
                  src={formData.logoDark}
                  alt="Dark logo"
                  className="max-h-10 mx-auto"
                />
              ) : (
                <div className="text-text-tertiary">
                  <Upload className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs">Dark theme</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Theme Preset - Compact Design */}
      <div className="bg-surface-base border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium text-white">Accent Color</h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: formData.accentColor + '20', color: formData.accentColor }}>
            {formData.themePreset === 'custom' ? customHex : THEME_PRESETS.find(p => p.id === formData.themePreset)?.name}
          </span>
        </div>
        
        {/* Color Grid - More compact */}
        <div className="grid grid-cols-8 gap-1.5 mb-3">
          {THEME_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={cn(
                'aspect-square rounded-md border transition-all cursor-pointer relative',
                formData.themePreset === preset.id
                  ? 'border-white ring-1 ring-white/40 scale-110 z-10'
                  : 'border-transparent hover:scale-105'
              )}
              style={{ backgroundColor: preset.color }}
              title={preset.name}
            >
              {formData.themePreset === preset.id && (
                <CheckCircle2 className="w-3 h-3 text-white absolute inset-0 m-auto drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>
        
        {/* Custom Hex Input - Inline compact */}
        <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded-md border border-border">
          <div 
            className="w-7 h-7 rounded border border-white/20 flex-shrink-0"
            style={{ backgroundColor: isValidHex(customHex) ? customHex : NEUTRAL_COLOR }}
          />
          <input
            type="text"
            value={customHex}
            onChange={(e) => handleCustomHexChange(e.target.value)}
            placeholder="#14b8a6"
            className={cn(
              "flex-1 bg-transparent border-0 text-xs font-mono focus:outline-none",
              isValidHex(customHex) ? "text-white" : "text-error-400"
            )}
            maxLength={7}
          />
          <input
            type="color"
            value={isValidHex(customHex) ? customHex : NEUTRAL_COLOR}
            onChange={(e) => handleCustomHexChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
          />
          <Button
            type="button"
            variant={formData.themePreset === 'custom' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handlePresetSelect(THEME_PRESETS.find(p => p.id === 'custom')!)}
            disabled={!isValidHex(customHex)}
            className="text-xs px-2 py-1 h-auto"
          >
            Apply
          </Button>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Saving...' : 'Save Branding'}
      </Button>
    </form>
  );
}

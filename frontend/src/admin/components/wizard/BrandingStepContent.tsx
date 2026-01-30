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

const THEME_PRESETS = [
  { id: 'blue', name: 'Blue', color: '#0756d9', accent500: '#0756d9', accent600: '#0548b8' },
  { id: 'teal', name: 'Teal', color: '#14b8a6', accent500: '#14b8a6', accent600: '#0d9488' },
  { id: 'emerald', name: 'Emerald', color: '#10b981', accent500: '#10b981', accent600: '#059669' },
  { id: 'green', name: 'Green', color: '#22c55e', accent500: '#22c55e', accent600: '#16a34a' },
  { id: 'lime', name: 'Lime', color: '#84cc16', accent500: '#84cc16', accent600: '#65a30d' },
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
  { id: 'cyan', name: 'Cyan', color: '#06b6d4', accent500: '#06b6d4', accent600: '#0891b2' },
  { id: 'custom', name: 'Custom', color: '#888888', accent500: '#888888', accent600: '#666666' },
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
    accentColor: data?.accentColor || '#0756d9',
    themePreset: data?.themePreset || 'blue',
  });
  const [customHex, setCustomHex] = useState(data?.accentColor || '#0756d9');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lightLogoRef = useRef<HTMLInputElement>(null);
  const darkLogoRef = useRef<HTMLInputElement>(null);

  // Validate hex color
  const isValidHex = (hex: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(hex);

  const handleLogoUpload = (type: 'light' | 'dark') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          [type === 'light' ? 'logoLight' : 'logoDark']: reader.result as string,
        }));
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
    root.style.setProperty('--color-action-primary-fg', '#ffffff');
    
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
      let accent500 = formData.accentColor || '#0756d9';
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo Upload */}
      <div className="bg-surface-base border border-border rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Image className="w-5 h-5 text-primary-400" />
          Logo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Light Logo */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Light Theme Logo
            </label>
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
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                formData.logoLight
                  ? 'border-primary-500/50 bg-primary-500/5'
                  : 'border-border hover:border-border'
              )}
            >
              {formData.logoLight ? (
                <img
                  src={formData.logoLight}
                  alt="Light logo preview"
                  className="max-h-16 mx-auto"
                />
              ) : (
                <div className="text-text-tertiary">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Click to upload</p>
                </div>
              )}
            </div>
          </div>

          {/* Dark Logo */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Dark Theme Logo
            </label>
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
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors bg-background-primary',
                formData.logoDark
                  ? 'border-primary-500/50'
                  : 'border-border hover:border-border'
              )}
            >
              {formData.logoDark ? (
                <img
                  src={formData.logoDark}
                  alt="Dark logo preview"
                  className="max-h-16 mx-auto"
                />
              ) : (
                <div className="text-text-tertiary">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Click to upload</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Theme Preset */}
      <div className="bg-surface-base border border-border rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary-400" />
          Accent Color
        </h3>
        
        {/* Color Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-4">
          {THEME_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={cn(
                'aspect-square rounded-lg border-2 transition-all cursor-pointer relative group',
                formData.themePreset === preset.id
                  ? 'border-white ring-2 ring-white/30 scale-110 z-10'
                  : 'border-transparent hover:border-white/50 hover:scale-105'
              )}
              style={{ backgroundColor: preset.color }}
              title={preset.name}
            >
              {formData.themePreset === preset.id && (
                <CheckCircle2 className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-lg" />
              )}
              <span className="sr-only">{preset.name}</span>
            </button>
          ))}
        </div>
        
        {/* Custom Hex Input */}
        <div className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg border border-border">
          <div 
            className="w-10 h-10 rounded-lg border-2 border-white/20 flex-shrink-0"
            style={{ backgroundColor: isValidHex(customHex) ? customHex : '#888888' }}
          />
          <div className="flex-1">
            <label className="block text-xs text-text-tertiary mb-1">Custom Hex Color</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customHex}
                onChange={(e) => handleCustomHexChange(e.target.value)}
                placeholder="#14b8a6"
                className={cn(
                  "flex-1 bg-surface-base border rounded px-3 py-1.5 text-sm font-mono",
                  isValidHex(customHex) ? "border-border text-white" : "border-error-500/50 text-error-400"
                )}
                maxLength={7}
              />
              <input
                type="color"
                value={isValidHex(customHex) ? customHex : '#888888'}
                onChange={(e) => handleCustomHexChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                title="Pick a color"
              />
            </div>
          </div>
          <Button
            type="button"
            variant={formData.themePreset === 'custom' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handlePresetSelect(THEME_PRESETS.find(p => p.id === 'custom')!)}
            disabled={!isValidHex(customHex)}
          >
            Use Custom
          </Button>
        </div>
        
        <p className="text-sm text-text-tertiary mt-3">
          Selected: <span className="text-white font-medium" style={{ color: formData.accentColor }}>
            {formData.themePreset === 'custom' ? `Custom (${formData.accentColor})` : THEME_PRESETS.find(p => p.id === formData.themePreset)?.name}
          </span>
        </p>
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

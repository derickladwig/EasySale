/**
 * BrandingSettingsPage - Comprehensive branding configuration
 * 
 * Features:
 * - Logo upload with drag-drop and file picker
 * - Image cropping with aspect ratio constraints
 * - Real-time preview panel showing logo in header, login, favicon
 * - Color picker with preset themes + custom hex
 * - Live CSS variable updates for instant preview
 * - Favicon and app icon generation
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, Image, Palette, Eye, Save, ArrowLeft, 
  CheckCircle2, AlertCircle, Trash2, RefreshCw 
} from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { cn } from '@common/utils/classNames';
import { toast } from '@common/components/molecules/Toast';
import { brandingApi, validateImageFile, getImageDimensions } from '../../services/brandingApi';
import type { AssetType, CropRegion, UploadResponse } from '../../services/brandingApi';

// ============================================================================
// Types
// ============================================================================

interface BrandingState {
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  icon: string | null;
  accentColor: string;
  themePreset: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const THEME_PRESETS = [
  { id: 'blue', name: 'Blue', color: '#0756d9' },
  { id: 'teal', name: 'Teal', color: '#14b8a6' },
  { id: 'emerald', name: 'Emerald', color: '#10b981' },
  { id: 'green', name: 'Green', color: '#22c55e' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1' },
  { id: 'violet', name: 'Violet', color: '#8b5cf6' },
  { id: 'purple', name: 'Purple', color: '#a855f7' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
  { id: 'rose', name: 'Rose', color: '#f43f5e' },
  { id: 'red', name: 'Red', color: '#ef4444' },
  { id: 'orange', name: 'Orange', color: '#f97316' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function darkenColor(hex: string, percent: number = 15): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function applyAccentPreview(accent500: string) {
  const accent600 = darkenColor(accent500);
  const root = document.documentElement;
  
  // Apply to CSS variables
  ['accent', 'primary'].forEach(prefix => {
    root.style.setProperty(`--color-${prefix}-500`, accent500);
    root.style.setProperty(`--color-${prefix}-600`, accent600);
  });
  
  root.style.setProperty('--color-action-primary-bg', accent500);
  root.style.setProperty('--color-action-primary-hover', accent600);
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ImageUploadZoneProps {
  label: string;
  description: string;
  currentImage: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
  aspectRatio?: 'square' | 'wide';
}

function ImageUploadZone({
  label,
  description,
  currentImage,
  onUpload,
  onRemove,
  isUploading,
  aspectRatio = 'wide',
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        onUpload(file);
      } else {
        toast.error(validation.error || 'Invalid file');
      }
    }
  }, [onUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        onUpload(file);
      } else {
        toast.error(validation.error || 'Invalid file');
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <p className="text-xs text-text-tertiary">{description}</p>
      
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all cursor-pointer',
          aspectRatio === 'square' ? 'aspect-square' : 'aspect-video',
          isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-border hover:border-primary-500/50',
          currentImage ? 'bg-surface-elevated' : 'bg-surface-base',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        {currentImage ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img
              src={currentImage}
              alt={label}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute top-2 right-2 p-1.5 bg-error-500/80 hover:bg-error-500 rounded-full text-white transition-colors"
              title="Remove image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary">
            {isUploading ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8 mb-2" />
                <p className="text-sm">Drop image or click to upload</p>
                <p className="text-xs mt-1">PNG, JPG, WebP up to 10MB</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PreviewPanelProps {
  branding: BrandingState;
  companyName: string;
}

function PreviewPanel({ branding, companyName }: PreviewPanelProps) {
  return (
    <div className="bg-surface-elevated border border-border rounded-xl p-6 space-y-6">
      <h3 className="text-lg font-medium text-white flex items-center gap-2">
        <Eye className="w-5 h-5 text-primary-400" />
        Live Preview
      </h3>

      {/* Header Preview */}
      <div className="space-y-2">
        <p className="text-xs text-text-tertiary uppercase tracking-wide">Header</p>
        <div className="bg-surface-base border border-border rounded-lg p-4 flex items-center gap-3">
          {branding.logoDark ? (
            <img src={branding.logoDark} alt="Logo" className="h-8 w-auto" />
          ) : (
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: branding.accentColor }}
            >
              {companyName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-white font-medium">{companyName}</span>
        </div>
      </div>

      {/* Favicon Preview */}
      <div className="space-y-2">
        <p className="text-xs text-text-tertiary uppercase tracking-wide">Browser Tab</p>
        <div className="bg-slate-700 rounded-t-lg p-2 flex items-center gap-2 max-w-[200px]">
          {branding.favicon ? (
            <img src={branding.favicon} alt="Favicon" className="w-4 h-4" />
          ) : (
            <div 
              className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold"
              style={{ backgroundColor: branding.accentColor }}
            >
              {companyName.substring(0, 1)}
            </div>
          )}
          <span className="text-slate-300 text-xs truncate">{companyName}</span>
        </div>
      </div>

      {/* Login Badge Preview */}
      <div className="space-y-2">
        <p className="text-xs text-text-tertiary uppercase tracking-wide">Login Badge</p>
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-800/50 shadow-lg">
            {branding.favicon || branding.icon ? (
              <img 
                src={branding.favicon || branding.icon || ''} 
                alt="Badge" 
                className="w-12 h-12 object-contain" 
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: branding.accentColor }}
              >
                {companyName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Button Preview */}
      <div className="space-y-2">
        <p className="text-xs text-text-tertiary uppercase tracking-wide">Buttons</p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg text-white font-medium transition-colors"
            style={{ 
              backgroundColor: branding.accentColor,
            }}
          >
            Primary
          </button>
          <button
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              color: branding.accentColor,
              border: `1px solid ${branding.accentColor}`,
            }}
          >
            Secondary
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BrandingSettingsPage() {
  const navigate = useNavigate();
  
  const [branding, setBranding] = useState<BrandingState>({
    logoLight: null,
    logoDark: null,
    favicon: null,
    icon: null,
    accentColor: '#0756d9',
    themePreset: 'blue',
  });
  
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });
  
  const [customHex, setCustomHex] = useState('#0756d9');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing branding on mount
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const config = await brandingApi.getBrandingConfig();
        setBranding(prev => ({
          ...prev,
          logoLight: config.logoLight || null,
          logoDark: config.logoDark || null,
          favicon: config.favicon || null,
          icon: config.icon || null,
          accentColor: config.accentColor || '#0756d9',
        }));
        if (config.accentColor) {
          setCustomHex(config.accentColor);
          applyAccentPreview(config.accentColor);
        }
      } catch (error) {
        console.warn('Failed to load branding config:', error);
      }
    };
    loadBranding();
  }, []);

  // Handle image upload
  const handleUpload = async (file: File, assetType: AssetType) => {
    setUploadState({ isUploading: true, progress: 0, error: null });
    
    try {
      const result = await brandingApi.uploadImage(file, assetType);
      
      // Update state based on asset type
      setBranding(prev => {
        const updates: Partial<BrandingState> = {};
        
        if (assetType === 'logo_light') {
          updates.logoLight = result.urls.master;
        } else if (assetType === 'logo_dark') {
          updates.logoDark = result.urls.master;
        } else if (assetType === 'favicon' || assetType === 'icon') {
          updates.favicon = result.urls.favicon || result.urls.master;
          updates.icon = result.urls.master;
        }
        
        return { ...prev, ...updates };
      });
      
      setHasChanges(true);
      toast.success('Image uploaded successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({ ...prev, error: message }));
      toast.error(message);
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  };

  // Handle color preset selection
  const handlePresetSelect = (preset: typeof THEME_PRESETS[0]) => {
    setBranding(prev => ({
      ...prev,
      themePreset: preset.id,
      accentColor: preset.color,
    }));
    setCustomHex(preset.color);
    applyAccentPreview(preset.color);
    setHasChanges(true);
  };

  // Handle custom hex input
  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setBranding(prev => ({
        ...prev,
        themePreset: 'custom',
        accentColor: hex,
      }));
      applyAccentPreview(hex);
      setHasChanges(true);
    }
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await brandingApi.saveBrandingConfig({
        logoLight: branding.logoLight || undefined,
        logoDark: branding.logoDark || undefined,
        favicon: branding.favicon || undefined,
        icon: branding.icon || undefined,
        accentColor: branding.accentColor,
        themePreset: branding.themePreset,
      });
      
      // Save to localStorage for persistence
      localStorage.setItem('theme_accent_500', branding.accentColor);
      localStorage.setItem('theme_accent_600', darkenColor(branding.accentColor));
      localStorage.setItem('theme_preset', branding.themePreset);
      
      setHasChanges(false);
      toast.success('Branding saved successfully');
    } catch (error) {
      toast.error('Failed to save branding');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle remove image
  const handleRemoveImage = (type: keyof BrandingState) => {
    setBranding(prev => ({ ...prev, [type]: null }));
    setHasChanges(true);
  };

  const companyName = 'EasySale'; // TODO: Get from config

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-text-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-white">Branding Settings</h1>
              <p className="text-text-secondary text-sm mt-1">
                Customize your logo, colors, and brand identity
              </p>
            </div>
          </div>
          
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo Upload */}
            <div className="bg-surface-base border border-border rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary-400" />
                Logo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUploadZone
                  label="Light Theme Logo"
                  description="Used on dark backgrounds"
                  currentImage={branding.logoLight}
                  onUpload={(file) => handleUpload(file, 'logo_light')}
                  onRemove={() => handleRemoveImage('logoLight')}
                  isUploading={uploadState.isUploading}
                />
                
                <ImageUploadZone
                  label="Dark Theme Logo"
                  description="Used on light backgrounds"
                  currentImage={branding.logoDark}
                  onUpload={(file) => handleUpload(file, 'logo_dark')}
                  onRemove={() => handleRemoveImage('logoDark')}
                  isUploading={uploadState.isUploading}
                />
              </div>
            </div>

            {/* Favicon/Icon Upload */}
            <div className="bg-surface-base border border-border rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary-400" />
                Favicon & App Icon
              </h3>
              <p className="text-sm text-text-tertiary mb-4">
                Upload a square image (at least 512x512px). We'll generate all required sizes automatically.
              </p>
              
              <div className="max-w-xs">
                <ImageUploadZone
                  label="Icon"
                  description="Used for browser tab, PWA, and mobile"
                  currentImage={branding.favicon || branding.icon}
                  onUpload={(file) => handleUpload(file, 'favicon')}
                  onRemove={() => { handleRemoveImage('favicon'); handleRemoveImage('icon'); }}
                  isUploading={uploadState.isUploading}
                  aspectRatio="square"
                />
              </div>
            </div>

            {/* Color Theme */}
            <div className="bg-surface-base border border-border rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary-400" />
                Accent Color
              </h3>
              
              {/* Color Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-13 gap-2 mb-4">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      'aspect-square rounded-lg border-2 transition-all cursor-pointer relative',
                      branding.themePreset === preset.id
                        ? 'border-white ring-2 ring-white/30 scale-110 z-10'
                        : 'border-transparent hover:border-white/50 hover:scale-105'
                    )}
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  >
                    {branding.themePreset === preset.id && (
                      <CheckCircle2 className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Custom Hex Input */}
              <div className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg border border-border">
                <div 
                  className="w-10 h-10 rounded-lg border-2 border-white/20 flex-shrink-0"
                  style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : '#888888' }}
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
                        /^#[0-9A-Fa-f]{6}$/.test(customHex) 
                          ? "border-border text-white" 
                          : "border-error-500/50 text-error-400"
                      )}
                      maxLength={7}
                    />
                    <input
                      type="color"
                      value={/^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : '#888888'}
                      onChange={(e) => handleCustomHexChange(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                      title="Pick a color"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <PreviewPanel branding={branding} companyName={companyName} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrandingSettingsPage;

/**
 * Preferences Page
 * 
 * User preferences page accessible from profile menu.
 * Allows users to configure theme, UI density, keyboard shortcuts, and default landing page.
 * 
 * Requirements: 7.1 (User Preferences)
 */

import React, { useState, useEffect } from 'react';
import { useUserPreferences } from '@common/hooks/useUserPreferences';
import { useDisplaySettings } from '@common/hooks/useDisplaySettings';
import { useConfig } from '../../config/ConfigProvider';
import { Button } from '@common/components/atoms/Button';
import { CollapsibleSection } from '@common/components/molecules/CollapsibleSection';
import { useToast } from '@common/contexts/ToastContext';
import { getEffectiveThemeDescription } from '@common/utils/themeResolver';
import { 
  Palette, 
  Layout, 
  Keyboard, 
  Home, 
  Save, 
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Maximize2,
  Minimize2,
  Square
} from 'lucide-react';
import type { ThemeAppearance, UIDensity } from '@common/utils/userPreferences';

export function PreferencesPage() {
  const {
    preferences,
    isLoading,
    setTheme,
    setDensity,
    setDefaultLandingPage,
    setKeyboardShortcuts,
    resetToDefaults,
  } = useUserPreferences();
  
  // Use displaySettings to actually apply theme changes to the DOM
  const { updateSettings: updateDisplaySettings } = useDisplaySettings();
  
  const { brandConfig } = useConfig();
  const toast = useToast();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Local state for form values
  const [localTheme, setLocalTheme] = useState<ThemeAppearance>(preferences.theme || 'store-default');
  const [localDensity, setLocalDensity] = useState<UIDensity>(preferences.density || 'comfortable');
  const [localLandingPage, setLocalLandingPage] = useState(preferences.defaultLandingPage || '/');
  const [localShortcutsEnabled, setLocalShortcutsEnabled] = useState(
    preferences.shortcuts?.enabled ?? true
  );

  // Sync local state with preferences when they change
  useEffect(() => {
    setLocalTheme(preferences.theme || 'store-default');
    setLocalDensity(preferences.density || 'comfortable');
    setLocalLandingPage(preferences.defaultLandingPage || '/');
    setLocalShortcutsEnabled(preferences.shortcuts?.enabled ?? true);
  }, [preferences]);

  // Check if there are unsaved changes
  useEffect(() => {
    const changed =
      localTheme !== (preferences.theme || 'store-default') ||
      localDensity !== (preferences.density || 'comfortable') ||
      localLandingPage !== (preferences.defaultLandingPage || '/') ||
      localShortcutsEnabled !== (preferences.shortcuts?.enabled ?? true);
    setHasUnsavedChanges(changed);
  }, [
    localTheme,
    localDensity,
    localLandingPage,
    localShortcutsEnabled,
    preferences,
  ]);

  const handleSave = () => {
    setTheme(localTheme);
    setDensity(localDensity);
    setDefaultLandingPage(localLandingPage);
    setKeyboardShortcuts({ enabled: localShortcutsEnabled });
    toast.success('Preferences saved successfully');
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    setLocalTheme(preferences.theme || 'store-default');
    setLocalDensity(preferences.density || 'comfortable');
    setLocalLandingPage(preferences.defaultLandingPage || '/');
    setLocalShortcutsEnabled(preferences.shortcuts?.enabled ?? true);
    setHasUnsavedChanges(false);
    toast.info('Changes discarded');
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all preferences to defaults?')) {
      resetToDefaults();
      toast.success('Preferences reset to defaults');
      setHasUnsavedChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <div className="text-text-secondary">Loading preferences...</div>
      </div>
    );
  }

  const themeOptions: Array<{
    value: ThemeAppearance;
    label: string;
    description: string;
    icon: typeof Sun;
  }> = [
    {
      value: 'store-default',
      label: 'Store Default',
      description: 'Use your store\'s default theme',
      icon: Monitor,
    },
    {
      value: 'light',
      label: 'Light',
      description: 'Always use light theme',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Always use dark theme',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follow system preference',
      icon: Monitor,
    },
  ];

  const densityOptions: Array<{
    value: UIDensity;
    label: string;
    description: string;
    icon: typeof Maximize2;
  }> = [
    {
      value: 'compact',
      label: 'Compact',
      description: 'More content, less spacing',
      icon: Minimize2,
    },
    {
      value: 'comfortable',
      label: 'Comfortable',
      description: 'Balanced spacing',
      icon: Square,
    },
    {
      value: 'spacious',
      label: 'Spacious',
      description: 'More spacing, easier to read',
      icon: Maximize2,
    },
  ];

  const landingPageOptions = [
    { value: '/', label: 'Home' },
    { value: '/sell', label: 'Sell' },
    { value: '/lookup', label: 'Lookup' },
    { value: '/inventory', label: 'Inventory' },
    { value: '/customers', label: 'Customers' },
    { value: '/reporting', label: 'Reporting' },
    { value: '/admin', label: 'Admin' },
  ];

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <h1 className="text-3xl font-bold text-text-primary">Preferences</h1>
        <p className="text-text-secondary mt-2">
          Customize your EasySale experience
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Theme Settings */}
          <CollapsibleSection title="Theme" icon={Palette} defaultOpen={true}>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Choose how EasySale looks. You can override the store's default theme.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setLocalTheme(option.value);
                        // Apply theme immediately for instant visual feedback
                        // Map user preference to display settings theme
                        const displayTheme = option.value === 'store-default' ? 'dark' 
                          : option.value === 'system' ? 'auto' 
                          : option.value;
                        updateDisplaySettings({ theme: displayTheme as 'light' | 'dark' | 'auto' });
                      }}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200
                        ${
                          localTheme === option.value
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-border-light bg-background-secondary hover:border-border-DEFAULT'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center text-center gap-2">
                        <Icon className="w-6 h-6 text-text-primary" />
                        <div className="text-sm font-medium text-text-primary">
                          {option.label}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Show effective theme */}
              <div className="p-3 bg-background-secondary rounded-lg border border-border-light">
                <div className="text-xs font-medium text-text-secondary mb-1">
                  Effective Theme
                </div>
                <div className="text-sm text-text-primary">
                  {getEffectiveThemeDescription(localTheme, brandConfig)}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* UI Density */}
          <CollapsibleSection title="UI Density" icon={Layout} defaultOpen={true}>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Adjust the spacing and size of UI elements to fit your preference.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {densityOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setLocalDensity(option.value);
                        // Apply density immediately for instant visual feedback
                        updateDisplaySettings({ density: option.value });
                      }}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200
                        ${
                          localDensity === option.value
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-border-light bg-background-secondary hover:border-border-DEFAULT'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center text-center gap-2">
                        <Icon className="w-6 h-6 text-text-primary" />
                        <div className="text-sm font-medium text-text-primary">
                          {option.label}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CollapsibleSection>

          {/* Default Landing Page */}
          <CollapsibleSection title="Default Landing Page" icon={Home} defaultOpen={true}>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Choose which page to show when you first log in.
              </p>
              <div className="max-w-md">
                <select
                  value={localLandingPage}
                  onChange={(e) => setLocalLandingPage(e.target.value)}
                  className="
                    w-full px-4 py-2 rounded-lg
                    bg-background-secondary
                    border border-border-light
                    text-text-primary
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                    transition-all duration-200
                  "
                >
                  {landingPageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CollapsibleSection>

          {/* Keyboard Shortcuts */}
          <CollapsibleSection title="Keyboard Shortcuts" icon={Keyboard} defaultOpen={true}>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Enable or disable keyboard shortcuts throughout the application.
              </p>
              <div className="p-4 bg-background-secondary rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localShortcutsEnabled}
                    onChange={(e) => setLocalShortcutsEnabled(e.target.checked)}
                    className="
                      w-5 h-5 rounded
                      border-border-light
                      text-primary-500
                      focus:ring-2 focus:ring-primary-500
                      cursor-pointer
                    "
                  />
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      Enable keyboard shortcuts
                    </div>
                    <div className="text-xs text-text-tertiary">
                      Use keyboard shortcuts for faster navigation and actions
                    </div>
                  </div>
                </label>
              </div>
              
              {localShortcutsEnabled && (
                <div className="p-4 bg-background-secondary rounded-lg">
                  <div className="text-sm font-medium text-text-primary mb-3">
                    Common Shortcuts
                  </div>
                  <div className="space-y-2 text-xs text-text-secondary">
                    <div className="flex justify-between">
                      <span>Go to Sell</span>
                      <kbd className="px-2 py-1 bg-background-primary rounded border border-border-light">
                        Ctrl+1
                      </kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Go to Lookup</span>
                      <kbd className="px-2 py-1 bg-background-primary rounded border border-border-light">
                        Ctrl+2
                      </kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Go to Inventory</span>
                      <kbd className="px-2 py-1 bg-background-primary rounded border border-border-light">
                        Ctrl+3
                      </kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Search</span>
                      <kbd className="px-2 py-1 bg-background-primary rounded border border-border-light">
                        Ctrl+K
                      </kbd>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Reset Section */}
          <div className="pt-4 border-t border-border-light">
            <div className="flex items-center justify-between p-4 bg-background-secondary rounded-lg">
              <div>
                <div className="text-sm font-medium text-text-primary">
                  Reset to Defaults
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  Restore all preferences to their default values
                </div>
              </div>
              <Button
                onClick={handleReset}
                variant="ghost"
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer with Save/Cancel */}
      <div className="border-t border-border-light bg-background-secondary px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            {hasUnsavedChanges && (
              <span className="text-sm text-warning-DEFAULT flex items-center gap-2">
                <span className="w-2 h-2 bg-warning-DEFAULT rounded-full animate-pulse"></span>
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCancel}
              variant="ghost"
              disabled={!hasUnsavedChanges}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              disabled={!hasUnsavedChanges}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

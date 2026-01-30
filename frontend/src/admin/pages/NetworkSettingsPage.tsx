/**
 * NetworkSettingsPage - Standalone settings page for network configuration
 * 
 * Allows users to configure LAN access settings outside of the setup wizard.
 * Accessible from Admin → Network or Settings → Network.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Globe, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkStepContent } from '../components/wizard/NetworkStepContent';
import type { NetworkStepData } from '../components/wizard/types';

export function NetworkSettingsPage() {
  const navigate = useNavigate();
  const [currentConfig, setCurrentConfig] = useState<NetworkStepData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/network/config');
      if (response.ok) {
        const config = await response.json();
        setCurrentConfig({
          lanEnabled: config.lan_enabled ?? config.lanEnabled ?? false,
          bindMode: config.bind_mode ?? config.bindMode ?? 'localhost',
          selectedIp: config.selected_ip ?? config.selectedIp,
          detectedInterfaces: config.detected_interfaces ?? config.detectedInterfaces ?? [],
        });
      }
    } catch (err) {
      console.error('Failed to load network config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = useCallback((data?: NetworkStepData) => {
    if (data) {
      setCurrentConfig(data);
      setSaveSuccess(true);
      // Clear success message after 5 seconds
      setTimeout(() => setSaveSuccess(false), 5000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Network Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Configure LAN access for other devices
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Banner */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Settings saved successfully
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Restart the application for changes to take effect.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-surface border border-border rounded-lg p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <NetworkStepContent
              onComplete={handleComplete}
              data={currentConfig ?? undefined}
              isComplete={currentConfig !== null}
            />
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <h2 className="font-medium text-foreground mb-3">About Network Access</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Local only (default):</strong> The application is only accessible from this 
              computer at <code className="bg-muted px-1 rounded">http://localhost:7945</code>. 
              This is the most secure option.
            </p>
            <p>
              <strong>LAN access:</strong> When enabled, other devices on your local network can 
              access the application using this computer's IP address. Useful for:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Accessing from tablets or phones on the same network</li>
              <li>Running multiple registers from different devices</li>
              <li>Testing on different devices during development</li>
            </ul>
            <p className="text-amber-600 dark:text-amber-400">
              <strong>Security note:</strong> Only enable LAN access on trusted networks. 
              Anyone on the same network will be able to access the login page.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

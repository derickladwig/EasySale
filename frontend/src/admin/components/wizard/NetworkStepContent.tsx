/**
 * NetworkStepContent - Network & Access configuration step
 * 
 * Allows users to configure LAN access for the application.
 * Settings are persisted locally (not in git) and control Docker port binding.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Globe, 
  Lock, 
  Wifi, 
  Monitor, 
  RefreshCw, 
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import type { StepContentProps, NetworkStepData, NetworkBindMode, NetworkInterface } from './types';
import wizardStyles from '../../pages/SetupWizard.module.css';

const DEFAULT_PORT = 7945;

export function NetworkStepContent({
  onComplete,
  data,
  isComplete,
}: StepContentProps<NetworkStepData>) {
  const [lanEnabled, setLanEnabled] = useState(data?.lanEnabled ?? false);
  const [bindMode, setBindMode] = useState<NetworkBindMode>(data?.bindMode ?? 'localhost');
  const [selectedIp, setSelectedIp] = useState<string | undefined>(data?.selectedIp);
  const [detectedInterfaces, setDetectedInterfaces] = useState<NetworkInterface[]>(
    data?.detectedInterfaces ?? []
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect if user is currently accessing via LAN (private IP)
  const isAccessingViaLan = useMemo(() => {
    const hostname = window.location.hostname;
    // Check for private IP ranges
    if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
    const parts = hostname.split('.').map(Number);
    if (parts.length !== 4) return false;
    // 10.x.x.x
    if (parts[0] === 10) return true;
    // 172.16.x.x - 172.31.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.x.x
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }, []);

  // Detect network interfaces on mount
  useEffect(() => {
    if (lanEnabled && detectedInterfaces.length === 0) {
      detectInterfaces();
    }
  }, [lanEnabled]);

  const detectInterfaces = useCallback(async () => {
    setIsDetecting(true);
    setError(null);
    try {
      const response = await fetch('/api/network/interfaces');
      if (!response.ok) {
        throw new Error('Failed to detect network interfaces');
      }
      const interfaces: NetworkInterface[] = await response.json();
      setDetectedInterfaces(interfaces);
      
      // Auto-select first non-localhost interface if none selected
      if (!selectedIp && interfaces.length > 0) {
        const firstLan = interfaces.find(i => i.ip !== '127.0.0.1');
        if (firstLan) {
          setSelectedIp(firstLan.ip);
        }
      }
    } catch (err) {
      console.error('Failed to detect interfaces:', err);
      setError('Could not detect network interfaces. You can still enable LAN access with "All Interfaces" mode.');
      // Provide fallback
      setDetectedInterfaces([
        { name: 'Loopback', ip: '127.0.0.1', isWireless: false }
      ]);
    } finally {
      setIsDetecting(false);
    }
  }, [selectedIp]);

  const handleLanToggle = useCallback((enabled: boolean) => {
    setLanEnabled(enabled);
    if (!enabled) {
      setBindMode('localhost');
      setSelectedIp(undefined);
    } else {
      setBindMode('all-interfaces');
      if (detectedInterfaces.length === 0) {
        detectInterfaces();
      }
    }
  }, [detectedInterfaces.length, detectInterfaces]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const networkData: NetworkStepData = {
        lanEnabled,
        bindMode,
        selectedIp: bindMode === 'specific-ip' ? selectedIp : undefined,
        detectedInterfaces,
      };

      // Save to backend (which writes local-only files)
      const response = await fetch('/api/network/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(networkData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save network configuration');
      }

      onComplete(networkData);
    } catch (err) {
      console.error('Failed to save network config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  }, [lanEnabled, bindMode, selectedIp, detectedInterfaces, onComplete]);

  const getAccessUrls = useCallback(() => {
    const urls: { label: string; url: string; primary?: boolean }[] = [
      { label: 'Local', url: `http://localhost:${DEFAULT_PORT}`, primary: !lanEnabled }
    ];

    if (lanEnabled) {
      if (bindMode === 'all-interfaces') {
        urls.push({
          label: 'LAN (any interface)',
          url: `http://<your-lan-ip>:${DEFAULT_PORT}`,
          primary: true
        });
      } else if (bindMode === 'specific-ip' && selectedIp) {
        urls.push({
          label: 'LAN',
          url: `http://${selectedIp}:${DEFAULT_PORT}`,
          primary: true
        });
      }
    }

    return urls;
  }, [lanEnabled, bindMode, selectedIp]);

  return (
    <div className="space-y-6">
      {/* LAN Access Toggle */}
      <div className="bg-surface-secondary rounded-lg p-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-lg",
            lanEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {lanEnabled ? <Globe size={24} /> : <Lock size={24} />}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Enable LAN Access</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Allow other devices on your network to access this application
                </p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lanEnabled}
                  onChange={(e) => handleLanToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Local-only info when disabled */}
      {!lanEnabled && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Local only (recommended)</strong> — The application will only be accessible from this computer.
                This is the most secure option for single-user setups.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LAN access warning when accessing via LAN but toggle is off */}
      {!lanEnabled && isAccessingViaLan && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>You're accessing via LAN</strong> ({window.location.hostname}). 
                Enable LAN access above to ensure other devices can continue connecting after restart.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LAN Configuration Options */}
      {lanEnabled && (
        <div className="space-y-4">
          {/* Bind Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Network Binding Mode
            </label>
            
            <div className="space-y-2">
              {/* All Interfaces */}
              <label className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                bindMode === 'all-interfaces' 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}>
                <input
                  type="radio"
                  name="bindMode"
                  value="all-interfaces"
                  checked={bindMode === 'all-interfaces'}
                  onChange={() => setBindMode('all-interfaces')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-primary" />
                    <span className="font-medium">All Interfaces (0.0.0.0)</span>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accessible from any network interface. Use your computer's LAN IP to connect from other devices.
                  </p>
                </div>
              </label>

              {/* Specific IP */}
              <label className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                bindMode === 'specific-ip' 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}>
                <input
                  type="radio"
                  name="bindMode"
                  value="specific-ip"
                  checked={bindMode === 'specific-ip'}
                  onChange={() => setBindMode('specific-ip')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Monitor size={16} className="text-muted-foreground" />
                    <span className="font-medium">Specific Interface</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      Advanced
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bind to a specific network interface. Useful if you have multiple networks.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Interface Selection (when specific-ip mode) */}
          {bindMode === 'specific-ip' && (
            <div className="ml-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">
                  Select Network Interface
                </label>
                <button
                  type="button"
                  onClick={detectInterfaces}
                  disabled={isDetecting}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                >
                  <RefreshCw size={14} className={isDetecting ? 'animate-spin' : ''} />
                  {isDetecting ? 'Detecting...' : 'Refresh'}
                </button>
              </div>

              {detectedInterfaces.length > 0 ? (
                <div className="space-y-2">
                  {detectedInterfaces
                    .filter(iface => iface.ip !== '127.0.0.1')
                    .map((iface) => (
                      <label
                        key={iface.ip}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedIp === iface.ip
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <input
                          type="radio"
                          name="selectedIp"
                          value={iface.ip}
                          checked={selectedIp === iface.ip}
                          onChange={() => setSelectedIp(iface.ip)}
                        />
                        <div className="flex items-center gap-2">
                          {iface.isWireless ? (
                            <Wifi size={16} className="text-muted-foreground" />
                          ) : (
                            <Monitor size={16} className="text-muted-foreground" />
                          )}
                          <span className="font-mono text-sm">{iface.ip}</span>
                          <span className="text-sm text-muted-foreground">({iface.name})</span>
                        </div>
                      </label>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isDetecting ? 'Detecting network interfaces...' : 'No network interfaces detected'}
                </p>
              )}
            </div>
          )}

          {/* Security Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Security Note:</strong> Enabling LAN access allows any device on your local network to connect.
                  Only enable this on trusted networks.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access URLs Preview */}
      <div className="bg-surface-secondary rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Access URLs</h4>
        <div className="space-y-2">
          {getAccessUrls().map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              {url.primary && <CheckCircle2 size={16} className="text-green-500" />}
              {!url.primary && <div className="w-4" />}
              <span className="text-sm text-muted-foreground w-24">{url.label}:</span>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {url.url}
              </code>
            </div>
          ))}
        </div>
        {lanEnabled && bindMode === 'all-interfaces' && (
          <p className="text-xs text-muted-foreground mt-2">
            Replace &lt;your-lan-ip&gt; with this computer's IP address (e.g., 192.168.1.x)
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || (bindMode === 'specific-ip' && !selectedIp)}
          className={cn(
            wizardStyles.btn,
            wizardStyles.btnPrimary,
            "min-w-[140px]"
          )}
        >
          {isSaving ? 'Saving...' : isComplete ? 'Update Settings' : 'Save & Continue'}
        </button>
      </div>

      {/* Restart Notice */}
      {isComplete && (
        <p className="text-sm text-muted-foreground text-center">
          Changes will take effect after restarting the application.
        </p>
      )}
    </div>
  );
}

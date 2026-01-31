/**
 * IntegrationsStepContent - Integrations Configuration
 * 
 * Optional step for connecting external services like WooCommerce.
 * Validates: Requirements 10.1, 10.2
 */

import React, { useState } from 'react';
import { CheckCircle2, ShoppingBag, Calculator, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { cn } from '@common/utils/classNames';
import { syncApi } from '../../../services/syncApi';
import { toast } from '@common/components/molecules/Toast';
import { useConfig } from '../../../config/ConfigProvider';
import type { StepContentProps, IntegrationsStepData } from './types';

interface IntegrationOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

export function IntegrationsStepContent({
  onComplete,
  data,
  isComplete,
}: StepContentProps<IntegrationsStepData>) {
  const { brandConfig } = useConfig();
  const appName = brandConfig?.appName || brandConfig?.company?.name || 'this application';
  const [integrations, setIntegrations] = useState<IntegrationOption[]>([
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      description: 'Sync products, pricing, and orders with your online store',
      icon: ShoppingBag,
      enabled: data?.woocommerce?.enabled || false,
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync sales and financial data for accounting',
      icon: Calculator,
      enabled: data?.quickbooks?.enabled || false,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  
  // WooCommerce form state
  const [wcUrl, setWcUrl] = useState(data?.woocommerce?.storeUrl || '');
  const [wcConsumerKey, setWcConsumerKey] = useState('');
  const [wcConsumerSecret, setWcConsumerSecret] = useState('');
  const [wcConnected, setWcConnected] = useState(data?.woocommerce?.connected || false);
  
  // QuickBooks state
  const [qbConnected, setQbConnected] = useState(data?.quickbooks?.connected || false);


  const handleToggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, enabled: !int.enabled } : int
      )
    );
  };

  const handleConfigureWooCommerce = async () => {
    if (!wcUrl || !wcConsumerKey || !wcConsumerSecret) {
      toast.error('Please fill in all WooCommerce fields');
      return;
    }
    
    setSaving('woocommerce');
    try {
      await syncApi.connectWooCommerce({
        store_url: wcUrl,
        consumer_key: wcConsumerKey,
        consumer_secret: wcConsumerSecret,
      });
      setWcConnected(true);
      toast.success('WooCommerce connected successfully');
      setConfiguring(null);
    } catch (error) {
      console.error('Failed to connect WooCommerce:', error);
      toast.error('Failed to connect WooCommerce. Please check your credentials.');
    } finally {
      setSaving(null);
    }
  };

  const handleConfigureQuickBooks = async () => {
    setSaving('quickbooks');
    try {
      const authResponse = await syncApi.getQuickBooksAuthUrl();
      toast.info('Opening QuickBooks authorization...');
      // Open OAuth URL in new window
      const authWindow = window.open(authResponse.auth_url, '_blank', 'width=600,height=700');
      
      // Poll for completion (simplified - in production would use postMessage)
      const checkInterval = setInterval(async () => {
        try {
          const status = await syncApi.getQuickBooksStatus();
          if (status.is_connected) {
            clearInterval(checkInterval);
            setQbConnected(true);
            toast.success('QuickBooks connected successfully');
            setConfiguring(null);
            authWindow?.close();
          }
        } catch {
          // Still waiting for auth
        }
      }, 2000);
      
      // Stop checking after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        setSaving(null);
      }, 300000);
    } catch (error) {
      console.error('Failed to initiate QuickBooks OAuth:', error);
      toast.error('Failed to connect QuickBooks. Please try again.');
      setSaving(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const woo = integrations.find((i) => i.id === 'woocommerce');
      const qb = integrations.find((i) => i.id === 'quickbooks');
      onComplete({
        woocommerce: { 
          enabled: woo?.enabled || false,
          connected: wcConnected,
          storeUrl: wcUrl || undefined,
        },
        quickbooks: { 
          enabled: qb?.enabled || false,
          connected: qbConnected,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    const enabledCount = [data?.woocommerce?.enabled, data?.quickbooks?.enabled].filter(Boolean).length;
    const connectedCount = [data?.woocommerce?.connected, data?.quickbooks?.connected].filter(Boolean).length;
    return (
      <div className="bg-success-500/10 border border-success-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success-400" />
          <div>
            <h3 className="text-lg font-medium text-success-300">
              Integrations Configured
            </h3>
            <p className="text-success-400/80 text-sm mt-1">
              {enabledCount} integration(s) enabled, {connectedCount} connected
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-text-tertiary text-sm">
        Connect your store to external services. You can configure these in detail later from Admin → Integrations.
      </p>

      <div className="space-y-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <div
              key={integration.id}
              className={cn(
                'bg-surface-base border rounded-xl p-4 transition-colors',
                integration.enabled
                  ? 'border-primary-500/50'
                  : 'border-border'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-surface-elevated rounded-lg">
                    <Icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{integration.name}</h4>
                    <p className="text-sm text-text-tertiary mt-1">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={integration.enabled}
                    onChange={() => handleToggle(integration.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              {integration.enabled && (
                <div className="mt-4 pt-4 border-t border-border">
                  {configuring === integration.id ? (
                    <div className="space-y-3">
                      {integration.id === 'woocommerce' && (
                        <>
                          {wcConnected ? (
                            <div className="flex items-center gap-2 text-success-400 text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              Connected to {wcUrl || 'WooCommerce'}
                            </div>
                          ) : (
                            <>
                              <Input
                                label="Store URL"
                                value={wcUrl}
                                onChange={(e) => setWcUrl(e.target.value)}
                                placeholder="https://yourstore.com"
                                size="sm"
                              />
                              <Input
                                label="Consumer Key"
                                value={wcConsumerKey}
                                onChange={(e) => setWcConsumerKey(e.target.value)}
                                placeholder="ck_..."
                                size="sm"
                              />
                              <Input
                                label="Consumer Secret"
                                type="password"
                                value={wcConsumerSecret}
                                onChange={(e) => setWcConsumerSecret(e.target.value)}
                                placeholder="cs_..."
                                size="sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfiguring(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={handleConfigureWooCommerce}
                                  loading={saving === 'woocommerce'}
                                >
                                  Connect
                                </Button>
                              </div>
                            </>
                          )}
                        </>
                      )}
                      {integration.id === 'quickbooks' && (
                        <>
                          {qbConnected ? (
                            <div className="flex items-center gap-2 text-success-400 text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              Connected to QuickBooks
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start gap-2 p-3 bg-surface-elevated rounded-lg text-sm">
                                <AlertCircle className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                                <p className="text-text-secondary">
                                  QuickBooks uses OAuth authentication. Click the button below to authorize {appName} to access your QuickBooks account.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfiguring(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={handleConfigureQuickBooks}
                                  loading={saving === 'quickbooks'}
                                  rightIcon={<ExternalLink className="w-4 h-4" />}
                                >
                                  Authorize QuickBooks
                                </Button>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfiguring(integration.id)}
                      rightIcon={<ExternalLink className="w-4 h-4" />}
                    >
                      {(integration.id === 'woocommerce' && wcConnected) || 
                       (integration.id === 'quickbooks' && qbConnected) 
                        ? `Connected` 
                        : `Configure ${integration.name}`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Save Integrations
      </Button>
    </form>
  );
}

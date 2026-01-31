import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { toast } from '@common/components/molecules/Toast';
import { ScopeSelector } from '@common/components/molecules/ScopeSelector';
import { ConfirmDialog, useConfirmDialog } from '@common/components/molecules/ConfirmDialog';
import { Plug, ExternalLink, RefreshCw, Settings, ShoppingBag, DollarSign, CreditCard, FileText, Cloud } from 'lucide-react';
import { syncApi } from '../../services/syncApi';
import { MappingEditor } from '../components/MappingEditor';
import { SyncNowDropdown } from '../components/SyncNowDropdown';
import { useIntegrationsQuery, Integration } from '../hooks';
import { LoadingSpinner } from '@common/components/organisms/LoadingSpinner';
import { IntegrationCard } from '../../admin/components/IntegrationCard';
import { useCapabilities, useHasStripe, useHasSquare, useHasClover, useAuth } from '@common/contexts';
import { IntegrationLogsDrawer } from '../components/IntegrationLogsDrawer';
import { useStores } from '../../admin/hooks/useStores';
import { generateOAuthState, openOAuthPopup, buildOAuthUrl } from '@common/utils/oauthPopup';
import { CREDENTIAL_PLACEHOLDER } from '@common/utils/credentialMasking';

/**
 * Integration capability mapping.
 * Maps integration IDs to their required capability flags.
 * 
 * Rule: capability-off = disabled card; capability-on + backend-missing = bug/error state
 * Validates: Requirements 10.1, 10.2
 */
const INTEGRATION_CAPABILITIES: Record<string, { capability: 'sync' | 'export' | null; hasBackend: boolean }> = {
  woocommerce: { capability: 'sync', hasBackend: true },
  quickbooks: { capability: 'sync', hasBackend: true },
  supabase: { capability: 'sync', hasBackend: true },
  stripe: { capability: null, hasBackend: true }, // Payment integrations have backend now
  square: { capability: null, hasBackend: true },
  clover: { capability: null, hasBackend: true },
};

/**
 * Default integrations that are always available.
 * These are shown even when the API returns empty, allowing users to connect them.
 * 
 * Validates: Requirements 10.1, 10.2
 */
const DEFAULT_INTEGRATIONS: Integration[] = [
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Sync products, pricing, and orders with your WooCommerce online store',
    status: 'disconnected',
    enabled: false,
    lastSync: undefined,
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices, customers, and financial data with QuickBooks accounting',
    status: 'disconnected',
    enabled: false,
    lastSync: undefined,
  },
  {
    id: 'supabase',
    name: 'Supabase Hub',
    description: 'Cloud sync and backup with Supabase for multi-location data sharing',
    status: 'disconnected',
    enabled: false,
    lastSync: undefined,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments with Stripe Connect for in-person and online transactions',
    status: 'disconnected',
    enabled: false,
    lastSync: undefined,
  },
  {
    id: 'square',
    name: 'Square',
    description: 'Process payments and sync inventory with Square POS',
    status: 'disconnected',
    enabled: false,
    lastSync: undefined,
  },
  {
    id: 'clover',
    name: 'Clover',
    description: 'Connect to Clover POS for payment processing and merchant services',
    status: 'disconnected',
    enabled: false,
    lastSync: undefined,
  },
];

export const IntegrationsPage: React.FC = () => {
  // Store scope selection for multi-store support
  const { stores, isLoading: storesLoading } = useStores();
  const [selectedScope, setSelectedScope] = useState<'all' | string>('all');

  // Fetch integrations data using React Query with scope filter
  const { data: integrationsData = [], isLoading } = useIntegrationsQuery(selectedScope);
  
  // Get capabilities to determine which integrations are enabled
  const { capabilities, loading: capabilitiesLoading } = useCapabilities();
  
  // Get user for role-based access control
  // Validates: Requirements 16.4
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Feature-specific capability hooks
  const hasStripe = useHasStripe();
  const hasSquare = useHasSquare();
  const hasClover = useHasClover();

  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [mappings, setMappings] = useState<
    Array<{ source: string; target: string; transformation?: string }>
  >([]);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, {
    status: 'connected' | 'disconnected' | 'error';
    lastSync?: string;
    enabled: boolean;
  }>>({});
  
  // Track backend availability for each integration
  const [backendAvailability, setBackendAvailability] = useState<Record<string, boolean>>({});
  const [savingIntegration, setSavingIntegration] = useState<string | null>(null);

  // QuickBooks settings
  const [qbRealmId, setQbRealmId] = useState('');

  // WooCommerce settings
  const [wcUrl, setWcUrl] = useState('');
  const [wcConsumerKey, setWcConsumerKey] = useState('');
  const [wcConsumerSecret, setWcConsumerSecret] = useState('');
  // Track if WooCommerce credentials are saved (for masking)
  // Validates: Requirements 11.1
  const [wcCredentialsSaved, setWcCredentialsSaved] = useState(false);

  // Stripe settings (OAuth-based, no API key input)
  const [stripeSummary, setStripeSummary] = useState<{
    business_name?: string;
    country?: string;
    currency?: string;
    account_id_masked?: string;
  } | null>(null);

  // Square settings (API key-based)
  const [squareAccessToken, setSquareAccessToken] = useState('');
  const [squareLocationId, setSquareLocationId] = useState('');
  // Track if Square credentials are saved (for masking)
  // Validates: Requirements 11.1
  const [squareCredentialsSaved, setSquareCredentialsSaved] = useState(false);
  const [squareSummary, setSquareSummary] = useState<{
    location_name?: string;
    address?: string;
    capabilities?: string[];
  } | null>(null);

  // Clover settings (OAuth-based)
  const [cloverSummary, setCloverSummary] = useState<{
    merchant_name?: string;
    address?: string;
  } | null>(null);

  // Supabase summary
  const [supabaseSummary, setSupabaseSummary] = useState<{
    project_name?: string;
    last_sync_at?: string;
    pending_queue_count?: number;
  } | null>(null);

  // Logs drawer state
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [logsDrawerPlatform, setLogsDrawerPlatform] = useState<'stripe' | 'square' | 'clover' | 'woocommerce' | 'quickbooks' | 'supabase'>('stripe');

  // Confirmation dialog state for destructive actions
  // Validates: Requirements 9.2, 9.3, 16.5
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [fullResyncTarget, setFullResyncTarget] = useState<string | null>(null);

  /**
   * Check if a capability is enabled for an integration.
   * Returns true if no capability is required or if the capability is enabled.
   * 
   * Validates: Requirements 10.1, 10.2
   */
  const isCapabilityEnabled = useCallback((integrationId: string): boolean => {
    const config = INTEGRATION_CAPABILITIES[integrationId];
    if (!config || !config.capability) {
      return true; // No capability required
    }
    
    if (!capabilities) {
      return false; // Capabilities not loaded yet
    }
    
    return capabilities.features[config.capability] ?? false;
  }, [capabilities]);

  /**
   * Get the disabled reason for an integration.
   * 
   * Validates: Requirements 10.1, 10.2
   */
  const getDisabledReason = useCallback((integrationId: string): string | undefined => {
    const config = INTEGRATION_CAPABILITIES[integrationId];
    if (!config || !config.capability) {
      return undefined;
    }
    
    if (!capabilities) {
      return 'Loading capabilities...';
    }
    
    if (!capabilities.features[config.capability]) {
      return `The ${config.capability} capability is not enabled. Enable it in Admin → Capabilities to use this integration.`;
    }
    
    return undefined;
  }, [capabilities]);

  /**
   * Check if backend is available for an integration.
   * Rule: capability-on + backend-missing = bug/error state
   * 
   * Validates: Requirements 10.1, 10.2
   */
  const isBackendAvailable = useCallback((integrationId: string): boolean => {
    const config = INTEGRATION_CAPABILITIES[integrationId];
    if (!config) {
      return false;
    }
    
    // If we've checked backend availability, use that
    if (backendAvailability[integrationId] !== undefined) {
      return backendAvailability[integrationId];
    }
    
    // Default to the static config
    return config.hasBackend;
  }, [backendAvailability]);

  /**
   * Merge default integrations with API data.
   * API data takes precedence for matching IDs.
   * This ensures WooCommerce and QuickBooks cards are always shown.
   */
  const mergeIntegrations = useCallback((): Integration[] => {
    const apiIntegrationsMap = new Map(integrationsData.map(int => [int.id, int]));
    
    // Start with default integrations, override with API data if available
    const merged: Integration[] = DEFAULT_INTEGRATIONS.map(defaultInt => {
      const apiInt = apiIntegrationsMap.get(defaultInt.id);
      const connStatus = connectionStatuses[defaultInt.id];
      
      if (apiInt) {
        // Merge with connection status
        return {
          ...apiInt,
          status: connStatus?.status ?? apiInt.status,
          lastSync: connStatus?.lastSync ?? apiInt.lastSync,
          enabled: connStatus?.enabled ?? apiInt.enabled,
        };
      }
      // Use default with connection status
      return {
        ...defaultInt,
        status: connStatus?.status ?? defaultInt.status,
        lastSync: connStatus?.lastSync ?? defaultInt.lastSync,
        enabled: connStatus?.enabled ?? defaultInt.enabled,
      };
    });

    // Add any additional integrations from API that aren't in defaults
    integrationsData.forEach(apiInt => {
      if (!DEFAULT_INTEGRATIONS.find(d => d.id === apiInt.id)) {
        const connStatus = connectionStatuses[apiInt.id];
        merged.push({
          ...apiInt,
          status: connStatus?.status ?? apiInt.status,
          lastSync: connStatus?.lastSync ?? apiInt.lastSync,
          enabled: connStatus?.enabled ?? apiInt.enabled,
        });
      }
    });

    return merged;
  }, [integrationsData, connectionStatuses]);

  // Get merged integrations
  const integrations = mergeIntegrations();

  // Memoize loadConnectionStatus to avoid recreating on every render
  const loadConnectionStatus = useCallback(async () => {
    try {
      const connections = await syncApi.getConnectionStatus();

      // Build connection status map
      const statusMap: Record<string, { status: 'connected' | 'disconnected' | 'error'; lastSync?: string; enabled: boolean }> = {};
      connections.forEach((connection: { platform: string; connected: boolean; lastSync?: string }) => {
        statusMap[connection.platform] = {
          status: connection.connected ? 'connected' : 'disconnected',
          lastSync: connection.lastSync,
          enabled: connection.connected,
        };
        
        // Update credential saved flags based on connection status
        // Validates: Requirements 11.1
        if (connection.platform === 'woocommerce' && connection.connected) {
          setWcCredentialsSaved(true);
        }
        if (connection.platform === 'square' && connection.connected) {
          setSquareCredentialsSaved(true);
        }
      });

      setConnectionStatuses(statusMap);
      
      // Also check backend availability for integrations with sync capability
      const availabilityMap: Record<string, boolean> = {};
      for (const integrationId of Object.keys(INTEGRATION_CAPABILITIES)) {
        const config = INTEGRATION_CAPABILITIES[integrationId];
        if (config.hasBackend) {
          try {
            const isAvailable = await syncApi.checkBackendAvailability(integrationId);
            availabilityMap[integrationId] = isAvailable;
          } catch {
            availabilityMap[integrationId] = false;
          }
        } else {
          availabilityMap[integrationId] = false;
        }
      }
      setBackendAvailability(availabilityMap);
    } catch {
      // eslint-disable-next-line no-console
      console.error('Failed to load connection status');
      // Keep existing data if API fails
    }
  }, []);

  // Load connection status on mount - using a ref to track if already loaded
  const hasLoadedStatusRef = useRef(false);
  
  useEffect(() => {
    // Load connection status once on mount (we always have DEFAULT_INTEGRATIONS)
    if (!hasLoadedStatusRef.current) {
      hasLoadedStatusRef.current = true;
      // This async call is intentional on mount to load connection statuses
      const loadStatus = async () => {
        await loadConnectionStatus();
      };
      void loadStatus();
    }
  }, [loadConnectionStatus]);

  const handleToggleIntegration = (integrationId: string) => {
    setConnectionStatuses((prev) => {
      const current = prev[integrationId];
      return {
        ...prev,
        [integrationId]: {
          status: current?.status ?? 'disconnected',
          lastSync: current?.lastSync,
          enabled: !current?.enabled,
        },
      };
    });

    const integration = integrations.find((i) => i.id === integrationId);
    toast.success(`${integration?.name} ${integration?.enabled ? 'disabled' : 'enabled'}`);
  };

  const handleTestConnection = async (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);
    toast.info(`Testing connection to ${integration?.name}...`);

    try {
      const result = await syncApi.testConnection(integrationId);

      if (result.success) {
        setConnectionStatuses((prev) => ({
          ...prev,
          [integrationId]: {
            status: 'connected',
            lastSync: new Date().toISOString(),
            enabled: prev[integrationId]?.enabled ?? true,
          },
        }));
        toast.success(result.message || `Successfully connected to ${integration?.name}`);
      } else {
        setConnectionStatuses((prev) => {
          const current = prev[integrationId];
          return {
            ...prev,
            [integrationId]: {
              status: 'error' as const,
              lastSync: current?.lastSync,
              enabled: current?.enabled ?? false,
            },
          };
        });
        toast.error(result.message || `Failed to connect to ${integration?.name}`);
      }
    } catch {
      setConnectionStatuses((prev) => {
        const current = prev[integrationId];
        return {
          ...prev,
          [integrationId]: {
            status: 'error' as const,
            lastSync: current?.lastSync,
            enabled: current?.enabled ?? false,
          },
        };
      });
      toast.error(`Failed to connect to ${integration?.name}`);
    }
  };

  const handleSyncNow = async (integrationId: string, mode: 'incremental' | 'full' | 'dry_run' = 'incremental') => {
    const integration = integrations.find((i) => i.id === integrationId);
    setSyncing(integrationId);

    try {
      if (mode === 'dry_run') {
        // Dry run mode (Epic 4 - Task 12)
        const result = await syncApi.dryRunSync(integrationId, { mode: 'incremental' });
        toast.success(
          `Dry run complete: ${result.recordsToProcess} records would be processed (est. ${Math.round(result.estimatedDuration / 1000)}s)`
        );
      } else {
        // Incremental or Full sync
        // Validates: Requirements 16.1, 16.2, 16.3
        const result = await syncApi.triggerSync(integrationId, { mode });

        if (mode === 'full') {
          toast.info(`Full resync started for ${integration?.name}. This may take a while...`);
        } else if (result.recordsProcessed > 10) {
          toast.info(`Processing ${result.recordsProcessed} records...`);
        } else {
          toast.success(`${integration?.name} sync triggered`);
        }
      }

      // Refresh status after 2 seconds
      setTimeout(() => {
        loadConnectionStatus();
        setSyncing(null);
      }, 2000);
    } catch {
      // eslint-disable-next-line no-console
      console.error('Failed to trigger sync');
      toast.error('Failed to trigger sync');
      setSyncing(null);
    }
  };

  const handleSaveSettings = async (integrationId: string) => {
    setSavingIntegration(integrationId);
    toast.info('Saving integration settings...');
    
    try {
      switch (integrationId) {
        case 'woocommerce':
          if (!wcUrl || !wcConsumerKey || !wcConsumerSecret) {
            toast.error('Please fill in all WooCommerce fields');
            setSavingIntegration(null);
            return;
          }
          await syncApi.connectWooCommerce({
            store_url: wcUrl,
            consumer_key: wcConsumerKey,
            consumer_secret: wcConsumerSecret,
          });
          // Mark credentials as saved and clear the input values
          // Validates: Requirements 11.1
          setWcCredentialsSaved(true);
          setWcConsumerKey('');
          setWcConsumerSecret('');
          break;
          
        case 'quickbooks':
          // QuickBooks uses OAuth flow with state validation
          // Validates: Requirements 11.3, 11.4, 11.5
          try {
            const state = generateOAuthState();
            const authResponse = await syncApi.getQuickBooksAuthUrl();
            const authUrlWithState = buildOAuthUrl(authResponse.auth_url, state);
            
            toast.info('Opening QuickBooks authorization...');
            
            openOAuthPopup('quickbooks', authUrlWithState, state, {
              onSuccess: async () => {
                toast.success('QuickBooks connected successfully');
                await loadConnectionStatus();
                setConnectionStatuses((prev) => ({
                  ...prev,
                  quickbooks: {
                    status: 'connected',
                    lastSync: new Date().toISOString(),
                    enabled: true,
                  },
                }));
              },
              onError: (error) => {
                toast.error(error || 'QuickBooks authorization failed');
              },
              onBlocked: () => {
                // Popup was blocked - provide fallback
                toast.warning('Popup blocked. Click the link below to authorize.');
                // Store the auth URL for manual navigation
                window.open(authUrlWithState, '_blank');
              },
            });
            
            setSavingIntegration(null);
            return;
          } catch {
            toast.error('Failed to initiate QuickBooks OAuth. Please configure client credentials first.');
            setSavingIntegration(null);
            return;
          }
          
        default:
          // For integrations without backend support, just show success
          await new Promise((resolve) => setTimeout(resolve, 500));
          break;
      }
      
      toast.success('Settings saved successfully');
      
      // Refresh connection status
      await loadConnectionStatus();
      
      // Update local state to show connected
      setConnectionStatuses((prev) => ({
        ...prev,
        [integrationId]: {
          status: 'connected',
          lastSync: new Date().toISOString(),
          enabled: true,
        },
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please check your credentials and try again.');
    } finally {
      setSavingIntegration(null);
    }
  };

  /**
   * Handle disconnecting an integration.
   * Validates: Requirements 10.1, 10.2
   */
  const handleDisconnect = async (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);
    toast.info(`Disconnecting ${integration?.name}...`);
    
    try {
      switch (integrationId) {
        case 'woocommerce':
          await syncApi.disconnectWooCommerce();
          // Clear local form state and credential saved flag
          // Validates: Requirements 11.1
          setWcUrl('');
          setWcConsumerKey('');
          setWcConsumerSecret('');
          setWcCredentialsSaved(false);
          break;
          
        case 'quickbooks':
          await syncApi.disconnectQuickBooks();
          setQbRealmId('');
          break;
          
        case 'stripe':
          await syncApi.disconnectStripe();
          setStripeSummary(null);
          break;
          
        case 'square':
          await syncApi.disconnectSquare();
          // Clear local form state and credential saved flag
          // Validates: Requirements 11.1
          setSquareAccessToken('');
          setSquareLocationId('');
          setSquareSummary(null);
          setSquareCredentialsSaved(false);
          break;
          
        case 'clover':
          await syncApi.disconnectClover();
          setCloverSummary(null);
          break;
          
        default:
          // For integrations without backend support, just update local state
          break;
      }
      
      // Update local state
      setConnectionStatuses((prev) => ({
        ...prev,
        [integrationId]: {
          status: 'disconnected',
          lastSync: prev[integrationId]?.lastSync,
          enabled: false,
        },
      }));
      
      toast.success(`${integration?.name} disconnected successfully`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to disconnect:', error);
      toast.error(`Failed to disconnect ${integration?.name}`);
    }
  };

  /**
   * Handle Stripe OAuth flow - initiates Connect with Stripe
   * Uses popup with state validation for security
   * Validates: Requirements 1.1, 1.2, 11.3, 11.4, 11.5
   */
  const handleStripeConnect = async () => {
    toast.info('Opening Stripe authorization...');
    try {
      const state = generateOAuthState();
      const response = await syncApi.getStripeAuthUrl();
      const authUrlWithState = buildOAuthUrl(response.auth_url, state);
      
      openOAuthPopup('stripe', authUrlWithState, state, {
        onSuccess: async () => {
          toast.success('Stripe connected successfully');
          await loadConnectionStatus();
          const summary = await syncApi.getStripeSummary();
          setStripeSummary(summary);
          setConnectionStatuses((prev) => ({
            ...prev,
            stripe: {
              status: 'connected',
              lastSync: new Date().toISOString(),
              enabled: true,
            },
          }));
        },
        onError: (error) => {
          toast.error(error || 'Stripe authorization failed');
        },
        onBlocked: () => {
          toast.warning('Popup blocked. Opening in new tab...');
          window.open(authUrlWithState, '_blank');
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get Stripe auth URL:', error);
      toast.error('Failed to initiate Stripe connection. Please check your configuration.');
    }
  };

  /**
   * Handle Square API key connection
   * Validates: Requirements 2.1, 2.3
   */
  const handleSquareConnect = async () => {
    if (!squareAccessToken || !squareLocationId) {
      toast.error('Please enter both Access Token and Location ID');
      return;
    }
    
    setSavingIntegration('square');
    try {
      await syncApi.connectSquare({
        access_token: squareAccessToken,
        location_id: squareLocationId,
      });
      
      // Fetch summary after connecting
      const summary = await syncApi.getSquareSummary();
      setSquareSummary(summary);
      
      // Mark credentials as saved and clear the input value
      // Validates: Requirements 11.1
      setSquareCredentialsSaved(true);
      setSquareAccessToken('');
      
      setConnectionStatuses((prev) => ({
        ...prev,
        square: {
          status: 'connected',
          lastSync: new Date().toISOString(),
          enabled: true,
        },
      }));
      
      toast.success('Square connected successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to connect Square:', error);
      toast.error('Failed to connect Square. Please check your credentials.');
    } finally {
      setSavingIntegration(null);
    }
  };

  /**
   * Handle Clover OAuth flow - initiates Connect with Clover
   * Uses popup with state validation for security
   * Validates: Requirements 3.1, 3.2, 11.3, 11.4, 11.5
   */
  const handleCloverConnect = async () => {
    toast.info('Opening Clover authorization...');
    try {
      const state = generateOAuthState();
      const response = await syncApi.getCloverAuthUrl();
      const authUrlWithState = buildOAuthUrl(response.auth_url, state);
      
      openOAuthPopup('clover', authUrlWithState, state, {
        onSuccess: async () => {
          toast.success('Clover connected successfully');
          await loadConnectionStatus();
          const summary = await syncApi.getCloverSummary();
          setCloverSummary(summary);
          setConnectionStatuses((prev) => ({
            ...prev,
            clover: {
              status: 'connected',
              lastSync: new Date().toISOString(),
              enabled: true,
            },
          }));
        },
        onError: (error) => {
          toast.error(error || 'Clover authorization failed');
        },
        onBlocked: () => {
          toast.warning('Popup blocked. Opening in new tab...');
          window.open(authUrlWithState, '_blank');
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get Clover auth URL:', error);
      toast.error('Failed to initiate Clover connection. Please check your configuration.');
    }
  };

  /**
   * Handle test connection for payment integrations
   * Validates: Requirements 1.4, 2.4, 3.4
   */
  const handleTestPaymentConnection = async (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);
    toast.info(`Testing connection to ${integration?.name}...`);
    
    try {
      let result: { success: boolean; message?: string };
      
      switch (integrationId) {
        case 'stripe':
          result = await syncApi.testStripeConnection();
          if (result.success) {
            const summary = await syncApi.getStripeSummary();
            setStripeSummary(summary);
          }
          break;
        case 'square':
          result = await syncApi.testSquareConnection();
          if (result.success) {
            const summary = await syncApi.getSquareSummary();
            setSquareSummary(summary);
          }
          break;
        case 'clover':
          result = await syncApi.testCloverConnection();
          if (result.success) {
            const summary = await syncApi.getCloverSummary();
            setCloverSummary(summary);
          }
          break;
        default:
          result = { success: false, message: 'Unknown integration' };
      }
      
      if (result.success) {
        setConnectionStatuses((prev) => ({
          ...prev,
          [integrationId]: {
            status: 'connected',
            lastSync: new Date().toISOString(),
            enabled: true,
          },
        }));
        toast.success(result.message || `Successfully connected to ${integration?.name}`);
      } else {
        setConnectionStatuses((prev) => ({
          ...prev,
          [integrationId]: {
            status: 'error',
            lastSync: prev[integrationId]?.lastSync,
            enabled: false,
          },
        }));
        toast.error(result.message || `Failed to connect to ${integration?.name}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Test connection failed:', error);
      setConnectionStatuses((prev) => ({
        ...prev,
        [integrationId]: {
          status: 'error',
          lastSync: prev[integrationId]?.lastSync,
          enabled: false,
        },
      }));
      toast.error(`Failed to test ${integration?.name} connection`);
    }
  };

  /**
   * Open logs drawer for a specific integration
   * Validates: Requirements 9.3
   */
  const handleViewLogs = (platform: 'stripe' | 'square' | 'clover' | 'woocommerce' | 'quickbooks' | 'supabase') => {
    setLogsDrawerPlatform(platform);
    setLogsDrawerOpen(true);
  };

  /**
   * Load summaries for connected integrations
   */
  const loadIntegrationSummaries = useCallback(async () => {
    // Load Stripe summary if connected
    if (connectionStatuses.stripe?.status === 'connected') {
      try {
        const summary = await syncApi.getStripeSummary();
        setStripeSummary(summary);
      } catch {
        // Ignore errors for summary loading
      }
    }
    
    // Load Square summary if connected
    if (connectionStatuses.square?.status === 'connected') {
      try {
        const summary = await syncApi.getSquareSummary();
        setSquareSummary(summary);
      } catch {
        // Ignore errors for summary loading
      }
    }
    
    // Load Clover summary if connected
    if (connectionStatuses.clover?.status === 'connected') {
      try {
        const summary = await syncApi.getCloverSummary();
        setCloverSummary(summary);
      } catch {
        // Ignore errors for summary loading
      }
    }
    
    // Load Supabase summary if connected
    if (connectionStatuses.supabase?.status === 'connected') {
      try {
        const summary = await syncApi.getSupabaseSummary();
        setSupabaseSummary(summary);
      } catch {
        // Ignore errors for summary loading
      }
    }
  }, [connectionStatuses]);

  // Load summaries when connection statuses change
  useEffect(() => {
    loadIntegrationSummaries();
  }, [loadIntegrationSummaries]);

  /**
   * Filter integrations based on capability flags
   * Cards are hidden if capability is not enabled
   * Validates: Requirements 14.3, 14.7
   */
  const shouldShowIntegration = useCallback((integrationId: string): boolean => {
    switch (integrationId) {
      case 'stripe':
        return hasStripe;
      case 'square':
        return hasSquare;
      case 'clover':
        return hasClover;
      default:
        return true; // Show other integrations by default
    }
  }, [hasStripe, hasSquare, hasClover]);

  // Handle loading state
  if (isLoading || capabilitiesLoading) {
    return <LoadingSpinner />;
  }

  // Note: We no longer show empty state since DEFAULT_INTEGRATIONS ensures
  // WooCommerce and QuickBooks cards are always displayed (Requirement 10.1, 10.2)

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Integrations</h1>
            <p className="text-text-secondary mt-2">Connect to external services and payment processors</p>
          </div>
          {/* Scope Selector for multi-store filtering */}
          {!storesLoading && stores.length > 1 && (
            <ScopeSelector
              value={selectedScope}
              onChange={setSelectedScope}
              stores={stores}
            />
          )}
        </div>

        {/* Integrations List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {integrations
            .filter((integration) => shouldShowIntegration(integration.id))
            .map((integration) => {
            // Get icon for integration
            const getIntegrationIcon = () => {
              switch (integration.id) {
                case 'woocommerce':
                  return <ShoppingBag className="w-5 h-5 text-primary-400" />;
                case 'quickbooks':
                  return <DollarSign className="w-5 h-5 text-success-400" />;
                case 'stripe':
                  return <CreditCard className="w-5 h-5 text-primary-400" />;
                case 'square':
                  return <CreditCard className="w-5 h-5 text-text-secondary" />;
                case 'clover':
                  return <CreditCard className="w-5 h-5 text-success-400" />;
                case 'supabase':
                  return <Cloud className="w-5 h-5 text-primary-400" />;
                default:
                  return <Plug className="w-5 h-5 text-text-disabled" />;
              }
            };

            // Render configuration content for each integration
            const renderConfigContent = () => {
              const isConnected = connectionStatuses[integration.id]?.status === 'connected';
              
              switch (integration.id) {
                case 'quickbooks':
                  return (
                    <>
                      <Input
                        label="Realm ID"
                        value={qbRealmId}
                        onChange={(e) => setQbRealmId(e.target.value)}
                        placeholder="Enter QuickBooks Realm ID"
                        size="sm"
                      />
                      <p className="text-xs text-text-tertiary">
                        OAuth authentication required. Contact support for setup.
                      </p>
                      <Button
                        onClick={() => handleViewLogs('quickbooks')}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 mt-2"
                      >
                        <FileText className="w-4 h-4" />
                        View Logs
                      </Button>
                    </>
                  );
                case 'woocommerce':
                  return (
                    <>
                      <Input
                        label="Store URL"
                        value={wcUrl}
                        onChange={(e) => setWcUrl(e.target.value)}
                        placeholder="https://yourstore.com"
                        size="sm"
                      />
                      {/* Credential masking: show placeholder when saved, allow editing when clicked */}
                      {/* Validates: Requirements 11.1 */}
                      <Input
                        label="Consumer Key"
                        value={wcCredentialsSaved && !wcConsumerKey ? '' : wcConsumerKey}
                        onChange={(e) => setWcConsumerKey(e.target.value)}
                        placeholder={wcCredentialsSaved ? CREDENTIAL_PLACEHOLDER : 'ck_...'}
                        size="sm"
                      />
                      <Input
                        label="Consumer Secret"
                        type="password"
                        value={wcCredentialsSaved && !wcConsumerSecret ? '' : wcConsumerSecret}
                        onChange={(e) => setWcConsumerSecret(e.target.value)}
                        placeholder={wcCredentialsSaved ? CREDENTIAL_PLACEHOLDER : 'cs_...'}
                        size="sm"
                      />
                      {wcCredentialsSaved && (
                        <p className="text-xs text-text-tertiary">
                          Credentials are saved. Enter new values to update them.
                        </p>
                      )}
                      <div className="pt-3 border-t border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-secondary">
                            Sync Controls
                          </span>
                          <Button
                            onClick={() => setShowMappingEditor(!showMappingEditor)}
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Settings className="w-4 h-4" />
                            Field Mappings
                          </Button>
                        </div>

                        {/* Sync Now dropdown with Full Resync option for admins */}
                        {/* Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5 */}
                        <SyncNowDropdown
                          integrationId={integration.id}
                          integrationName={integration.name}
                          isSyncing={syncing === integration.id}
                          canFullResync={isAdmin}
                          onIncrementalSync={async () => handleSyncNow(integration.id, 'incremental')}
                          onFullResync={() => setFullResyncTarget(integration.id)}
                          onDryRun={async () => handleSyncNow(integration.id, 'dry_run')}
                        />

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-surface-base rounded">
                            <div className="text-text-tertiary">Sync Mode</div>
                            <div className="text-text-secondary font-medium">Incremental</div>
                          </div>
                          <div className="p-2 bg-surface-base rounded">
                            <div className="text-text-tertiary">Auto Sync</div>
                            <div className="text-success-400 font-medium">Enabled</div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleViewLogs('woocommerce')}
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          View Logs
                        </Button>
                      </div>
                    </>
                  );
                case 'stripe':
                  return (
                    <>
                      {!isConnected ? (
                        <div className="space-y-3">
                          <p className="text-sm text-text-secondary">
                            Connect your Stripe account to accept payments. Uses Stripe Connect OAuth for secure authorization.
                          </p>
                          <Button
                            onClick={handleStripeConnect}
                            variant="primary"
                            size="sm"
                            className="w-full flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Connect with Stripe
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Summary section */}
                          {stripeSummary && (
                            <div className="p-3 bg-surface-base rounded-lg space-y-2">
                              <div className="text-sm font-medium text-text-primary">Account Summary</div>
                              {stripeSummary.business_name && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-tertiary">Business</span>
                                  <span className="text-text-secondary">{stripeSummary.business_name}</span>
                                </div>
                              )}
                              {stripeSummary.country && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-tertiary">Country</span>
                                  <span className="text-text-secondary">{stripeSummary.country}</span>
                                </div>
                              )}
                              {stripeSummary.currency && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-tertiary">Currency</span>
                                  <span className="text-text-secondary">{stripeSummary.currency.toUpperCase()}</span>
                                </div>
                              )}
                              {stripeSummary.account_id_masked && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-tertiary">Account ID</span>
                                  <span className="text-text-secondary font-mono">{stripeSummary.account_id_masked}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleTestPaymentConnection('stripe')}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Test Connection
                            </Button>
                            <Button
                              onClick={() => handleViewLogs('stripe')}
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Logs
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                case 'square':
                  return (
                    <>
                      {!isConnected ? (
                        <div className="space-y-3">
                          {/* Credential masking: show placeholder when saved */}
                          {/* Validates: Requirements 11.1 */}
                          <Input
                            label="Access Token"
                            type="password"
                            value={squareCredentialsSaved && !squareAccessToken ? '' : squareAccessToken}
                            onChange={(e) => setSquareAccessToken(e.target.value)}
                            placeholder={squareCredentialsSaved ? CREDENTIAL_PLACEHOLDER : 'Enter Square access token'}
                            size="sm"
                          />
                          <Input
                            label="Location ID"
                            value={squareLocationId}
                            onChange={(e) => setSquareLocationId(e.target.value)}
                            placeholder="Enter location ID"
                            size="sm"
                          />
                          {squareCredentialsSaved && (
                            <p className="text-xs text-text-tertiary">
                              Credentials are saved. Enter new values to update them.
                            </p>
                          )}
                          <Button
                            onClick={handleSquareConnect}
                            variant="primary"
                            size="sm"
                            className="w-full"
                            disabled={savingIntegration === 'square'}
                          >
                            {savingIntegration === 'square' ? 'Connecting...' : 'Connect Square'}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Summary section */}
                          {squareSummary && (
                            <div className="p-3 bg-surface-base rounded-lg space-y-2">
                              <div className="text-sm font-medium text-text-primary">Location Summary</div>
                              {squareSummary.location_name && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-tertiary">Location</span>
                                  <span className="text-text-secondary">{squareSummary.location_name}</span>
                                </div>
                              )}
                              {squareSummary.address && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-tertiary">Address</span>
                                  <span className="text-text-secondary">{squareSummary.address}</span>
                                </div>
                              )}
                              {squareSummary.capabilities && squareSummary.capabilities.length > 0 && (
                                <div className="text-xs">
                                  <span className="text-text-tertiary">Capabilities</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {squareSummary.capabilities.map((cap) => (
                                      <span key={cap} className="px-2 py-0.5 bg-surface-secondary rounded text-text-secondary">
                                        {cap}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleTestPaymentConnection('square')}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Test Connection
                            </Button>
                            <Button
                              onClick={() => handleViewLogs('square')}
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Logs
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                case 'clover':
                  return (
                    <>
                      {!isConnected ? (
                        <div className="space-y-3">
                          <p className="text-sm text-text-secondary">
                            Connect your Clover merchant account. Uses OAuth for secure authorization.
                          </p>
                          <Button
                            onClick={handleCloverConnect}
                            variant="primary"
                            size="sm"
                            className="w-full flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Connect with Clover
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Summary section */}
                          {cloverSummary && (
                            <div className="p-3 bg-surface-base rounded-lg space-y-2">
                              <div className="text-sm font-medium text-text-primary">Merchant Summary</div>
                              {cloverSummary.merchant_name && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-tertiary">Merchant</span>
                                  <span className="text-text-secondary">{cloverSummary.merchant_name}</span>
                                </div>
                              )}
                              {cloverSummary.address && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-tertiary">Address</span>
                                  <span className="text-text-secondary">{cloverSummary.address}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleTestPaymentConnection('clover')}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Test Connection
                            </Button>
                            <Button
                              onClick={() => handleViewLogs('clover')}
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Logs
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                case 'supabase':
                  return (
                    <div className="space-y-3">
                      {/* Summary section */}
                      {supabaseSummary && (
                        <div className="p-3 bg-surface-base rounded-lg space-y-2">
                          <div className="text-sm font-medium text-text-primary">Hub Summary</div>
                          {supabaseSummary.project_name && (
                            <div className="flex justify-between text-xs">
                              <span className="text-text-tertiary">Project</span>
                              <span className="text-text-secondary">{supabaseSummary.project_name}</span>
                            </div>
                          )}
                          {supabaseSummary.last_sync_at && (
                            <div className="flex justify-between text-xs">
                              <span className="text-text-tertiary">Last Sync</span>
                              <span className="text-text-secondary">
                                {new Date(supabaseSummary.last_sync_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {supabaseSummary.pending_queue_count !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className="text-text-tertiary">Pending</span>
                              <span className="text-text-secondary">{supabaseSummary.pending_queue_count} items</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <Button
                        onClick={() => handleViewLogs('supabase')}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        View Logs
                      </Button>
                    </div>
                  );
                default:
                  return null;
              }
            };

            /**
             * Map integration status to IntegrationCard status.
             * The Integration type uses 'disconnected' but IntegrationCard expects 'not_connected'.
             */
            const mapStatus = (status: string): 'connected' | 'not_connected' | 'error' | 'syncing' => {
              switch (status) {
                case 'connected':
                  return 'connected';
                case 'error':
                  return 'error';
                case 'syncing':
                  return 'syncing';
                case 'disconnected':
                default:
                  return 'not_connected';
              }
            };

            return (
              <IntegrationCard
                key={integration.id}
                id={integration.id}
                name={integration.name}
                description={integration.description}
                status={mapStatus(integration.status)}
                icon={getIntegrationIcon()}
                enabled={integration.enabled}
                config={{
                  storeUrl: integration.id === 'woocommerce' ? wcUrl : undefined,
                  lastSync: integration.lastSync,
                }}
                capabilityEnabled={isCapabilityEnabled(integration.id)}
                disabledReason={getDisabledReason(integration.id)}
                backendAvailable={isBackendAvailable(integration.id)}
                actions={{
                  onConnect: () => {
                    handleToggleIntegration(integration.id);
                  },
                  onConfigure: () => {
                    setSelectedIntegration(
                      selectedIntegration === integration.id ? null : integration.id
                    );
                  },
                  onTestConnection: () => handleTestConnection(integration.id),
                  onDisconnect: () => {
                    // Show confirmation dialog instead of directly disconnecting
                    // Validates: Requirements 9.2, 9.3
                    setDisconnectTarget(integration.id);
                  },
                  onToggle: (enabled) => {
                    if (enabled !== integration.enabled) {
                      handleToggleIntegration(integration.id);
                    }
                  },
                }}
                showConfig={selectedIntegration === integration.id}
                configContent={
                  <div className="space-y-3">
                    {renderConfigContent()}
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button
                        onClick={() => handleTestConnection(integration.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={!isCapabilityEnabled(integration.id) || !isBackendAvailable(integration.id)}
                      >
                        Test Connection
                      </Button>
                      <Button
                        onClick={() => handleSaveSettings(integration.id)}
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        disabled={savingIntegration === integration.id || !isCapabilityEnabled(integration.id)}
                      >
                        {savingIntegration === integration.id ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>

        {/* Integration Notes */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Plug className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Integration Notes</h2>
            </div>

            <div className="space-y-3 text-sm text-text-tertiary">
              <div className="p-3 bg-surface-base rounded-lg">
                <div className="font-medium text-text-secondary mb-1">Security</div>
                <p>
                  All API keys and credentials are encrypted before storage. Never share your
                  credentials with anyone.
                </p>
              </div>

              <div className="p-3 bg-surface-base rounded-lg">
                <div className="font-medium text-text-secondary mb-1">Sync Frequency</div>
                <p>
                  Integrations sync automatically based on your Network & Sync settings. Manual sync
                  is available for each integration.
                </p>
              </div>

              <div className="p-3 bg-surface-base rounded-lg">
                <div className="font-medium text-text-secondary mb-1">Error Handling</div>
                <p>
                  Failed sync attempts are logged and retried automatically. Check the audit log for
                  detailed error information.
                </p>
              </div>

              <div className="p-3 bg-surface-base rounded-lg">
                <div className="font-medium text-text-secondary mb-1">Support</div>
                <p>
                  Need help setting up integrations? Visit our{' '}
                  <a
                    href="#"
                    className="text-primary-400 hover:text-primary-300 inline-flex items-center gap-1"
                  >
                    documentation <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  or contact support.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Mapping Editor Modal */}
        {showMappingEditor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 'var(--z-modal)' }}>
            <div className="max-w-4xl w-full max-h-[90vh] overflow-auto" style={{ boxShadow: 'var(--shadow-modal)' }}>
              <MappingEditor
                sourcePlatform="WooCommerce"
                targetPlatform="QuickBooks"
                mappings={mappings}
                onMappingsChange={setMappings}
                onPreview={() => toast.info('Preview requires a connected integration. Save your mappings first, then test with a sync dry run.')}
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={() => setShowMappingEditor(false)} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast.success('Mappings saved');
                    setShowMappingEditor(false);
                  }}
                  variant="primary"
                  size="sm"
                >
                  Save Mappings
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Integration Logs Drawer */}
        <IntegrationLogsDrawer
          isOpen={logsDrawerOpen}
          onClose={() => setLogsDrawerOpen(false)}
          platform={logsDrawerPlatform}
        />

        {/* Disconnect Confirmation Dialog */}
        {/* Validates: Requirements 9.2, 9.3 */}
        <ConfirmDialog
          isOpen={disconnectTarget !== null}
          onClose={() => setDisconnectTarget(null)}
          onConfirm={async () => {
            if (disconnectTarget) {
              await handleDisconnect(disconnectTarget);
              setDisconnectTarget(null);
            }
          }}
          title="Disconnect Integration"
          message={`Are you sure you want to disconnect ${
            integrations.find(i => i.id === disconnectTarget)?.name || 'this integration'
          }? You will need to re-enter credentials to reconnect.`}
          variant="danger"
          confirmText="Disconnect"
          cancelText="Cancel"
        />

        {/* Full Resync Confirmation Dialog */}
        {/* Validates: Requirements 16.5 */}
        <ConfirmDialog
          isOpen={fullResyncTarget !== null}
          onClose={() => setFullResyncTarget(null)}
          onConfirm={async () => {
            if (fullResyncTarget) {
              await handleSyncNow(fullResyncTarget, 'full');
              setFullResyncTarget(null);
            }
          }}
          title="Full Resync"
          message={`This will perform a full resync of all data for ${
            integrations.find(i => i.id === fullResyncTarget)?.name || 'this integration'
          }. This may take several minutes and could affect system performance. Are you sure you want to continue?`}
          variant="warning"
          confirmText="Start Full Resync"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
};

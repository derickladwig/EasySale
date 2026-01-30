import React from 'react';
import { Card } from '@common/components/molecules/Card';
import { toast } from '@common/components/molecules/Toast';
import { Flag, Gift, Wrench, ShoppingCart, AlertTriangle, Package } from 'lucide-react';
import { useFeatureFlags, useUpdateFeatureFlag } from '../hooks/useFeatureFlags';
import { EmptyState } from '@common/components/molecules/EmptyState';

// Icon mapping for known feature flags
const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  loyalty: Gift,
  loyalty_program: Gift,
  service_orders: Wrench,
  ecommerce_sync: ShoppingCart,
  woocommerce_sync: ShoppingCart,
  shopify_sync: ShoppingCart,
};

export const FeatureFlagsPage: React.FC = () => {
  const { data: features, isLoading, error } = useFeatureFlags();
  const updateFeatureFlag = useUpdateFeatureFlag();

  const handleToggleFeature = async (featureName: string, currentEnabled: boolean) => {
    const feature = features?.find((f) => f.name === featureName);
    if (!feature) return;

    // Confirm disabling
    if (currentEnabled) {
      const confirmed = confirm(
        `Warning: Disabling "${feature.name}" will hide this feature from navigation and prevent access to its data.\n\n` +
          `Are you sure you want to disable it?`
      );
      if (!confirmed) return;
    }

    try {
      await updateFeatureFlag.mutateAsync({
        name: featureName,
        enabled: !currentEnabled,
      });
      toast.success(`${feature.name} ${currentEnabled ? 'disabled' : 'enabled'} successfully`);
    } catch (err) {
      toast.error(`Failed to update feature flag: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Feature Flags</h1>
          <p className="text-text-secondary mt-2">
            Enable or disable optional features for your POS system
          </p>
        </div>

        {/* Warning Banner */}
        <div className="p-4 bg-warning-500/10 border border-warning-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-400 mt-0.5" />
            <div>
              <div className="font-medium text-warning-400 mb-1">Important</div>
              <p className="text-sm text-text-secondary">
                Disabling features will hide them from navigation and prevent API access. Features
                with active data will show a confirmation dialog before disabling.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-text-tertiary">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p>Loading feature flags...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-error-500/10 border border-error-500/20 rounded-xl p-6 text-center">
            <div className="text-error-400 mb-2">Failed to load feature flags</div>
            <div className="text-text-tertiary text-sm">{error instanceof Error ? error.message : 'Unknown error'}</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!features || features.length === 0) && (
          <EmptyState
            title="No feature flags configured"
            description="Feature flags allow you to enable or disable optional features in your POS system"
            icon={<Flag size={48} />}
          />
        )}

        {/* Features List */}
        {!isLoading && !error && features && features.length > 0 && (
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Flag className="w-5 h-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-text-primary">Available Features</h2>
              </div>

              <div className="space-y-4">
                {features.map((feature) => {
                  const Icon = FEATURE_ICONS[feature.name] || Package;
                  return (
                    <div
                      key={feature.name}
                      className="flex items-start justify-between p-4 bg-surface-base rounded-lg border border-border"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`p-3 rounded-lg ${
                            feature.enabled
                              ? 'bg-primary-500/20 text-primary-400'
                              : 'bg-surface-elevated text-text-disabled'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-text-primary">{feature.name}</h3>
                            {feature.enabled ? (
                              <span className="px-2 py-1 text-xs font-medium bg-success-500/20 text-success-400 rounded">
                                Enabled
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-surface-elevated text-text-tertiary rounded">
                                Disabled
                              </span>
                            )}
                          </div>
                          {feature.description && (
                            <p className="text-sm text-text-tertiary">{feature.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={feature.enabled}
                            onChange={() => handleToggleFeature(feature.name, feature.enabled)}
                            disabled={updateFeatureFlag.isPending}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Feature Impact */}
        {!isLoading && !error && features && features.length > 0 && (
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Flag className="w-5 h-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-text-primary">Feature Impact</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3 bg-surface-base rounded-lg">
                  <div className="font-medium text-text-primary mb-1">Navigation</div>
                  <p className="text-text-tertiary">
                    Disabled features are hidden from the main navigation menu and quick actions.
                  </p>
                </div>

                <div className="p-3 bg-surface-base rounded-lg">
                  <div className="font-medium text-text-primary mb-1">API Access</div>
                  <p className="text-text-tertiary">
                    API endpoints for disabled features return a 403 Forbidden error with a clear
                    message.
                  </p>
                </div>

                <div className="p-3 bg-surface-base rounded-lg">
                  <div className="font-medium text-text-primary mb-1">Data Retention</div>
                  <p className="text-text-tertiary">
                    Disabling a feature does not delete existing data. Data remains in the database
                    and can be accessed when the feature is re-enabled.
                  </p>
                </div>

                <div className="p-3 bg-surface-base rounded-lg">
                  <div className="font-medium text-text-primary mb-1">Audit Logging</div>
                  <p className="text-text-tertiary">
                    All feature flag changes are logged in the audit log with user, timestamp, and
                    before/after values.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

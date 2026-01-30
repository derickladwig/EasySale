import { useState, useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { SettingsPageShell } from './SettingsPageShell';

interface SettingValue {
  key: string;
  value: any;
  scope: 'global' | 'store' | 'station' | 'user';
  source_id: number | null;
  description: string | null;
}

interface ResolvedSetting {
  key: string;
  effective_value: any;
  effective_scope: 'global' | 'store' | 'station' | 'user';
  effective_source_id: number | null;
  description: string | null;
  all_values: SettingValue[];
  is_overridden: boolean;
}

interface EffectiveSettingsResponse {
  settings: Record<string, ResolvedSetting>;
  context: {
    user_id: number | null;
    station_id: number | null;
    store_id: number | null;
  };
}

export function EffectiveSettingsView() {
  const [settings, setSettings] = useState<Record<string, ResolvedSetting>>({});
  const [context, setContext] = useState<EffectiveSettingsResponse['context'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'overridden'>('all');
  const [searchQuery] = useState('');

  // Fetch effective settings
  useEffect(() => {
    fetchEffectiveSettings();
  }, []);

  const fetchEffectiveSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/effective', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch effective settings');
      }

      const data: EffectiveSettingsResponse = await response.json();
      setSettings(data.settings);
      setContext(data.context);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get scope badge color
  const getScopeBadgeColor = (scope: ResolvedSetting['effective_scope']) => {
    switch (scope) {
      case 'global':
        return 'bg-info-100 text-info-dark border-info-200';
      case 'store':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'station':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'user':
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  // Filter settings
  const filteredSettings = Object.entries(settings).filter(([key, setting]) => {
    // Apply filter
    if (filter === 'overridden' && !setting.is_overridden) {
      return false;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        key.toLowerCase().includes(query) ||
        setting.description?.toLowerCase().includes(query) ||
        JSON.stringify(setting.effective_value).toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Format value for display
  const formatValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Enabled' : 'Disabled';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (loading) {
    return (
      <SettingsPageShell
        title="Effective Settings"
        subtitle="View resolved settings for your current context"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-secondary-500">Loading settings...</div>
        </div>
      </SettingsPageShell>
    );
  }

  if (error) {
    return (
      <SettingsPageShell
        title="Effective Settings"
        subtitle="View resolved settings for your current context"
      >
        <div className="p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-error-800">Failed to load settings</p>
            <p className="text-sm text-error-700 mt-1">{error}</p>
          </div>
        </div>
      </SettingsPageShell>
    );
  }

  return (
    <SettingsPageShell
      title="Effective Settings"
      subtitle="View resolved settings for your current context"
    >
      {/* Context Info */}
      {context && (
        <div className="mb-6 p-4 bg-info-50 border border-info-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-info-900">Current Context</p>
              <div className="text-sm text-info-dark mt-1 space-y-1">
                <p>User ID: {context.user_id || 'N/A'}</p>
                <p>Store ID: {context.store_id || 'N/A'}</p>
                <p>Station ID: {context.station_id || 'N/A'}</p>
              </div>
              <p className="text-xs text-accent mt-2">
                Settings are resolved in order: User → Station → Store → Global
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
          }`}
        >
          All Settings ({Object.keys(settings).length})
        </button>
        <button
          onClick={() => setFilter('overridden')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            filter === 'overridden'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
          }`}
        >
          Overridden Only ({Object.values(settings).filter((s) => s.is_overridden).length})
        </button>
      </div>

      {/* Settings List */}
      <div className="space-y-4">
        {filteredSettings.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <p>No settings found</p>
            {searchQuery && <p className="text-sm mt-1">Try a different search query</p>}
          </div>
        ) : (
          filteredSettings.map(([key, setting]) => (
            <div
              key={key}
              className="p-4 bg-surface-base border border-border rounded-lg hover:border-primary-500/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-text-primary">{key}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded border ${getScopeBadgeColor(
                        setting.effective_scope
                      )}`}
                    >
                      {setting.effective_scope}
                    </span>
                    {setting.is_overridden && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-warning-500/20 text-warning-400 border border-warning-500/30">
                        Overridden
                      </span>
                    )}
                  </div>

                  {setting.description && (
                    <p className="text-sm text-text-secondary mb-2">{setting.description}</p>
                  )}

                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-text-secondary">Effective Value:</span>
                    <code className="text-sm text-text-primary bg-surface-elevated px-2 py-1 rounded">
                      {formatValue(setting.effective_value)}
                    </code>
                  </div>

                  {/* Show all values if overridden */}
                  {setting.is_overridden && setting.all_values.length > 1 && (
                    <details className="mt-3">
                      <summary className="text-sm text-text-secondary cursor-pointer hover:text-text-primary">
                        View all scope values ({setting.all_values.length})
                      </summary>
                      <div className="mt-2 space-y-2 pl-4 border-l-2 border-border">
                        {setting.all_values.map((val, idx) => (
                          <div key={idx} className="text-sm">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getScopeBadgeColor(
                                val.scope
                              )}`}
                            >
                              {val.scope}
                              {val.source_id && ` (ID: ${val.source_id})`}
                            </span>
                            <code className="ml-2 text-text-secondary bg-surface-elevated px-2 py-1 rounded">
                              {formatValue(val.value)}
                            </code>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </SettingsPageShell>
  );
}

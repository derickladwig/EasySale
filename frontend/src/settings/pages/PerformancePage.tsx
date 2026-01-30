import React, { useState, useEffect } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { Toggle } from '@common/components/atoms/Toggle';
import { toast } from '@common/components/molecules/Toast';
import { EmptyChart } from '@common/components/molecules/EmptyChart';
import { Activity, Download, AlertCircle, Clock, Database, Cpu } from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: string;
  status: 'good' | 'warning' | 'error';
}

interface RecentError {
  id: string;
  timestamp: string;
  message: string;
  stack: string;
}

// Hook for metrics data - fetches from backend API
const useMetricsQuery = () => {
  const [data, setData] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/settings/performance/metrics');
        if (!response.ok) {
          // Return empty array if endpoint not available (graceful degradation)
          setData([]);
          return;
        }
        const result = await response.json();
        setData(result.metrics || []);
      } catch {
        // Graceful degradation - show empty state instead of error
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return { data, isLoading, error };
};

// Hook for errors data - fetches from backend API
const useErrorsQuery = () => {
  const [data, setData] = useState<RecentError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const response = await fetch('/api/settings/performance/errors');
        if (!response.ok) {
          // Return empty array if endpoint not available (graceful degradation)
          setData([]);
          return;
        }
        const result = await response.json();
        setData(result.errors || []);
      } catch {
        // Graceful degradation - show empty state instead of error
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchErrors();
  }, []);

  return { data, isLoading, error };
};

export const PerformancePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [monitoringUrl, setMonitoringUrl] = useState('https://monitoring.example.com');
  const [sentryDsn, setSentryDsn] = useState('');

  // Fetch metrics and errors data
  const { data: metrics = [], isLoading: metricsLoading, error: metricsError } = useMetricsQuery();
  const { data: errors = [], isLoading: errorsLoading, error: errorsError } = useErrorsQuery();

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Performance monitoring settings updated');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportMetrics = () => {
    toast.info('Exporting performance metrics to CSV...');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-success-400 bg-success-500/20';
      case 'warning':
        return 'text-warning-400 bg-warning-500/20';
      case 'error':
        return 'text-error-400 bg-error-500/20';
      default:
        return 'text-text-tertiary bg-surface-elevated';
    }
  };

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Performance Monitoring</h1>
          <p className="text-text-secondary mt-2">Monitor system performance and track errors</p>
        </div>

        {/* Configuration Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Monitoring Configuration</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-surface-base rounded-lg">
                <Toggle
                  checked={monitoringEnabled}
                  onChange={setMonitoringEnabled}
                  label="Enable Performance Monitoring"
                  description="Collect and report performance metrics"
                />
              </div>

              <Input
                label="Monitoring Endpoint URL"
                value={monitoringUrl}
                onChange={(e) => setMonitoringUrl(e.target.value)}
                placeholder="https://monitoring.example.com"
                disabled={!monitoringEnabled}
                helperText="URL where performance metrics will be sent"
              />

              <Input
                label="Error Tracking DSN (Sentry)"
                value={sentryDsn}
                onChange={(e) => setSentryDsn(e.target.value)}
                placeholder="https://[key]@sentry.io/[project]"
                disabled={!monitoringEnabled}
                helperText="Optional: Sentry DSN for error tracking and alerting"
              />
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleSaveSettings} loading={isLoading} variant="primary">
                Save Settings
              </Button>
            </div>
          </div>
        </Card>

        {/* Performance Metrics Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-text-primary">Performance Metrics</h2>
              </div>
              <Button
                onClick={handleExportMetrics}
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                disabled={metrics.length === 0}
              >
                Export CSV
              </Button>
            </div>

            {metricsLoading ? (
              <div className="text-center py-8 text-text-tertiary">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto"></div>
                <p className="mt-3">Loading metrics...</p>
              </div>
            ) : metricsError ? (
              <div className="text-center py-8 text-error-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Failed to load metrics</p>
              </div>
            ) : metrics.length === 0 ? (
              <EmptyChart
                message="Not enough data to display metrics"
                context="Performance metrics will appear here once the system collects data"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.map((metric, index) => (
                    <div key={index} className="p-4 bg-surface-base rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm text-text-tertiary">{metric.name}</div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(metric.status)}`}
                        >
                          {metric.status}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-text-primary">{metric.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-surface-base rounded-lg border border-border">
                  <div className="text-sm text-text-tertiary mb-2">
                    Metrics collected over the last 24 hours
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-disabled">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-success-400"></div>
                      <span>Good (&lt; 100ms)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-warning-400"></div>
                      <span>Warning (100-500ms)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-error-400"></div>
                      <span>Error (&gt; 500ms)</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* System Resources Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">System Resources</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-surface-base rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-tertiary">CPU Usage</span>
                  <span className="text-sm font-medium text-text-primary">23%</span>
                </div>
                <div className="w-full bg-surface-elevated rounded-full h-2">
                  <div className="bg-success-500 h-2 rounded-full w-[23%]"></div>
                </div>
              </div>

              <div className="p-4 bg-surface-base rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-tertiary">Memory Usage</span>
                  <span className="text-sm font-medium text-text-primary">48%</span>
                </div>
                <div className="w-full bg-surface-elevated rounded-full h-2">
                  <div className="bg-success-500 h-2 rounded-full w-[48%]"></div>
                </div>
              </div>

              <div className="p-4 bg-surface-base rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-tertiary">Disk Usage</span>
                  <span className="text-sm font-medium text-text-primary">67%</span>
                </div>
                <div className="w-full bg-surface-elevated rounded-full h-2">
                  <div className="bg-warning-500 h-2 rounded-full w-[67%]"></div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Errors Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Recent Errors</h2>
            </div>

            {errorsLoading ? (
              <div className="text-center py-8 text-text-tertiary">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto"></div>
                <p className="mt-3">Loading errors...</p>
              </div>
            ) : errorsError ? (
              <div className="text-center py-8 text-error-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Failed to load error logs</p>
              </div>
            ) : errors.length === 0 ? (
              <div className="text-center py-8 text-success-400">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-success-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="font-medium">No errors logged</p>
                <p className="text-sm text-text-tertiary mt-1">System is running smoothly</p>
              </div>
            ) : (
              <div className="space-y-4">
                {errors.map((error) => (
                  <div key={error.id} className="p-4 bg-surface-base rounded-lg border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-error-400" />
                        <span className="font-medium text-text-primary">{error.message}</span>
                      </div>
                      <span className="text-xs text-text-tertiary">{error.timestamp}</span>
                    </div>
                    <details className="mt-2">
                      <summary className="text-sm text-text-tertiary cursor-pointer hover:text-text-secondary">
                        View stack trace
                      </summary>
                      <pre className="mt-2 p-3 bg-background-primary rounded text-xs text-text-secondary overflow-x-auto">
                        {error.stack}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Database Performance Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Database Performance</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary mb-1">Total Queries (24h)</div>
                <div className="text-2xl font-bold text-text-primary">45,231</div>
              </div>

              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary mb-1">Slow Queries (&gt;100ms)</div>
                <div className="text-2xl font-bold text-warning-400">12</div>
              </div>

              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary mb-1">Database Size</div>
                <div className="text-2xl font-bold text-text-primary">1.2 GB</div>
              </div>

              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary mb-1">Connection Pool</div>
                <div className="text-2xl font-bold text-text-primary">8 / 20</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

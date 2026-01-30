import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type WidgetType = 'stat' | 'chart' | 'list' | 'table' | 'progress' | 'custom';
export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface WidgetSchema {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size?: WidgetSize;
  refreshInterval?: number; // milliseconds, 0 = no auto-refresh

  // Data source
  dataSource?: () => Promise<any>;

  // Stat widget
  value?: string | number;
  previousValue?: string | number;
  trend?: TrendDirection;
  trendValue?: string;
  icon?: React.ReactNode;
  color?: string;

  // List widget
  items?: Array<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: string;
  }>;

  // Progress widget
  current?: number;
  target?: number;
  unit?: string;

  // Custom widget
  render?: (data: any) => React.ReactNode;
}

export interface DynamicWidgetProps {
  schema: WidgetSchema;
  onRefresh?: (widgetId: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DynamicWidget({
  schema,
  onRefresh,
  isLoading: externalLoading,
}: DynamicWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load data from data source
  const loadData = useCallback(async () => {
    if (!schema.dataSource) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await schema.dataSource();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [schema.dataSource]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh
  useEffect(() => {
    if (!schema.refreshInterval || schema.refreshInterval === 0) return;

    const interval = setInterval(() => {
      loadData();
    }, schema.refreshInterval);

    return () => clearInterval(interval);
  }, [schema.refreshInterval, loadData]);

  // Handle manual refresh
  const handleRefresh = () => {
    loadData();
    onRefresh?.(schema.id);
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (schema.size) {
      case 'sm':
        return 'col-span-1';
      case 'md':
        return 'col-span-1 md:col-span-2';
      case 'lg':
        return 'col-span-1 md:col-span-2 lg:col-span-3';
      case 'xl':
        return 'col-span-1 md:col-span-2 lg:col-span-4';
      default:
        return 'col-span-1';
    }
  };

  // Render loading state
  if (isLoading || externalLoading) {
    return (
      <div className={`bg-surface border border-border rounded-lg p-6 ${getSizeClasses()}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface-elevated rounded w-1/2"></div>
          <div className="h-8 bg-surface-elevated rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-surface border border-error-500/20 rounded-lg p-6 ${getSizeClasses()}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="text-error-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-error-400 mb-1">Error Loading Widget</h3>
            <p className="text-sm text-error-400/80">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 text-sm text-error-400 hover:text-error-300 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render widget based on type
  const renderWidget = () => {
    switch (schema.type) {
      case 'stat':
        return renderStatWidget();
      case 'list':
        return renderListWidget();
      case 'progress':
        return renderProgressWidget();
      case 'custom':
        return schema.render?.(data);
      default:
        return (
          <div className="text-sm text-text-secondary">
            Widget type "{schema.type}" not implemented
          </div>
        );
    }
  };

  // Render stat widget
  const renderStatWidget = () => {
    const value = data?.value ?? schema.value;
    const previousValue = data?.previousValue ?? schema.previousValue;
    const trend = data?.trend ?? schema.trend;
    const trendValue = data?.trendValue ?? schema.trendValue;

    // Calculate trend if not provided
    let calculatedTrend = trend;
    let calculatedTrendValue = trendValue;

    if (!trend && value !== undefined && previousValue !== undefined) {
      const current = Number(value);
      const previous = Number(previousValue);
      const change = current - previous;
      const percentChange = previous !== 0 ? (change / previous) * 100 : 0;

      calculatedTrend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
      calculatedTrendValue = `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
    }

    const trendIcon =
      calculatedTrend === 'up' ? (
        <TrendingUp size={16} />
      ) : calculatedTrend === 'down' ? (
        <TrendingDown size={16} />
      ) : (
        <Minus size={16} />
      );

    const trendColor =
      calculatedTrend === 'up'
        ? 'text-success-400'
        : calculatedTrend === 'down'
          ? 'text-error-400'
          : 'text-text-secondary';

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-3xl font-bold text-text-primary mb-1">{value}</div>
            {calculatedTrendValue && (
              <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                {trendIcon}
                <span>{calculatedTrendValue}</span>
                {previousValue && <span className="text-text-secondary ml-1">vs previous</span>}
              </div>
            )}
          </div>
          {schema.icon && (
            <div className={`p-3 rounded-lg ${schema.color || 'bg-primary-500/20'}`}>
              {schema.icon}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render list widget
  const renderListWidget = () => {
    const items = data?.items ?? schema.items ?? [];

    return (
      <div className="space-y-3">
        {items.map((item: any, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {item.icon && (
                <div className={`p-2 rounded ${item.color || 'bg-surface-elevated'}`}>{item.icon}</div>
              )}
              <span className="text-sm text-text-primary">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{item.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render progress widget
  const renderProgressWidget = () => {
    const current = data?.current ?? schema.current ?? 0;
    const target = data?.target ?? schema.target ?? 100;
    const unit = data?.unit ?? schema.unit ?? '';
    const percentage = target > 0 ? (current / target) * 100 : 0;

    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-text-primary">
              {current}
              {unit && <span className="text-lg text-text-secondary ml-1">{unit}</span>}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              of {target}
              {unit} target
            </div>
          </div>
          <div className="text-2xl font-bold text-primary-400">{percentage.toFixed(0)}%</div>
        </div>
        <div className="w-full bg-surface-elevated rounded-full h-3 overflow-hidden">
          <div
            className="bg-primary-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-surface border border-border rounded-lg p-6 ${getSizeClasses()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text-primary mb-1">{schema.title}</h3>
          {schema.description && (
            <p className="text-xs text-text-secondary">{schema.description}</p>
          )}
        </div>
        {schema.dataSource && (
          <button
            onClick={handleRefresh}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      {renderWidget()}

      {/* Footer */}
      {schema.refreshInterval && schema.refreshInterval > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-text-secondary">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

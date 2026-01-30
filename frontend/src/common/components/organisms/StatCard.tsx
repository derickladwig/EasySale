import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { Icon } from '../atoms/Icon';
import { Card } from './Card';
import { cn } from '../../utils/classNames';

export type StatCardVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  /** Main statistic value */
  value: string | number;

  /** Label for the statistic */
  label: string;

  /** Optional icon */
  icon?: LucideIcon;

  /** Trend direction */
  trend?: TrendDirection;

  /** Trend percentage (e.g., "12.5" for 12.5%) */
  trendValue?: string | number;

  /** Color variant */
  variant?: StatCardVariant;

  /** Whether the card is interactive */
  interactive?: boolean;

  /** Click handler */
  onClick?: () => void;

  /** Additional CSS classes */
  className?: string;
}

// Variant color mappings
const variantColors: Record<StatCardVariant, { icon: string; trend: string }> = {
  default: { icon: 'text-primary-500', trend: 'text-primary-500' },
  success: { icon: 'text-success-500', trend: 'text-success-500' },
  warning: { icon: 'text-warning-500', trend: 'text-warning-500' },
  error: { icon: 'text-error-500', trend: 'text-error-500' },
  info: { icon: 'text-info-500', trend: 'text-info-500' },
};

// Trend colors
const trendColors: Record<TrendDirection, string> = {
  up: 'text-success-500',
  down: 'text-error-500',
  neutral: 'text-text-tertiary',
};

/**
 * StatCard Component
 *
 * A specialized card for displaying dashboard metrics with optional trend indicators and icons.
 *
 * @example
 * // Basic stat card
 * <StatCard
 *   value="1,234"
 *   label="Total Sales"
 * />
 *
 * @example
 * // With trend indicator
 * <StatCard
 *   value="$45,231"
 *   label="Revenue"
 *   trend="up"
 *   trendValue="12.5"
 * />
 *
 * @example
 * // With icon and variant
 * <StatCard
 *   value="156"
 *   label="Active Users"
 *   icon={Users}
 *   variant="success"
 *   trend="up"
 *   trendValue="8.2"
 * />
 */
export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      value,
      label,
      icon: IconComponent,
      trend,
      trendValue,
      variant = 'default',
      interactive = false,
      onClick,
      className,
    },
    ref
  ) => {
    const colors = variantColors[variant];
    const trendColor = trend ? trendColors[trend] : undefined;

    return (
      <Card
        ref={ref}
        variant="elevated"
        interactive={interactive}
        onClick={onClick}
        className={className}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-tertiary mb-1">{label}</p>
            <p className="text-3xl font-bold text-text-primary mb-2">{value}</p>
            {trend && trendValue !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
                {trend === 'up' && <Icon icon={TrendingUp} size="xs" />}
                {trend === 'down' && <Icon icon={TrendingDown} size="xs" />}
                <span>
                  {trend === 'up' && '+'}
                  {trend === 'down' && '-'}
                  {trendValue}%
                </span>
                <span className="text-text-tertiary font-normal ml-1">vs last period</span>
              </div>
            )}
          </div>

          {IconComponent && (
            <div className={cn('p-3 rounded-lg bg-background-primary', colors.icon)}>
              <Icon icon={IconComponent} size="md" />
            </div>
          )}
        </div>
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';

import React from 'react';
import { cn } from '../../utils/classNames';

export interface DashboardTemplateProps {
  /** Dashboard title */
  title?: string;

  /** Dashboard description */
  description?: string;

  /** Action buttons for the header */
  actions?: React.ReactNode;

  /** Stat cards to display in the grid */
  stats?: React.ReactNode[];

  /** Main content area */
  children?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * DashboardTemplate Component
 *
 * A template for dashboard pages with a grid layout for stat cards and main content area.
 * Responsive design: 1 column on mobile, 2 columns on tablet, 4 columns on desktop.
 *
 * @example
 * <DashboardTemplate
 *   title="Sales Dashboard"
 *   description="Overview of today's sales performance"
 *   stats={[
 *     <StatCard key="1" title="Total Sales" value="$12,345" trend={5.2} />,
 *     <StatCard key="2" title="Orders" value="156" trend={-2.1} />,
 *   ]}
 * >
 *   <Card>
 *     <DataTable columns={columns} data={data} />
 *   </Card>
 * </DashboardTemplate>
 */
export const DashboardTemplate = React.forwardRef<HTMLDivElement, DashboardTemplateProps>(
  ({ title, description, actions, stats = [], children, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-6 p-4 md:p-6', className)}>
        {/* Header */}
        {(title || description || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {title && <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{title}</h1>}
              {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        {/* Stats Grid */}
        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div key={index}>{stat}</div>
            ))}
          </div>
        )}

        {/* Main Content */}
        {children && <div className="flex-1">{children}</div>}
      </div>
    );
  }
);

DashboardTemplate.displayName = 'DashboardTemplate';

import React from 'react';
import { cn } from '../../utils/classNames';

export interface InventoryTemplateProps {
  /** Page title */
  title?: string;

  /** Page description */
  description?: string;

  /** Action buttons for the header */
  actions?: React.ReactNode;

  /** Filter section */
  filters?: React.ReactNode;

  /** Main data table */
  table?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * InventoryTemplate Component
 *
 * A template for inventory pages with filters and data table.
 * Responsive: Filters stack on mobile, side-by-side on desktop.
 *
 * @example
 * <InventoryTemplate
 *   title="Inventory Management"
 *   description="Manage your product inventory"
 *   actions={<Button>Add Product</Button>}
 *   filters={<InventoryFilters />}
 *   table={<DataTable columns={columns} data={data} />}
 * />
 */
export const InventoryTemplate = React.forwardRef<HTMLDivElement, InventoryTemplateProps>(
  ({ title, description, actions, filters, table, className }, ref) => {
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

        {/* Filters */}
        {filters && (
          <div className="bg-surface-base rounded-lg border border-border p-4">{filters}</div>
        )}

        {/* Data Table */}
        {table && (
          <div className="flex-1 bg-surface-base rounded-lg border border-border overflow-hidden">
            {table}
          </div>
        )}
      </div>
    );
  }
);

InventoryTemplate.displayName = 'InventoryTemplate';

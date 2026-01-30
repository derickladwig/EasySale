import React from 'react';
import { cn } from '../../utils/classNames';

export interface SalesTemplateProps {
  /** Product catalog section */
  catalog?: React.ReactNode;

  /** Shopping cart section */
  cart?: React.ReactNode;

  /** Customer information section */
  customerInfo?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * SalesTemplate Component
 *
 * A template for sales/POS pages with split-pane layout.
 * Layout: Product catalog (left), Cart (center), Customer info (right).
 * Responsive: Stacks vertically on mobile, side-by-side on desktop.
 *
 * @example
 * <SalesTemplate
 *   catalog={<ProductCatalog />}
 *   cart={<ShoppingCart />}
 *   customerInfo={<CustomerPanel />}
 * />
 */
export const SalesTemplate = React.forwardRef<HTMLDivElement, SalesTemplateProps>(
  ({ catalog, cart, customerInfo, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col lg:flex-row gap-4 p-4 md:p-6 h-full', className)}>
        {/* Product Catalog - Left Side */}
        {catalog && (
          <div className="flex-1 lg:w-1/2 min-h-[400px] lg:min-h-0">
            <div className="h-full bg-surface-base rounded-lg border border-border overflow-hidden">
              {catalog}
            </div>
          </div>
        )}

        {/* Cart & Customer Info - Right Side */}
        <div className="flex flex-col lg:w-1/2 gap-4 min-h-[400px] lg:min-h-0">
          {/* Shopping Cart */}
          {cart && (
            <div className="flex-1 bg-surface-base rounded-lg border border-border overflow-hidden">
              {cart}
            </div>
          )}

          {/* Customer Information */}
          {customerInfo && (
            <div className="bg-surface-base rounded-lg border border-border overflow-hidden">
              {customerInfo}
            </div>
          )}
        </div>
      </div>
    );
  }
);

SalesTemplate.displayName = 'SalesTemplate';

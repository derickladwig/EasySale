import React from 'react';
import { cn } from '../../utils/classNames';

export interface FormTemplateProps {
  /** Form title */
  title?: string;

  /** Form description */
  description?: string;

  /** Form content */
  children?: React.ReactNode;

  /** Form actions (submit, cancel buttons) */
  actions?: React.ReactNode;

  /** Whether to use two-column layout on desktop */
  twoColumn?: boolean;

  /** Maximum width of the form */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /** Additional CSS classes */
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-full',
};

/**
 * FormTemplate Component
 *
 * A template for form pages with consistent layout and styling.
 * Responsive: Single column on mobile, optional two columns on desktop.
 *
 * @example
 * <FormTemplate
 *   title="Add Product"
 *   description="Enter product details"
 *   actions={
 *     <>
 *       <Button variant="outline">Cancel</Button>
 *       <Button variant="primary">Save</Button>
 *     </>
 *   }
 * >
 *   <FormField label="Product Name" />
 *   <FormField label="SKU" />
 *   <FormField label="Price" type="number" />
 * </FormTemplate>
 */
export const FormTemplate = React.forwardRef<HTMLDivElement, FormTemplateProps>(
  (
    { title, description, children, actions, twoColumn = false, maxWidth = 'lg', className },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-6 p-4 md:p-6',
          'mx-auto w-full',
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div>
            {title && <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{title}</h1>}
            {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>
        )}

        {/* Form Content */}
        <div className="bg-surface-base rounded-lg border border-border p-6">
          <div
            className={cn('grid gap-6', twoColumn ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}
          >
            {children}
          </div>
        </div>

        {/* Form Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            {actions}
          </div>
        )}
      </div>
    );
  }
);

FormTemplate.displayName = 'FormTemplate';

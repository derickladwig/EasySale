import React from 'react';
import { cn } from '../../utils/classNames';

export type FormGroupLayout = 'vertical' | 'horizontal';

export interface FormGroupProps {
  /** Child form fields */
  children: React.ReactNode;

  /** Layout direction */
  layout?: FormGroupLayout;

  /** Optional title for the group */
  title?: string;

  /** Optional description for the group */
  description?: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * FormGroup Component
 *
 * Groups related form fields together with consistent spacing and optional title/description.
 * Supports both vertical (stacked) and horizontal (side-by-side) layouts.
 *
 * @example
 * // Vertical layout (default)
 * <FormGroup title="Personal Information">
 *   <FormField label="First Name" type="text" />
 *   <FormField label="Last Name" type="text" />
 * </FormGroup>
 *
 * @example
 * // Horizontal layout
 * <FormGroup layout="horizontal">
 *   <FormField label="City" type="text" />
 *   <FormField label="State" type="text" />
 *   <FormField label="Zip" type="text" />
 * </FormGroup>
 *
 * @example
 * // With description
 * <FormGroup
 *   title="Contact Information"
 *   description="We'll use this to reach you about your order"
 * >
 *   <FormField label="Email" type="email" />
 *   <FormField label="Phone" type="tel" />
 * </FormGroup>
 */
export const FormGroup = React.forwardRef<HTMLDivElement, FormGroupProps>(
  ({ children, layout = 'vertical', title, description, className }, ref) => {
    return (
      <div ref={ref} className={cn('w-full', className)}>
        {(title || description) && (
          <div className="mb-4">
            {title && <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>}
            {description && <p className="text-sm text-text-tertiary">{description}</p>}
          </div>
        )}

        <div
          className={cn(
            'flex',
            layout === 'vertical' ? 'flex-col gap-4' : 'flex-row gap-4 flex-wrap',
            layout === 'horizontal' && 'items-start'
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

FormGroup.displayName = 'FormGroup';

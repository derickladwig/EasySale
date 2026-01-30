/**
 * SkeletonForm Component
 *
 * Skeleton placeholder for form components.
 * Matches the shape of form layouts with various field types.
 *
 * Requirements:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 *
 * @example
 * // Basic form skeleton
 * <SkeletonForm fields={5} />
 *
 * @example
 * // Form skeleton with custom field configuration
 * <SkeletonForm
 *   fields={[
 *     { type: 'input', label: true },
 *     { type: 'textarea', label: true },
 *     { type: 'select', label: true },
 *   ]}
 *   showButtons
 * />
 */

import React from 'react';
import { cn } from '../../utils/classNames';
import { Skeleton } from './Skeleton';

export type SkeletonFormFieldType = 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'toggle';

export interface SkeletonFormField {
  /** Type of form field */
  type: SkeletonFormFieldType;

  /** Whether to show label skeleton */
  label?: boolean;

  /** Whether to show helper text skeleton */
  helperText?: boolean;

  /** Width of the field (for inline layouts) */
  width?: 'full' | 'half' | 'third';
}

export interface SkeletonFormProps {
  /** Number of fields or array of field configurations */
  fields?: number | SkeletonFormField[];

  /** Whether to show action buttons skeleton */
  showButtons?: boolean;

  /** Layout of the form */
  layout?: 'vertical' | 'horizontal' | 'grid';

  /** Number of columns for grid layout */
  gridColumns?: number;

  /** Additional CSS classes */
  className?: string;
}

/**
 * SkeletonFormField Component
 * Displays a single skeleton form field
 */
const SkeletonFormFieldComponent: React.FC<SkeletonFormField> = ({ type, label, helperText }) => {
  return (
    <div className="space-y-1.5">
      {/* Label skeleton */}
      {label && <Skeleton className="h-4 w-24" />}

      {/* Field skeleton based on type */}
      {type === 'input' && <Skeleton className="h-11 w-full rounded-lg" />}

      {type === 'textarea' && <Skeleton className="h-24 w-full rounded-lg" />}

      {type === 'select' && <Skeleton className="h-11 w-full rounded-lg" />}

      {type === 'checkbox' && (
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}

      {type === 'radio' && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton variant="circle" className="w-4 h-4" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      )}

      {type === 'toggle' && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      )}

      {/* Helper text skeleton */}
      {helperText && <Skeleton className="h-3 w-48" />}
    </div>
  );
};

/**
 * SkeletonForm Component
 * Displays a skeleton placeholder matching form layouts
 */
export const SkeletonForm: React.FC<SkeletonFormProps> = ({
  fields = 5,
  showButtons = true,
  layout = 'vertical',
  gridColumns = 2,
  className,
}) => {
  // Convert number to array of default field configurations
  const fieldConfigs: SkeletonFormField[] = Array.isArray(fields)
    ? fields
    : Array.from({ length: fields }).map(() => ({
        type: 'input' as SkeletonFormFieldType,
        label: true,
        helperText: false,
      }));

  // Layout-specific classes
  const layoutClass = {
    vertical: 'space-y-6',
    horizontal: 'space-y-4',
    grid: `grid grid-cols-1 md:grid-cols-${gridColumns} gap-6`,
  }[layout];

  return (
    <div className={cn('w-full', className)} role="status" aria-busy="true">
      {/* Form fields */}
      <div className={layoutClass}>
        {fieldConfigs.map((field, index) => (
          <SkeletonFormFieldComponent key={index} {...field} />
        ))}
      </div>

      {/* Action buttons */}
      {showButtons && (
        <div className="mt-8 flex gap-3 justify-end border-t border-border-light pt-6">
          <Skeleton className="h-11 w-24 rounded-lg" />
          <Skeleton className="h-11 w-24 rounded-lg" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonFormSection Component
 * Displays a skeleton form section with title and fields
 */
export interface SkeletonFormSectionProps {
  /** Whether to show section title */
  showTitle?: boolean;

  /** Whether to show section description */
  showDescription?: boolean;

  /** Number of fields in the section */
  fields?: number;

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonFormSection: React.FC<SkeletonFormSectionProps> = ({
  showTitle = true,
  showDescription = false,
  fields = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Section header */}
      {(showTitle || showDescription) && (
        <div className="space-y-2 pb-4 border-b border-border-light">
          {showTitle && <Skeleton className="h-6 w-48" />}
          {showDescription && <Skeleton className="h-4 w-full" />}
        </div>
      )}

      {/* Section fields */}
      <SkeletonForm fields={fields} showButtons={false} />
    </div>
  );
};

/**
 * SkeletonFormTabs Component
 * Displays a skeleton form with tabs
 */
export interface SkeletonFormTabsProps {
  /** Number of tabs */
  tabs?: number;

  /** Number of fields per tab */
  fieldsPerTab?: number;

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonFormTabs: React.FC<SkeletonFormTabsProps> = ({
  tabs = 3,
  fieldsPerTab = 5,
  className,
}) => {
  return (
    <div className={cn('w-full', className)} role="status" aria-busy="true">
      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-border-light mb-6">
        {Array.from({ length: tabs }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-24" />
        ))}
      </div>

      {/* Active tab content */}
      <SkeletonForm fields={fieldsPerTab} showButtons />
    </div>
  );
};

export default SkeletonForm;

import React from 'react';
import { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from '../../utils/classNames';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps extends Omit<LucideProps, 'size'> {
  /** The Lucide icon component to render */
  icon: LucideIcon;

  /** Size of the icon */
  size?: IconSize;

  /** Color of the icon (uses Tailwind color classes) */
  color?: string;

  /** Accessible label for screen readers */
  'aria-label'?: string;

  /** Additional CSS classes */
  className?: string;
}

// Icon size mappings (in pixels)
const iconSizes: Record<IconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

/**
 * Icon Component
 *
 * A wrapper around Lucide React icons with consistent sizing and styling.
 * Provides standardized icon sizes and color support.
 *
 * @example
 * // Basic icon
 * <Icon icon={Plus} size="md" />
 *
 * @example
 * // Icon with color (use semantic tokens)
 * <Icon icon={Check} size="lg" color="text-success-500" />
 *
 * @example
 * // Icon with accessibility label
 * <Icon icon={Search} size="sm" aria-label="Search" />
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    { icon: LucideIconComponent, size = 'md', color, className, 'aria-label': ariaLabel, ...props },
    ref
  ) => {
    const sizeInPixels = iconSizes[size];

    return (
      <LucideIconComponent
        ref={ref}
        size={sizeInPixels}
        className={cn(color || 'text-current', className)}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel}
        {...props}
      />
    );
  }
);

Icon.displayName = 'Icon';

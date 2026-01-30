import { cn } from './classNames';

/**
 * Variant Configuration
 *
 * Defines the structure for component variant systems.
 * This allows components to have multiple variants (e.g., primary, secondary)
 * and sizes (e.g., sm, md, lg) with consistent styling.
 */
export interface VariantConfig<V extends string = string, S extends string = string> {
  /** Base classes applied to all variants */
  base: string;

  /** Classes for each variant */
  variants: Record<V, string>;

  /** Classes for each size */
  sizes: Record<S, string>;

  /** State-specific classes */
  states?: {
    hover?: string;
    active?: string;
    focus?: string;
    disabled?: string;
  };

  /** Default variant (if not specified) */
  defaultVariant?: V;

  /** Default size (if not specified) */
  defaultSize?: S;
}

/**
 * Create a variant class generator function
 *
 * This function creates a reusable class generator for components with variants and sizes.
 *
 * @param config - Variant configuration
 * @returns Function that generates classes based on variant and size
 *
 * @example
 * const buttonVariants = createVariants({
 *   base: 'inline-flex items-center justify-center font-medium rounded-lg',
 *   variants: {
 *     primary: 'bg-primary-600 text-white hover:bg-primary-700',
 *     secondary: 'bg-dark-700 text-white hover:bg-dark-600',
 *     outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
 *   },
 *   sizes: {
 *     sm: 'px-3 py-1.5 text-sm',
 *     md: 'px-4 py-2 text-base',
 *     lg: 'px-6 py-3 text-lg',
 *   },
 *   states: {
 *     disabled: 'opacity-50 cursor-not-allowed',
 *   },
 *   defaultVariant: 'primary',
 *   defaultSize: 'md',
 * });
 *
 * // Usage
 * const classes = buttonVariants({ variant: 'primary', size: 'lg', disabled: true });
 */
export function createVariants<V extends string, S extends string>(config: VariantConfig<V, S>) {
  return function getVariantClasses(
    options: {
      variant?: V;
      size?: S;
      disabled?: boolean;
      className?: string;
    } = {}
  ): string {
    const {
      variant = config.defaultVariant,
      size = config.defaultSize,
      disabled = false,
      className,
    } = options;

    return cn(
      config.base,
      variant && config.variants[variant],
      size && config.sizes[size],
      disabled && config.states?.disabled,
      className
    );
  };
}

/**
 * Button variant configuration
 *
 * Pre-configured variants for button components with enhanced color scheme
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8, 7.9, 7.10
 */
export const buttonVariants = createVariants({
  base: 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-primary active:scale-[0.98]',
  variants: {
    // Primary variant - vibrant blue with enhanced hover/active states (Req 7.1, 7.2, 7.3, 7.4, 7.10)
    primary: 'bg-primary-500 text-white shadow-md hover:brightness-110 hover:shadow-lg active:bg-primary-700 focus:ring-primary-500',
    
    // Secondary variant - subtle background with text emphasis (Req 7.1, 7.2, 7.3, 7.4, 7.10)
    secondary: 'bg-background-tertiary text-text-primary shadow-sm hover:brightness-110 hover:shadow-md active:bg-surface-overlay focus:ring-primary-500',
    
    // Outline variant - bordered with transparent background (Req 7.1, 7.2, 7.3, 7.4, 7.10)
    outline: 'border-2 border-primary-500 text-primary-500 bg-transparent hover:bg-primary-500/10 hover:brightness-110 active:bg-primary-500/20 focus:ring-primary-500',
    
    // Ghost variant - minimal styling, text-only appearance (Req 7.1, 7.2, 7.3, 7.4, 7.10)
    ghost: 'text-text-secondary bg-transparent hover:bg-background-tertiary hover:brightness-110 hover:text-text-primary active:bg-surface-elevated focus:ring-primary-500',
    
    // Danger variant - red for destructive actions (Req 7.1, 7.2, 7.3, 7.4, 7.7, 7.10)
    danger: 'bg-error-DEFAULT text-white shadow-md hover:brightness-110 hover:shadow-lg active:bg-error-dark/90 focus:ring-error-DEFAULT',
  } as Record<string, string>,
  sizes: {
    sm: 'px-3 py-1.5 text-sm min-h-[2.25rem] h-9 rounded-md',      // 36px height (Req 7.1)
    md: 'px-4 py-2 text-base min-h-[2.75rem] h-11 rounded-lg',     // 44px height (Req 7.1)
    lg: 'px-6 py-3 text-lg min-h-[3.25rem] h-13 rounded-lg',       // 52px height (Req 7.1)
    xl: 'px-8 py-4 text-xl min-h-[3.75rem] h-15 rounded-xl',       // 60px height (Req 7.1)
  } as Record<string, string>,
  states: {
    disabled: 'opacity-50 cursor-not-allowed pointer-events-none',  // Req 7.8 - 50% opacity and disabled cursor
  },
  defaultVariant: 'primary',
  defaultSize: 'md',
});

/**
 * Input variant configuration
 *
 * Pre-configured variants for input components with enhanced styling
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export const inputVariants = createVariants({
  base: 'rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-primary placeholder:text-text-tertiary',
  variants: {
    // Default variant - navy background with blue focus (Req 8.1, 8.2, 8.3)
    default:
      'border-border-DEFAULT bg-background-secondary text-text-primary focus:border-primary-500 focus:ring-primary-500/20',
    
    // Error variant - red border for validation errors (Req 8.4)
    error:
      'border-error-DEFAULT bg-background-secondary text-text-primary focus:border-error-DEFAULT focus:ring-error-DEFAULT/20',
    
    // Success variant - green border for successful validation (Req 8.10)
    success:
      'border-success-DEFAULT bg-background-secondary text-text-primary focus:border-success-DEFAULT focus:ring-success-DEFAULT/20',
  } as Record<string, string>,
  sizes: {
    sm: 'px-3 py-2 text-sm h-10',           // 40px height
    md: 'px-4 py-2.5 text-base h-11',       // 44px height (Req 8.1 - minimum touch target)
    lg: 'px-6 py-3 text-lg h-14',           // 56px height
  } as Record<string, string>,
  states: {
    disabled: 'opacity-50 cursor-not-allowed bg-background-secondary',
  },
  defaultVariant: 'default',
  defaultSize: 'md',
});

/**
 * Badge variant configuration
 *
 * Pre-configured variants for badge components with enhanced color scheme
 * Requirements: 14.1 - Status indicator colors (default, success, warning, error, info)
 */
export const badgeVariants = createVariants({
  base: 'inline-flex items-center font-medium rounded-full',
  variants: {
    // Default variant - neutral gray (Req 14.1)
    default: 'bg-secondary-200 text-secondary-800',
    
    // Primary variant - blue brand color (Req 14.1)
    primary: 'bg-primary-100 text-primary-800',
    
    // Success variant - green for positive status (Req 14.1)
    success: 'bg-success-100 text-success-800',
    
    // Warning variant - yellow/amber for caution (Req 14.1)
    warning: 'bg-warning-100 text-warning-800',
    
    // Error variant - red for errors/critical status (Req 14.1)
    error: 'bg-error-100 text-error-800',
    
    // Info variant - blue for informational status (Req 14.1)
    info: 'bg-info-100 text-info-800',
  } as Record<string, string>,
  sizes: {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  } as Record<string, string>,
  defaultVariant: 'default',
  defaultSize: 'md',
});

/**
 * Card variant configuration
 *
 * Pre-configured variants for card components
 */
export const cardVariants = createVariants({
  base: 'rounded-lg overflow-hidden',
  variants: {
    default: 'bg-surface border border-border',
    elevated: 'bg-surface shadow-md',
    outlined: 'bg-surface border-2 border-border',
    ghost: 'bg-transparent',
  } as Record<string, string>,
  sizes: {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  } as Record<string, string>,
  defaultVariant: 'default',
  defaultSize: 'md',
});

/**
 * Alert variant configuration
 *
 * Pre-configured variants for alert components
 */
export const alertVariants = createVariants({
  base: 'rounded-lg p-4 flex items-start gap-3',
  variants: {
    info: 'bg-info-50 border border-info-200 text-info-900',
    success: 'bg-success-50 border border-success-200 text-success-900',
    warning: 'bg-warning-50 border border-warning-200 text-warning-900',
    error: 'bg-error-50 border border-error-200 text-error-900',
  } as Record<string, string>,
  sizes: {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  } as Record<string, string>,
  defaultVariant: 'info',
  defaultSize: 'md',
});

import clsx, { ClassValue } from 'clsx';

/**
 * Utility function for conditionally joining classNames together.
 *
 * This is a wrapper around the `clsx` library that provides a convenient way
 * to combine multiple className strings, including conditional classes.
 *
 * @param classes - Class values to combine
 * @returns Combined className string
 *
 * @example
 * // Basic usage
 * cn('btn', 'btn-primary') // 'btn btn-primary'
 *
 * @example
 * // Conditional classes
 * cn('btn', isActive && 'btn-active') // 'btn btn-active' (if isActive is true)
 *
 * @example
 * // Multiple conditions
 * cn(
 *   'btn',
 *   isActive && 'btn-active',
 *   isDisabled && 'btn-disabled',
 *   size === 'large' && 'btn-lg'
 * )
 *
 * @example
 * // With arrays and objects
 * cn(
 *   'btn',
 *   ['btn-primary', 'btn-lg'],
 *   { 'btn-active': isActive, 'btn-disabled': isDisabled }
 * )
 */
export function cn(...classes: ClassValue[]): string {
  return clsx(classes);
}

/**
 * Alias for cn() - some developers prefer this name
 */
export const classNames = cn;

/**
 * Utility for merging Tailwind CSS classes with proper precedence.
 *
 * This function ensures that later classes override earlier ones,
 * which is important for Tailwind's utility-first approach.
 *
 * @param baseClasses - Base classes to apply
 * @param overrideClasses - Classes that should override base classes
 * @returns Merged className string
 *
 * @example
 * mergeClasses('p-4 bg-accent', 'p-6') // 'bg-accent p-6'
 * // The p-6 overrides p-4
 */
export function mergeClasses(baseClasses: string, overrideClasses?: string): string {
  if (!overrideClasses) return baseClasses;

  // Split classes into arrays
  const base = baseClasses.split(' ');
  const override = overrideClasses.split(' ');

  // Extract class prefixes (e.g., 'p-' from 'p-4')
  const getPrefix = (cls: string) => {
    const match = cls.match(/^([a-z-]+)-/);
    return match ? match[1] : cls;
  };

  // Get prefixes from override classes
  const overridePrefixes = new Set(override.map(getPrefix));

  // Filter out base classes that are overridden
  const filtered = base.filter((cls) => !overridePrefixes.has(getPrefix(cls)));

  // Combine filtered base classes with override classes
  return [...filtered, ...override].join(' ');
}

/**
 * Utility for creating variant-based className strings.
 *
 * This is useful for components that have multiple variants and sizes.
 *
 * @param base - Base classes that always apply
 * @param variants - Object mapping variant names to classes
 * @param activeVariant - The currently active variant
 * @returns Combined className string
 *
 * @example
 * const buttonClasses = variantClasses(
 *   'btn',
 *   {
 *     primary: 'bg-accent text-white',
 *     secondary: 'bg-gray-500 text-white',
 *     outline: 'border border-accent text-accent'
 *   },
 *   'primary'
 * );
 * // Result: 'btn bg-accent text-white'
 */
export function variantClasses<T extends string>(
  base: string,
  variants: Record<T, string>,
  activeVariant: T
): string {
  return cn(base, variants[activeVariant]);
}

/**
 * Utility for creating size-based className strings.
 *
 * @param base - Base classes that always apply
 * @param sizes - Object mapping size names to classes
 * @param activeSize - The currently active size
 * @returns Combined className string
 *
 * @example
 * const buttonClasses = sizeClasses(
 *   'btn',
 *   {
 *     sm: 'px-3 py-1.5 text-sm',
 *     md: 'px-4 py-2 text-base',
 *     lg: 'px-6 py-3 text-lg'
 *   },
 *   'md'
 * );
 * // Result: 'btn px-4 py-2 text-base'
 */
export function sizeClasses<T extends string>(
  base: string,
  sizes: Record<T, string>,
  activeSize: T
): string {
  return cn(base, sizes[activeSize]);
}

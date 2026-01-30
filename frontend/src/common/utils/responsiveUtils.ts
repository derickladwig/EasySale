/**
 * Responsive Layout Utilities
 *
 * This module provides utility classes and functions for responsive layouts,
 * text truncation, grid layouts, and aspect ratio handling.
 */

/**
 * Text truncation classes
 *
 * @example
 * <div className={truncateClasses.single}>Long text that will be truncated...</div>
 * <div className={truncateClasses.multi}>Long text that will be truncated after 2 lines...</div>
 */
export const truncateClasses = {
  /** Single line truncation with ellipsis */
  single: 'truncate overflow-hidden text-ellipsis whitespace-nowrap',

  /** Multi-line truncation (2 lines) */
  multi: 'line-clamp-2 overflow-hidden',

  /** Multi-line truncation (3 lines) */
  multiLarge: 'line-clamp-3 overflow-hidden',

  /** Multi-line truncation (4 lines) */
  multiXLarge: 'line-clamp-4 overflow-hidden',
} as const;

/**
 * Responsive grid column classes
 *
 * Automatically adjusts number of columns based on breakpoint:
 * - xs: 1 column
 * - sm: 2 columns
 * - md: 3 columns
 * - lg: 4 columns
 * - xl: 6 columns
 *
 * @example
 * <div className={gridColumns.responsive}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </div>
 */
export const gridColumns = {
  /** Responsive grid: 1 col (xs) → 2 cols (sm) → 3 cols (md) → 4 cols (lg) → 6 cols (xl) */
  responsive: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',

  /** Always 1 column */
  single: 'grid grid-cols-1',

  /** 1 col (xs) → 2 cols (sm+) */
  double: 'grid grid-cols-1 sm:grid-cols-2',

  /** 1 col (xs) → 2 cols (sm) → 3 cols (md+) */
  triple: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3',

  /** 1 col (xs) → 2 cols (sm) → 3 cols (md) → 4 cols (lg+) */
  quad: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',

  /** 1 col (xs) → 2 cols (sm) → 4 cols (md) → 6 cols (lg+) */
  six: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
} as const;

/**
 * Container max-width classes for ultrawide displays
 *
 * Prevents content from stretching too wide on large screens
 *
 * @example
 * <div className={containerMaxWidths.xl}>
 *   Content will be centered and max 1280px wide
 * </div>
 */
export const containerMaxWidths = {
  /** Max 640px */
  sm: 'max-w-screen-sm mx-auto',

  /** Max 768px */
  md: 'max-w-screen-md mx-auto',

  /** Max 1024px */
  lg: 'max-w-screen-lg mx-auto',

  /** Max 1280px */
  xl: 'max-w-screen-xl mx-auto',

  /** Max 1536px */
  '2xl': 'max-w-screen-2xl mx-auto',

  /** No max-width limit */
  full: 'max-w-full',
} as const;

/**
 * Aspect ratio utility classes
 *
 * Maintains specific aspect ratios for containers
 *
 * @example
 * <div className={aspectRatioClasses.video}>
 *   <img src="..." className="w-full h-full object-cover" />
 * </div>
 */
export const aspectRatioClasses = {
  /** 1:1 square */
  square: 'aspect-square',

  /** 16:9 video */
  video: 'aspect-video',

  /** 21:9 ultrawide */
  wide: 'aspect-[21/9]',

  /** 3:4 portrait */
  portrait: 'aspect-[3/4]',

  /** 4:3 standard */
  standard: 'aspect-[4/3]',
} as const;

/**
 * Responsive spacing classes
 *
 * Adjusts spacing based on breakpoint and density setting
 *
 * @example
 * <div className={responsiveSpacing.padding}>
 *   Content with responsive padding
 * </div>
 */
export const responsiveSpacing = {
  /** Responsive padding: 4 (xs) → 6 (md) → 8 (lg) */
  padding: 'p-4 md:p-6 lg:p-8',

  /** Responsive gap: 2 (xs) → 4 (md) → 6 (lg) */
  gap: 'gap-2 md:gap-4 lg:gap-6',

  /** Responsive margin: 4 (xs) → 6 (md) → 8 (lg) */
  margin: 'm-4 md:m-6 lg:m-8',

  /** Responsive vertical spacing: 4 (xs) → 6 (md) → 8 (lg) */
  vertical: 'space-y-4 md:space-y-6 lg:space-y-8',

  /** Responsive horizontal spacing: 4 (xs) → 6 (md) → 8 (lg) */
  horizontal: 'space-x-4 md:space-x-6 lg:space-x-8',
} as const;

/**
 * Touch target size classes
 *
 * Ensures interactive elements meet minimum touch target sizes
 *
 * @example
 * <button className={touchTargetClasses.minimum}>
 *   Tap me
 * </button>
 */
export const touchTargetClasses = {
  /** Minimum touch target (44x44px) */
  minimum: 'min-w-11 min-h-11',

  /** Primary action touch target (56x56px) */
  primary: 'min-w-14 min-h-14',

  /** Touch-friendly padding */
  padding: 'p-3',

  /** Touch-friendly gap between elements */
  gap: 'gap-2',
} as const;

/**
 * Responsive text size classes
 *
 * Adjusts text size based on breakpoint
 *
 * @example
 * <h1 className={responsiveTextSize.heading}>
 *   Responsive Heading
 * </h1>
 */
export const responsiveTextSize = {
  /** Heading: 2xl (xs) → 3xl (md) → 4xl (lg) */
  heading: 'text-2xl md:text-3xl lg:text-4xl',

  /** Subheading: xl (xs) → 2xl (md) → 3xl (lg) */
  subheading: 'text-xl md:text-2xl lg:text-3xl',

  /** Body: base (xs) → lg (md) */
  body: 'text-base md:text-lg',

  /** Small: sm (xs) → base (md) */
  small: 'text-sm md:text-base',
} as const;

/**
 * Responsive layout classes for common patterns
 *
 * @example
 * <div className={responsiveLayout.stack}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </div>
 */
export const responsiveLayout = {
  /** Stack vertically on mobile, horizontal on desktop */
  stack: 'flex flex-col md:flex-row',

  /** Stack horizontally on mobile, vertical on desktop (reverse) */
  stackReverse: 'flex flex-col-reverse md:flex-row-reverse',

  /** Center content */
  center: 'flex items-center justify-center',

  /** Space between items */
  spaceBetween: 'flex items-center justify-between',

  /** Wrap items */
  wrap: 'flex flex-wrap',
} as const;

/**
 * Helper function to combine multiple class strings
 *
 * @example
 * const classes = cn('base-class', condition && 'conditional-class', 'another-class');
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Helper function to get responsive grid columns based on item count
 *
 * @param itemCount - Number of items to display
 * @returns Tailwind grid class string
 *
 * @example
 * const gridClass = getResponsiveGridColumns(8);
 * // Returns: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
 */
export function getResponsiveGridColumns(itemCount: number): string {
  if (itemCount <= 1) return gridColumns.single;
  if (itemCount <= 2) return gridColumns.double;
  if (itemCount <= 3) return gridColumns.triple;
  if (itemCount <= 4) return gridColumns.quad;
  return gridColumns.responsive;
}

/**
 * Helper function to calculate optimal columns for a given width
 *
 * @param containerWidth - Width of the container in pixels
 * @param minItemWidth - Minimum width of each item in pixels
 * @returns Number of columns that fit
 *
 * @example
 * const columns = calculateOptimalColumns(1200, 300);
 * // Returns: 4 (1200 / 300 = 4 columns)
 */
export function calculateOptimalColumns(containerWidth: number, minItemWidth: number): number {
  return Math.max(1, Math.floor(containerWidth / minItemWidth));
}

/**
 * Helper function to check if viewport is at minimum dimensions
 *
 * @returns true if viewport is at or below minimum dimensions (320x480)
 */
export function isMinimumViewport(): boolean {
  return window.innerWidth <= 320 || window.innerHeight <= 480;
}

/**
 * Helper function to check if device is touch-capable
 *
 * @returns true if device supports touch input
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}

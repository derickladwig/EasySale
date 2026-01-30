import React from 'react';
import { cn } from '../../utils/classNames';

/**
 * Grid Component
 * 
 * A responsive grid layout component that adapts to different screen sizes.
 * 
 * Features:
 * - Responsive column counts (1 on mobile, 2 on tablet, 3+ on desktop)
 * - Consistent gaps (16px on mobile, 24px on desktop)
 * - Auto-fit for flexible layouts
 * - Minimum and maximum column widths
 * - Vertical stacking on narrow screens (<640px)
 * - Aspect-ratio support for consistent card heights
 * - Prevents horizontal scrolling at all breakpoints
 * - Centers content on ultrawide displays with max-width constraints
 * - Follows design system color scheme and spacing
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
 */

export interface GridProps {
  /** Child elements to render in the grid */
  children: React.ReactNode;
  
  /** Number of columns on desktop (default: 3) */
  columns?: 1 | 2 | 3 | 4 | 6;
  
  /** Use auto-fit for flexible layouts (default: false) */
  autoFit?: boolean;
  
  /** Minimum column width for auto-fit (default: 250px) */
  minColumnWidth?: 'sm' | 'md' | 'lg';
  
  /** Maximum column width (optional, for constraining column size) */
  maxColumnWidth?: string;
  
  /** Custom gap size (overrides responsive defaults) */
  gap?: 'sm' | 'md' | 'lg' | 'responsive';
  
  /** Aspect ratio for grid items (for consistent card heights) */
  aspectRatio?: 'square' | 'video' | 'portrait' | 'photo' | 'auto' | string;
  
  /** Center content on ultrawide displays with max-width constraint (default: false) */
  centerOnUltrawide?: boolean;
  
  /** Maximum width for ultrawide centering (default: '1536px' / screen-2xl) */
  maxWidth?: 'screen-sm' | 'screen-md' | 'screen-lg' | 'screen-xl' | 'screen-2xl' | string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Grid component for responsive layouts
 * 
 * @example
 * // Basic 3-column grid (1 on mobile, 2 on tablet, 3 on desktop)
 * <Grid>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * 
 * @example
 * // Auto-fit grid with minimum column width
 * <Grid autoFit minColumnWidth="md">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * 
 * @example
 * // 4-column grid on desktop
 * <Grid columns={4}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 *   <Card>Item 4</Card>
 * </Grid>
 * 
 * @example
 * // Grid with consistent card heights using aspect ratio
 * <Grid aspectRatio="video">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * 
 * @example
 * // Auto-fit grid with max column width constraint
 * <Grid autoFit minColumnWidth="md" maxColumnWidth="400px">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 * </Grid>
 * 
 * @example
 * // Grid centered on ultrawide displays
 * <Grid centerOnUltrawide maxWidth="screen-xl">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 */
export const Grid: React.FC<GridProps> = ({
  children,
  columns = 3,
  autoFit = false,
  minColumnWidth = 'md',
  maxColumnWidth,
  gap = 'responsive',
  aspectRatio,
  centerOnUltrawide = false,
  maxWidth = 'screen-2xl',
  className,
  'data-testid': dataTestId,
}) => {
  // Determine grid column classes based on columns prop
  // Requirement 5.1: Responsive column counts (1 on mobile, 2 on tablet, 3+ on desktop)
  // Requirement 5.6: Stack vertically on narrow screens (<640px)
  const getColumnClasses = () => {
    if (autoFit) {
      // Requirement 5.4: Use auto-fit for flexible layouts
      // Requirement 5.5: Define minimum and maximum column widths
      const minWidthMap = {
        sm: 'grid-auto-fit-sm',  // 200px min
        md: 'grid-auto-fit',     // 250px min
        lg: 'grid-auto-fit-lg',  // 350px min
      };
      return minWidthMap[minColumnWidth];
    }
    
    // Responsive column classes from Tailwind config
    // These automatically stack vertically on narrow screens (<640px)
    const columnMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-responsive-2',  // 1 on mobile, 2 on tablet+
      3: 'grid-cols-responsive',    // 1 on mobile, 2 on tablet, 3 on desktop
      4: 'grid-cols-responsive-4',  // 1 on mobile, 2 on tablet, 4 on desktop
      6: 'grid-cols-responsive-6',  // 2 on mobile, 3 on tablet, 6 on desktop
    };
    
    return columnMap[columns];
  };
  
  // Determine gap classes
  // Requirement 5.2: Consistent gaps (16px on mobile, 24px on desktop)
  const getGapClasses = () => {
    const gapMap = {
      sm: 'gap-2',           // 8px
      md: 'gap-4',           // 16px
      lg: 'gap-6',           // 24px
      responsive: 'gap-responsive', // 16px mobile, 24px desktop
    };
    
    return gapMap[gap];
  };
  
  // Determine aspect ratio classes
  // Requirement 5.7: Use aspect-ratio for consistent card heights
  // Requirement 5.10: Balance heights for varying content
  const getAspectRatioClasses = () => {
    if (!aspectRatio || aspectRatio === 'auto') {
      return '';
    }
    
    // Map common aspect ratios to Tailwind classes
    const aspectRatioMap: Record<string, string> = {
      square: 'aspect-square',
      video: 'aspect-video',
      portrait: 'aspect-portrait',
      photo: 'aspect-photo',
    };
    
    return aspectRatioMap[aspectRatio] || '';
  };
  
  // Determine max-width classes for ultrawide centering
  // Requirement 5.9: Center content on ultrawide displays with max-width constraints
  const getMaxWidthClasses = () => {
    if (!centerOnUltrawide) {
      return '';
    }
    
    // Map max-width presets to Tailwind classes
    const maxWidthMap: Record<string, string> = {
      'screen-sm': 'max-w-screen-sm',   // 640px
      'screen-md': 'max-w-screen-md',   // 768px
      'screen-lg': 'max-w-screen-lg',   // 1024px
      'screen-xl': 'max-w-screen-xl',   // 1280px
      'screen-2xl': 'max-w-screen-2xl', // 1536px
    };
    
    // If it's a preset, use the Tailwind class
    if (maxWidthMap[maxWidth]) {
      return maxWidthMap[maxWidth];
    }
    
    // Otherwise, it's a custom value that will be handled in inline styles
    return '';
  };
  
  // Build inline styles for custom max column width and custom max-width
  // Requirement 5.5: Define minimum and maximum column widths
  // Requirement 5.9: Center content on ultrawide displays
  const getGridStyle = (): React.CSSProperties | undefined => {
    const styles: React.CSSProperties = {};
    
    // Handle custom max column width for auto-fit grids
    if (autoFit && maxColumnWidth) {
      const minWidthMap = {
        sm: '200px',
        md: '250px',
        lg: '350px',
      };
      const minWidth = minWidthMap[minColumnWidth];
      
      styles.gridTemplateColumns = `repeat(auto-fit, minmax(${minWidth}, min(${maxColumnWidth}, 1fr)))`;
    }
    
    // Handle custom max-width for ultrawide centering
    if (centerOnUltrawide && !maxWidth.startsWith('screen-')) {
      styles.maxWidth = maxWidth;
    }
    
    return Object.keys(styles).length > 0 ? styles : undefined;
  };
  
  const aspectRatioClass = getAspectRatioClasses();
  const maxWidthClass = getMaxWidthClasses();
  
  // Requirement 5.3: Prevent horizontal scrolling at all breakpoints
  // Requirement 5.8: Layouts reflow without content jumping
  // Requirement 5.9: Center content on ultrawide displays
  return (
    <div
      className={cn(
        'grid',
        getColumnClasses(),
        getGapClasses(),
        // Prevent horizontal overflow
        'w-full overflow-x-hidden',
        // Center on ultrawide displays if enabled
        centerOnUltrawide && 'mx-auto',
        maxWidthClass,
        className
      )}
      style={getGridStyle()}
      data-testid={dataTestId}
    >
      {aspectRatio && aspectRatio !== 'auto' ? (
        // Wrap children in aspect-ratio containers
        React.Children.map(children, (child, index) => (
          <div key={index} className={aspectRatioClass}>
            {child}
          </div>
        ))
      ) : (
        children
      )}
    </div>
  );
};

Grid.displayName = 'Grid';

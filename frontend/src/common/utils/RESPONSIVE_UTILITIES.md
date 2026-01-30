# Responsive Utilities Documentation

This document describes the responsive layout utilities available in the EasySale design system.

## Overview

The responsive utilities provide pre-configured Tailwind CSS class combinations for common responsive patterns. These utilities ensure consistent responsive behavior across the application while maintaining layout stability at all viewport sizes.

## Text Truncation

### Single Line Truncation

```tsx
import { truncateClasses } from '@/common/utils/responsiveUtils';

<div className={truncateClasses.single}>
  This is a very long text that will be truncated with an ellipsis...
</div>
```

### Multi-Line Truncation

```tsx
<div className={truncateClasses.multi}>
  This text will be truncated after 2 lines with an ellipsis...
</div>

<div className={truncateClasses.multiLarge}>
  This text will be truncated after 3 lines with an ellipsis...
</div>
```

## Responsive Grid Layouts

### Automatic Responsive Grid

```tsx
import { gridColumns } from '@/common/utils/responsiveUtils';

<div className={gridColumns.responsive}>
  {/* 1 col (xs) → 2 cols (sm) → 3 cols (md) → 4 cols (lg) → 6 cols (xl) */}
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Fixed Column Grids

```tsx
// Always 2 columns on sm and above
<div className={gridColumns.double}>
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// 1 → 2 → 3 columns
<div className={gridColumns.triple}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Dynamic Grid Based on Item Count

```tsx
import { getResponsiveGridColumns } from '@/common/utils/responsiveUtils';

const items = [1, 2, 3, 4, 5, 6, 7, 8];
const gridClass = getResponsiveGridColumns(items.length);

<div className={gridClass}>
  {items.map(item => <div key={item}>Item {item}</div>)}
</div>
```

## Container Max-Widths

Prevent content from stretching too wide on ultrawide displays:

```tsx
import { containerMaxWidths } from '@/common/utils/responsiveUtils';

<div className={containerMaxWidths.xl}>
  {/* Content will be centered and max 1280px wide */}
  <h1>Page Title</h1>
  <p>Content...</p>
</div>
```

## Aspect Ratios

Maintain specific aspect ratios for containers:

```tsx
import { aspectRatioClasses } from '@/common/utils/responsiveUtils';

// 16:9 video container
<div className={aspectRatioClasses.video}>
  <img src="..." className="w-full h-full object-cover" />
</div>

// Square container
<div className={aspectRatioClasses.square}>
  <img src="..." className="w-full h-full object-cover" />
</div>
```

## Responsive Spacing

Adjust spacing based on breakpoint:

```tsx
import { responsiveSpacing } from '@/common/utils/responsiveUtils';

// Responsive padding
<div className={responsiveSpacing.padding}>
  {/* 16px (xs) → 24px (md) → 32px (lg) */}
  Content
</div>

// Responsive gap
<div className={`flex ${responsiveSpacing.gap}`}>
  {/* 8px (xs) → 16px (md) → 24px (lg) */}
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## Touch Target Sizes

Ensure interactive elements meet minimum touch target sizes:

```tsx
import { touchTargetClasses } from '@/common/utils/responsiveUtils';

// Minimum touch target (44x44px)
<button className={touchTargetClasses.minimum}>
  Tap me
</button>

// Primary action touch target (56x56px)
<button className={touchTargetClasses.primary}>
  Primary Action
</button>

// Touch-friendly spacing
<div className={`flex ${touchTargetClasses.gap}`}>
  <button>Button 1</button>
  <button>Button 2</button>
</div>
```

## Responsive Text Sizes

Adjust text size based on breakpoint:

```tsx
import { responsiveTextSize } from '@/common/utils/responsiveUtils';

<h1 className={responsiveTextSize.heading}>
  {/* 24px (xs) → 30px (md) → 36px (lg) */}
  Page Heading
</h1>

<p className={responsiveTextSize.body}>
  {/* 16px (xs) → 18px (md) */}
  Body text
</p>
```

## Responsive Layout Patterns

Common layout patterns that adapt to screen size:

```tsx
import { responsiveLayout } from '@/common/utils/responsiveUtils';

// Stack vertically on mobile, horizontal on desktop
<div className={responsiveLayout.stack}>
  <div>Sidebar</div>
  <div>Main Content</div>
</div>

// Center content
<div className={responsiveLayout.center}>
  <div>Centered Content</div>
</div>

// Space between items
<div className={responsiveLayout.spaceBetween}>
  <div>Left</div>
  <div>Right</div>
</div>
```

## Utility Functions

### Combine Classes

```tsx
import { cn } from '@/common/utils/responsiveUtils';

const isActive = true;
const className = cn(
  'base-class',
  isActive && 'active-class',
  'another-class'
);
// Result: 'base-class active-class another-class'
```

### Calculate Optimal Columns

```tsx
import { calculateOptimalColumns } from '@/common/utils/responsiveUtils';

const containerWidth = 1200;
const minItemWidth = 300;
const columns = calculateOptimalColumns(containerWidth, minItemWidth);
// Result: 4 columns
```

### Check Minimum Viewport

```tsx
import { isMinimumViewport } from '@/common/utils/responsiveUtils';

if (isMinimumViewport()) {
  // Viewport is at or below 320x480
  // Show simplified UI
}
```

### Check Touch Device

```tsx
import { isTouchDevice } from '@/common/utils/responsiveUtils';

if (isTouchDevice()) {
  // Device supports touch input
  // Use touch-optimized interactions
}
```

## Best Practices

### 1. Use Responsive Utilities Over Custom Classes

❌ **Don't:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
```

✅ **Do:**
```tsx
<div className={gridColumns.quad}>
```

### 2. Combine Utilities with cn()

❌ **Don't:**
```tsx
<div className={`${baseClass} ${isActive ? activeClass : ''} ${otherClass}`}>
```

✅ **Do:**
```tsx
<div className={cn(baseClass, isActive && activeClass, otherClass)}>
```

### 3. Use Touch Target Classes for Interactive Elements

❌ **Don't:**
```tsx
<button className="w-8 h-8">
  {/* Too small for touch */}
</button>
```

✅ **Do:**
```tsx
<button className={touchTargetClasses.minimum}>
  {/* Meets 44x44px minimum */}
</button>
```

### 4. Prevent Content Overflow on Ultrawide Displays

❌ **Don't:**
```tsx
<div className="w-full">
  {/* Content stretches to full width on 4K displays */}
</div>
```

✅ **Do:**
```tsx
<div className={containerMaxWidths.xl}>
  {/* Content is centered and max 1280px wide */}
</div>
```

### 5. Use Responsive Spacing for Consistent Layouts

❌ **Don't:**
```tsx
<div className="p-4">
  {/* Same padding on all screen sizes */}
</div>
```

✅ **Do:**
```tsx
<div className={responsiveSpacing.padding}>
  {/* Padding adapts to screen size */}
</div>
```

## Breakpoint Reference

| Breakpoint | Min Width | Device Type |
|------------|-----------|-------------|
| xs | 0px | Extra small phones |
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Desktops |
| xl | 1280px | Large desktops |
| 2xl | 1536px | Ultra-wide displays |

## Aspect Ratio Reference

| Ratio | Value | Common Use |
|-------|-------|------------|
| portrait | 3:4 | Portrait images |
| square | 1:1 | Profile pictures, icons |
| standard | 4:3 | Standard displays |
| video | 16:9 | Videos, modern displays |
| wide | 21:9 | Ultrawide displays |

## Touch Target Reference

| Size | Dimensions | Use Case |
|------|------------|----------|
| minimum | 44x44px | All interactive elements |
| primary | 56x56px | Primary actions, important buttons |

## Related Documentation

- [Design Tokens](../../tailwind.config.js) - Complete design token system
- [useResponsive Hook](../hooks/useResponsive.ts) - Responsive state management
- [useDisplaySettings Hook](../hooks/useDisplaySettings.ts) - User display preferences

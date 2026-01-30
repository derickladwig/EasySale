# Typography Tokens - Usage Guide

This document describes the enhanced typography tokens added to the Tailwind configuration as part of task 1.3 (UI Enhancement spec).

## Overview

The typography system has been enhanced to provide:
- Clear heading hierarchy (h1: 36px, h2: 30px, h3: 24px, h4: 20px)
- Consistent line heights (1.5 for body text, 1.2 for headings)
- Appropriate font weights (400 for body, 600 for headings)
- Tabular number utilities for prices and quantities

## Font Size Scale

### Body Text Sizes (line-height: 1.5)

```jsx
<p className="text-xs">Extra small text (12px)</p>
<p className="text-sm">Small text (14px)</p>
<p className="text-base">Base text (16px) - Default body text</p>
<p className="text-lg">Large text (18px)</p>
```

### Heading Sizes (line-height: 1.2)

```jsx
<h1 className="text-h1 font-semibold">Heading 1 (36px)</h1>
<h2 className="text-h2 font-semibold">Heading 2 (30px)</h2>
<h3 className="text-h3 font-semibold">Heading 3 (24px)</h3>
<h4 className="text-h4 font-semibold">Heading 4 (20px)</h4>
```

### Display Sizes

```jsx
<div className="text-xl">Extra large (20px)</div>
<div className="text-2xl">2X large (24px)</div>
<div className="text-3xl">3X large (30px)</div>
<div className="text-4xl">4X large (36px)</div>
<div className="text-5xl">5X large (48px)</div>
<div className="text-6xl">6X large (60px)</div>
<div className="text-7xl">7X large (72px)</div>
```

## Font Weights

### Body Text (Default: 400)

```jsx
<p className="font-normal">Normal body text (400)</p>
<p className="font-medium">Medium emphasis (500)</p>
```

### Headings (Default: 600)

```jsx
<h1 className="font-semibold">Semibold heading (600)</h1>
<h2 className="font-bold">Bold heading (700)</h2>
```

### All Available Weights

- `font-thin` (100)
- `font-extralight` (200)
- `font-light` (300)
- `font-normal` (400) - Body text default
- `font-medium` (500)
- `font-semibold` (600) - Heading default
- `font-bold` (700)
- `font-extrabold` (800)
- `font-black` (900)

## Tabular Numbers

Use tabular numbers for prices, quantities, and other numeric data that should align vertically in tables or lists.

### Usage

```jsx
// For prices and quantities (monospaced numbers)
<span className="font-tabular-nums">$1,234.56</span>
<span className="font-tabular-nums">Qty: 42</span>

// For regular text with numbers (proportional spacing)
<span className="font-proportional-nums">Order #12345</span>
```

### Example: Price Table

```jsx
<table>
  <tbody>
    <tr>
      <td>Product A</td>
      <td className="font-tabular-nums text-right">$1,234.56</td>
    </tr>
    <tr>
      <td>Product B</td>
      <td className="font-tabular-nums text-right">$89.99</td>
    </tr>
    <tr>
      <td>Product C</td>
      <td className="font-tabular-nums text-right">$12,345.67</td>
    </tr>
  </tbody>
</table>
```

The numbers will align perfectly in the right column because they all have the same width.

## Complete Typography Example

```jsx
function ProductCard({ product }) {
  return (
    <div className="p-6 bg-background-secondary rounded-lg">
      {/* Heading with semibold weight */}
      <h3 className="text-h3 font-semibold text-text-primary mb-2">
        {product.name}
      </h3>
      
      {/* Body text with normal weight */}
      <p className="text-base font-normal text-text-secondary mb-4">
        {product.description}
      </p>
      
      {/* Price with tabular numbers */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-normal text-text-tertiary">Price:</span>
        <span className="text-h4 font-semibold text-primary-500 font-tabular-nums">
          ${product.price.toFixed(2)}
        </span>
      </div>
      
      {/* Quantity with tabular numbers */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm font-normal text-text-tertiary">In Stock:</span>
        <span className="text-base font-medium font-tabular-nums">
          {product.quantity}
        </span>
      </div>
    </div>
  );
}
```

## Requirements Satisfied

- ✅ **Requirement 16.1**: System font stack for optimal performance (inherited from base config)
- ✅ **Requirement 16.2**: Clear heading hierarchy (h1: 36px, h2: 30px, h3: 24px, h4: 20px)
- ✅ **Requirement 16.3**: Consistent line heights (1.5 for body, 1.2 for headings)
- ✅ **Requirement 16.4**: Appropriate font weights (400 for body, 600 for headings)
- ✅ **Requirement 16.7**: Tabular numbers for prices and quantities

## Migration Guide

If you have existing code using the old font size classes, here's how to migrate:

### Before (Old Classes)

```jsx
<h1 className="text-4xl">Heading</h1>  // 36px but wrong line-height
<h2 className="text-3xl">Heading</h2>  // 30px but wrong line-height
```

### After (New Classes)

```jsx
<h1 className="text-h1 font-semibold">Heading</h1>  // 36px with 1.2 line-height
<h2 className="text-h2 font-semibold">Heading</h2>  // 30px with 1.2 line-height
```

### For Prices and Quantities

```jsx
// Before
<span className="text-lg">${price}</span>

// After
<span className="text-lg font-tabular-nums">${price}</span>
```

## Notes

- The `text-h1`, `text-h2`, `text-h3`, and `text-h4` classes are specifically designed for headings with the correct line-height (1.2)
- Always use `font-semibold` (600) with heading classes for consistency
- Always use `font-tabular-nums` for numeric data in tables, prices, and quantities
- Body text should use `font-normal` (400) by default
- The line-height values are optimized for readability and visual hierarchy

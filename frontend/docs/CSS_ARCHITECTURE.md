# CSS Architecture Guide

This guide covers CSS patterns, Tailwind usage, and styling best practices for the EasySale design system.

## Tailwind CSS First

The design system uses Tailwind CSS as the primary styling solution. Use Tailwind utility classes for all styling whenever possible.

### Why Tailwind?

- **Consistency**: Design tokens are enforced through Tailwind config
- **Performance**: Unused styles are purged in production
- **Developer Experience**: No context switching between files
- **Maintainability**: Styles are colocated with components
- **Responsive**: Built-in responsive modifiers

## Tailwind Usage Patterns

### Basic Styling

```typescript
// ✅ Good: Use Tailwind utilities
<div className="flex items-center gap-4 p-4 bg-dark-800 rounded-lg">

// ❌ Bad: Inline styles
<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
```

### Conditional Classes

Use the `cn()` utility for conditional classes:

```typescript
import { cn } from '../../utils/classNames';

<button
  className={cn(
    'px-4 py-2 rounded-lg font-medium transition-colors',
    variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700',
    variant === 'secondary' && 'bg-dark-700 text-dark-100 hover:bg-dark-600',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  )}
>
```

### Responsive Modifiers

```typescript
<div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8">
```

### State Modifiers

```typescript
<button className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50">
```

### Dark Mode (Not Used)

The design system uses a dark theme by default. Do not use `dark:` modifiers:

```typescript
// ❌ Bad: Don't use dark mode modifiers
<div className="bg-white dark:bg-dark-900">

// ✅ Good: Use dark colors directly
<div className="bg-dark-900">
```

## When to Use Custom CSS

Use custom CSS only for:

1. **Complex animations** that can't be achieved with Tailwind
2. **Print styles** for receipts, labels, and reports
3. **Browser-specific fixes** for edge cases
4. **Global styles** that apply to the entire app

### Custom CSS File Structure

```
src/styles/
├── index.css          # Main entry point
├── base.css           # Base styles and resets
├── print.css          # Print styles
└── animations.css     # Custom animations
```

## Custom CSS Patterns

### Using @apply

Use `@apply` sparingly for repeated patterns:

```css
/* ✅ Good: Repeated pattern */
.custom-scrollbar {
  @apply scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800;
}

/* ❌ Bad: Single-use pattern */
.button-primary {
  @apply px-4 py-2 bg-primary-600 text-white rounded-lg;
}
```

### Custom Properties for Dynamic Values

Use CSS custom properties for values that change dynamically:

```css
:root {
  --text-scale: 1;
  --density-scale: 1;
  --sidebar-width: 280px;
}

.scaled-text {
  font-size: calc(1rem * var(--text-scale));
}

.scaled-padding {
  padding: calc(1rem * var(--density-scale));
}
```

### Component-Specific Styles

If a component needs custom CSS, create a separate file:

```typescript
// Component.tsx
import './Component.css';

export const Component = () => {
  return <div className="custom-component">...</div>;
};
```

```css
/* Component.css */
.custom-component {
  /* Custom styles that can't be achieved with Tailwind */
  animation: custom-animation 0.3s ease-out;
}

@keyframes custom-animation {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

## Naming Conventions

### Tailwind Classes

Use Tailwind's naming conventions:
- `bg-*` for backgrounds
- `text-*` for text colors and sizes
- `p-*`, `m-*` for padding and margin
- `w-*`, `h-*` for width and height
- `flex`, `grid` for layout
- `rounded-*` for border radius
- `shadow-*` for shadows

### Custom Classes

Use **kebab-case** for custom classes:

```css
/* ✅ Good */
.custom-scrollbar { }
.data-table-header { }
.modal-backdrop { }

/* ❌ Bad */
.customScrollbar { }
.DataTableHeader { }
.modal_backdrop { }
```

### BEM Naming (If Needed)

For complex components, use BEM naming:

```css
.data-table { }
.data-table__header { }
.data-table__row { }
.data-table__cell { }
.data-table__row--selected { }
.data-table__cell--sortable { }
```

## Design Tokens

All design tokens are defined in `tailwind.config.js`:

### Colors

```typescript
// Use design token colors
<div className="bg-dark-900 text-dark-100">

// Don't use arbitrary colors
<div className="bg-[#0f172a] text-[#f1f5f9]">
```

### Spacing

```typescript
// Use spacing scale (4px base unit)
<div className="p-4 gap-4"> // 16px

// Don't use arbitrary values
<div className="p-[16px] gap-[16px]">
```

### Typography

```typescript
// Use typography scale
<h1 className="text-3xl font-bold">

// Don't use arbitrary sizes
<h1 className="text-[30px] font-[700]">
```

### Shadows

```typescript
// Use shadow tokens
<div className="shadow-md">

// Don't use arbitrary shadows
<div className="shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
```

## Layout Patterns

### Flexbox

```typescript
// Horizontal layout
<div className="flex items-center gap-4">

// Vertical layout
<div className="flex flex-col gap-4">

// Centered layout
<div className="flex items-center justify-center">

// Space between
<div className="flex items-center justify-between">
```

### Grid

```typescript
// Auto-fit grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Fixed columns
<div className="grid grid-cols-3 gap-4">
```

### Positioning

```typescript
// Absolute positioning
<div className="relative">
  <div className="absolute top-0 right-0">

// Fixed positioning
<div className="fixed top-0 left-0 right-0">

// Sticky positioning
<div className="sticky top-0">
```

## Animation Patterns

### Transitions

```typescript
// Basic transition
<button className="transition-colors duration-200">

// Multiple properties
<button className="transition-all duration-300 ease-in-out">

// Custom timing
<button className="transition-transform duration-500 ease-out">
```

### Animations

```typescript
// Built-in animations
<div className="animate-spin">
<div className="animate-pulse">
<div className="animate-bounce">

// Custom animations (defined in tailwind.config.js)
<div className="animate-slide-in">
<div className="animate-fade-in">
```

### Reduced Motion

Respect user preferences for reduced motion:

```typescript
// Automatically handled by animations.ts utility
import { getAnimationDuration } from '../../utils/animations';

const duration = getAnimationDuration('normal'); // Returns 0 if reduced motion
```

## Responsive Patterns

### Mobile-First

```typescript
// ✅ Good: Mobile-first
<div className="text-sm md:text-base lg:text-lg">

// ❌ Bad: Desktop-first
<div className="text-lg md:text-base sm:text-sm">
```

### Breakpoint-Specific Styles

```typescript
<div className="
  p-4 md:p-6 lg:p-8
  text-sm md:text-base lg:text-lg
  flex-col md:flex-row
">
```

### Container Queries (Future)

Container queries are not yet widely supported. Use breakpoints for now:

```typescript
// Current approach
<div className="grid grid-cols-1 md:grid-cols-2">

// Future approach (when supported)
<div className="@container">
  <div className="grid grid-cols-1 @md:grid-cols-2">
</div>
```

## Performance Optimization

### Purging Unused Styles

Tailwind automatically purges unused styles in production. Ensure all class names are complete strings:

```typescript
// ✅ Good: Complete class names
<div className="bg-primary-600">
<div className={variant === 'primary' ? 'bg-primary-600' : 'bg-secondary-600'}>

// ❌ Bad: Dynamic class names (won't be purged correctly)
<div className={`bg-${color}-600`}>
```

### Critical CSS

Critical CSS is automatically extracted by Vite. No additional configuration needed.

### CSS-in-JS (Not Used)

The design system does not use CSS-in-JS libraries (styled-components, emotion, etc.). Use Tailwind instead.

## Accessibility

### Focus Indicators

Always provide visible focus indicators:

```typescript
<button className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
```

### Color Contrast

Ensure sufficient color contrast (see `COLOR_CONTRAST.md`):

```typescript
// ✅ Good: High contrast
<div className="bg-dark-900 text-dark-100">

// ❌ Bad: Low contrast
<div className="bg-dark-900 text-dark-600">
```

### Screen Reader Only

Use `sr-only` for screen reader only content:

```typescript
<span className="sr-only">Loading...</span>
<div className="animate-spin" aria-hidden="true">
```

## Print Styles

Print styles are defined in `src/styles/print.css`:

```css
@media print {
  /* Hide UI elements */
  .no-print {
    display: none !important;
  }

  /* Receipt styles */
  .receipt {
    width: 80mm;
    font-size: 12px;
  }

  /* Label styles */
  .label {
    width: 4in;
    height: 2in;
  }
}
```

Use print-specific classes:

```typescript
<nav className="no-print">
<div className="print:hidden">
<div className="hidden print:block">
```

## Common Patterns

### Card Component

```typescript
<div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
```

### Button Component

```typescript
<button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 transition-colors">
```

### Input Component

```typescript
<input className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors">
```

### Modal Backdrop

```typescript
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
```

### Loading Spinner

```typescript
<div className="animate-spin rounded-full h-8 w-8 border-4 border-dark-700 border-t-primary-500">
```

## Debugging Tips

### Tailwind IntelliSense

Install the Tailwind CSS IntelliSense extension for VS Code:
- Autocomplete for class names
- Hover to see CSS values
- Linting for invalid classes

### DevTools

Use browser DevTools to inspect computed styles:
1. Right-click element → Inspect
2. View computed styles in Styles panel
3. Toggle classes to test changes

### Tailwind Play

Use [Tailwind Play](https://play.tailwindcss.com/) to prototype styles quickly.

## Checklist for Styling

Before submitting styled components, ensure:

- [ ] Uses Tailwind utility classes whenever possible
- [ ] Uses design token colors (no arbitrary colors)
- [ ] Uses spacing scale (no arbitrary spacing)
- [ ] Uses typography scale (no arbitrary font sizes)
- [ ] Responsive at all breakpoints
- [ ] Accessible (focus indicators, color contrast)
- [ ] Respects reduced motion preferences
- [ ] No inline styles
- [ ] No CSS-in-JS
- [ ] Custom CSS only when necessary
- [ ] Print styles if applicable

## Getting Help

- Review existing components for styling patterns
- Check Tailwind CSS documentation
- Use Tailwind IntelliSense for autocomplete
- Ask in team chat for guidance

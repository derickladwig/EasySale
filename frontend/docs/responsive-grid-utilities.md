# Responsive Grid Utilities

This document describes the responsive grid utilities added to the Tailwind configuration as part of Task 2.2 of the UI Enhancement spec.

## Overview

The responsive grid utilities provide a consistent way to create responsive layouts that adapt to different screen sizes. These utilities follow the design system's breakpoints and spacing scale.

## Breakpoints

- **Mobile**: < 768px (xs, sm)
- **Tablet**: 768px - 1024px (md)
- **Desktop**: ≥ 1024px (lg, xl, 2xl)

## Responsive Column Count Classes

These classes automatically adjust the number of grid columns based on screen size.

### `.grid-cols-responsive`
Default responsive grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)

```tsx
<div className="grid grid-cols-responsive gap-responsive">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### `.grid-cols-responsive-2`
Two-column responsive grid: 1 column (mobile) → 2 columns (tablet+)

```tsx
<div className="grid grid-cols-responsive-2 gap-responsive">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### `.grid-cols-responsive-4`
Four-column responsive grid: 1 column (mobile) → 2 columns (tablet) → 4 columns (desktop)

```tsx
<div className="grid grid-cols-responsive-4 gap-responsive">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

### `.grid-cols-responsive-6`
Six-column responsive grid: 2 columns (mobile) → 3 columns (tablet) → 6 columns (desktop)

```tsx
<div className="grid grid-cols-responsive-6 gap-responsive">
  {/* 6 items */}
</div>
```

## Auto-Fit Grid Classes

These classes use CSS Grid's `auto-fit` feature to automatically fit as many columns as possible based on minimum column width.

### `.grid-auto-fit-sm`
Auto-fit with minimum column width of 200px

### `.grid-auto-fit`
Auto-fit with minimum column width of 250px (default)

### `.grid-auto-fit-md`
Auto-fit with minimum column width of 300px

### `.grid-auto-fit-lg`
Auto-fit with minimum column width of 350px

```tsx
<div className="grid grid-auto-fit gap-responsive">
  {/* Items will automatically wrap based on available space */}
</div>
```

## Responsive Gap Classes

Gap utilities that adjust spacing between grid items based on screen size.

- **Mobile**: 16px (1rem)
- **Desktop**: 24px (1.5rem)

### `.gap-responsive`
Responsive gap for both rows and columns

### `.gap-x-responsive`
Responsive horizontal gap (column gap)

### `.gap-y-responsive`
Responsive vertical gap (row gap)

```tsx
<div className="grid grid-cols-responsive gap-responsive">
  {/* Gap is 16px on mobile, 24px on desktop */}
</div>
```

## Responsive Padding Classes

Padding utilities that adjust based on screen size.

- **Mobile**: 16px (1rem)
- **Desktop**: 24px (1.5rem)

### `.p-responsive`
Responsive padding on all sides

### `.px-responsive`
Responsive horizontal padding (left and right)

### `.py-responsive`
Responsive vertical padding (top and bottom)

### `.pt-responsive`
Responsive top padding

### `.pb-responsive`
Responsive bottom padding

### `.pl-responsive`
Responsive left padding

### `.pr-responsive`
Responsive right padding

### `.container-padding`
Responsive horizontal padding for containers (same as `.px-responsive`)

```tsx
<div className="p-responsive">
  {/* Padding is 16px on mobile, 24px on desktop */}
</div>
```

## Usage Examples

### Product Grid

```tsx
<div className="grid grid-cols-responsive gap-responsive p-responsive">
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
```

### Dashboard Widgets

```tsx
<div className="grid grid-cols-responsive-4 gap-responsive">
  <StatCard title="Sales" value="$12,345" />
  <StatCard title="Orders" value="123" />
  <StatCard title="Customers" value="456" />
  <StatCard title="Revenue" value="$67,890" />
</div>
```

### Settings Form

```tsx
<div className="p-responsive">
  <form className="space-y-6">
    <div className="grid grid-cols-responsive-2 gap-responsive">
      <Input label="First Name" />
      <Input label="Last Name" />
    </div>
    {/* More form fields */}
  </form>
</div>
```

### Image Gallery

```tsx
<div className="grid grid-auto-fit gap-responsive p-responsive">
  {images.map(image => (
    <img
      key={image.id}
      src={image.url}
      alt={image.alt}
      className="w-full h-auto rounded-lg"
    />
  ))}
</div>
```

## Requirements Satisfied

This implementation satisfies the following requirements from the UI Enhancement spec:

- **Requirement 5.1**: Responsive column counts (1 on mobile, 2 on tablet, 3+ on desktop)
- **Requirement 5.2**: Consistent gaps (16px on mobile, 24px on desktop)
- **Requirement 5.4**: CSS Grid with auto-fit for flexible layouts
- **Requirement 5.5**: Minimum and maximum column widths
- **Requirement 5.6**: Vertical stacking on narrow screens
- **Requirement 5.7**: Aspect-ratio support (via existing Tailwind utilities)
- **Requirement 15.5**: Responsive container padding (16px mobile, 24px desktop)
- **Requirement 15.6**: Responsive grid gaps (16px mobile, 24px desktop)

## Browser Support

These utilities use modern CSS Grid features and are supported in all modern browsers:

- Chrome 57+
- Firefox 52+
- Safari 10.1+
- Edge 16+

## Performance Considerations

- All utilities use CSS Grid, which is hardware-accelerated
- No JavaScript required for responsive behavior
- Minimal CSS output due to Tailwind's utility-first approach
- Media queries are optimized and deduplicated by Tailwind

## Testing

To test the responsive behavior:

1. Open the ResponsiveGridDemo component in your browser
2. Resize the browser window to see the grid adapt
3. Use browser DevTools to test specific breakpoints:
   - Mobile: 375px, 414px
   - Tablet: 768px, 834px
   - Desktop: 1024px, 1440px, 1920px

## Related Documentation

- [Tailwind CSS Grid Documentation](https://tailwindcss.com/docs/grid-template-columns)
- [CSS Grid Layout Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Responsive Design Best Practices](https://web.dev/responsive-web-design-basics/)

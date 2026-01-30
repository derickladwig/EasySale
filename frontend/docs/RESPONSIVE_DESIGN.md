# Responsive Design Guide

This guide covers responsive design patterns and best practices for the EasySale design system.

## Breakpoints

The design system uses 6 breakpoints with aspect ratio detection:

| Breakpoint | Min Width | Typical Devices | Aspect Ratio Detection |
|------------|-----------|-----------------|------------------------|
| `xs` | 0px | Small phones | Portrait (< 1.2) |
| `sm` | 640px | Large phones | Square (1.2-1.4) |
| `md` | 768px | Tablets | Standard (1.4-1.7) |
| `lg` | 1024px | Laptops | Widescreen (1.7-2.2) |
| `xl` | 1280px | Desktops | Ultrawide (> 2.2) |
| `2xl` | 1536px | Large desktops | - |

### Using Breakpoints

```typescript
// Tailwind responsive modifiers
<div className="flex flex-col md:flex-row lg:gap-8">

// useResponsive hook
const { breakpoint, aspectRatio, isPortrait } = useResponsive();

if (breakpoint === 'xs' || breakpoint === 'sm') {
  // Mobile layout
} else {
  // Desktop layout
}
```

## Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```typescript
// ✅ Good: Mobile-first
<div className="flex flex-col md:flex-row">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>

// ❌ Bad: Desktop-first
<div className="flex flex-row sm:flex-col">
```

## Layout Patterns

### Stack on Mobile, Side-by-Side on Desktop

```typescript
<div className="flex flex-col lg:flex-row gap-4">
  <div className="flex-1">Content 1</div>
  <div className="flex-1">Content 2</div>
</div>
```

### Grid Layouts

```typescript
// 1 column mobile, 2 tablet, 4 desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// Auto-fit with minimum width
<div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
```

### Hide/Show Elements

```typescript
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">Mobile only</div>

// Different content for different sizes
<div>
  <span className="md:hidden">Menu</span>
  <span className="hidden md:inline">Navigation Menu</span>
</div>
```

## Touch Target Requirements

All interactive elements must meet minimum touch target sizes:

| Element Type | Minimum Size | Recommended Size |
|--------------|--------------|------------------|
| Buttons | 44x44px | 48x48px |
| Links | 44x44px | 48x48px |
| Form inputs | 44px height | 48px height |
| Checkboxes | 24x24px | 32x32px |
| Radio buttons | 24x24px | 32x32px |

### Implementing Touch Targets

```typescript
// Button with proper touch target
<Button
  size="md" // 48px height
  className="min-w-[120px]"
>
  Click me
</Button>

// Icon button with touch target
<button
  className="p-3 min-w-[44px] min-h-[44px]"
  aria-label="Delete"
>
  <Icon icon={Trash2} size="sm" />
</button>

// Checkbox with touch target
<input
  type="checkbox"
  className="w-6 h-6" // 24px minimum
/>
```

## Text Scaling

The design system supports user-configurable text scaling:

### Text Size Settings
- **Small**: 0.875x base size
- **Medium**: 1x base size (default)
- **Large**: 1.125x base size
- **Extra Large**: 1.25x base size

### Using Text Scaling

```typescript
// Text automatically scales with --text-scale CSS variable
<p className="text-base">This text scales with user preference</p>

// Fixed size (use sparingly)
<p className="text-[14px]">This text does not scale</p>

// Responsive text sizes
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Responsive heading
</h1>
```

### Text Scaling Best Practices

1. **Use relative units**: `text-base`, `text-lg`, not `text-[16px]`
2. **Test at all scales**: Verify layout doesn't break at 1.25x
3. **Avoid fixed heights**: Use `min-h-*` instead of `h-*`
4. **Allow text wrapping**: Don't use `truncate` on critical text

## Density Scaling

The design system supports user-configurable density:

### Density Settings
- **Compact**: 0.875x spacing (dense layouts)
- **Comfortable**: 1x spacing (default)
- **Spacious**: 1.125x spacing (relaxed layouts)

### Using Density Scaling

```typescript
// Spacing automatically scales with --density-scale CSS variable
<div className="p-4 gap-4">
  {/* Padding and gap scale with density */}
</div>

// Fixed spacing (use sparingly)
<div className="p-[16px]">
  {/* Does not scale */}
</div>
```

## Sidebar Width

The sidebar width is user-configurable:

### Sidebar Width Settings
- **Narrow**: 240px
- **Medium**: 280px (default)
- **Wide**: 320px

### Using Sidebar Width

```typescript
// Sidebar uses --sidebar-width CSS variable
<aside className="w-[var(--sidebar-width)]">
  {/* Sidebar content */}
</aside>

// Main content adjusts automatically
<main className="ml-[var(--sidebar-width)]">
  {/* Main content */}
</main>
```

## Container Widths

Use appropriate container widths for different content types:

```typescript
// Full width (dashboards, tables)
<div className="w-full">

// Constrained width (forms, articles)
<div className="max-w-2xl mx-auto">

// Ultrawide support (3840px+)
<div className="max-w-[1920px] mx-auto">
```

## Aspect Ratio Handling

The design system detects aspect ratios and adjusts layouts:

### Aspect Ratio Categories
- **Portrait**: < 1.2 (phones in portrait)
- **Square**: 1.2-1.4 (tablets in portrait)
- **Standard**: 1.4-1.7 (laptops, tablets in landscape)
- **Widescreen**: 1.7-2.2 (desktops)
- **Ultrawide**: > 2.2 (ultrawide monitors)

### Using Aspect Ratio Detection

```typescript
const { aspectRatio } = useResponsive();

// Adjust layout based on aspect ratio
<div className={cn(
  'grid gap-4',
  aspectRatio === 'portrait' && 'grid-cols-1',
  aspectRatio === 'square' && 'grid-cols-2',
  aspectRatio === 'standard' && 'grid-cols-3',
  aspectRatio === 'widescreen' && 'grid-cols-4',
  aspectRatio === 'ultrawide' && 'grid-cols-5'
)}>
```

## Orientation Detection

Detect device orientation for better layouts:

```typescript
const { isPortrait, isLandscape } = useResponsive();

// Show different layouts based on orientation
{isPortrait ? (
  <VerticalLayout />
) : (
  <HorizontalLayout />
)}
```

## Responsive Images

Use responsive images for better performance:

```typescript
// Responsive image with aspect ratio
<div className="aspect-square bg-dark-700 rounded">
  <img
    src={product.image}
    alt={product.name}
    className="w-full h-full object-cover"
  />
</div>

// Responsive background image
<div
  className="h-64 bg-cover bg-center"
  style={{ backgroundImage: `url(${image})` }}
/>
```

## Responsive Typography

Use responsive font sizes:

```typescript
// Headings
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
<h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
<h3 className="text-lg md:text-xl lg:text-2xl font-semibold">

// Body text
<p className="text-sm md:text-base">

// Small text
<span className="text-xs md:text-sm">
```

## Responsive Spacing

Use responsive spacing for better layouts:

```typescript
// Padding
<div className="p-4 md:p-6 lg:p-8">

// Margin
<div className="mt-4 md:mt-6 lg:mt-8">

// Gap
<div className="flex gap-2 md:gap-4 lg:gap-6">
```

## Testing Responsive Designs

### Browser DevTools
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test at different breakpoints:
   - 375px (iPhone SE)
   - 768px (iPad)
   - 1024px (iPad Pro)
   - 1920px (Desktop)
   - 3840px (4K)

### Real Devices
Test on actual devices:
- Small phone (iPhone SE, Android)
- Large phone (iPhone Pro Max, Android)
- Tablet (iPad, Android tablet)
- Touch-screen laptop
- Desktop monitor
- Ultrawide monitor

### Aspect Ratios
Test at different aspect ratios:
- Portrait: 9:16 (phone)
- Square: 4:3 (iPad)
- Standard: 16:10 (laptop)
- Widescreen: 16:9 (desktop)
- Ultrawide: 21:9, 32:9 (ultrawide monitor)

## Common Responsive Patterns

### Navigation

```typescript
// Mobile: Hamburger menu
// Desktop: Full navigation
<nav>
  <button className="md:hidden" onClick={toggleMenu}>
    <Icon icon={Menu} />
  </button>
  <div className="hidden md:flex gap-4">
    <NavLink>Home</NavLink>
    <NavLink>Products</NavLink>
    <NavLink>Customers</NavLink>
  </div>
</nav>
```

### Data Tables

```typescript
// Mobile: Card layout
// Desktop: Table layout
<div className="md:hidden">
  {data.map(item => <Card key={item.id} {...item} />)}
</div>
<div className="hidden md:block">
  <DataTable columns={columns} data={data} />
</div>
```

### Forms

```typescript
// Mobile: Single column
// Desktop: Two columns
<FormTemplate twoColumn>
  <FormField label="First Name" />
  <FormField label="Last Name" />
  <FormField label="Email" />
  <FormField label="Phone" />
</FormTemplate>
```

### Modals

```typescript
// Mobile: Full screen
// Desktop: Centered with max width
<Modal
  size="lg"
  className="h-full md:h-auto"
>
  {/* Modal content */}
</Modal>
```

## Performance Considerations

### Lazy Loading
Load components only when needed:

```typescript
const MobileNav = lazy(() => import('./MobileNav'));
const DesktopNav = lazy(() => import('./DesktopNav'));

{isMobile ? <MobileNav /> : <DesktopNav />}
```

### Image Optimization
Use responsive images:

```typescript
<img
  src={image.src}
  srcSet={`${image.sm} 640w, ${image.md} 768w, ${image.lg} 1024w`}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt={image.alt}
/>
```

### Conditional Rendering
Render different components for different sizes:

```typescript
const { breakpoint } = useResponsive();

{breakpoint === 'xs' || breakpoint === 'sm' ? (
  <MobileLayout />
) : (
  <DesktopLayout />
)}
```

## Accessibility Considerations

### Focus Management
Ensure focus is visible at all sizes:

```typescript
<button className="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
```

### Touch Targets
Maintain minimum touch target sizes:

```typescript
<button className="min-w-[44px] min-h-[44px] p-2">
```

### Text Readability
Ensure text is readable at all sizes:

```typescript
// Minimum 16px font size for body text
<p className="text-base"> // 16px

// Minimum 14px for small text
<span className="text-sm"> // 14px
```

## Checklist for Responsive Components

Before submitting a responsive component, ensure:

- [ ] Component works at all breakpoints (xs, sm, md, lg, xl, 2xl)
- [ ] Component works at all aspect ratios (portrait, square, standard, widescreen, ultrawide)
- [ ] Component works in both portrait and landscape orientations
- [ ] Touch targets meet minimum size requirements (44x44px)
- [ ] Text scales properly with user preferences
- [ ] Spacing scales properly with density settings
- [ ] Component works at minimum viewport (320x480)
- [ ] Component works at maximum viewport (3840x2160)
- [ ] No horizontal scrolling at any breakpoint
- [ ] No text overflow or truncation of critical content
- [ ] Images are responsive and optimized
- [ ] Component is tested on real devices
- [ ] Component is accessible at all sizes

## Getting Help

- Review existing components for responsive patterns
- Check Storybook for responsive examples
- Use browser DevTools for testing
- Test on real devices when possible
- Ask in team chat for guidance

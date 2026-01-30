# Shadow Tokens Documentation

## Overview

Shadow tokens have been added to the Tailwind configuration to provide consistent elevation and depth throughout the application. These tokens support the enhanced UI design with proper visual hierarchy.

## Elevation Levels

### Base Shadows
Use these for standard elevation levels:

- `shadow-sm` - Subtle shadow for minimal elevation (e.g., input fields)
- `shadow-md` - Medium shadow for cards and panels (default)
- `shadow-lg` - Large shadow for elevated elements (e.g., modals, dropdowns)
- `shadow-xl` - Extra large shadow for high-priority elements
- `shadow-2xl` - Maximum shadow for floating elements

**Example:**
```jsx
<div className="bg-background-secondary rounded-lg shadow-md p-6">
  Card with medium shadow
</div>
```

## Hover Shadow Utilities

Use these to enhance elevation on hover states:

- `hover:shadow-hover-sm` - Enhanced small shadow on hover
- `hover:shadow-hover-md` - Enhanced medium shadow on hover
- `hover:shadow-hover-lg` - Enhanced large shadow on hover
- `hover:shadow-hover-xl` - Enhanced extra large shadow on hover

**Example:**
```jsx
<button className="shadow-md hover:shadow-hover-lg transition-shadow duration-200">
  Hover me
</button>
```

**Card with hover effect:**
```jsx
<div className="bg-background-secondary rounded-lg shadow-md hover:shadow-hover-lg transition-shadow duration-200 cursor-pointer">
  Interactive card
</div>
```

## Focus Shadow Utilities

Use these for accessibility and visual feedback on focused elements:

- `focus:shadow-focus` - Simple focus ring (2px primary color)
- `focus:shadow-focus-ring` - Enhanced focus ring with background separation
- `focus:shadow-focus-error` - Focus ring for error states (red)
- `focus:shadow-focus-success` - Focus ring for success states (green)

**Example:**
```jsx
<input 
  className="border-2 border-border-DEFAULT focus:border-primary-500 focus:shadow-focus-ring transition-all"
  type="text"
/>
```

**Button with focus state:**
```jsx
<button className="bg-primary-500 text-white focus:shadow-focus-ring focus:outline-none">
  Accessible button
</button>
```

## Special Shadows

- `shadow-inner` - Inset shadow for pressed/recessed elements
- `shadow-none` - Remove shadow

## Usage Guidelines

### Cards (Requirement 6.1, 6.5)
- Default state: `shadow-md`
- Hover state: `hover:shadow-hover-lg`
- Transition: `transition-shadow duration-200`

```jsx
<div className="bg-background-secondary rounded-lg shadow-md hover:shadow-hover-lg transition-shadow duration-200">
  Card content
</div>
```

### Buttons (Requirement 7.2, 7.3)
- Primary buttons: `shadow-md hover:shadow-hover-lg`
- Focus state: `focus:shadow-focus-ring`

```jsx
<button className="bg-primary-500 text-white shadow-md hover:shadow-hover-lg focus:shadow-focus-ring transition-all duration-200">
  Primary Action
</button>
```

### Input Fields (Requirement 8.3)
- Focus state: `focus:shadow-focus-ring`
- Error state: `focus:shadow-focus-error`

```jsx
<input 
  className="border-2 border-border-DEFAULT focus:border-primary-500 focus:shadow-focus-ring"
  type="text"
/>
```

### Modals (Requirement 10.1)
- Use `shadow-2xl` for maximum elevation

```jsx
<div className="bg-background-secondary rounded-lg shadow-2xl p-6">
  Modal content
</div>
```

## CSS Variables

All shadow tokens reference CSS variables for theme customization:

- `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-2xl`
- `--shadow-hover-sm`, `--shadow-hover-md`, `--shadow-hover-lg`, `--shadow-hover-xl`
- `--shadow-focus`, `--shadow-focus-ring`, `--shadow-focus-error`, `--shadow-focus-success`

These can be overridden in the theme configuration for tenant-specific customization.

## Accessibility Considerations

1. **Focus rings are required** for keyboard navigation (WCAG 2.1 Success Criterion 2.4.7)
2. Use `focus:shadow-focus-ring` on all interactive elements
3. Ensure focus indicators have sufficient contrast
4. Never use `outline-none` without providing an alternative focus indicator

## Performance Tips

1. Use `transition-shadow` for smooth shadow transitions
2. Combine with `duration-200` or `duration-300` for optimal timing
3. Avoid animating shadows on large lists (use virtual scrolling instead)
4. Consider using `will-change-shadow` for complex animations (use sparingly)

## Examples

### Interactive Card
```jsx
<div className="bg-background-secondary rounded-lg shadow-md hover:shadow-hover-lg transition-shadow duration-200 cursor-pointer p-6">
  <h3 className="text-text-primary font-semibold mb-2">Card Title</h3>
  <p className="text-text-secondary">Card description</p>
</div>
```

### Primary Button
```jsx
<button className="bg-primary-500 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-hover-lg focus:shadow-focus-ring focus:outline-none transition-all duration-200 active:scale-[0.98]">
  Click Me
</button>
```

### Form Input
```jsx
<input 
  type="text"
  className="w-full h-11 px-4 rounded-lg bg-background-secondary border-2 border-border-DEFAULT text-text-primary focus:border-primary-500 focus:shadow-focus-ring transition-all duration-200"
  placeholder="Enter text..."
/>
```

### Error Input
```jsx
<input 
  type="text"
  className="w-full h-11 px-4 rounded-lg bg-background-secondary border-2 border-error-DEFAULT text-text-primary focus:border-error-DEFAULT focus:shadow-focus-error transition-all duration-200"
  placeholder="Enter text..."
  aria-invalid="true"
/>
```

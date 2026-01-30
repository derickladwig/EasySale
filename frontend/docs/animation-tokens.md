# Animation Tokens Documentation

This document describes the animation tokens added to the Tailwind configuration as part of task 1.5 of the UI Enhancement spec.

## Overview

The animation system provides consistent durations, easing functions, and transition utilities across the application, with full support for reduced motion accessibility preferences.

## Requirements Satisfied

- **Requirement 17.1**: Duration tokens (fast, normal, slow)
- **Requirement 17.2**: Easing functions (ease-out for entrances, ease-in for exits)
- **Requirement 17.3**: Transition utilities
- **Requirement 17.4**: Reduced-motion support

## Duration Tokens (Req 17.1)

Three semantic duration tokens are available for consistent animation timing:

### Fast (150ms)
Use for quick interactions like hover states and focus changes.

```tsx
<div className="transition-fast hover:bg-primary-500">
  Quick hover effect
</div>
```

### Normal (300ms)
Use for standard transitions like drawers, modals, and component state changes.

```tsx
<div className="transition-normal hover:scale-105">
  Standard transition
</div>
```

### Slow (500ms)
Use for complex animations like page transitions and large component movements.

```tsx
<div className="transition-slow hover:translate-x-8">
  Slow, smooth movement
</div>
```

### Available Duration Classes

```css
duration-75      /* 75ms */
duration-100     /* 100ms */
duration-fast    /* 150ms - Semantic token */
duration-150     /* 150ms */
duration-200     /* 200ms */
duration-normal  /* 300ms - Semantic token */
duration-300     /* 300ms */
duration-500     /* 500ms */
duration-slow    /* 500ms - Semantic token */
duration-700     /* 700ms */
duration-1000    /* 1000ms */
```

## Easing Functions (Req 17.2)

Easing functions control the acceleration curve of animations.

### Ease-Out (Entrances)
Use when elements are entering the view. Starts fast and slows down.

```tsx
<div className="transition-all duration-300 ease-out">
  Entrance animation
</div>
```

### Ease-In (Exits)
Use when elements are leaving the view. Starts slow and speeds up.

```tsx
<div className="transition-all duration-300 ease-in">
  Exit animation
</div>
```

### Ease-In-Out (Movements)
Use when elements are changing position. Smooth acceleration and deceleration.

```tsx
<div className="transition-all duration-300 ease-in-out">
  Movement animation
</div>
```

### Available Easing Classes

```css
ease-in              /* For exits */
ease-out             /* For entrances */
ease-in-out          /* For movements */
ease-linear          /* Linear timing */
ease-in-back         /* Anticipation effect */
ease-out-back        /* Overshoot effect */
ease-in-out-back     /* Both anticipation and overshoot */
ease-in-circ         /* Circular easing in */
ease-out-circ        /* Circular easing out */
ease-in-out-circ     /* Circular easing both */
```

## Transition Utilities (Req 17.3)

Pre-configured transition utilities combine duration and easing for common patterns.

### Quick Transition Classes

```tsx
// Fast transition with ease-out (150ms)
<div className="transition-fast hover:bg-primary-500">
  Fast transition
</div>

// Normal transition with ease-out (300ms)
<div className="transition-normal hover:bg-primary-500">
  Normal transition
</div>

// Slow transition with ease-out (500ms)
<div className="transition-slow hover:bg-primary-500">
  Slow transition
</div>
```

### Semantic Transition Classes

```tsx
// Entrance transition (ease-out timing)
<div className="transition-entrance duration-300 hover:opacity-100">
  Entrance effect
</div>

// Exit transition (ease-in timing)
<div className="transition-exit duration-300 hover:opacity-0">
  Exit effect
</div>

// Movement transition (ease-in-out timing)
<div className="transition-movement duration-300 hover:translate-x-4">
  Movement effect
</div>
```

### Transition Property Classes

Control which CSS properties are animated:

```css
transition-none              /* No transitions */
transition-all               /* All properties */
transition-colors            /* Background, border, text colors */
transition-opacity           /* Opacity only */
transition-shadow            /* Box shadow only */
transition-transform         /* Transform only */
transition-transform-opacity /* Transform and opacity */
transition-colors-opacity    /* Colors and opacity */
transition-colors-shadow     /* Colors and shadow */
transition-layout            /* Width, height, padding, margin */
```

### Examples

```tsx
// Color transitions only
<button className="transition-colors duration-fast hover:bg-primary-600">
  Color change
</button>

// Transform and opacity
<div className="transition-transform-opacity duration-normal hover:scale-110 hover:opacity-80">
  Scale and fade
</div>

// Colors and shadow
<div className="transition-colors-shadow duration-normal hover:bg-primary-500 hover:shadow-lg">
  Color and shadow
</div>
```

## Reduced Motion Support (Req 17.4)

The animation system respects the user's `prefers-reduced-motion` accessibility setting.

### Automatic Reduced Motion

All animations are automatically disabled or simplified when the user has enabled reduced motion in their OS settings:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Motion-Safe Variant

Apply animations only when motion is safe (user hasn't requested reduced motion):

```tsx
<div className="motion-safe:animate-pulse">
  Only pulses when motion is safe
</div>

<div className="motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:scale-105">
  Only animates when motion is safe
</div>
```

### Motion-Reduce Variant

Apply styles only when reduced motion is preferred:

```tsx
<div className="motion-reduce:bg-warning-DEFAULT">
  Yellow background when reduced motion is preferred
</div>

<div className="motion-safe:hover:scale-105 motion-reduce:hover:bg-background-tertiary">
  Scales on hover (motion safe) or changes color (motion reduce)
</div>
```

### Best Practices

1. **Always provide alternatives**: When using animations, provide a non-animated alternative for reduced motion users.

```tsx
<button className="
  motion-safe:transition-all 
  motion-safe:duration-300 
  motion-safe:hover:scale-105
  motion-reduce:hover:bg-background-tertiary
">
  Accessible button
</button>
```

2. **Use semantic classes**: Prefer `motion-safe:` and `motion-reduce:` variants over media queries.

3. **Test with reduced motion**: Enable reduced motion in your OS settings to test the experience.

## Performance Considerations

### Use CSS Transforms

For best performance, animate CSS transforms instead of layout properties:

```tsx
// Good - Uses transform (GPU accelerated)
<div className="transition-transform duration-300 hover:translate-x-4">
  Smooth animation
</div>

// Avoid - Animates layout property (causes reflow)
<div className="transition-all duration-300 hover:ml-4">
  Janky animation
</div>
```

### Avoid Expensive Properties

Don't animate these properties as they cause layout recalculation:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `padding`, `margin`

Instead, use:
- `transform: scale()` instead of `width`/`height`
- `transform: translate()` instead of `top`/`left`
- `opacity` for fade effects

### Use will-change Sparingly

Only use `will-change` for complex animations that need optimization:

```tsx
<div className="will-change-transform transition-transform duration-300 hover:scale-150">
  Complex animation
</div>
```

## Common Patterns

### Button Hover Effect

```tsx
<button className="
  px-6 py-3 
  bg-primary-500 
  text-white 
  rounded-lg
  transition-fast
  hover:bg-primary-600
  active:scale-95
  focus:ring-2 
  focus:ring-primary-500
">
  Click me
</button>
```

### Card Hover Effect

```tsx
<div className="
  p-6 
  bg-background-secondary 
  rounded-lg 
  shadow-md
  transition-normal
  hover:shadow-lg
  hover:scale-105
  cursor-pointer
">
  Hover me
</div>
```

### Modal Entrance

```tsx
<div className="
  fixed inset-0 
  bg-black/50
  animate-fade-in
">
  <div className="
    bg-background-secondary 
    rounded-lg 
    p-6
    animate-scale-in
  ">
    Modal content
  </div>
</div>
```

### Drawer Slide-In

```tsx
<div className="
  fixed right-0 top-0 bottom-0
  w-80
  bg-background-secondary
  shadow-xl
  animate-slide-in-from-right
">
  Drawer content
</div>
```

### Toast Notification

```tsx
<div className="
  fixed top-4 right-4
  p-4
  bg-success-DEFAULT
  text-white
  rounded-lg
  shadow-lg
  animate-slide-in-from-top
">
  Success message
</div>
```

## Testing

A test component is available at `src/test-animation-tokens.tsx` that demonstrates all animation tokens and their usage.

To view the test component:

1. Import it in your app
2. Navigate to the test route
3. Interact with the examples
4. Enable reduced motion in your OS to test accessibility

## Browser Support

All animation tokens use standard CSS properties with excellent browser support:

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

The `prefers-reduced-motion` media query is supported in all modern browsers.

## Migration Guide

If you have existing animations using hard-coded values, migrate them to use the new tokens:

### Before

```tsx
<div className="transition-all duration-200 ease-out hover:scale-105">
  Old style
</div>
```

### After

```tsx
<div className="transition-fast hover:scale-105">
  New style with semantic token
</div>
```

Or for more control:

```tsx
<div className="transition-transform-opacity duration-normal ease-out hover:scale-105">
  New style with explicit properties
</div>
```

## Summary

The animation token system provides:

1. **Semantic duration tokens**: `fast`, `normal`, `slow`
2. **Appropriate easing functions**: `ease-out` for entrances, `ease-in` for exits
3. **Convenient transition utilities**: Pre-configured classes for common patterns
4. **Accessibility support**: Automatic reduced motion handling with `motion-safe` and `motion-reduce` variants

Use these tokens consistently throughout the application for a polished, accessible, and performant animation experience.

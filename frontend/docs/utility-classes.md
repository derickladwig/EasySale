# Interactive State Utility Classes

This document describes the custom Tailwind utility classes added for interactive states (focus, hover, active, disabled) as part of the UI Enhancement specification (Task 1.6).

**Requirements:** 7.1, 7.2, 7.3, 7.4

## Overview

These utility classes provide consistent interactive states across all components, ensuring a polished and accessible user experience. They follow the design system's color scheme and animation tokens.

## Focus Ring Utilities

Focus rings provide visible keyboard navigation indicators for accessibility (WCAG AA compliance).

### Classes

- **`.focus-ring`** - Standard focus ring with 2px blue outline, 2px offset
- **`.focus-ring-inset`** - Focus ring with negative offset (inside element)
- **`.focus-ring-error`** - Red focus ring for error states
- **`.focus-ring-success`** - Green focus ring for success states
- **`.focus-ring-none`** - Removes focus ring (use with caution for accessibility)

### Usage

```tsx
// Standard button with focus ring
<button className="focus-ring bg-primary-500 text-white px-4 py-2 rounded-lg">
  Click Me
</button>

// Input with error focus ring
<input 
  className="focus-ring-error border-2 border-error px-3 py-2 rounded-lg"
  type="text"
/>

// Input with success focus ring
<input 
  className="focus-ring-success border-2 border-success px-3 py-2 rounded-lg"
  type="text"
/>
```

### Requirements

- **Req 7.10:** Buttons show visible focus ring when focused via keyboard
- **Req 18.2:** Visible focus indicators (2px blue outline) for accessibility

## Hover State Utilities

Hover states provide visual feedback when users hover over interactive elements.

### Brightness Classes

Apply brightness increase on hover (10% by default, as per Req 1.5).

- **`.hover-brightness`** - 10% brightness increase (1.1x)
- **`.hover-brightness-sm`** - 5% brightness increase (1.05x)
- **`.hover-brightness-lg`** - 15% brightness increase (1.15x)

### Lift Classes

Apply elevation effect on hover (translateY + shadow increase).

- **`.hover-lift`** - Medium lift (-2px) with hover shadow
- **`.hover-lift-sm`** - Small lift (-1px) with small hover shadow
- **`.hover-lift-lg`** - Large lift (-4px) with large hover shadow

### Usage

```tsx
// Button with brightness increase on hover
<button className="hover-brightness bg-primary-500 text-white px-4 py-2 rounded-lg">
  Hover Me
</button>

// Card with lift effect on hover
<div className="hover-lift bg-background-secondary p-6 rounded-lg shadow-md">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

// Subtle hover effect for secondary actions
<button className="hover-brightness-sm bg-background-tertiary text-text-primary px-3 py-2 rounded-md">
  Secondary Action
</button>
```

### Requirements

- **Req 7.3:** Buttons show clear hover states with brightness increase
- **Req 1.5:** Color scheme defines hover states with 10% brightness increase

## Active State Utilities

Active states provide feedback when users press/click interactive elements.

### Scale Classes

Apply scale transform on active state (0.98 by default, as per Req 7.4).

- **`.active-scale`** - Medium scale (0.98x)
- **`.active-scale-sm`** - Small scale (0.99x)
- **`.active-scale-lg`** - Large scale (0.95x)

### Brightness Classes

Apply brightness decrease on active state (15% decrease by default, as per Req 1.6).

- **`.active-brightness`** - 15% brightness decrease (0.85x)
- **`.active-brightness-sm`** - 10% brightness decrease (0.9x)
- **`.active-brightness-lg`** - 20% brightness decrease (0.8x)

### Usage

```tsx
// Button with scale effect on press
<button className="active-scale bg-primary-500 text-white px-4 py-2 rounded-lg">
  Press Me
</button>

// Button with brightness decrease on press
<button className="active-brightness bg-primary-500 text-white px-4 py-2 rounded-lg">
  Press Me
</button>

// Combined scale and brightness for maximum feedback
<button className="active-scale active-brightness bg-primary-500 text-white px-4 py-2 rounded-lg">
  Press Me
</button>
```

### Requirements

- **Req 7.4:** Buttons show active/pressed states with scale transform (0.98)
- **Req 1.6:** Color scheme defines active states with 15% brightness decrease

## Disabled State Utilities

Disabled states indicate non-interactive elements.

### Classes

- **`.disabled-state`** - Complete disabled state (50% opacity + no-drop cursor + no pointer events)
- **`.disabled-opacity`** - Only opacity change (50%)
- **`.disabled-cursor`** - Only cursor change (not-allowed)
- **`.disabled-no-pointer`** - Only pointer events disabled

### Usage

```tsx
// Button with full disabled state
<button className="disabled-state bg-primary-500 text-white px-4 py-2 rounded-lg" disabled>
  Disabled Button
</button>

// Custom disabled styling with only opacity
<button className="disabled-opacity bg-primary-500 text-white px-4 py-2 rounded-lg" disabled>
  Custom Disabled
</button>

// Disabled input
<input 
  className="disabled-state border-2 border-border px-3 py-2 rounded-lg"
  type="text"
  disabled
/>
```

### Requirements

- **Req 7.8:** Disabled buttons have 50% opacity and no-drop cursor

## Combined Interactive Utilities

Pre-configured combinations for common interactive patterns.

### Classes

- **`.interactive`** - Complete interactive state (focus + hover + active + disabled)
- **`.interactive-card`** - Interactive card pattern (hover lift + focus ring)
- **`.interactive-button`** - Interactive button pattern (all states optimized for buttons)

### Usage

```tsx
// Quick interactive button (all states included)
<button className="interactive bg-primary-500 text-white px-4 py-2 rounded-lg">
  Interactive Button
</button>

// Interactive card
<div className="interactive-card bg-background-secondary p-6 rounded-lg shadow-md">
  <h3>Clickable Card</h3>
  <p>Click anywhere on this card</p>
</div>

// Interactive button with optimized states
<button className="interactive-button bg-primary-500 text-white px-4 py-2 rounded-lg shadow-md">
  Optimized Button
</button>
```

## Best Practices

### 1. Combine Utilities for Rich Interactions

```tsx
// Rich button interaction
<button className="
  focus-ring 
  hover-brightness 
  active-scale 
  disabled-state
  bg-primary-500 
  text-white 
  px-4 py-2 
  rounded-lg
">
  Rich Interaction
</button>
```

### 2. Use Combined Utilities for Consistency

```tsx
// Prefer this (consistent with design system)
<button className="interactive bg-primary-500 text-white px-4 py-2 rounded-lg">
  Consistent Button
</button>

// Over this (manual combination)
<button className="focus-ring hover-brightness active-scale disabled-state bg-primary-500 text-white px-4 py-2 rounded-lg">
  Manual Button
</button>
```

### 3. Match Utility Intensity to Element Importance

```tsx
// Primary action - strong feedback
<button className="hover-brightness-lg active-scale-lg">
  Primary Action
</button>

// Secondary action - subtle feedback
<button className="hover-brightness-sm active-scale-sm">
  Secondary Action
</button>

// Tertiary action - minimal feedback
<button className="hover-brightness-sm">
  Tertiary Action
</button>
```

### 4. Always Include Focus Rings for Accessibility

```tsx
// Good - keyboard accessible
<button className="focus-ring hover-brightness active-scale">
  Accessible Button
</button>

// Bad - not keyboard accessible
<button className="hover-brightness active-scale">
  Not Accessible
</button>
```

### 5. Use Semantic Focus Rings

```tsx
// Error state input
<input className="focus-ring-error border-error" />

// Success state input
<input className="focus-ring-success border-success" />

// Standard input
<input className="focus-ring border-border" />
```

## Accessibility Considerations

1. **Always include focus rings** - Required for keyboard navigation (WCAG AA)
2. **Use sufficient contrast** - Focus rings use primary-500 color (meets WCAG AA)
3. **Don't rely on color alone** - Combine color with other visual cues (scale, shadow)
4. **Test with keyboard** - Verify all interactive elements are keyboard accessible
5. **Respect reduced motion** - Animations automatically disabled when user prefers reduced motion

## Performance Notes

- All utilities use CSS transforms for performance (GPU-accelerated)
- Transitions are optimized with appropriate durations (100-200ms)
- Hover and active states use `filter: brightness()` for consistent color adjustments
- Focus rings use `outline` instead of `border` to avoid layout shifts

## Browser Support

These utilities work in all modern browsers:
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

For older browsers, graceful degradation is applied (no animations, but functionality remains).

## Related Documentation

- [Design System Colors](./design-system.md#colors)
- [Animation Tokens](./design-system.md#animations)
- [Accessibility Guidelines](./accessibility.md)
- [Component Library](./components.md)

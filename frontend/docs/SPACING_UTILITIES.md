# Spacing Utilities Guide

This document explains the enhanced spacing system in the Tailwind configuration, which implements Requirements 15.1, 15.2, and 15.3 from the UI Enhancement specification.

## Overview

The spacing system is built on a **4px base unit** and provides three types of utilities:
1. **Standard spacing** - Base spacing scale
2. **Responsive spacing** - Mobile/desktop-specific values
3. **Density multipliers** - Compact/spacious variants

## 4px Base Unit (Requirement 15.1)

All spacing values are multiples of 4px (0.25rem) for consistency:

```tsx
// Standard spacing scale
<div className="p-1">   {/* 4px padding */}
<div className="p-2">   {/* 8px padding */}
<div className="p-4">   {/* 16px padding - component spacing */}
<div className="p-6">   {/* 24px padding - form spacing */}
<div className="p-8">   {/* 32px padding - section spacing */}
```

### Key Spacing Values

| Class | Value | Use Case | Requirement |
|-------|-------|----------|-------------|
| `space-4` | 16px | Component spacing (between related items) | 15.3 |
| `space-6` | 24px | Form spacing (between form groups) | 15.4 |
| `space-8` | 32px | Section spacing (between major sections) | 15.2 |

## Responsive Spacing Utilities (Requirements 15.5, 15.6)

Use these utilities for consistent mobile/desktop spacing:

### Container Padding

```tsx
// Mobile: 16px, Desktop: 24px
<div className="px-container-mobile md:px-container-desktop">
  Content with responsive padding
</div>
```

### Grid Gaps

```tsx
// Mobile: 16px gap, Desktop: 24px gap
<div className="grid gap-grid-gap-mobile md:gap-grid-gap-desktop">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Available Responsive Utilities

| Utility | Mobile Value | Desktop Value | Use Case |
|---------|--------------|---------------|----------|
| `container-mobile` / `container-desktop` | 16px | 24px | Container padding |
| `grid-gap-mobile` / `grid-gap-desktop` | 16px | 24px | Grid gaps |

## Density Multiplier Utilities (Requirements 15.7, 15.8, 15.9)

Support user density preferences with compact (75%) and spacious (125%) variants:

### Compact Density (25% reduction)

```tsx
// Normal: 16px, Compact: 12px
<div className="p-4 data-[density=compact]:p-compact-4">
  Compact spacing
</div>

// Normal: 24px, Compact: 18px
<div className="gap-6 data-[density=compact]:gap-compact-6">
  Compact grid gap
</div>
```

### Spacious Density (25% increase)

```tsx
// Normal: 16px, Spacious: 20px
<div className="p-4 data-[density=spacious]:p-spacious-4">
  Spacious spacing
</div>

// Normal: 24px, Spacious: 30px
<div className="gap-6 data-[density=spacious]:gap-spacious-6">
  Spacious grid gap
</div>
```

### Available Density Utilities

| Normal | Compact (75%) | Spacious (125%) |
|--------|---------------|-----------------|
| `space-1` (4px) | `compact-1` (3px) | `spacious-1` (5px) |
| `space-2` (8px) | `compact-2` (6px) | `spacious-2` (10px) |
| `space-3` (12px) | `compact-3` (9px) | `spacious-3` (15px) |
| `space-4` (16px) | `compact-4` (12px) | `spacious-4` (20px) |
| `space-6` (24px) | `compact-6` (18px) | `spacious-6` (30px) |
| `space-8` (32px) | `compact-8` (24px) | `spacious-8` (40px) |

## Usage Examples

### Component Spacing (16px between related items)

```tsx
// Card with consistent component spacing
<div className="bg-background-secondary rounded-lg p-6">
  <h2 className="text-xl font-semibold">Title</h2>
  <p className="mt-4">Description text</p>  {/* 16px gap */}
  <button className="mt-4">Action</button>  {/* 16px gap */}
</div>
```

### Form Spacing (24px between form groups)

```tsx
// Form with consistent form group spacing
<form className="space-y-6">  {/* 24px gap between groups */}
  <div>
    <label>Name</label>
    <input type="text" />
  </div>
  <div>
    <label>Email</label>
    <input type="email" />
  </div>
  <button type="submit">Submit</button>
</form>
```

### Section Spacing (32px between major sections)

```tsx
// Page with consistent section spacing
<div className="space-y-8">  {/* 32px gap between sections */}
  <section>
    <h2>Section 1</h2>
    <p>Content...</p>
  </section>
  <section>
    <h2>Section 2</h2>
    <p>Content...</p>
  </section>
</div>
```

### Responsive Container

```tsx
// Container with responsive padding
<div className="px-container-mobile md:px-container-desktop max-w-7xl mx-auto">
  {/* 16px padding on mobile, 24px on desktop */}
  <h1>Page Title</h1>
  <p>Content...</p>
</div>
```

### Density-Aware Component

```tsx
// Component that respects user density preference
function Card({ density = 'normal' }) {
  return (
    <div 
      className="bg-background-secondary rounded-lg p-6"
      data-density={density}
    >
      <h3 className="text-lg font-semibold">Title</h3>
      <p className="mt-4 data-[density=compact]:mt-compact-4 data-[density=spacious]:mt-spacious-4">
        {/* Normal: 16px, Compact: 12px, Spacious: 20px */}
        Description text
      </p>
    </div>
  );
}
```

## Best Practices

1. **Use semantic spacing values**
   - `space-4` for component spacing
   - `space-6` for form spacing
   - `space-8` for section spacing

2. **Use responsive utilities for containers and grids**
   - `container-mobile` / `container-desktop` for container padding
   - `grid-gap-mobile` / `grid-gap-desktop` for grid gaps

3. **Support density preferences**
   - Add `data-density` attribute to components
   - Use `compact-*` and `spacious-*` utilities with data attributes

4. **Maintain consistency**
   - Stick to the 4px base unit
   - Use the defined spacing values instead of arbitrary values
   - Follow the spacing guidelines for different contexts

## Migration Guide

If you're updating existing components:

1. **Replace arbitrary spacing values**
   ```tsx
   // Before
   <div className="p-[18px]">
   
   // After (use closest standard value)
   <div className="p-4">  {/* 16px */}
   ```

2. **Use responsive utilities**
   ```tsx
   // Before
   <div className="px-4 md:px-6">
   
   // After
   <div className="px-container-mobile md:px-container-desktop">
   ```

3. **Add density support**
   ```tsx
   // Before
   <div className="p-4">
   
   // After
   <div className="p-4 data-[density=compact]:p-compact-4 data-[density=spacious]:p-spacious-4">
   ```

## Testing

The spacing utilities are tested in `frontend/src/test/tailwind-spacing.test.ts`. Run tests with:

```bash
npm test -- tailwind-spacing.test.ts
```

## References

- **Requirements**: `.kiro/specs/ui-enhancement/requirements.md` (Requirement 15)
- **Design**: `.kiro/specs/ui-enhancement/design.md`
- **Tasks**: `.kiro/specs/ui-enhancement/tasks.md` (Task 1.2)

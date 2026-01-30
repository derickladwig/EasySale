# Design Tokens Reference

Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes. We use them in place of hard-coded values to maintain a scalable and consistent visual system.

## Color Tokens

### Semantic Colors

Use semantic color tokens for all UI elements. These tokens automatically adapt to the current theme (light/dark).

#### Background Colors

```css
--color-bg-primary      /* Main background color */
--color-bg-secondary    /* Secondary background (sidebars, panels) */
```

**Usage:**
```css
.my-component {
  background: var(--color-bg-primary);
}
```

#### Text Colors

```css
--color-text-primary    /* Primary text color (headings, body) */
--color-text-secondary  /* Secondary text (labels, captions) */
--color-text-muted      /* Muted text (placeholders, disabled) */
```

**Usage:**
```css
.heading {
  color: var(--color-text-primary);
}

.caption {
  color: var(--color-text-secondary);
}
```

#### Surface Elevation

```css
--color-surface-1       /* Page background */
--color-surface-2       /* Cards, panels */
--color-surface-3       /* Inputs, table headers */
```

**Usage:**
```css
.card {
  background: var(--color-surface-2);
}
```

#### Borders and Dividers

```css
--color-border          /* Standard borders */
--color-border-subtle   /* Subtle borders (table rows) */
--color-divider         /* Section dividers */
```

**Usage:**
```css
.card {
  border: var(--border-1) solid var(--color-border);
}
```

#### Interactive Colors

```css
--color-accent          /* Primary accent color (buttons, links) */
--color-accent-hover    /* Accent hover state */
--color-focus-ring      /* Focus indicator color */
```

**Usage:**
```css
.button-primary {
  background: var(--color-accent);
}

.button-primary:hover {
  background: var(--color-accent-hover);
}

.input:focus-visible {
  outline: var(--ring-2) solid var(--color-focus-ring);
}
```

#### Status Colors

```css
--color-success         /* Success states (green) */
--color-warning         /* Warning states (yellow/orange) */
--color-error           /* Error states (red) */
--color-info            /* Info states (blue) */
```

**Usage:**
```css
.alert-success {
  background: var(--color-success);
}
```

## Spacing Scale

Use the spacing scale for all margins, padding, and gaps. Never use arbitrary pixel values.

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-6: 24px
--space-8: 32px
--space-12: 48px
--space-16: 64px
```

**Usage:**
```css
.card {
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.stack {
  gap: var(--space-2);
}
```

**Guidelines:**
- Use `--space-1` for tight spacing (icon gaps)
- Use `--space-2` to `--space-4` for component internal spacing
- Use `--space-6` to `--space-8` for section spacing
- Use `--space-12` to `--space-16` for page-level spacing

## Typography Scale

### Font Sizes

```css
--font-size-xs: 0.75rem    /* 12px - Small labels */
--font-size-sm: 0.875rem   /* 14px - Secondary text */
--font-size-base: 1rem     /* 16px - Body text */
--font-size-lg: 1.125rem   /* 18px - Large body */
--font-size-xl: 1.25rem    /* 20px - Small headings */
--font-size-2xl: 1.5rem    /* 24px - Medium headings */
--font-size-3xl: 1.875rem  /* 30px - Large headings */
```

**Usage:**
```css
h1 {
  font-size: var(--font-size-3xl);
}

body {
  font-size: var(--font-size-base);
}

.caption {
  font-size: var(--font-size-sm);
}
```

### Font Weights

```css
--font-weight-normal: 400     /* Regular text */
--font-weight-medium: 500     /* Emphasized text */
--font-weight-semibold: 600   /* Headings */
--font-weight-bold: 700       /* Strong emphasis */
```

**Usage:**
```css
h2 {
  font-weight: var(--font-weight-semibold);
}

.emphasis {
  font-weight: var(--font-weight-medium);
}
```

### Line Heights

```css
--line-height-tight: 1.25     /* Headings */
--line-height-normal: 1.5     /* Body text */
--line-height-relaxed: 1.75   /* Long-form content */
```

**Usage:**
```css
h1 {
  line-height: var(--line-height-tight);
}

p {
  line-height: var(--line-height-normal);
}
```

## Border Radius

```css
--radius-none: 0       /* No rounding */
--radius-sm: 4px       /* Subtle rounding */
--radius-md: 8px       /* Standard rounding */
--radius-lg: 12px      /* Prominent rounding */
--radius-full: 9999px  /* Fully rounded (pills, circles) */
```

**Usage:**
```css
.button {
  border-radius: var(--radius-md);
}

.badge {
  border-radius: var(--radius-full);
}
```

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

**Usage:**
```css
.card {
  box-shadow: var(--shadow-md);
}

.modal {
  box-shadow: var(--shadow-xl);
}
```

**Note:** Shadows automatically adjust for dark mode.

## Layout Contract Tokens

These tokens define the layout structure and should only be used in the AppShell component.

```css
--appHeaderH: 64px      /* Header height */
--appSidebarW: 240px    /* Sidebar width */
--pageGutter: 16px      /* Page padding */
```

**Usage:**
```css
/* Only in AppShell.module.css */
.header {
  height: var(--appHeaderH);
}
```

## Z-Index Scale

Use the z-index scale to maintain consistent layering.

```css
--z-sidebar: 900        /* Sidebar layer */
--z-header: 800         /* Header layer */
--z-dropdown: 1000      /* Dropdown menus */
--z-modal: 2000         /* Modal dialogs */
--z-toast: 3000         /* Toast notifications */
```

**Usage:**
```css
.modal {
  z-index: var(--z-modal);
}
```

## Border Widths

```css
--border-1: 1px         /* Standard borders */
--border-2: 2px         /* Emphasized borders */
```

**Usage:**
```css
.card {
  border: var(--border-1) solid var(--color-border);
}

.active-indicator {
  border-left: var(--border-2) solid var(--color-accent);
}
```

## Focus Ring

```css
--ring-2: 2px           /* Standard focus ring */
--ring-3: 3px           /* Emphasized focus ring */
```

**Usage:**
```css
.button:focus-visible {
  outline: var(--ring-2) solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

## Row Heights

Use for tables and lists to maintain consistent sizing.

```css
--row-h-compact: 32px       /* Compact density */
--row-h-comfortable: 40px   /* Comfortable density (default) */
--row-h-spacious: 48px      /* Spacious density */
```

**Usage:**
```css
.table-row {
  height: var(--row-h-comfortable);
}
```

## Animation Durations

```css
--duration-1: 150ms     /* Fast transitions */
--duration-2: 300ms     /* Standard transitions */
```

**Usage:**
```css
.button {
  transition: all var(--duration-1);
}
```

## Best Practices

### DO ✅

- Always use design tokens instead of hard-coded values
- Use semantic tokens (e.g., `--color-text-primary`) over theme tokens (e.g., `--theme-text-primary`)
- Use the spacing scale for all spacing values
- Use the typography scale for all font sizes
- Test components in both light and dark themes

### DON'T ❌

- Don't use hard-coded colors (e.g., `#3b82f6`)
- Don't use arbitrary spacing values (e.g., `margin: 13px`)
- Don't use arbitrary font sizes (e.g., `font-size: 17px`)
- Don't use `position: fixed` outside of AppShell
- Don't use arbitrary z-index values

## Migration Guide

When migrating existing components:

1. Replace hard-coded colors with semantic tokens
2. Replace arbitrary spacing with spacing scale
3. Replace arbitrary font sizes with typography scale
4. Add focus rings to interactive elements
5. Test in both light and dark themes
6. Verify WCAG AA contrast ratios

## Examples

### Before (Hard-coded)

```css
.card {
  background: #ffffff;
  color: #1a1a1a;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
}
```

### After (Design Tokens)

```css
.card {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  border: var(--border-1) solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}
```

# Design Tokens Quick Reference

## Quick Lookup

Need a color, spacing, or other value? Use this quick reference to find the right token.

## Colors

### Background Colors
```css
--color-bg-primary        /* Main background (white in light, dark in dark) */
--color-bg-secondary      /* Secondary background (light gray in light, darker in dark) */
```

### Text Colors
```css
--color-text-primary      /* Main text color */
--color-text-secondary    /* Secondary text (less emphasis) */
--color-text-muted        /* Muted text (least emphasis) */
```

### Surface Colors (for cards, panels, inputs)
```css
--color-surface-1         /* Page background level */
--color-surface-2         /* Card/panel level */
--color-surface-3         /* Input/table header level */
```

### Border & Divider Colors
```css
--color-border            /* Standard borders */
--color-border-subtle     /* Subtle borders (less contrast) */
--color-divider           /* Divider lines */
```

### Interactive Colors
```css
--color-accent            /* Primary action color (buttons, links) */
--color-accent-hover      /* Accent color on hover */
--color-focus-ring        /* Focus ring color */
```

### Status Colors
```css
--color-success           /* Success states (green) */
--color-warning           /* Warning states (orange/yellow) */
--color-error             /* Error states (red) */
--color-info              /* Info states (blue) */
```

## Spacing

```css
--space-1    /* 4px  - Tiny gaps */
--space-2    /* 8px  - Small gaps, compact padding */
--space-3    /* 12px - Medium-small gaps */
--space-4    /* 16px - Standard padding, comfortable gaps */
--space-6    /* 24px - Large padding, section spacing */
--space-8    /* 32px - Extra large spacing */
--space-12   /* 48px - Section dividers */
--space-16   /* 64px - Page-level spacing */
```

### Common Usage
- **Button padding**: `var(--space-3) var(--space-4)`
- **Card padding**: `var(--space-4)` or `var(--space-6)`
- **Input padding**: `var(--space-3) var(--space-4)`
- **Section gaps**: `var(--space-6)` or `var(--space-8)`
- **Page margins**: `var(--space-4)` or `var(--space-6)`

## Typography

### Font Sizes
```css
--font-size-xs      /* 12px - Small labels, captions */
--font-size-sm      /* 14px - Secondary text, table cells */
--font-size-base    /* 16px - Body text (default) */
--font-size-lg      /* 18px - Emphasized text */
--font-size-xl      /* 20px - Small headings */
--font-size-2xl     /* 24px - Section headings */
--font-size-3xl     /* 30px - Page titles */
```

### Font Weights
```css
--font-weight-normal      /* 400 - Body text */
--font-weight-medium      /* 500 - Emphasized text */
--font-weight-semibold    /* 600 - Headings */
--font-weight-bold        /* 700 - Strong emphasis */
```

### Line Heights
```css
--line-height-tight       /* 1.25 - Headings */
--line-height-normal      /* 1.5  - Body text */
--line-height-relaxed     /* 1.75 - Long-form content */
```

## Border Radius

```css
--radius-none    /* 0     - No rounding */
--radius-sm      /* 4px   - Subtle rounding */
--radius-md      /* 8px   - Standard rounding (buttons, cards) */
--radius-lg      /* 12px  - Large rounding */
--radius-full    /* 9999px - Fully rounded (pills, avatars) */
```

## Shadows

```css
--shadow-sm      /* Subtle shadow (hover states) */
--shadow-md      /* Standard shadow (cards) */
--shadow-lg      /* Prominent shadow (modals) */
--shadow-xl      /* Strong shadow (dropdowns) */
```

## Z-Index

```css
--z-sidebar      /* 900  - Sidebar layer */
--z-header       /* 800  - Header layer */
--z-dropdown     /* 1000 - Dropdown menus */
--z-modal        /* 2000 - Modal overlays */
--z-toast        /* 3000 - Toast notifications */
```

## Layout Contract

```css
--appHeaderH     /* 64px  - Header height */
--appSidebarW    /* 240px - Sidebar width */
--pageGutter     /* 16px  - Page content padding */
```

## Row Heights (for tables and lists)

```css
--row-h-compact      /* 32px - Compact density */
--row-h-comfortable  /* 40px - Comfortable density (default) */
--row-h-spacious     /* 48px - Spacious density */
```

## Animation Durations

```css
--duration-1     /* 150ms - Quick transitions */
--duration-2     /* 300ms - Standard transitions */
```

## Common Patterns

### Button
```css
.button {
  padding: var(--space-3) var(--space-4);
  background: var(--color-accent);
  color: var(--color-bg-primary);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  transition: background var(--duration-1);
}

.button:hover {
  background: var(--color-accent-hover);
}

.button:focus-visible {
  outline: var(--ring-2) solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

### Card
```css
.card {
  background: var(--color-surface-2);
  border: var(--border-1) solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}
```

### Input
```css
.input {
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-3);
  border: var(--border-1) solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.input:focus {
  outline: var(--ring-2) solid var(--color-focus-ring);
  outline-offset: 0;
  border-color: var(--color-accent);
}
```

### Section Header
```css
.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.sectionTitle {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
}
```

### Table
```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.tableHeader {
  background: var(--color-surface-3);
  border-bottom: var(--border-2) solid var(--color-border);
}

.tableCell {
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-1) solid var(--color-border-subtle);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.tableRow:hover {
  background: var(--color-surface-2);
}
```

## Tips

1. **Always use tokens**: Never hardcode values
2. **Check existing tokens first**: Before requesting new ones
3. **Use semantic tokens**: Use `--color-accent` not `--color-blue-500`
4. **Test in both themes**: Verify appearance in light and dark modes
5. **Use spacing scale**: Stick to the 4px grid (space-1 through space-16)

## Need a New Token?

If you need a value that doesn't exist:

1. Check if an existing token can work
2. Discuss with the team
3. Add to `src/styles/tokens.css` or `src/styles/themes.css`
4. Update this reference guide
5. Never add hardcoded values to component CSS

## Resources

- [Full Token Definitions](../src/styles/tokens.css)
- [Theme Definitions](../src/styles/themes.css)
- [CSS Ownership Rules](./CSS_OWNERSHIP_RULES.md)
- [Linting Setup](./LINTING_SETUP.md)

# CSS Ownership Rules

## Overview

This document defines strict ownership rules for CSS in the EasySale design system. These rules ensure consistency, maintainability, and prevent the proliferation of hardcoded values throughout the codebase.

## Core Principle

**Only `tokens.css` and `themes.css` may define raw color values, positioning rules, and z-index values.**

All other CSS files must reference design tokens through CSS custom properties (variables).

## Ownership Rules

### 1. Color Definitions

**Rule**: Only `src/styles/tokens.css` and `src/styles/themes.css` may contain raw color values.

**Allowed in tokens.css/themes.css**:
```css
/* tokens.css */
:root {
  --color-bg-primary: var(--theme-bg-primary);
  --color-accent: var(--theme-accent);
}

/* themes.css */
[data-theme="light"] {
  --theme-bg-primary: #ffffff;
  --theme-accent: #0066cc;
}
```

**Forbidden everywhere else**:
```css
/* ❌ WRONG - Hardcoded hex color */
.button {
  background: #0066cc;
}

/* ❌ WRONG - Hardcoded rgb color */
.card {
  background: rgb(255, 255, 255);
}

/* ❌ WRONG - Hardcoded hsl color */
.text {
  color: hsl(210, 100%, 50%);
}
```

**Correct usage**:
```css
/* ✅ CORRECT - Using design token */
.button {
  background: var(--color-accent);
}

.card {
  background: var(--color-bg-primary);
}

.text {
  color: var(--color-text-primary);
}
```

### 2. Fixed Positioning

**Rule**: Only `AppShell.module.css`, modal components, and toast components may use `position: fixed`.

**Rationale**: Fixed positioning breaks the layout contract and can cause overlaps. The AppShell component manages all fixed positioning for the application layout.

**Allowed**:
- `src/components/AppShell.module.css`
- `src/components/Modal.module.css`
- `src/components/Toast.module.css`

**Forbidden everywhere else**:
```css
/* ❌ WRONG - Fixed positioning outside AppShell */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
}
```

**Correct usage**:
```css
/* ✅ CORRECT - Use AppShell for layout */
/* Let AppShell handle positioning, use relative/absolute within content */
.content {
  position: relative;
}
```

### 3. Z-Index Values

**Rule**: Only design tokens may define z-index values. All components must use z-index tokens.

**Allowed in tokens.css**:
```css
/* tokens.css */
:root {
  --z-sidebar: 900;
  --z-header: 800;
  --z-dropdown: 1000;
  --z-modal: 2000;
  --z-toast: 3000;
}
```

**Forbidden everywhere else**:
```css
/* ❌ WRONG - Literal z-index value */
.dropdown {
  z-index: 1000;
}
```

**Correct usage**:
```css
/* ✅ CORRECT - Using z-index token */
.dropdown {
  z-index: var(--z-dropdown);
}
```

### 4. Inline Styles in JSX

**Rule**: Inline `style` props are forbidden in JSX. All styling must use CSS modules or design tokens.

**Rationale**: Inline styles bypass the design system, make theming impossible, and are harder to maintain.

**Forbidden**:
```tsx
/* ❌ WRONG - Inline style prop */
<div style={{ color: '#0066cc', padding: '16px' }}>
  Content
</div>
```

**Correct usage**:
```tsx
/* ✅ CORRECT - Using CSS module */
import styles from './Component.module.css';

<div className={styles.container}>
  Content
</div>
```

```css
/* Component.module.css */
.container {
  color: var(--color-accent);
  padding: var(--space-4);
}
```

## Enforcement

These rules are enforced through automated linting:

### Stylelint Rules

- `color-no-hex`: Disallows hex colors
- `function-disallowed-list`: Disallows `rgb()`, `rgba()`, `hsl()`, `hsla()`
- `declaration-property-value-allowed-list`: Requires CSS variables for color properties
- Custom rules for `position: fixed` and `z-index` literals

### ESLint Rules

- `react/forbid-component-props`: Disallows `style` prop on components
- `react/forbid-dom-props`: Disallows `style` prop on DOM elements

## Exceptions

The following files are explicitly excluded from color rules:

- `src/styles/tokens.css` - Defines design tokens
- `src/styles/themes.css` - Defines theme-specific values

No exceptions are allowed for fixed positioning or z-index rules outside the designated components.

## Migration Guide

When migrating existing CSS:

1. **Identify hardcoded colors**: Search for `#`, `rgb(`, `hsl(` in CSS files
2. **Find appropriate token**: Consult `tokens.css` for available tokens
3. **Replace with variable**: Use `var(--token-name)`
4. **Test in both themes**: Verify appearance in light and dark modes

Example migration:
```css
/* Before */
.button {
  background: #0066cc;
  color: #ffffff;
  padding: 16px;
}

/* After */
.button {
  background: var(--color-accent);
  color: var(--color-bg-primary);
  padding: var(--space-4);
}
```

## Benefits

Following these ownership rules provides:

1. **Consistency**: All colors come from a single source of truth
2. **Themability**: Changing themes updates all components automatically
3. **Maintainability**: No need to hunt for hardcoded values
4. **Accessibility**: Centralized contrast ratio management
5. **Layout Safety**: No accidental overlaps from rogue fixed positioning

## Questions?

If you need a color, spacing, or z-index value that doesn't exist in the design tokens:

1. Check if an existing token can be used
2. If not, propose adding it to `tokens.css` or `themes.css`
3. Never add hardcoded values directly to component CSS

For layout needs that seem to require fixed positioning:

1. Check if AppShell extension points can solve the problem
2. Consider using absolute positioning within a relative container
3. Only use fixed positioning for true overlay components (modals, toasts)

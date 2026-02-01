# Semantic Token Mapping Guide

## Overview

This document provides a comprehensive mapping from Tailwind base color utilities (which are **NOT allowed** in components) to semantic tokens (which **MUST be used** instead).

**Rule**: All components must use semantic tokens from the theme system. Hardcoded Tailwind base colors (`slate-*`, `blue-*`, `gray-*`, `green-*`, `red-*`, `yellow-*`, `purple-*`, etc.) are prohibited outside of `frontend/src/styles/` and `frontend/src/theme/` directories.

## Status Colors

### Success States (Green)

| ❌ Prohibited | ✅ Use Instead | Context |
|--------------|---------------|---------|
| `text-green-50` | `text-success-50` | Very light success text |
| `text-green-100` | `text-success-100` | Light success text |
| `text-green-300` | `text-success-300` | Medium-light success text |
| `text-green-400` | `text-success-400` | Medium success text |
| `text-green-600` | `text-success-600` | Standard success text (most common) |
| `text-green-700` | `text-success-700` | Dark success text |
| `bg-green-50` | `bg-success-50` | Very light success background |
| `bg-green-100` | `bg-success-100` | Light success background |
| `bg-green-500` | `bg-success-500` | Standard success background |
| `bg-green-600` | `bg-success-600` | Dark success background |
| `border-green-500` | `border-success-500` | Success border |
| `border-green-600` | `border-success-600` | Dark success border |

**Dark Mode Variants:**
- `dark:text-green-400` → `dark:text-success-400`
- `dark:bg-green-500` → `dark:bg-success-500`

### Error States (Red)

| ❌ Prohibited | ✅ Use Instead | Context |
|--------------|---------------|---------|
| `text-red-50` | `text-error-50` | Very light error text |
| `text-red-100` | `text-error-100` | Light error text |
| `text-red-300` | `text-error-300` | Medium-light error text |
| `text-red-400` | `text-error-400` | Medium error text |
| `text-red-600` | `text-error-600` | Standard error text (most common) |
| `text-red-700` | `text-error-700` | Dark error text |
| `bg-red-50` | `bg-error-50` | Very light error background |
| `bg-red-100` | `bg-error-100` | Light error background |
| `bg-red-500` | `bg-error-500` | Standard error background |
| `bg-red-600` | `bg-error-600` | Dark error background |
| `border-red-500` | `border-error-500` | Error border |
| `border-red-600` | `border-error-600` | Dark error border |

**Dark Mode Variants:**
- `dark:text-red-400` → `dark:text-error-400`
- `dark:bg-red-500` → `dark:bg-error-500`

### Warning States (Yellow/Amber)

| ❌ Prohibited | ✅ Use Instead | Context |
|--------------|---------------|---------|
| `text-yellow-50` | `text-warning-50` | Very light warning text |
| `text-yellow-100` | `text-warning-100` | Light warning text |
| `text-yellow-300` | `text-warning-300` | Medium-light warning text |
| `text-yellow-400` | `text-warning-400` | Medium warning text |
| `text-yellow-600` | `text-warning-600` | Standard warning text (most common) |
| `text-yellow-700` | `text-warning-700` | Dark warning text |
| `text-amber-600` | `text-warning-600` | Amber is warning |
| `bg-yellow-50` | `bg-warning-50` | Very light warning background |
| `bg-yellow-100` | `bg-warning-100` | Light warning background |
| `bg-yellow-500` | `bg-warning-500` | Standard warning background |
| `bg-yellow-600` | `bg-warning-600` | Dark warning background |
| `border-yellow-500` | `border-warning-500` | Warning border |
| `border-yellow-600` | `border-warning-600` | Dark warning border |

**Dark Mode Variants:**
- `dark:text-yellow-400` → `dark:text-warning-400`
- `dark:bg-yellow-500` → `dark:bg-warning-500`

### Info States (Blue)

| ❌ Prohibited | ✅ Use Instead | Context |
|--------------|---------------|---------|
| `text-blue-50` | `text-info-50` | Very light info text |
| `text-blue-100` | `text-info-100` | Light info text |
| `text-blue-300` | `text-info-300` | Medium-light info text |
| `text-blue-400` | `text-info-400` | Medium info text |
| `text-blue-600` | `text-info-600` | Standard info text (most common) |
| `text-blue-700` | `text-info-700` | Dark info text |
| `bg-blue-50` | `bg-info-50` | Very light info background |
| `bg-blue-100` | `bg-info-100` | Light info background |
| `bg-blue-500` | `bg-info-500` | Standard info background |
| `bg-blue-600` | `bg-info-600` | Dark info background |
| `border-blue-500` | `border-info-500` | Info border |
| `border-blue-600` | `border-info-600` | Dark info border |

**Dark Mode Variants:**
- `dark:text-blue-400` → `dark:text-info-400`
- `dark:bg-blue-500` → `dark:bg-info-500`

## Surface & Background Colors

### Neutral Surfaces (Gray/Slate)

| ❌ Prohibited | ✅ Use Instead | Context |
|--------------|---------------|---------|
| `bg-white` | `bg-surface` or `bg-background` | Base background |
| `bg-gray-50` | `bg-surface` | Light surface |
| `bg-gray-100` | `bg-surface-elevated` | Elevated surface (cards, panels) |
| `bg-gray-200` | `bg-surface-elevated` | More elevated surface |
| `bg-slate-50` | `bg-surface` | Light surface |
| `bg-slate-100` | `bg-surface-elevated` | Elevated surface |
| `bg-slate-200` | `bg-surface-elevated` | More elevated surface |
| `bg-slate-800` | `bg-surface` (dark mode) | Dark surface |
| `bg-slate-900` | `bg-background` (dark mode) | Dark background |

### Text Colors

| ❌ Prohibited | ✅ Use Instead | Context |
|--------------|---------------|---------|
| `text-black` | `text-text-primary` | Primary text |
| `text-gray-900` | `text-text-primary` | Primary text |
| `text-gray-800` | `text-text-primary` | Primary text |
| `text-gray-700` | `text-text-secondary` | Secondary text |
| `text-gray-600` | `text-text-secondary` | Secondary text |
| `text-gray-500` | `text-text-tertiary` | Tertiary/muted text |
| `text-gray-400` | `text-text-tertiary` | Tertiary/muted text |
| `text-slate-900` | `text-text-primary` | Primary text |
| `text-slate-800` | `text-text-primary` | Primary text |
| `text-slate-700` | `text-text-secondary` | Secondary text |
| `text-slate-600` | `text-text-secondary` | Secondary text |
| `text-slate-500` | `text-text-tertiary` | Tertiary/muted text |
| `text-slate-400` | `text-text-tertiary` | Tertiary/muted text |

**Dark Mode Variants:**
- `dark:text-gray-100` → `dark:text-text-primary`
- `dark:text-gray-300` → `dark:text-text-secondary`
- `dark:text-gray-400` → `dark:text-text-tertiary`

### Border Colors

| ❌ Prohibited | ✅ Use Instead | Context |
|--------------|---------------|---------|
| `border-gray-200` | `border-border` | Standard border |
| `border-gray-300` | `border-border-dark` | Darker border |
| `border-gray-400` | `border-border-dark` | Strong border |
| `border-slate-200` | `border-border` | Standard border |
| `border-slate-300` | `border-border-dark` | Darker border |
| `border-slate-400` | `border-border-dark` | Strong border |

**Dark Mode Variants:**
- `dark:border-gray-700` → `dark:border-border`
- `dark:border-gray-600` → `dark:border-border-dark`

## Special Cases

### Purple (Scope Badges, Special UI)

| ❌ Prohibited | ✅ Use Instead | Context |
|--------------|---------------|---------|
| `bg-purple-500/20` | `bg-info-100` | Light purple background |
| `text-purple-600` | `text-info-600` | Purple text (use info) |
| `bg-purple-100` | `bg-info-100` | Light purple background |

**Note**: Purple is typically used for special UI elements like scope badges. If you need purple specifically for branding, use `bg-primary-*` or `text-primary-*` tokens which can be configured to purple via theme settings.

### Opacity Modifiers

When using opacity modifiers, apply them to semantic tokens:

| ❌ Prohibited | ✅ Use Instead |
|--------------|---------------|
| `bg-gray-500/20` | `bg-surface-elevated` or custom opacity |
| `bg-blue-500/10` | `bg-info-50` |
| `text-red-600/80` | `text-error-600 opacity-80` |

## Common Patterns

### Status Badges

```tsx
// ❌ WRONG
<span className="bg-green-100 text-green-800">Active</span>
<span className="bg-red-100 text-red-800">Error</span>
<span className="bg-yellow-100 text-yellow-800">Warning</span>

// ✅ CORRECT
<span className="bg-success-100 text-success-800">Active</span>
<span className="bg-error-100 text-error-800">Error</span>
<span className="bg-warning-100 text-warning-800">Warning</span>
```

### Cards & Panels

```tsx
// ❌ WRONG
<div className="bg-white border border-gray-200">
  <h2 className="text-gray-900">Title</h2>
  <p className="text-gray-600">Description</p>
</div>

// ✅ CORRECT
<div className="bg-surface border border-border">
  <h2 className="text-text-primary">Title</h2>
  <p className="text-text-secondary">Description</p>
</div>
```

### Buttons

```tsx
// ❌ WRONG
<button className="bg-blue-600 hover:bg-blue-700 text-white">
  Click me
</button>

// ✅ CORRECT
<button className="bg-primary-600 hover:bg-primary-700 text-white">
  Click me
</button>
```

### Icons

```tsx
// ❌ WRONG
<Icon name="check" className="text-green-600" />
<Icon name="error" className="text-red-600" />
<Icon name="warning" className="text-yellow-600" />

// ✅ CORRECT
<Icon name="check" className="text-success-600" />
<Icon name="error" className="text-error-600" />
<Icon name="warning" className="text-warning-600" />
```

## Utility Functions

When creating utility functions that return color classes, use semantic tokens:

```typescript
// ❌ WRONG
export function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'text-green-600';
    case 'error': return 'text-red-600';
    case 'warning': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
}

// ✅ CORRECT
export function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'text-success-600';
    case 'error': return 'text-error-600';
    case 'warning': return 'text-warning-600';
    default: return 'text-text-secondary';
  }
}
```

## Testing & Validation

### ESLint Rule

The codebase includes an ESLint rule to prevent hardcoded Tailwind base colors:

```bash
npm run lint:colors
```

This will scan for violations and report any hardcoded color utilities.

### Manual Verification

To manually check for violations:

```bash
# Search for common violations
grep -r "text-green-" frontend/src --exclude-dir=styles --exclude-dir=theme
grep -r "text-red-" frontend/src --exclude-dir=styles --exclude-dir=theme
grep -r "text-yellow-" frontend/src --exclude-dir=styles --exclude-dir=theme
grep -r "bg-gray-" frontend/src --exclude-dir=styles --exclude-dir=theme
grep -r "bg-slate-" frontend/src --exclude-dir=styles --exclude-dir=theme
```

## Migration Checklist

When refactoring a component:

- [ ] Replace all `text-green-*` with `text-success-*`
- [ ] Replace all `text-red-*` with `text-error-*`
- [ ] Replace all `text-yellow-*` with `text-warning-*`
- [ ] Replace all `text-blue-*` with `text-info-*`
- [ ] Replace all `bg-gray-*` / `bg-slate-*` with `bg-surface-*` or `bg-background`
- [ ] Replace all `text-gray-*` / `text-slate-*` with `text-text-*`
- [ ] Replace all `border-gray-*` / `border-slate-*` with `border-border-*`
- [ ] Update dark mode variants to use semantic tokens
- [ ] Test theme changes propagate correctly
- [ ] Run `npm run lint:colors` to verify compliance

## Benefits of Semantic Tokens

1. **Theme Consistency**: All components automatically respect theme changes
2. **Dark Mode Support**: Semantic tokens automatically adapt to dark mode
3. **Branding Flexibility**: Easy to customize colors via theme configuration
4. **Maintainability**: Centralized color management
5. **Accessibility**: Ensures proper contrast ratios across themes

## Reference

- **Source of Truth**: `frontend/src/styles/tokens.css`
- **Theme Variants**: `frontend/src/styles/themes.css`
- **Tailwind Config**: `frontend/tailwind.config.js`
- **Theme Engine**: `frontend/src/theme/ThemeEngine.ts`
- **Global Rules**: `GLOBAL_RULES_EASYSALE.md`

---

*Last updated: 2026-01-30*

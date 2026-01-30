# Tailwind CSS Usage Guidelines

**Date:** 2026-01-24  
**Epic:** 1 - Token System, Theme Engine, and Tenant Config Integration  
**Task:** 2.0.1 Tailwind-token alignment  
**Validates Requirements:** 1.7, 1.8

---

## Overview

EasySale uses Tailwind CSS for utility-based styling, but with **strict rules** to ensure theme consistency and maintainability. All Tailwind color utilities MUST reference CSS custom properties (design tokens) to support dynamic theming.

---

## Core Principle

**✅ ALLOWED:** Tailwind classes that resolve to CSS variables  
**❌ FORBIDDEN:** Hard-coded Tailwind color values (e.g., `bg-blue-500`)

---

## When to Use Tailwind vs CSS Modules

### Use Tailwind For:

1. **Layout and Spacing**
   ```tsx
   <div className="flex items-center gap-4 p-6">
     <div className="w-64 h-full">Sidebar</div>
     <div className="flex-1">Content</div>
   </div>
   ```

2. **Responsive Design**
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
     {items.map(item => <Card key={item.id} />)}
   </div>
   ```

3. **Typography**
   ```tsx
   <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>
   <p className="text-sm text-secondary">Last updated 5 minutes ago</p>
   ```

4. **Common UI Patterns**
   ```tsx
   <button className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover">
     Save Changes
   </button>
   ```

5. **Utility Combinations**
   ```tsx
   <div className="absolute top-0 right-0 z-50 shadow-lg rounded-md">
     <Dropdown />
   </div>
   ```

### Use CSS Modules For:

1. **Component-Specific Styling**
   ```tsx
   // DataTable.module.css
   .table {
     border-collapse: collapse;
     width: 100%;
   }
   
   .row:hover {
     background: var(--color-surface-2);
   }
   ```

2. **Complex State-Based Styling**
   ```tsx
   // Button.module.css
   .button {
     /* Base styles */
   }
   
   .button[data-variant="primary"] {
     background: var(--color-accent);
   }
   
   .button[data-variant="primary"]:hover:not(:disabled) {
     background: var(--color-accent-hover);
   }
   ```

3. **Animation and Transitions**
   ```tsx
   // Modal.module.css
   .modal {
     animation: fadeIn 0.3s ease-out;
   }
   
   @keyframes fadeIn {
     from { opacity: 0; transform: scale(0.95); }
     to { opacity: 1; transform: scale(1); }
   }
   ```

4. **Pseudo-Elements and Pseudo-Classes**
   ```tsx
   // Input.module.css
   .input::placeholder {
     color: var(--color-text-muted);
   }
   
   .input:focus-visible {
     outline: 2px solid var(--color-focus-ring);
     outline-offset: 2px;
   }
   ```

---

## Allowed Tailwind Color Classes

All color classes in `tailwind.config.js` reference CSS variables. You can safely use:

### Brand Colors
```tsx
// Primary (tenant-configurable)
<div className="bg-primary-500 text-white">Primary Action</div>
<div className="border-primary-600">Primary Border</div>

// Secondary (neutral)
<div className="bg-secondary-100 text-secondary-900">Secondary Surface</div>

// Accent (theme-configurable)
<div className="bg-accent hover:bg-accent-hover">Accent Button</div>
```

### Semantic Colors
```tsx
// Success
<div className="bg-success text-white">Success Message</div>
<div className="text-success-600">Success Text</div>

// Warning
<div className="bg-warning text-white">Warning Message</div>
<div className="text-warning-600">Warning Text</div>

// Error
<div className="bg-error text-white">Error Message</div>
<div className="text-error-600">Error Text</div>

// Info
<div className="bg-info text-white">Info Message</div>
<div className="text-info-600">Info Text</div>
```

### UI Semantic Colors
```tsx
// Background
<div className="bg-background">Page Background</div>
<div className="bg-background-secondary">Secondary Background</div>

// Surface (for cards, panels)
<div className="bg-surface">Card Surface</div>
<div className="bg-surface-elevated">Elevated Card</div>

// Border
<div className="border border-border">Default Border</div>
<div className="border border-border-subtle">Subtle Border</div>

// Text
<p className="text-text-primary">Primary Text</p>
<p className="text-text-secondary">Secondary Text</p>
<p className="text-text-tertiary">Tertiary Text</p>

// Focus Ring
<button className="focus:ring-2 focus:ring-focus">Focusable Button</button>

// Divider
<hr className="border-divider" />
```

---

## Forbidden Patterns

### ❌ Hard-Coded Tailwind Colors

**NEVER use Tailwind's default color palette directly:**

```tsx
// ❌ FORBIDDEN - Hard-coded blue
<div className="bg-blue-500 text-white">Button</div>

// ❌ FORBIDDEN - Hard-coded slate
<div className="bg-slate-800 text-slate-100">Card</div>

// ❌ FORBIDDEN - Hard-coded red
<div className="text-red-600">Error Message</div>
```

**Why?** These colors don't respond to theme changes and break tenant customization.

**✅ CORRECT - Use semantic tokens:**

```tsx
// ✅ CORRECT - Uses theme-aware accent color
<div className="bg-accent text-white">Button</div>

// ✅ CORRECT - Uses theme-aware surface color
<div className="bg-surface-elevated text-text-primary">Card</div>

// ✅ CORRECT - Uses semantic error color
<div className="text-error">Error Message</div>
```

### ❌ Inline Styles

**NEVER use inline styles for colors:**

```tsx
// ❌ FORBIDDEN - Inline style
<div style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}>Button</div>
```

**Why?** Inline styles bypass the design token system and linting rules.

**✅ CORRECT - Use Tailwind classes or CSS modules:**

```tsx
// ✅ CORRECT - Tailwind classes
<div className="bg-accent text-white">Button</div>

// ✅ CORRECT - CSS module
<div className={styles.button}>Button</div>
```

### ❌ Arbitrary Values for Colors

**NEVER use Tailwind's arbitrary value syntax for colors:**

```tsx
// ❌ FORBIDDEN - Arbitrary color value
<div className="bg-[#3b82f6] text-[#ffffff]">Button</div>
```

**Why?** Arbitrary values bypass the design token system.

**✅ CORRECT - Use design tokens:**

```tsx
// ✅ CORRECT - Design token
<div className="bg-accent text-white">Button</div>

// ✅ CORRECT - CSS variable in CSS module
.button {
  background: var(--color-accent);
  color: white;
}
```

---

## Spacing and Layout

Tailwind spacing utilities are **allowed and encouraged** for layout:

```tsx
// ✅ CORRECT - Spacing utilities
<div className="p-4 m-2 gap-6">
  <div className="space-y-4">
    <Card />
    <Card />
  </div>
</div>

// ✅ CORRECT - Flexbox and Grid
<div className="flex items-center justify-between">
  <h1>Title</h1>
  <button>Action</button>
</div>

<div className="grid grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

**Note:** Spacing values in `tailwind.config.js` are fixed (not CSS variables) because they don't need to change with themes.

---

## Border Radius and Shadows

Border radius and shadows **reference CSS variables** for theme consistency:

```tsx
// ✅ CORRECT - Border radius (references --radius-*)
<div className="rounded-lg">Card with rounded corners</div>
<button className="rounded-full">Circular button</button>

// ✅ CORRECT - Shadows (references --shadow-*)
<div className="shadow-md">Card with medium shadow</div>
<div className="shadow-lg">Card with large shadow</div>
```

---

## Typography

Typography utilities are **allowed and encouraged**:

```tsx
// ✅ CORRECT - Font sizes
<h1 className="text-2xl font-semibold">Page Title</h1>
<p className="text-base">Body text</p>
<span className="text-sm text-text-secondary">Helper text</span>

// ✅ CORRECT - Font weights
<p className="font-normal">Normal weight</p>
<p className="font-medium">Medium weight</p>
<p className="font-bold">Bold weight</p>

// ✅ CORRECT - Line heights
<p className="leading-tight">Tight line height</p>
<p className="leading-normal">Normal line height</p>
<p className="leading-relaxed">Relaxed line height</p>
```

---

## Responsive Design

Tailwind's responsive utilities are **fully supported**:

```tsx
// ✅ CORRECT - Responsive breakpoints
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <Card />
  <Card />
  <Card />
</div>

// ✅ CORRECT - Responsive spacing
<div className="p-4 md:p-6 lg:p-8">
  Content with responsive padding
</div>

// ✅ CORRECT - Responsive visibility
<div className="hidden md:block">
  Visible on medium screens and up
</div>
```

---

## State Variants

Tailwind's state variants are **fully supported**:

```tsx
// ✅ CORRECT - Hover states
<button className="bg-accent hover:bg-accent-hover">
  Hover me
</button>

// ✅ CORRECT - Focus states
<input className="border border-border focus:border-accent focus:ring-2 focus:ring-focus" />

// ✅ CORRECT - Disabled states
<button className="bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
  Submit
</button>

// ✅ CORRECT - Active states
<button className="bg-accent active:scale-95">
  Click me
</button>
```

---

## Dark Mode Support

**DO NOT use Tailwind's `dark:` variant.** Theme switching is handled by CSS custom properties:

```tsx
// ❌ FORBIDDEN - Tailwind dark mode variant
<div className="bg-white dark:bg-slate-900">
  Content
</div>

// ✅ CORRECT - Use theme-aware tokens
<div className="bg-background">
  Content (automatically adapts to light/dark theme)
</div>
```

**Why?** The theme engine manages light/dark mode by updating CSS variables. Using `dark:` variants would conflict with this system.

---

## Linting Enforcement

The following linting rules enforce these guidelines:

### Stylelint Rules

```javascript
// .stylelintrc.js
module.exports = {
  rules: {
    // Disallow hex colors outside tokens.css and themes.css
    'color-no-hex': true,
    
    // Disallow rgb/hsl functions
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    
    // Require CSS variables for color properties
    'declaration-property-value-allowed-list': {
      '/^(color|background|border|outline)/': ['/^var\\(--/']
    }
  },
  ignoreFiles: [
    'src/styles/tokens.css',
    'src/styles/themes.css'
  ]
};
```

### ESLint Rules

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Ban inline style prop
    'react/forbid-component-props': [
      'error',
      {
        forbid: [
          {
            propName: 'style',
            message: 'Use CSS modules or design tokens instead of inline styles'
          }
        ]
      }
    ],
    'react/forbid-dom-props': [
      'error',
      {
        forbid: [
          {
            propName: 'style',
            message: 'Use CSS modules or design tokens instead of inline styles'
          }
        ]
      }
    ]
  }
};
```

---

## Migration Examples

### Before (Hard-Coded Colors)

```tsx
// ❌ OLD - Hard-coded Tailwind colors
function Button({ children }) {
  return (
    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
      {children}
    </button>
  );
}
```

### After (Design Tokens)

```tsx
// ✅ NEW - Theme-aware tokens
function Button({ children }) {
  return (
    <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg">
      {children}
    </button>
  );
}
```

### Before (Inline Styles)

```tsx
// ❌ OLD - Inline styles
function Card({ children }) {
  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      padding: '16px', 
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {children}
    </div>
  );
}
```

### After (Tailwind + Tokens)

```tsx
// ✅ NEW - Tailwind classes with tokens
function Card({ children }) {
  return (
    <div className="bg-surface p-4 rounded-lg shadow-md">
      {children}
    </div>
  );
}
```

---

## Quick Reference

### ✅ Allowed Tailwind Utilities

| Category | Examples | Notes |
|----------|----------|-------|
| **Layout** | `flex`, `grid`, `block`, `inline` | Fully supported |
| **Spacing** | `p-4`, `m-2`, `gap-6`, `space-y-4` | Fully supported |
| **Sizing** | `w-64`, `h-full`, `min-h-screen` | Fully supported |
| **Typography** | `text-2xl`, `font-semibold`, `leading-normal` | Fully supported |
| **Colors** | `bg-accent`, `text-primary`, `border-border` | MUST use tokens |
| **Borders** | `border`, `rounded-lg`, `divide-y` | Fully supported |
| **Shadows** | `shadow-md`, `shadow-lg` | References CSS vars |
| **Effects** | `opacity-50`, `blur-sm` | Fully supported |
| **Transitions** | `transition`, `duration-300`, `ease-in-out` | Fully supported |
| **Transforms** | `scale-95`, `rotate-45`, `translate-x-4` | Fully supported |
| **Responsive** | `md:grid-cols-2`, `lg:p-8` | Fully supported |
| **States** | `hover:`, `focus:`, `active:`, `disabled:` | Fully supported |

### ❌ Forbidden Patterns

| Pattern | Why Forbidden | Alternative |
|---------|---------------|-------------|
| `bg-blue-500` | Hard-coded color | `bg-accent` or `bg-primary-500` |
| `text-red-600` | Hard-coded color | `text-error` |
| `dark:bg-slate-900` | Conflicts with theme engine | `bg-background` (auto-adapts) |
| `style={{ color: '#fff' }}` | Bypasses design tokens | `className="text-white"` |
| `bg-[#3b82f6]` | Arbitrary color value | `bg-accent` |

---

## Summary

1. **Use Tailwind for layout, spacing, and responsive design** - These utilities are powerful and don't conflict with theming
2. **Use CSS modules for component-specific styling** - Complex state logic, animations, and pseudo-elements
3. **Always use design tokens for colors** - Never hard-code color values
4. **Never use inline styles** - They bypass linting and design tokens
5. **Never use Tailwind's `dark:` variant** - Theme engine handles light/dark mode
6. **Follow linting rules** - They enforce these guidelines automatically

---

**Questions?** Refer to the [Design Token Documentation](./design-tokens.md) or ask the team.


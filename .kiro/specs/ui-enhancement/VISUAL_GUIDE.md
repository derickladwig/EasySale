# Visual Guide - UI Enhancement Examples

## Color Palette

### Background Colors
```css
/* Main app background */
.bg-background-primary { background: #0f172a; }

/* Cards and panels */
.bg-background-secondary { background: #1e293b; }

/* Hover states */
.bg-background-tertiary { background: #334155; }
```

### Text Colors
```css
/* High emphasis */
.text-primary { color: #f1f5f9; }

/* Medium emphasis */
.text-secondary { color: #cbd5e1; }

/* Low emphasis */
.text-tertiary { color: #94a3b8; }

/* Disabled */
.text-disabled { color: #64748b; }
```

### Accent Colors
```css
/* Primary brand */
.bg-primary-500 { background: #3b82f6; }

/* Success */
.bg-success { background: #22c55e; }

/* Warning */
.bg-warning { background: #f59e0b; }

/* Error */
.bg-error { background: #ef4444; }
```

## Component Examples

### Button Variants

```tsx
// Primary Button
<Button variant="primary" size="md">
  Save Changes
</Button>
// Result: Blue background, white text, shadow

// Secondary Button
<Button variant="secondary" size="md">
  Cancel
</Button>
// Result: Dark gray background, white text

// Outline Button
<Button variant="outline" size="md">
  Learn More
</Button>
// Result: Transparent background, blue border and text

// Danger Button
<Button variant="danger" size="md">
  Delete Item
</Button>
// Result: Red background, white text, shadow
```


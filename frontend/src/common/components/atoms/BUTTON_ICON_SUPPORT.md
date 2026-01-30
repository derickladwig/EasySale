# Button Icon Support

## Overview

The Button component now fully supports icon-only, text-only, and icon+text variants as specified in Requirement 7.6.

## Features

### 1. Icon-Only Buttons

Buttons can now be rendered with just an icon, without any text content:

```tsx
<Button 
  leftIcon={<Icon icon={Plus} />} 
  aria-label="Add item"
/>
```

**Key Features:**
- Automatically detects when no children are provided
- Applies square/circular styling (`aspect-square p-0`)
- Requires `aria-label` for accessibility (Requirement 18.4)
- Warns in development if `aria-label` is missing

### 2. Icon + Text Buttons

Buttons can have icons on the left, right, or both sides:

```tsx
// Left icon
<Button leftIcon={<Icon icon={Plus} />}>
  Add Item
</Button>

// Right icon
<Button rightIcon={<Icon icon={ArrowRight} />}>
  Next
</Button>

// Both icons
<Button 
  leftIcon={<Icon icon={Plus} />}
  rightIcon={<Icon icon={Download} />}
>
  Add & Download
</Button>
```

**Key Features:**
- Proper spacing between icon and text (`mr-2 -ml-1` for left, `ml-2 -mr-1` for right)
- Icons hidden during loading state
- Works with all button variants and sizes

### 3. Icon Positioning

Icons can be positioned on either side of the button text:

- **Left Icon**: Use `leftIcon` prop
- **Right Icon**: Use `rightIcon` prop
- **Both**: Use both props simultaneously

## Implementation Details

### Icon-Only Detection

The component automatically detects icon-only buttons:

```typescript
const isIconOnly = !children && (leftIcon || rightIcon);
```

### Conditional Spacing

Icon spacing is only applied when text is present:

```tsx
<span className={cn(children && 'mr-2 -ml-1')}>
  {leftIcon}
</span>
```

### Accessibility

Icon-only buttons require an `aria-label` for screen readers:

```tsx
// ✅ Good - has aria-label
<Button leftIcon={<Icon icon={Settings} />} aria-label="Settings" />

// ❌ Bad - missing aria-label (will warn in development)
<Button leftIcon={<Icon icon={Settings} />} />
```

## Examples

### All Variants with Icons

```tsx
<Button variant="primary" leftIcon={<Icon icon={Plus} />} aria-label="Add" />
<Button variant="secondary" leftIcon={<Icon icon={Download} />} aria-label="Download" />
<Button variant="outline" leftIcon={<Icon icon={Trash2} />} aria-label="Delete" />
<Button variant="ghost" leftIcon={<Icon icon={Settings} />} aria-label="Settings" />
<Button variant="danger" leftIcon={<Icon icon={Trash2} />} aria-label="Remove" />
```

### Different Sizes

```tsx
<Button size="sm" leftIcon={<Icon icon={Plus} size="sm" />} aria-label="Add" />
<Button size="md" leftIcon={<Icon icon={Plus} size="sm" />} aria-label="Add" />
<Button size="lg" leftIcon={<Icon icon={Plus} size="md" />} aria-label="Add" />
<Button size="xl" leftIcon={<Icon icon={Plus} size="lg" />} aria-label="Add" />
```

### With Text

```tsx
<Button variant="primary" leftIcon={<Icon icon={Plus} />}>
  Add Item
</Button>

<Button variant="secondary" rightIcon={<Icon icon={ArrowRight} />}>
  Next Step
</Button>
```

## Testing

The Button component includes comprehensive tests for icon support:

- ✅ Icon-only buttons with left icon
- ✅ Icon-only buttons with right icon
- ✅ Icon + text buttons with proper spacing
- ✅ Accessibility (aria-label requirement)
- ✅ Development warnings for missing aria-label
- ✅ Icon positioning (left/right)
- ✅ Icons hidden during loading state

Run tests with:

```bash
npm test -- Button.test.tsx
```

## Storybook Examples

View all icon variants in Storybook:

- `IconOnlyLeft` - Icon-only button with left icon
- `IconOnlyRight` - Icon-only button with right icon
- `IconOnlyVariants` - All variants as icon-only buttons
- `IconOnlySizes` - All sizes as icon-only buttons
- `WithLeftIcon` - Button with left icon and text
- `WithRightIcon` - Button with right icon and text
- `WithBothIcons` - Button with both icons and text

## Requirements Satisfied

- ✅ **Requirement 7.6**: Support icon-only, text-only, and icon+text variants
- ✅ **Requirement 18.4**: Provide ARIA labels for icon-only buttons

## Migration Guide

If you were previously using icons as children:

```tsx
// ❌ Old way (still works but not recommended)
<Button>
  <Icon icon={Plus} />
</Button>

// ✅ New way (recommended)
<Button leftIcon={<Icon icon={Plus} />} aria-label="Add" />
```

The new approach provides:
- Better accessibility
- Proper spacing
- Consistent styling
- Type safety

# Design System - Base Components

This directory contains the foundational UI components for the EasySale system. All components follow the design tokens defined in `tailwind.config.js` and enforce consistent styling across the application.

## Components

### Button
A versatile button component with multiple variants and sizes.

**Variants:**
- `primary` - Main action button (blue)
- `secondary` - Secondary actions (gray)
- `ghost` - Minimal styling for tertiary actions
- `danger` - Destructive actions (red)

**Sizes:**
- `sm` - Small (compact interfaces)
- `md` - Medium (default)
- `lg` - Large (prominent actions)

**Usage:**
```tsx
import { Button } from '@common/components';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

### Input
Text input component with validation states and labels.

**Variants:**
- `default` - Normal state
- `error` - Validation error
- `success` - Validation success

**Features:**
- Optional label
- Helper text
- Full width option
- Disabled state

**Usage:**
```tsx
import { Input } from '@common/components';

<Input
  label="Email"
  placeholder="Enter your email..."
  variant="default"
  helperText="We'll never share your email"
  fullWidth
/>
```

### Select
Dropdown selection component.

**Features:**
- Optional label
- Helper text
- Placeholder option
- Full width option
- Disabled state

**Usage:**
```tsx
import { Select } from '@common/components';

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
];

<Select
  label="Choose an option"
  options={options}
  placeholder="Select..."
  fullWidth
/>
```

### Card
Container component with optional header and footer slots.

**Features:**
- Optional header section
- Optional footer section
- Configurable padding (none, sm, md, lg)
- Border and shadow styling

**Usage:**
```tsx
import { Card, CardHeader } from '@common/components';

<Card
  header={<CardHeader title="Card Title" subtitle="Subtitle" />}
  footer={<Button>Action</Button>}
  padding="md"
>
  Card content goes here
</Card>
```

## Design Principles

### Consistency
All components use design tokens from Tailwind configuration:
- Colors from the defined palette
- Spacing from the spacing scale (2, 3, 4, 6, 8, 12, 16, 20, 24, 32)
- Typography from the font size scale
- Border radius from the defined scale

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Focus states with visible outlines
- Disabled states clearly indicated
- Sufficient color contrast

### Composability
Components are designed to work together:
- Consistent sizing and spacing
- Compatible color schemes
- Predictable behavior

## Adding New Components

When adding new components:

1. **Follow the existing patterns**
   - Use TypeScript with proper types
   - Use forwardRef for components that need refs
   - Export types alongside components

2. **Use design tokens**
   - Never use arbitrary values (e.g., `px-[17px]`)
   - Use only defined spacing, colors, and typography

3. **Support common props**
   - `className` for custom styling
   - `fullWidth` for layout flexibility
   - `disabled` for interactive elements

4. **Document the component**
   - Add JSDoc comments
   - Update this README
   - Consider adding to Storybook (when available)

5. **Export from index.ts**
   - Export the component
   - Export all related types

## Future Components

Components planned for implementation:
- Table (sortable, filterable)
- Modal (dialog component)
- Toast (notifications)
- Badge (status indicators)
- Tabs (secondary navigation)

See `tasks.md` for implementation schedule.

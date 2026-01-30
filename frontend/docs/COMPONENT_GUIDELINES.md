# Component Creation Guidelines

This guide provides standards and best practices for creating new components in the EasySale design system.

## File Structure

Each component should follow this structure:

```
src/common/components/
├── atoms/
│   ├── Button.tsx           # Component implementation
│   ├── Button.test.tsx      # Unit tests
│   └── Button.stories.tsx   # Storybook stories
├── molecules/
│   └── ...
└── organisms/
    └── ...
```

## Component Template

Use this template for new components:

```typescript
import React from 'react';
import { cn } from '../../utils/classNames';

export interface ComponentNameProps {
  /** Prop description */
  propName?: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Component content */
  children?: React.ReactNode;
}

/**
 * ComponentName Component
 * 
 * Brief description of what the component does.
 * 
 * @example
 * // Basic usage
 * <ComponentName propName="value">
 *   Content
 * </ComponentName>
 */
export const ComponentName = React.forwardRef<HTMLDivElement, ComponentNameProps>(
  (
    {
      propName,
      className,
      children,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'base-classes',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

ComponentName.displayName = 'ComponentName';
```

## Naming Conventions

### Component Names
- Use **PascalCase** for component names: `Button`, `FormField`, `DataTable`
- Be descriptive and specific: `StatusIndicator` not `Status`
- Avoid abbreviations unless widely understood: `URL` is OK, `Btn` is not

### File Names
- Match the component name: `Button.tsx`, `FormField.tsx`
- Test files: `Button.test.tsx`
- Story files: `Button.stories.tsx`

### Prop Names
- Use **camelCase** for prop names: `onClick`, `isDisabled`, `maxWidth`
- Boolean props should be prefixed with `is`, `has`, `should`, or `can`: `isOpen`, `hasError`, `shouldAutoFocus`
- Event handlers should be prefixed with `on`: `onClick`, `onChange`, `onSubmit`

### CSS Classes
- Use Tailwind utility classes whenever possible
- Custom classes should be **kebab-case**: `custom-button`, `form-field-wrapper`
- Use the `cn()` utility to combine classes conditionally

## Prop Interface Patterns

### Required vs Optional Props
```typescript
export interface ComponentProps {
  // Required props (no ?)
  id: string;
  label: string;
  
  // Optional props (with ?)
  description?: string;
  disabled?: boolean;
  
  // Optional with default value (document in JSDoc)
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
}
```

### Extending HTML Attributes
```typescript
// For button-like components
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  // ... custom props
}

// For input-like components
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  // ... custom props
}

// For div-like components
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated';
  // ... custom props
}
```

### Omitting Conflicting Props
```typescript
// When you need to override a prop type
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'; // Custom size prop
}
```

## Component Patterns

### Forwarding Refs
Always use `React.forwardRef` for components that render DOM elements:

```typescript
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return <button ref={ref} {...props} />;
  }
);

Button.displayName = 'Button';
```

### Variants with Type Safety
Use union types for variants:

```typescript
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  variant?: ButtonVariant;
}
```

### Conditional Classes
Use the `cn()` utility for conditional classes:

```typescript
<button
  className={cn(
    'base-classes',
    variant === 'primary' && 'primary-classes',
    variant === 'secondary' && 'secondary-classes',
    disabled && 'disabled-classes',
    className
  )}
>
```

### Default Props
Use default parameter values instead of `defaultProps`:

```typescript
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      ...props
    },
    ref
  ) => {
    // ...
  }
);
```

## Testing Requirements

Every component must have comprehensive unit tests:

### Test Structure
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary-600');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Test Coverage
- ✅ Rendering with different props
- ✅ All variants and sizes
- ✅ Event handlers
- ✅ Disabled and loading states
- ✅ Accessibility attributes
- ✅ Edge cases (empty children, long text, etc.)

## Accessibility Requirements

### Semantic HTML
Use semantic HTML elements:
- `<button>` for buttons, not `<div onClick>`
- `<input>` for inputs, not custom implementations
- `<nav>` for navigation, `<main>` for main content

### ARIA Attributes
Add ARIA attributes when needed:
```typescript
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  aria-expanded={isExpanded}
>
```

### Keyboard Navigation
Ensure keyboard accessibility:
- All interactive elements must be focusable
- Support standard keyboard shortcuts (Enter, Space, Escape, Arrow keys)
- Visible focus indicators

### Screen Reader Support
- Use `aria-label` for icon-only buttons
- Use `aria-describedby` for helper text and errors
- Use `aria-live` for dynamic content updates

## Styling Guidelines

### Tailwind First
Use Tailwind utility classes for all styling:
```typescript
<div className="flex items-center gap-4 p-4 bg-dark-800 rounded-lg">
```

### Custom CSS Only When Necessary
Create custom CSS only for:
- Complex animations
- Print styles
- Browser-specific fixes

### Responsive Design
Use responsive modifiers:
```typescript
<div className="flex flex-col md:flex-row gap-4">
```

### Dark Theme
All components should work with the dark theme:
- Use `dark-*` color tokens
- Test on dark backgrounds
- Ensure sufficient contrast

## Documentation

### JSDoc Comments
Document all components and props:
```typescript
/**
 * Button Component
 * 
 * A versatile button component with multiple variants and sizes.
 * 
 * @example
 * // Primary button
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 */
export const Button = ...
```

### Storybook Stories
Create comprehensive stories:
- Default state
- All variants
- All sizes
- With icons
- Loading state
- Disabled state
- Interactive examples

## Performance Considerations

### Memoization
Use `React.memo` for expensive components:
```typescript
export const ExpensiveComponent = React.memo(({ data }) => {
  // Complex rendering logic
});
```

### Callback Optimization
Use `useCallback` for event handlers passed to children:
```typescript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Avoid Inline Functions
Don't create functions in render:
```typescript
// ❌ Bad
<Button onClick={() => handleClick(id)}>

// ✅ Good
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<Button onClick={handleButtonClick}>
```

## Common Pitfalls

### ❌ Don't Use Index as Key
```typescript
// ❌ Bad
{items.map((item, index) => <Item key={index} />)}

// ✅ Good
{items.map((item) => <Item key={item.id} />)}
```

### ❌ Don't Mutate Props
```typescript
// ❌ Bad
props.items.push(newItem);

// ✅ Good
const newItems = [...props.items, newItem];
```

### ❌ Don't Use Inline Styles
```typescript
// ❌ Bad
<div style={{ color: 'red' }}>

// ✅ Good
<div className="text-error-500">
```

### ❌ Don't Forget Accessibility
```typescript
// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good
<button onClick={handleClick}>Click me</button>
```

## Checklist for New Components

Before submitting a new component, ensure:

- [ ] Component follows naming conventions
- [ ] Props are properly typed with TypeScript
- [ ] Component uses `React.forwardRef`
- [ ] Component has `displayName` set
- [ ] All props are documented with JSDoc
- [ ] Component uses Tailwind classes
- [ ] Component works with dark theme
- [ ] Component is responsive
- [ ] Component is accessible (ARIA, keyboard, screen reader)
- [ ] Component has comprehensive unit tests (>80% coverage)
- [ ] Component has Storybook stories
- [ ] Component is exported from index.ts
- [ ] Component follows atomic design principles
- [ ] Component implements Empty State Contract (if applicable)

## Empty State Contract

All components that display data lists, tables, charts, or detail panes must implement consistent empty state handling. This ensures the application never appears broken or unusable when data is unavailable.

### Why Empty States Matter

Empty states are critical for user experience:
- **Prevent confusion**: Users know the app is working, just no data yet
- **Guide action**: Show users what to do next
- **Build confidence**: Professional appearance even with no data
- **Reduce support**: Clear messaging reduces "is it broken?" questions

### Empty State Rules

#### For Lists and Tables

When displaying a list or table with no data:

```typescript
if (data.length === 0) {
  return (
    <EmptyState
      title="No [items] found"
      description="Brief explanation of why this might be empty"
      primaryAction={{
        label: "Primary Action",
        onClick: handlePrimaryAction
      }}
      secondaryAction={{
        label: "Secondary Action",
        onClick: handleSecondaryAction
      }}
    />
  );
}
```

**Requirements**:
- Display message: "No [items] found" (e.g., "No inventory found", "No customers found")
- Show primary action button: "Scan to receive", "Create customer", "Import products", etc.
- If filters/search are active: Show "Clear filters" or "Reset search" option
- Ensure keyboard accessibility: Enter key triggers primary action when appropriate

**Examples**:
- Inventory page: "No inventory found" + "Scan to receive" button
- Customers page: "No customers found" + "Create customer" button
- Products page: "No products found" + "Import products" button

#### For Detail Panes

When displaying a detail pane with no selection:

```typescript
if (!selectedItem) {
  return (
    <EmptyDetailPane
      message="Select an item to view details"
      shortcuts={[
        { key: 'F3', description: 'Search' },
        { key: 'Ctrl+N', description: 'Create new' }
      ]}
    />
  );
}
```

**Requirements**:
- Display message: "Select an item to view details" or "Select a [type] from the list"
- Show keyboard shortcuts if applicable (e.g., "Press F3 to search")
- Never show blank/empty space without explanation

**Examples**:
- Product detail pane: "Select a product to view details" + keyboard shortcuts
- Customer detail pane: "Select a customer to view details" + shortcuts

#### For Charts and Metrics

When displaying charts or metrics with insufficient data:

```typescript
if (data.length === 0 || !hasEnoughData) {
  return (
    <EmptyChart
      message="Not enough data to display chart"
      context="Add transactions to see trends"
    />
  );
}
```

**Requirements**:
- Display message: "Not enough data to display chart"
- Never show NaN, undefined, or division errors
- Provide context: "Add transactions to see trends"
- Guard against division by zero in calculations

**Examples**:
- Sales chart: "Not enough data to display chart" + "Add transactions to see trends"
- Performance metrics: "Not enough data to display metrics" + context message

### Runtime Safety

All components must handle empty data gracefully:

```typescript
// ✅ GOOD: Safe array operations
const total = items?.reduce((sum, item) => sum + item.price, 0) ?? 0;
const average = items.length > 0 ? total / items.length : 0;

// ❌ BAD: Unsafe operations
const total = items.reduce((sum, item) => sum + item.price, 0); // Crashes if items is undefined
const average = total / items.length; // NaN if items.length is 0
```

**Requirements**:
- No console errors when arrays are empty
- No runtime exceptions from empty data
- All map/filter/reduce operations must handle empty arrays gracefully
- Use optional chaining: `data?.map(...)`
- Provide default values: `data ?? []`
- Guard against division by zero

### Empty State Components

The design system provides three reusable empty state components:

#### EmptyState

For lists and tables:

```typescript
import { EmptyState } from '@/common/components/EmptyState';

<EmptyState
  title="No inventory found"
  description="Start by scanning items to receive or import your inventory"
  primaryAction={{
    label: "Scan to receive",
    onClick: handleScan
  }}
  secondaryAction={{
    label: "Import inventory",
    onClick: handleImport
  }}
  icon={<PackageIcon />}
/>
```

#### EmptyDetailPane

For detail panes in list/detail layouts:

```typescript
import { EmptyDetailPane } from '@/common/components/EmptyDetailPane';

<EmptyDetailPane
  message="Select a product to view details"
  shortcuts={[
    { key: 'F3', description: 'Search products' },
    { key: 'Ctrl+N', description: 'Create new product' }
  ]}
/>
```

#### EmptyChart

For charts and data visualizations:

```typescript
import { EmptyChart } from '@/common/components/EmptyChart';

<EmptyChart
  message="Not enough data to display chart"
  context="Add at least 5 transactions to see sales trends"
/>
```

### Implementation Pattern

Follow this pattern when implementing data-driven components:

```typescript
import { useDataQuery } from '@/hooks/useDataQuery';
import { EmptyState } from '@/common/components/EmptyState';
import { LoadingSpinner } from '@/common/components/LoadingSpinner';
import { ErrorMessage } from '@/common/components/ErrorMessage';

export const MyDataComponent = () => {
  // 1. Fetch data with hook
  const { data = [], isLoading, error } = useDataQuery();

  // 2. Handle loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 3. Handle error state
  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  // 4. Handle empty state
  if (data.length === 0) {
    return (
      <EmptyState
        title="No items found"
        description="Get started by adding your first item"
        primaryAction={{
          label: "Add item",
          onClick: handleAdd
        }}
      />
    );
  }

  // 5. Render data
  return (
    <div>
      {data.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};
```

### Testing Empty States

Always test empty state handling:

```typescript
describe('MyDataComponent', () => {
  it('displays empty state when no data', () => {
    render(<MyDataComponent />, {
      wrapper: createWrapper({ data: [] })
    });
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('handles empty data without errors', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    
    render(<MyDataComponent />, {
      wrapper: createWrapper({ data: [] })
    });
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('triggers primary action on button click', () => {
    const handleAdd = vi.fn();
    
    render(<MyDataComponent onAdd={handleAdd} />, {
      wrapper: createWrapper({ data: [] })
    });
    
    screen.getByRole('button', { name: 'Add item' }).click();
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
```

### Common Mistakes

#### ❌ Don't Show Blank Space

```typescript
// ❌ BAD: Blank screen with no explanation
if (data.length === 0) {
  return <div />;
}

// ✅ GOOD: Clear messaging and action
if (data.length === 0) {
  return <EmptyState title="No items found" primaryAction={...} />;
}
```

#### ❌ Don't Crash on Empty Data

```typescript
// ❌ BAD: Crashes if data is empty
const firstItem = data[0];
const total = data.reduce((sum, item) => sum + item.price, 0);

// ✅ GOOD: Safe handling
const firstItem = data[0] ?? null;
const total = data?.reduce((sum, item) => sum + item.price, 0) ?? 0;
```

#### ❌ Don't Show Technical Errors

```typescript
// ❌ BAD: Shows NaN or undefined to users
<div>Average: {total / data.length}</div>

// ✅ GOOD: Shows empty state or safe value
{data.length > 0 ? (
  <div>Average: {total / data.length}</div>
) : (
  <EmptyChart message="Not enough data" />
)}
```

### Real-World Examples

See these components for reference implementations:

- **WarehousePage**: Empty inventory with "Scan to receive" action
- **CustomersPage**: Empty customer list with "Create customer" action
- **LookupPage**: Empty product list with detail pane
- **PerformancePage**: Empty metrics with safe division handling

### Verification

To verify your component handles empty states correctly:

1. **Manual Testing**: Load the component with no data and verify:
   - No console errors
   - Clear messaging displayed
   - Primary action button present and functional
   - Keyboard navigation works

2. **Automated Testing**: Run the mock data verification script:
   ```bash
   cd frontend
   npm run verify:no-mocks
   ```

3. **Unit Tests**: Ensure tests cover empty state scenarios

## Getting Help

- Review existing components for examples
- Check Storybook for component patterns
- Refer to Tailwind CSS documentation
- Ask in team chat for guidance

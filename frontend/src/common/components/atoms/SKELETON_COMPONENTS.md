# Skeleton Screen Components

Comprehensive skeleton loading components for the EasySale application. These components provide visual feedback during data loading, matching the shape of actual content to create a smooth user experience.

## Overview

Skeleton screens are animated placeholders that mimic the layout of content while it's loading. They provide better perceived performance and reduce user frustration compared to traditional spinners.

**Requirements Addressed:**
- **12.1**: Use skeleton screens for content loading
- **12.5**: Match the shape of the content being loaded
- **12.6**: Use subtle pulsing animation for skeletons

## Available Components

### Base Components

#### `Skeleton`
The foundational skeleton component used to build all other skeleton components.

```tsx
import { Skeleton } from '@/common/components/atoms';

<Skeleton className="h-4 w-full" />
<Skeleton variant="circle" className="w-12 h-12" />
<Skeleton variant="text" />
```

**Props:**
- `variant`: 'rectangle' | 'circle' | 'text'
- `speed`: 'slow' | 'normal' | 'fast'
- `className`: Additional CSS classes

#### `SkeletonText`
Multiple lines of skeleton text with configurable spacing.

```tsx
<SkeletonText lines={3} lastLineWidth="60%" spacing="normal" />
```

#### `SkeletonAvatar`
Circular skeleton for avatar placeholders.

```tsx
<SkeletonAvatar size="md" />
```

### Card Components

#### `SkeletonCard`
Skeleton placeholder for card components with optional header and footer.

```tsx
import { SkeletonCard } from '@/common/components/atoms';

// Basic card
<SkeletonCard />

// Card with header and footer
<SkeletonCard hasHeader hasFooter contentLines={5} />

// Custom padding
<SkeletonCard padding="lg" />
```

**Props:**
- `hasHeader`: boolean - Show header section
- `hasFooter`: boolean - Show footer section
- `contentLines`: number - Number of content lines (default: 3)
- `padding`: 'sm' | 'md' | 'lg' - Padding size
- `className`: string - Additional CSS classes

**Use Cases:**
- Product cards
- User profile cards
- Dashboard widgets
- Content previews

### Table Components

#### `SkeletonTable`
Skeleton placeholder for table components with configurable rows and columns.

```tsx
import { SkeletonTable } from '@/common/components/atoms';

// Basic table
<SkeletonTable rows={5} columns={4} />

// Table with selection and actions
<SkeletonTable 
  rows={10} 
  columns={6} 
  showHeader 
  showSelection 
  showActions 
/>
```

**Props:**
- `rows`: number - Number of skeleton rows (default: 5)
- `columns`: number - Number of columns (default: 4)
- `showHeader`: boolean - Show header row (default: true)
- `showSelection`: boolean - Show selection checkboxes
- `showActions`: boolean - Show action column
- `className`: string - Additional CSS classes

**Use Cases:**
- Data tables
- Product listings
- Transaction history
- Inventory lists

### Form Components

#### `SkeletonForm`
Skeleton placeholder for form components with various field types.

```tsx
import { SkeletonForm } from '@/common/components/atoms';

// Basic form
<SkeletonForm fields={5} />

// Horizontal layout
<SkeletonForm fields={3} layout="horizontal" />

// Without buttons
<SkeletonForm fields={4} hasSubmitButton={false} />
```

**Props:**
- `fields`: number - Number of form fields (default: 3)
- `hasSubmitButton`: boolean - Show submit button (default: true)
- `hasCancelButton`: boolean - Show cancel button (default: false)
- `layout`: 'vertical' | 'horizontal' - Form layout
- `className`: string - Additional CSS classes

**Use Cases:**
- Settings forms
- User registration
- Product creation
- Data entry forms

### List Components

#### `SkeletonList`
Skeleton placeholder for list components with avatars and actions.

```tsx
import { SkeletonList } from '@/common/components/atoms';

// Basic list
<SkeletonList items={5} />

// List with actions
<SkeletonList items={8} showAction showAvatar showSecondaryText />

// Simple list without avatars
<SkeletonList items={10} showAvatar={false} />
```

**Props:**
- `items`: number - Number of list items (default: 5)
- `showAvatar`: boolean - Show avatar/icon (default: true)
- `showSecondaryText`: boolean - Show secondary text (default: true)
- `showAction`: boolean - Show action button (default: false)
- `className`: string - Additional CSS classes

**Use Cases:**
- User lists
- Notification lists
- Activity feeds
- Search results

### Grid Components

#### `SkeletonGrid`
Skeleton placeholder for grid layouts with images and content.

```tsx
import { SkeletonGrid } from '@/common/components/atoms';

// Basic grid
<SkeletonGrid items={6} columns={3} />

// Grid without images
<SkeletonGrid items={8} columns={4} hasImage={false} />

// Two-column grid
<SkeletonGrid items={4} columns={2} />
```

**Props:**
- `items`: number - Number of grid items (default: 6)
- `columns`: 1 | 2 | 3 | 4 | 6 - Number of columns (default: 3)
- `hasImage`: boolean - Show image placeholders (default: true)
- `className`: string - Additional CSS classes

**Use Cases:**
- Product grids
- Image galleries
- Card grids
- Dashboard widgets

### Dashboard Components

#### `SkeletonDashboard`
Skeleton placeholder for dashboard layouts with stat cards and charts.

```tsx
import { SkeletonDashboard } from '@/common/components/atoms';

// Full dashboard
<SkeletonDashboard />

// Dashboard without chart
<SkeletonDashboard showChart={false} />

// Custom stat cards
<SkeletonDashboard statCards={6} />
```

**Props:**
- `showHeader`: boolean - Show header section (default: true)
- `statCards`: number - Number of stat cards (default: 4)
- `showChart`: boolean - Show chart area (default: true)
- `className`: string - Additional CSS classes

**Use Cases:**
- Dashboard pages
- Analytics views
- Reports
- Overview pages

## Animation

All skeleton components use a subtle pulsing animation defined in the Tailwind configuration:

```javascript
// tailwind.config.js
animation: {
  'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'pulse-fast': 'pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
```

The default animation provides a smooth, professional loading experience that doesn't distract users.

## Accessibility

All skeleton components include proper ARIA attributes:

- `role="status"` - Indicates loading status
- `aria-busy="true"` - Indicates content is loading
- `aria-label` - Descriptive label for screen readers

Example:
```tsx
<div role="status" aria-busy="true" aria-label="Loading card content">
  {/* Skeleton content */}
</div>
```

## Best Practices

### 1. Match Content Shape
Always use skeleton components that match the shape of the actual content:

```tsx
// Good: Matches the actual card layout
{loading ? <SkeletonCard hasHeader hasFooter /> : <ProductCard {...data} />}

// Bad: Generic spinner doesn't match content
{loading ? <Spinner /> : <ProductCard {...data} />}
```

### 2. Use Appropriate Count
Show a realistic number of skeleton items:

```tsx
// Good: Shows expected number of items
<SkeletonTable rows={pageSize} columns={5} />

// Bad: Shows too many or too few items
<SkeletonTable rows={100} columns={5} />
```

### 3. Combine Components
Combine skeleton components to match complex layouts:

```tsx
<div className="space-y-6">
  <SkeletonDashboard />
  <SkeletonTable rows={10} columns={6} />
  <SkeletonGrid items={6} columns={3} />
</div>
```

### 4. Responsive Design
Skeleton components automatically adapt to different screen sizes:

```tsx
// Automatically responsive
<SkeletonGrid items={6} columns={3} />
// Shows 1 column on mobile, 2 on tablet, 3 on desktop
```

### 5. Loading States
Use skeleton components for initial loads and data refreshes:

```tsx
function ProductList() {
  const { data, isLoading } = useQuery('products', fetchProducts);

  if (isLoading) {
    return <SkeletonGrid items={9} columns={3} />;
  }

  return <ProductGrid products={data} />;
}
```

## Examples

### Complete Loading Page

```tsx
function DashboardPage() {
  const { data, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <SkeletonDashboard />
        <SkeletonTable rows={10} columns={5} showSelection showActions />
        <SkeletonGrid items={6} columns={3} />
      </div>
    );
  }

  return <Dashboard data={data} />;
}
```

### Form Loading

```tsx
function SettingsPage() {
  const { data, isLoading } = useSettings();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <SkeletonForm fields={8} layout="vertical" />
      </div>
    );
  }

  return <SettingsForm settings={data} />;
}
```

### List Loading

```tsx
function UserList() {
  const { data, isLoading } = useUsers();

  if (isLoading) {
    return <SkeletonList items={10} showAvatar showAction />;
  }

  return <UserListView users={data} />;
}
```

## Testing

All skeleton components include comprehensive tests:

```bash
# Run skeleton component tests
npm test -- SkeletonScreens.test.tsx
```

Tests cover:
- Component rendering
- Props handling
- Accessibility attributes
- Responsive behavior
- Animation presence

## Storybook

View all skeleton components in Storybook:

```bash
npm run storybook
```

Navigate to: **Atoms > Skeleton Screens**

## Performance

Skeleton components are lightweight and performant:

- Pure CSS animations (no JavaScript)
- Minimal DOM elements
- No external dependencies
- Optimized for 60fps animations

## Browser Support

Skeleton components work in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Related Components

- `Spinner` - For action loading (buttons, inline operations)
- `ProgressBar` - For determinate progress
- `LoadingOverlay` - For full-page loading states

## Migration Guide

If you're currently using spinners or other loading indicators, migrate to skeleton screens:

### Before
```tsx
{loading && <Spinner />}
{!loading && <ProductCard {...data} />}
```

### After
```tsx
{loading ? <SkeletonCard hasHeader /> : <ProductCard {...data} />}
```

## Support

For questions or issues with skeleton components:

1. Check this documentation
2. View Storybook examples
3. Review test files for usage examples
4. Contact the UI team

## Changelog

### v1.0.0 (Current)
- Initial release with 6 skeleton component types
- Comprehensive test coverage
- Storybook documentation
- Accessibility support
- Responsive design

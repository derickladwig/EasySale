# EmptyState Component

## Overview

The `EmptyState` component displays a helpful message when there's no data to show. It provides a consistent, user-friendly way to communicate empty states across the application.

## Features

- **Icon Display**: Shows a relevant icon or illustration (Requirement 13.1)
- **Clear Heading**: Includes a heading that explains the situation (Requirement 13.2)
- **Helpful Description**: Provides context and guidance (Requirement 13.3)
- **Action Button**: Optional primary action button (Requirement 13.4)
- **Muted Colors**: Uses subtle colors to avoid drawing too much attention (Requirement 13.5)
- **Centered Layout**: Content is centered vertically and horizontally (Requirement 13.6)
- **Responsive**: Adapts to container size (Requirement 13.7)
- **Accessible**: Includes proper ARIA attributes for screen readers

## Usage

### Basic Empty State

```tsx
import { EmptyState } from '@/common/components/atoms';
import { Package } from 'lucide-react';

function ProductList() {
  const products = [];

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        heading="No products found"
        description="Get started by adding your first product to the inventory."
        action={{
          label: 'Add Product',
          onClick: handleAddProduct,
        }}
      />
    );
  }

  return <div>{/* Product list */}</div>;
}
```

### No Results State

```tsx
import { EmptyState } from '@/common/components/atoms';
import { Search } from 'lucide-react';

function SearchResults({ query, results }) {
  if (results.length === 0) {
    return (
      <EmptyState
        variant="no-results"
        icon={Search}
        heading="No results found"
        description={`No results found for "${query}". Try adjusting your search criteria.`}
      />
    );
  }

  return <div>{/* Search results */}</div>;
}
```

### Error State

```tsx
import { EmptyState } from '@/common/components/atoms';
import { AlertCircle, RefreshCw } from 'lucide-react';

function DataView({ error, retry }) {
  if (error) {
    return (
      <EmptyState
        variant="error"
        icon={AlertCircle}
        heading="Failed to load data"
        description="An error occurred while loading the data. Please try again."
        action={{
          label: 'Retry',
          onClick: retry,
          variant: 'primary',
          leftIcon: <RefreshCw size={16} />,
        }}
      />
    );
  }

  return <div>{/* Data view */}</div>;
}
```

### Without Action Button

```tsx
import { EmptyState } from '@/common/components/atoms';
import { FileText } from 'lucide-react';

function InvoiceList() {
  const invoices = [];

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        heading="No invoices found"
        description="Invoices will appear here once you create them."
      />
    );
  }

  return <div>{/* Invoice list */}</div>;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | Required | Lucide icon component to display |
| `heading` | `string` | Required | Main heading text |
| `description` | `string` | Required | Description text providing context |
| `action` | `object` | Optional | Primary action button configuration |
| `action.label` | `string` | Required | Button label text |
| `action.onClick` | `() => void` | Required | Button click handler |
| `action.variant` | `ButtonVariant` | `'primary'` | Button variant |
| `action.leftIcon` | `ReactNode` | Optional | Icon to display on the left side of button |
| `variant` | `'default' \| 'no-results' \| 'error'` | `'default'` | Visual variant |
| `className` | `string` | Optional | Additional CSS classes |

## Variants

### Default
Used when there's no data and the user can take action to add some.
- Uses muted text colors
- Suitable for empty lists, collections, etc.

### No Results
Used when a search or filter returns no results.
- Uses muted text colors
- Typically doesn't include an action button
- Suggests adjusting search/filter criteria

### Error
Used when data fails to load due to an error.
- Uses error color for the icon
- Typically includes a retry action button
- Provides clear error messaging

## Accessibility

The component includes several accessibility features:

- **Role**: Uses `role="status"` to indicate dynamic content
- **ARIA Live**: Uses `aria-live="polite"` for screen reader announcements
- **Icon Hiding**: Icons are hidden from screen readers with `aria-hidden="true"`
- **Semantic HTML**: Uses proper heading hierarchy

## Best Practices

### Icon Selection
Choose icons that clearly represent the empty state:
- `Package` for products
- `Users` for customers
- `ShoppingCart` for cart
- `FileText` for documents
- `Search` for no results
- `AlertCircle` for errors

### Heading Text
Keep headings concise and clear:
- ✅ "No products found"
- ✅ "Your cart is empty"
- ❌ "There are currently no products available in the system"

### Description Text
Provide helpful context and guidance:
- ✅ "Get started by adding your first product to the inventory."
- ✅ "Try adjusting your search or filter criteria."
- ❌ "No data."

### Action Buttons
Include action buttons when users can take immediate action:
- ✅ Include: Empty product list → "Add Product" button
- ✅ Include: Error state → "Retry" button
- ❌ Don't include: No search results (user should adjust search instead)

### Variant Selection
Choose the appropriate variant:
- Use `default` for empty lists/collections
- Use `no-results` for search/filter results
- Use `error` for loading failures

## Examples

### Empty Shopping Cart

```tsx
<EmptyState
  icon={ShoppingCart}
  heading="Your cart is empty"
  description="Add items to your cart to get started with your purchase."
  action={{
    label: 'Browse Products',
    onClick: () => navigate('/products'),
  }}
/>
```

### No Customers

```tsx
<EmptyState
  icon={Users}
  heading="No customers yet"
  description="Start building your customer base by adding your first customer."
  action={{
    label: 'Add Customer',
    onClick: () => setShowAddCustomerModal(true),
    leftIcon: <Plus size={16} />,
  }}
/>
```

### Search No Results

```tsx
<EmptyState
  variant="no-results"
  icon={Search}
  heading="No results found"
  description={`No results found for "${searchQuery}". Try different keywords.`}
/>
```

### Loading Error

```tsx
<EmptyState
  variant="error"
  icon={AlertCircle}
  heading="Failed to load customers"
  description="An error occurred while loading customer data. Please try again."
  action={{
    label: 'Retry',
    onClick: refetch,
    leftIcon: <RefreshCw size={16} />,
  }}
/>
```

## Related Components

- **Skeleton**: Use for loading states before data arrives
- **Spinner**: Use for short loading operations
- **Button**: Used internally for action buttons
- **Icon**: Used internally for icon display

## Testing

The component includes comprehensive tests covering:
- Basic rendering
- All variants
- Action button functionality
- Layout and styling
- Accessibility features
- Content variations

Run tests with:
```bash
npm test -- EmptyState.test.tsx
```

## Storybook

View all variants and examples in Storybook:
```bash
npm run storybook
```

Navigate to: **Atoms → EmptyState**

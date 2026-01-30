# Layout Components

Reusable layout components for structuring pages and content in the EasySale application.

## Components

### Grid

A responsive grid layout component that adapts to different screen sizes.

**Features:**
- Responsive column counts (1 on mobile, 2 on tablet, 3+ on desktop)
- Consistent gaps (16px on mobile, 24px on desktop)
- Auto-fit for flexible layouts
- Follows design system color scheme and spacing

**Requirements:** 5.1, 5.2, 5.4

#### Basic Usage

```tsx
import { Grid } from '@/common/components/layout';

// Default 3-column grid (1 on mobile, 2 on tablet, 3 on desktop)
<Grid>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Child elements to render in the grid |
| `columns` | `1 \| 2 \| 3 \| 4 \| 6` | `3` | Number of columns on desktop |
| `autoFit` | `boolean` | `false` | Use auto-fit for flexible layouts |
| `minColumnWidth` | `'sm' \| 'md' \| 'lg'` | `'md'` | Minimum column width for auto-fit |
| `gap` | `'sm' \| 'md' \| 'lg' \| 'responsive'` | `'responsive'` | Gap size between grid items |
| `className` | `string` | - | Additional CSS classes |
| `data-testid` | `string` | - | Test ID for testing |

#### Column Configurations

**1 Column:**
- Always 1 column on all screen sizes

**2 Columns:**
- 1 column on mobile (<768px)
- 2 columns on tablet and desktop (≥768px)

**3 Columns (Default):**
- 1 column on mobile (<768px)
- 2 columns on tablet (768px-1023px)
- 3 columns on desktop (≥1024px)

**4 Columns:**
- 1 column on mobile (<768px)
- 2 columns on tablet (768px-1023px)
- 4 columns on desktop (≥1024px)

**6 Columns:**
- 2 columns on mobile (<768px)
- 3 columns on tablet (768px-1023px)
- 6 columns on desktop (≥1024px)

#### Auto-fit Mode

Auto-fit mode automatically adjusts the number of columns based on available space and minimum column width.

```tsx
// Auto-fit with medium min-width (250px)
<Grid autoFit minColumnWidth="md">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>

// Auto-fit with small min-width (200px) - fits more columns
<Grid autoFit minColumnWidth="sm">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>

// Auto-fit with large min-width (350px) - fits fewer columns
<Grid autoFit minColumnWidth="lg">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

#### Gap Sizes

**Small (`sm`):** 8px gap on all screen sizes

**Medium (`md`):** 16px gap on all screen sizes

**Large (`lg`):** 24px gap on all screen sizes

**Responsive (default):** 16px on mobile, 24px on desktop

```tsx
// Small gap
<Grid gap="sm">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
</Grid>

// Large gap
<Grid gap="lg">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
</Grid>

// Responsive gap (default)
<Grid gap="responsive">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
</Grid>
```

#### Examples

**Product Grid:**
```tsx
<Grid columns={4} gap="responsive">
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</Grid>
```

**Dashboard Stats:**
```tsx
<Grid columns={4} gap="responsive">
  <StatCard title="Total Sales" value="$12,345" trend="+12.5%" />
  <StatCard title="Orders" value="234" trend="+8.2%" />
  <StatCard title="Customers" value="1,234" trend="+15.3%" />
  <StatCard title="Inventory" value="5,678" trend="-3.1%" />
</Grid>
```

**Settings Form:**
```tsx
<Grid columns={2} gap="lg">
  <FormField label="First Name" />
  <FormField label="Last Name" />
  <FormField label="Email" />
  <FormField label="Phone" />
</Grid>
```

**Image Gallery:**
```tsx
<Grid autoFit minColumnWidth="md" gap="sm">
  {images.map(image => (
    <img key={image.id} src={image.url} alt={image.alt} className="rounded-lg" />
  ))}
</Grid>
```

#### Custom Styling

You can apply custom classes to the grid container:

```tsx
<Grid 
  columns={3} 
  gap="responsive"
  className="bg-background-primary p-6 rounded-xl"
>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

#### Accessibility

The Grid component is a semantic layout component that:
- Uses CSS Grid for proper layout structure
- Maintains logical reading order
- Supports keyboard navigation through child elements
- Works with screen readers

#### Testing

The Grid component includes comprehensive tests covering:
- Basic rendering
- Responsive column counts (Requirement 5.1)
- Consistent gaps (Requirement 5.2)
- Auto-fit for flexible layouts (Requirement 5.4)
- Custom styling
- Edge cases
- Integration with design system

Run tests:
```bash
npm test -- Grid.test.tsx
```

#### Storybook

View the Grid component in Storybook to see all variants and examples:

```bash
npm run storybook
```

Navigate to: **Layout > Grid**

## Design System Integration

All layout components follow the unified design system:

- **Colors:** Uses CSS custom properties from theme system
- **Spacing:** 4px base unit with responsive utilities
- **Breakpoints:** xs (0px), sm (640px), md (768px), lg (1024px), xl (1280px)
- **Gaps:** Responsive gaps (16px mobile, 24px desktop)

## Related Components

- **Card:** Use with Grid for card layouts
- **StatCard:** Dashboard statistics in grid layout
- **ProductCard:** Product listings in grid layout
- **FormField:** Form fields in grid layout

## Requirements Mapping

- **Requirement 5.1:** Responsive column counts (1 on mobile, 2 on tablet, 3+ on desktop)
- **Requirement 5.2:** Consistent gaps (16px on mobile, 24px on desktop)
- **Requirement 5.4:** Auto-fit for flexible layouts

## Future Enhancements

Potential future additions:
- Masonry layout support
- Drag-and-drop reordering
- Virtualized grid for large datasets
- Grid item spanning (colspan/rowspan)
- Animated grid transitions

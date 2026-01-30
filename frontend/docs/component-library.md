# Component Library Reference

The unified design system provides a comprehensive set of reusable components built with design tokens. All components work in both light and dark themes with any accent color.

## Layout Primitives

### Stack

Vertical layout with consistent spacing between children.

**Props:**
- `gap?: 1 | 2 | 3 | 4 | 6 | 8` - Spacing between items (maps to `--space-*`)
- `align?: 'start' | 'center' | 'end' | 'stretch'` - Horizontal alignment
- `children: ReactNode` - Child elements

**Usage:**
```tsx
<Stack gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Stack>
```

### Inline

Horizontal layout with consistent spacing between children.

**Props:**
- `gap?: 1 | 2 | 3 | 4 | 6 | 8` - Spacing between items
- `align?: 'start' | 'center' | 'end' | 'baseline'` - Vertical alignment
- `wrap?: boolean` - Allow wrapping to next line
- `children: ReactNode` - Child elements

**Usage:**
```tsx
<Inline gap={2} wrap>
  <Button>Action 1</Button>
  <Button>Action 2</Button>
  <Button>Action 3</Button>
</Inline>
```

### Grid

Grid layout with responsive columns.

**Props:**
- `columns?: 1 | 2 | 3 | 4 | 6 | 12` - Number of columns
- `gap?: 1 | 2 | 3 | 4 | 6 | 8` - Spacing between items
- `children: ReactNode` - Child elements

**Usage:**
```tsx
<Grid columns={3} gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

## Card

Container component for grouping related content.

**Props:**
- `variant?: 'default' | 'outlined' | 'elevated'` - Visual style
- `padding?: 'none' | 'sm' | 'md' | 'lg'` - Internal padding
- `children: ReactNode` - Card content

**Variants:**
- `default` - Subtle background with border
- `outlined` - Transparent background with border
- `elevated` - Background with shadow

**Usage:**
```tsx
<Card variant="elevated" padding="lg">
  <h2>Card Title</h2>
  <p>Card content goes here.</p>
</Card>
```

## Button

Interactive button component with multiple variants and sizes.

**Props:**
- `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'` - Visual style
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `disabled?: boolean` - Disabled state
- `onClick?: () => void` - Click handler
- `children: ReactNode` - Button label

**Variants:**
- `primary` - Accent color background (main actions)
- `secondary` - Subtle background (secondary actions)
- `ghost` - Transparent background (tertiary actions)
- `danger` - Error color background (destructive actions)

**Sizes:**
- `sm` - Compact button (32px height)
- `md` - Standard button (40px height, default)
- `lg` - Large button (48px height)

**Usage:**
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Save Changes
</Button>

<Button variant="secondary" disabled>
  Cancel
</Button>
```

**Accessibility:**
- Minimum 40px height for touch targets
- Visible focus ring on keyboard focus
- Disabled state prevents interaction

## Input

Text input component with label, error, and helper text support.

**Props:**
- `type?: 'text' | 'email' | 'password' | 'number'` - Input type
- `label?: string` - Input label
- `placeholder?: string` - Placeholder text
- `value?: string` - Controlled value
- `onChange?: (e) => void` - Change handler
- `error?: string` - Error message
- `helperText?: string` - Helper text
- `disabled?: boolean` - Disabled state
- `required?: boolean` - Required field indicator

**Usage:**
```tsx
<Input
  type="email"
  label="Email Address"
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  helperText="We'll never share your email"
  required
/>
```

**Accessibility:**
- Label associated with input
- Error announced to screen readers
- Visible focus ring
- Minimum 40px height

## Select

Dropdown select component with label and error support.

**Props:**
- `options: Array<{value: string, label: string}>` - Select options
- `label?: string` - Select label
- `value?: string` - Selected value
- `onChange?: (e) => void` - Change handler
- `error?: string` - Error message
- `helperText?: string` - Helper text
- `disabled?: boolean` - Disabled state
- `required?: boolean` - Required field indicator

**Usage:**
```tsx
<Select
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'mx', label: 'Mexico' },
  ]}
  value={country}
  onChange={(e) => setCountry(e.target.value)}
  required
/>
```

## DataTable

Table component with sorting, alignment, and state management.

**Props:**
- `data: T[]` - Array of data objects
- `columns: Column<T>[]` - Column definitions
- `keyExtractor: (item: T) => string` - Unique key for each row
- `loading?: boolean` - Loading state
- `error?: string` - Error message
- `emptyMessage?: string` - Message when no data

**Column Definition:**
```typescript
interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}
```

**Usage:**
```tsx
const columns: Column<User>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (user) => user.name,
  },
  {
    key: 'email',
    header: 'Email',
    render: (user) => user.email,
  },
  {
    key: 'status',
    header: 'Status',
    render: (user) => <Badge>{user.status}</Badge>,
    align: 'center',
  },
];

<DataTable
  data={users}
  columns={columns}
  keyExtractor={(user) => user.id}
  loading={isLoading}
  emptyMessage="No users found"
/>
```

## App Primitives

### SectionHeader

Header for page sections with title, actions, and helper text.

**Props:**
- `title: string` - Section title
- `actions?: ReactNode` - Action buttons
- `helperText?: string` - Descriptive text

**Usage:**
```tsx
<SectionHeader
  title="Recent Orders"
  actions={<Button>View All</Button>}
  helperText="Orders from the last 30 days"
/>
```

### Toolbar

Consistent toolbar layout with search, filters, and actions.

**Props:**
- `search?: ReactNode` - Search input (left)
- `filters?: ReactNode` - Filter controls (center)
- `actions?: ReactNode` - Action buttons (right)

**Usage:**
```tsx
<Toolbar
  search={<Input placeholder="Search..." />}
  filters={<Select options={statusOptions} />}
  actions={<Button variant="primary">Add New</Button>}
/>
```

### EmptyState

Friendly message when no data is available.

**Props:**
- `icon?: ReactNode` - Optional icon
- `title: string` - Empty state title
- `description?: string` - Description text
- `action?: ReactNode` - Call-to-action button

**Usage:**
```tsx
<EmptyState
  icon={<Icon name="inbox" />}
  title="No messages"
  description="You don't have any messages yet"
  action={<Button>Compose Message</Button>}
/>
```

### InlineAlert

Alert component for warnings, errors, info, and success messages.

**Props:**
- `variant: 'success' | 'warning' | 'error' | 'info'` - Alert type
- `title?: string` - Alert title
- `children: ReactNode` - Alert content
- `onClose?: () => void` - Close handler

**Usage:**
```tsx
<InlineAlert variant="warning" title="Warning">
  Your session will expire in 5 minutes.
</InlineAlert>
```

### Badge

Small label for status indicators and counts.

**Props:**
- `variant?: 'default' | 'success' | 'warning' | 'error' | 'info'` - Badge color
- `size?: 'sm' | 'md'` - Badge size
- `count?: number` - Numeric count (for notification badges)
- `children?: ReactNode` - Badge label

**Usage:**
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="error" count={5} />
```

## Common Patterns

### Form Layout

```tsx
<Stack gap={4}>
  <Input
    label="Name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    required
  />
  
  <Input
    type="email"
    label="Email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
  />
  
  <Select
    label="Role"
    options={roleOptions}
    value={role}
    onChange={(e) => setRole(e.target.value)}
  />
  
  <Inline gap={2}>
    <Button variant="primary" onClick={handleSubmit}>
      Save
    </Button>
    <Button variant="secondary" onClick={handleCancel}>
      Cancel
    </Button>
  </Inline>
</Stack>
```

### Card Grid

```tsx
<Grid columns={3} gap={4}>
  {items.map((item) => (
    <Card key={item.id} variant="elevated">
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <Button variant="ghost">Learn More</Button>
    </Card>
  ))}
</Grid>
```

### Page Layout

```tsx
<Stack gap={6}>
  <SectionHeader
    title="Dashboard"
    actions={<Button>Refresh</Button>}
  />
  
  <Grid columns={3} gap={4}>
    <Card>Metric 1</Card>
    <Card>Metric 2</Card>
    <Card>Metric 3</Card>
  </Grid>
  
  <Card>
    <DataTable
      data={data}
      columns={columns}
      keyExtractor={(item) => item.id}
    />
  </Card>
</Stack>
```

## Accessibility Guidelines

All components follow WCAG 2.1 Level AA standards:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Indicators**: Visible focus rings on all focusable elements
- **Touch Targets**: Minimum 40px height for interactive elements
- **Color Contrast**: 4.5:1 ratio for normal text, 3:1 for large text
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Disabled States**: Clear visual indication and prevented interaction

## Theme Compatibility

All components automatically adapt to:
- **Theme Mode**: Light and dark themes
- **Accent Colors**: Blue, green, purple, orange, red
- **Density**: Compact, comfortable, spacious

No additional configuration required.

## Best Practices

### DO ✅

- Use layout primitives (Stack, Inline, Grid) for spacing
- Use semantic component variants
- Provide labels for all form inputs
- Handle loading and error states
- Test in both light and dark themes

### DON'T ❌

- Don't use custom margins/padding (use layout primitives)
- Don't create custom button styles (use variants)
- Don't skip accessibility attributes
- Don't hard-code colors or spacing
- Don't use inline styles

## Storybook

View all components with interactive examples:

```bash
npm run storybook
```

Browse to `http://localhost:6006` to explore the component library.

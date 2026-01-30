# Design System Migration Guide

This guide walks you through migrating existing pages to the unified design system.

## Overview

The migration process follows these steps:

1. **Wrap in AppShell** - Add layout structure
2. **Replace CSS with Components** - Use shared components
3. **Apply Design Tokens** - Replace hard-coded values
4. **Test Themes** - Verify light/dark compatibility
5. **Remove Old CSS** - Clean up legacy files

## Migration Checklist

- [ ] Page wrapped in AppShell
- [ ] Old CSS module removed
- [ ] Using Stack/Inline/Grid for spacing
- [ ] Using shared components (Button, Input, Card, etc.)
- [ ] All colors use design tokens
- [ ] All spacing uses design tokens
- [ ] Tested in light theme
- [ ] Tested in dark theme
- [ ] Tested with different accent colors
- [ ] Focus rings visible on interactive elements
- [ ] Minimum 40px height for interactive elements
- [ ] Visual regression tests passing

## Step-by-Step Migration

### Step 1: Wrap in AppShell

**Before:**
```tsx
export function DashboardPage() {
  return (
    <div className={styles.page}>
      <h1>Dashboard</h1>
      {/* content */}
    </div>
  );
}
```

**After:**
```tsx
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Navigation } from '@/common/components/Navigation';

export function DashboardPage() {
  return (
    <AppShell
      sidebar={<Navigation variant="sidebar" />}
      header={<PageHeader title="Dashboard" />}
    >
      {/* content */}
    </AppShell>
  );
}
```

### Step 2: Replace Layout with Primitives

**Before:**
```tsx
<div className={styles.container}>
  <div className={styles.card}>Card 1</div>
  <div className={styles.card}>Card 2</div>
  <div className={styles.card}>Card 3</div>
</div>
```

**After:**
```tsx
import { Stack } from '@/components/ui/Stack';
import { Card } from '@/components/ui/Card';

<Stack gap={4}>
  <Card>Card 1</Card>
  <Card>Card 2</Card>
  <Card>Card 3</Card>
</Stack>
```

### Step 3: Replace Custom Components

#### Buttons

**Before:**
```tsx
<button className={styles.primaryButton} onClick={handleClick}>
  Save
</button>
```

**After:**
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" onClick={handleClick}>
  Save
</Button>
```

#### Inputs

**Before:**
```tsx
<div className={styles.inputGroup}>
  <label className={styles.label}>Email</label>
  <input
    type="email"
    className={styles.input}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
  {error && <span className={styles.error}>{error}</span>}
</div>
```

**After:**
```tsx
import { Input } from '@/components/ui/Input';

<Input
  type="email"
  label="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={error}
/>
```

#### Tables

**Before:**
```tsx
<table className={styles.table}>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    {users.map(user => (
      <tr key={user.id}>
        <td>{user.name}</td>
        <td>{user.email}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**After:**
```tsx
import { DataTable } from '@/components/ui/DataTable';

const columns = [
  { key: 'name', header: 'Name', render: (user) => user.name },
  { key: 'email', header: 'Email', render: (user) => user.email },
];

<DataTable
  data={users}
  columns={columns}
  keyExtractor={(user) => user.id}
/>
```

### Step 4: Replace CSS with Design Tokens

**Before (CSS Module):**
```css
.card {
  background: #ffffff;
  color: #1a1a1a;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.button {
  background: #3b82f6;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
}
```

**After (Design Tokens):**
```css
.card {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  border: var(--border-1) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.button {
  background: var(--color-accent);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}
```

### Step 5: Remove Old CSS Module

Once all styles are migrated:

1. Delete the old CSS module file
2. Remove the import from the component
3. Run linting to catch any remaining references
4. Test the page thoroughly

## Common Patterns

### Dashboard Layout

```tsx
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Stack } from '@/components/ui/Stack';
import { Grid } from '@/components/ui/Grid';
import { Card } from '@/components/ui/Card';

export function Dashboard() {
  return (
    <AppShell
      sidebar={<Navigation />}
      header={<PageHeader title="Dashboard" />}
    >
      <Stack gap={6}>
        <Grid columns={3} gap={4}>
          <Card>Metric 1</Card>
          <Card>Metric 2</Card>
          <Card>Metric 3</Card>
        </Grid>
        
        <Card>
          <h2>Recent Activity</h2>
          <DataTable data={activity} columns={columns} />
        </Card>
      </Stack>
    </AppShell>
  );
}
```

### Form Page

```tsx
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Stack } from '@/components/ui/Stack';
import { Inline } from '@/components/ui/Inline';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export function SettingsPage() {
  return (
    <AppShell
      sidebar={<Navigation />}
      header={<PageHeader title="Settings" />}
    >
      <Card>
        <Stack gap={4}>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          <Select
            label="Role"
            options={roleOptions}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          
          <Inline gap={2}>
            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </Inline>
        </Stack>
      </Card>
    </AppShell>
  );
}
```

### List Page

```tsx
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Stack } from '@/components/ui/Stack';
import { Toolbar } from '@/components/ui/Toolbar';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function CustomersPage() {
  return (
    <AppShell
      sidebar={<Navigation />}
      header={
        <PageHeader
          title="Customers"
          actions={<Button variant="primary">Add Customer</Button>}
        />
      }
    >
      <Stack gap={4}>
        <Toolbar
          search={
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
          actions={<Button>Export</Button>}
        />
        
        <Card>
          <DataTable
            data={customers}
            columns={columns}
            keyExtractor={(customer) => customer.id}
            loading={isLoading}
            emptyMessage="No customers found"
          />
        </Card>
      </Stack>
    </AppShell>
  );
}
```

## Common Pitfalls

### ❌ Using Custom Margins

**Don't:**
```tsx
<div style={{ marginBottom: '20px' }}>
  <Card>Content</Card>
</div>
```

**Do:**
```tsx
<Stack gap={4}>
  <Card>Content</Card>
</Stack>
```

### ❌ Hard-coded Colors

**Don't:**
```css
.text {
  color: #666666;
}
```

**Do:**
```css
.text {
  color: var(--color-text-secondary);
}
```

### ❌ Custom Button Styles

**Don't:**
```tsx
<button className={styles.customButton}>Click</button>
```

**Do:**
```tsx
<Button variant="primary">Click</Button>
```

### ❌ Fixed Positioning

**Don't:**
```css
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}
```

**Do:**
```tsx
// Use AppShell for layout
<AppShell header={<Header />}>
  {/* content */}
</AppShell>
```

## Testing After Migration

### Visual Testing

1. Test in light theme
2. Test in dark theme
3. Test with each accent color (blue, green, purple, orange, red)
4. Test on desktop viewport (1280x720)
5. Test on tablet viewport (768x1024)
6. Test on mobile viewport (375x667)

### Functional Testing

1. Verify all interactive elements are keyboard accessible
2. Check focus rings are visible
3. Test form validation
4. Verify loading and error states
5. Check responsive behavior

### Accessibility Testing

1. Run axe DevTools
2. Test with screen reader
3. Verify color contrast (WCAG AA)
4. Check touch target sizes (minimum 40px)
5. Test keyboard navigation

## Rollback Plan

If issues arise after migration:

1. **Temporary Fix**: Add `.legacy-page` class to root element
2. **Restore Old CSS**: Revert CSS module deletion
3. **Fix Issues**: Address problems identified
4. **Re-migrate**: Follow guide again with fixes

## Getting Help

- **Design Tokens**: See `docs/design-tokens.md`
- **Components**: See `docs/component-library.md`
- **Examples**: Check migrated pages (Settings, Dashboard)
- **Storybook**: Run `npm run storybook` for component examples

## Migration Order

Recommended order for migrating pages:

1. ✅ Settings (already migrated - golden path)
2. Dashboard
3. Sell
4. Inventory
5. Customers
6. Reports
7. Remaining pages

Start with simpler pages to build confidence before tackling complex ones.

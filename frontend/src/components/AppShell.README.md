# AppShell Component

The `AppShell` component is the top-level layout component for EasySale. It manages the positioning of the sidebar, header, and main content area using CSS Grid.

## Purpose

**This is the ONLY component allowed to set sidebar and header positioning.** All pages must use AppShell to ensure consistent layout and prevent content overlap.

## Features

- ✅ CSS Grid layout with sidebar and main area
- ✅ Prevents content overlap through layout contracts
- ✅ Responsive behavior for mobile viewports
- ✅ Uses design tokens for all spacing and z-index values
- ✅ Accessible keyboard navigation
- ✅ Support for reduced motion preferences

## Layout Contract

The AppShell enforces these layout contracts using design tokens:

| Token | Value | Purpose |
|-------|-------|---------|
| `--appSidebarW` | 240px | Sidebar width |
| `--appHeaderH` | 64px | Header height |
| `--pageGutter` | 16px | Content padding |
| `--z-sidebar` | 900 | Sidebar z-index |
| `--z-header` | 800 | Header z-index |

## Usage

### Basic Usage

```tsx
import { AppShell } from '@/components';

function MyPage() {
  return (
    <AppShell
      sidebar={<Navigation />}
      header={<TopBar />}
    >
      <PageContent />
    </AppShell>
  );
}
```

### Without Sidebar

```tsx
<AppShell header={<TopBar />}>
  <LoginForm />
</AppShell>
```

### Without Header

```tsx
<AppShell sidebar={<Navigation />}>
  <FullHeightContent />
</AppShell>
```

### Mobile Sidebar Control

```tsx
function ResponsiveLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AppShell
      sidebar={<Navigation />}
      header={
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
      }
      isSidebarOpen={isSidebarOpen}
      onSidebarClose={() => setIsSidebarOpen(false)}
    >
      <PageContent />
    </AppShell>
  );
}
```

## Props

### `AppShellProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sidebar` | `React.ReactNode` | `undefined` | Optional sidebar content (navigation, etc.) |
| `header` | `React.ReactNode` | `undefined` | Optional header content (top bar, breadcrumbs, etc.) |
| `children` | `React.ReactNode` | **required** | Main content area |
| `isSidebarOpen` | `boolean` | `false` | Control sidebar visibility on mobile |
| `onSidebarClose` | `() => void` | `undefined` | Callback when sidebar backdrop is clicked (mobile only) |

## Responsive Behavior

### Desktop (>768px)
- Sidebar is static and always visible
- Grid layout: `[sidebar: 240px] [content: 1fr]`
- No backdrop

### Mobile (≤768px)
- Sidebar is a fixed overlay
- Controlled by `isSidebarOpen` prop
- Backdrop appears when open
- Clicking backdrop calls `onSidebarClose`

## Accessibility

### Keyboard Navigation
- Backdrop is keyboard accessible (Tab, Enter, Space)
- Sidebar has `aria-hidden` when closed on mobile
- Focus management for modal behavior

### Screen Readers
- Semantic HTML elements (`<aside>`, `<header>`, `<main>`)
- Proper ARIA labels on interactive elements
- Backdrop has descriptive label

### Motion Preferences
- Respects `prefers-reduced-motion` for sidebar transitions
- No animations when user prefers reduced motion

## Layout Rules

### ✅ DO

- Use AppShell for all authenticated pages
- Use PageHeader component for page titles and actions
- Use design tokens for any custom spacing
- Let content scroll naturally within the main area

### ❌ DON'T

- Don't use `position: fixed` in page components
- Don't set custom z-index values outside AppShell
- Don't add padding to page root elements (AppShell handles this)
- Don't create custom sidebar/header positioning

## Examples

### Dashboard Page

```tsx
function DashboardPage() {
  return (
    <AppShell
      sidebar={<MainNavigation />}
      header={
        <PageHeader
          title="Dashboard"
          actions={
            <Button variant="primary">New Sale</Button>
          }
        />
      }
    >
      <DashboardWidgets />
    </AppShell>
  );
}
```

### Settings Page

```tsx
function SettingsPage() {
  return (
    <AppShell
      sidebar={<SettingsNavigation />}
      header={
        <PageHeader
          title="Settings"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Settings' },
          ]}
        />
      }
    >
      <SettingsContent />
    </AppShell>
  );
}
```

### Login Page (No Sidebar)

```tsx
function LoginPage() {
  return (
    <AppShell
      header={
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Logo />
        </div>
      }
    >
      <LoginForm />
    </AppShell>
  );
}
```

## Testing

The AppShell component includes comprehensive tests:

- ✅ Basic rendering of all sections
- ✅ Layout structure and semantic HTML
- ✅ Mobile sidebar behavior
- ✅ Backdrop interaction (click and keyboard)
- ✅ Accessibility attributes
- ✅ Layout contract enforcement

Run tests:
```bash
npm test -- AppShell.test.tsx
```

## Migration Guide

### From Old Layout

**Before:**
```tsx
function MyPage() {
  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="content">
          <PageContent />
        </div>
      </div>
    </div>
  );
}
```

**After:**
```tsx
function MyPage() {
  return (
    <AppShell
      sidebar={<Sidebar />}
      header={<Header />}
    >
      <PageContent />
    </AppShell>
  );
}
```

### Benefits of Migration

1. **No Overlap Issues**: Layout contract prevents content from overlapping sidebar/header
2. **Consistent Spacing**: Design tokens ensure uniform spacing across all pages
3. **Responsive by Default**: Mobile behavior works automatically
4. **Accessible**: Built-in keyboard navigation and ARIA attributes
5. **Maintainable**: Single source of truth for layout positioning

## Related Components

- **PageHeader**: Use for page titles, breadcrumbs, and actions
- **Navigation**: Sidebar navigation component
- **TopBar**: Header content component

## Design Tokens Used

```css
/* Layout */
--appHeaderH: 64px;
--appSidebarW: 240px;
--pageGutter: 16px;

/* Colors */
--color-bg-primary
--color-bg-secondary
--color-border

/* Z-index */
--z-sidebar: 900;
--z-header: 800;

/* Borders */
--border-1: 1px;

/* Focus */
--ring-2: 2px;
--color-focus-ring

/* Animation */
--duration-2: 300ms;
```

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

Requires CSS Grid support (all modern browsers).

## Performance

- Minimal re-renders (only when props change)
- CSS-based animations (GPU accelerated)
- No JavaScript layout calculations
- Efficient event handlers

## Troubleshooting

### Content Not Scrolling

**Problem**: Content area doesn't scroll when it overflows.

**Solution**: Ensure you're not setting `height: 100%` on child elements. The AppShell handles scrolling automatically.

### Sidebar Overlapping Content

**Problem**: Sidebar overlaps content on mobile.

**Solution**: Make sure you're passing `isSidebarOpen` and `onSidebarClose` props for mobile control.

### Z-index Issues

**Problem**: Modals or dropdowns appear behind sidebar/header.

**Solution**: Use the z-index tokens (`--z-modal`, `--z-dropdown`) which are higher than sidebar/header.

## Contributing

When modifying AppShell:

1. Ensure all tests pass
2. Update Storybook stories
3. Test responsive behavior at all breakpoints
4. Verify accessibility with keyboard navigation
5. Check both light and dark themes
6. Update this README if adding new features

## License

Part of the EasySale design system.

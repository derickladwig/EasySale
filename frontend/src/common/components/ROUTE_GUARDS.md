# Route Guards Documentation

## Overview

Route guards are components that protect routes based on authentication and permissions. They ensure users can only access pages they're authorized to view.

## Components

### RequireAuth

Protects routes that require authentication. Redirects unauthenticated users to the login page.

**Usage:**
```tsx
<Route
  path="/dashboard"
  element={
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  }
/>
```

### RequirePermission

Protects routes that require specific permissions. Redirects users without the required permission to an access denied page.

**Usage:**
```tsx
<Route
  path="/admin"
  element={
    <RequirePermission permission="access_admin">
      <AdminPage />
    </RequirePermission>
  }
/>
```

**Props:**
- `permission`: The required permission (from Permission enum)
- `redirectTo`: Optional custom redirect path (default: '/access-denied')

## Navigation Component

The `Navigation` component automatically filters menu items based on user permissions.

**Usage:**
```tsx
// Sidebar variant (desktop)
<Navigation variant="sidebar" />

// Mobile variant (bottom navigation)
<Navigation variant="mobile" />
```

## Navigation Configuration

Navigation items are defined in `common/config/navigation.ts`. Each item includes:
- `path`: Route path
- `label`: Display label
- `icon`: Icon emoji
- `permission`: Required permission
- `description`: Optional description

**Example:**
```ts
{
  path: '/sell',
  label: 'Sell',
  icon: '🛒',
  permission: 'access_sell',
  description: 'Point of sale and checkout',
}
```

## Permission System

Permissions are defined in `PermissionsContext.tsx`:

- `access_sell`: Access to sell module
- `access_inventory`: Access to inventory module
- `access_admin`: Access to admin module
- `apply_discount`: Apply discounts
- `override_price`: Override prices
- `process_return`: Process returns
- `receive_stock`: Receive stock
- `adjust_inventory`: Adjust inventory
- `manage_users`: Manage users
- `manage_settings`: Manage settings
- `view_audit_logs`: View audit logs

## How It Works

1. **Authentication Check**: `RequireAuth` checks if user is authenticated
2. **Permission Check**: `RequirePermission` checks if user has required permission
3. **Loading State**: Shows loading spinner while checking authentication
4. **Redirect**: Redirects to login or access denied if checks fail
5. **Navigation Filtering**: Navigation component filters items based on permissions

## Adding New Protected Routes

1. Define the permission in `PermissionsContext.tsx` if needed
2. Add navigation item to `navigation.ts`
3. Create the page component
4. Add route with appropriate guard in `App.tsx`:

```tsx
<Route
  path="/new-feature"
  element={
    <RequirePermission permission="access_new_feature">
      <NewFeaturePage />
    </RequirePermission>
  }
/>
```

## Testing

To test different permission levels:
1. Login with different user roles
2. Verify navigation items are filtered correctly
3. Try accessing protected routes directly via URL
4. Verify redirects work as expected

## Security Notes

- Route guards are client-side only
- Always validate permissions on the backend
- JWT tokens should be validated on every API request
- Never trust client-side permission checks alone

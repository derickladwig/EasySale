# User Preferences Storage

## Overview

The User Preferences system provides a simple, type-safe way to store and manage per-user preferences in EasySale. Preferences are stored in the browser's localStorage and are isolated per user.

## Scope

**User Preferences** are personal settings that:
- Are specific to each user (not shared across the organization)
- Don't need to be synced across devices
- Are stored locally in the browser
- Can be reset to defaults at any time

For tenant/store-wide settings that need to be shared across users and devices, use the `SettingsPersistence` API instead.

## Preference Types

### Theme Appearance
```typescript
type ThemeAppearance = 'light' | 'dark' | 'system';
```
Controls the visual theme of the application.

### UI Density
```typescript
type UIDensity = 'comfortable' | 'compact' | 'spacious';
```
Controls the spacing and sizing of UI elements.

### Keyboard Shortcuts
```typescript
interface KeyboardShortcuts {
  enabled: boolean;
  customBindings?: Record<string, string>;
}
```
Controls keyboard shortcut behavior and custom key bindings.

### Default Landing Page
```typescript
defaultLandingPage: string;
```
The page to navigate to after login (e.g., `/sell`, `/warehouse`).

## Usage

### Using the React Hook (Recommended)

The `useUserPreferences` hook provides the easiest way to access and update preferences in React components:

```tsx
import { useUserPreferences } from '@/common/hooks';

function MyComponent() {
  const {
    preferences,
    isLoading,
    setTheme,
    setDensity,
    setDefaultLandingPage,
    updatePreferences,
  } = useUserPreferences();

  return (
    <div>
      <p>Current theme: {preferences.theme}</p>
      
      <button onClick={() => setTheme('dark')}>
        Dark Mode
      </button>
      
      <button onClick={() => setDensity('compact')}>
        Compact View
      </button>
      
      <button onClick={() => setDefaultLandingPage('/sell')}>
        Set Sell as Home
      </button>
    </div>
  );
}
```

### Using Utility Functions Directly

For non-React code or when you need more control:

```typescript
import {
  getUserPreferences,
  setUserPreferences,
  updateUserPreference,
  getUserTheme,
  setUserTheme,
} from '@/common/utils';

// Get all preferences
const prefs = getUserPreferences(userId);

// Update multiple preferences
setUserPreferences(userId, {
  theme: 'dark',
  density: 'compact',
});

// Update a single preference
updateUserPreference(userId, 'theme', 'dark');

// Convenience methods
const theme = getUserTheme(userId);
setUserTheme(userId, 'light');
```

## API Reference

### React Hook

#### `useUserPreferences()`

Returns an object with:

- `preferences: UserPreferences` - Current user preferences
- `isLoading: boolean` - Whether preferences are loading
- `updatePreferences(prefs: Partial<UserPreferences>)` - Update multiple preferences
- `updatePreference(field, value)` - Update a single preference
- `resetToDefaults()` - Reset all preferences to defaults
- `setTheme(theme: ThemeAppearance)` - Set theme preference
- `setDensity(density: UIDensity)` - Set density preference
- `setDefaultLandingPage(path: string)` - Set default landing page
- `setKeyboardShortcuts(shortcuts: Partial<KeyboardShortcuts>)` - Set keyboard shortcuts

#### Specialized Hooks

```typescript
// Get only theme preference
const theme = useThemePreference();

// Get only density preference
const density = useDensityPreference();

// Get only default landing page
const landingPage = useDefaultLandingPage();

// Get only keyboard shortcuts
const shortcuts = useKeyboardShortcuts();
```

### Utility Functions

#### Core Functions

```typescript
// Get all preferences for a user
getUserPreferences(userId: string): UserPreferences

// Set multiple preferences (merges with existing)
setUserPreferences(userId: string, preferences: Partial<UserPreferences>): UserPreferences

// Update a single preference field
updateUserPreference<K extends keyof UserPreferences>(
  userId: string,
  field: K,
  value: UserPreferences[K]
): UserPreferences

// Reset preferences to defaults
resetUserPreferences(userId: string): UserPreferences

// Clear preferences from storage
clearUserPreferences(userId: string): void
```

#### Convenience Functions

```typescript
// Theme
getUserTheme(userId: string): ThemeAppearance
setUserTheme(userId: string, theme: ThemeAppearance): void

// Density
getUserDensity(userId: string): UIDensity
setUserDensity(userId: string, density: UIDensity): void

// Landing Page
getUserDefaultLandingPage(userId: string): string
setUserDefaultLandingPage(userId: string, path: string): void

// Keyboard Shortcuts
getUserKeyboardShortcuts(userId: string): KeyboardShortcuts
setUserKeyboardShortcuts(userId: string, shortcuts: Partial<KeyboardShortcuts>): void
```

#### Import/Export

```typescript
// Export preferences as JSON string
exportUserPreferences(userId: string): string

// Import preferences from JSON string
importUserPreferences(userId: string, json: string): UserPreferences
```

#### Migration

```typescript
// Migrate from legacy storage format
migrateUserPreferences(userId: string): void
```

## Storage Format

Preferences are stored in localStorage with the key format:
```
userPrefs_{userId}
```

Example stored data:
```json
{
  "theme": "dark",
  "density": "compact",
  "defaultLandingPage": "/sell",
  "shortcuts": {
    "enabled": true,
    "customBindings": {
      "sell": "Ctrl+S",
      "warehouse": "Ctrl+W"
    }
  },
  "lastUpdated": "2026-01-27T05:00:00.000Z"
}
```

## Default Values

```typescript
{
  theme: 'system',
  density: 'comfortable',
  shortcuts: {
    enabled: true,
    customBindings: {},
  },
  defaultLandingPage: '/',
  lastUpdated: new Date().toISOString(),
}
```

## Best Practices

### 1. Use the React Hook in Components

```tsx
// ✅ Good - Use the hook
function MyComponent() {
  const { preferences, setTheme } = useUserPreferences();
  // ...
}

// ❌ Avoid - Direct utility calls in components
function MyComponent() {
  const { user } = useAuth();
  const theme = getUserTheme(user.id); // No reactivity
  // ...
}
```

### 2. Check Authentication Before Using

The hook handles this automatically, but if using utilities directly:

```typescript
// ✅ Good - Check user exists
if (user?.id) {
  setUserTheme(user.id, 'dark');
}

// ❌ Bad - No check
setUserTheme(user.id, 'dark'); // May fail if user is null
```

### 3. Use Partial Updates

```typescript
// ✅ Good - Update only what changed
updatePreferences({ theme: 'dark' });

// ❌ Avoid - Replacing entire object
setUserPreferences(userId, { theme: 'dark' }); // Loses other preferences
```

### 4. Handle Errors Gracefully

```typescript
try {
  setUserPreferences(userId, preferences);
} catch (error) {
  console.error('Failed to save preferences:', error);
  // Show user-friendly error message
}
```

## Migration from Legacy Storage

If you have existing theme or preference storage, call `migrateUserPreferences` on app initialization:

```typescript
useEffect(() => {
  if (user?.id) {
    migrateUserPreferences(user.id);
  }
}, [user?.id]);
```

This will automatically migrate legacy preferences to the new format.

## Testing

The system includes comprehensive unit tests:

```bash
# Run all preference tests
npm test -- userPreferences

# Run only utility tests
npm test -- userPreferences.test.ts

# Run only hook tests
npm test -- useUserPreferences.test.tsx
```

## Troubleshooting

### Preferences Not Persisting

1. Check that localStorage is available and not disabled
2. Verify the user is authenticated (`user?.id` exists)
3. Check browser console for errors

### Preferences Not Loading

1. Verify the correct user ID is being used
2. Check localStorage in browser DevTools (Application tab)
3. Look for the key `userPrefs_{userId}`

### Preferences Reset on Logout

This is expected behavior. Preferences are per-user and loaded when the user authenticates. If you need preferences to persist across sessions, ensure the user ID remains consistent.

## Related Systems

- **SettingsPersistence**: For tenant/store-wide settings that sync across devices
- **ThemeProvider**: Applies theme preferences to the UI
- **AuthContext**: Provides user information for preference storage

## Future Enhancements

Potential future improvements:
- Cloud sync for preferences across devices
- Preference versioning and migration system
- Preference validation and constraints
- Preference change history/audit log
- Import/export UI for backup and restore

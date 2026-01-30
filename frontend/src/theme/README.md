# Theme Module

The Theme Module provides comprehensive theme management for EasySale, including:

- Theme application via HTML data attributes
- Scope-based theme resolution (tenant → store → user)
- Theme persistence with offline support
- Pre-React boot sequence to prevent theme flash
- CSS variable injection from tenant configuration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ThemeEngine                           │
│  - Apply themes to DOM                                   │
│  - Resolve scope precedence                              │
│  - Persist preferences                                   │
│  - Load cached themes                                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   ConfigStore                            │
│  - Get/set theme preferences                             │
│  - Store/user/default scopes                             │
│  - Offline-first persistence                             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Theme Bridge                            │
│  - Map tenant config → CSS variables                     │
│  - Inject colors into DOM                                │
└─────────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

```typescript
import { ThemeEngine } from '@/theme';
import { createConfigStore } from '@/config/ConfigStore';

// Create config store
const configStore = createConfigStore('cached');

// Create theme engine
const themeEngine = new ThemeEngine(configStore);

// Initialize with store and user context
await themeEngine.initialize('store-1', 'user-1');
```

### Changing Theme

```typescript
// Change user theme preference
await themeEngine.saveThemePreference('user', {
  mode: 'dark',
});

// Change store theme (requires store admin permissions)
await themeEngine.saveThemePreference('store', {
  mode: 'light',
  colors: {
    primary: { 500: '#10b981', 600: '#059669' },
  },
});
```

### Theme Boot Sequence

To prevent theme flash on page load, call `bootTheme()` before React renders:

**In `index.html`:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EasySale</title>
    
    <!-- Theme boot script (before React) -->
    <script>
      (function() {
        const cached = localStorage.getItem('EasySale_theme_cache');
        if (cached) {
          const { lastTheme } = JSON.parse(cached);
          const mode = lastTheme.mode === 'auto' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : lastTheme.mode;
          document.documentElement.dataset.theme = mode;
        } else {
          document.documentElement.dataset.theme = 'light';
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Or use the `bootTheme()` helper:**

```typescript
import { bootTheme } from '@/theme';

// Call before React renders
bootTheme({
  cacheKey: 'EasySale_theme_cache',
  defaultTheme: {
    mode: 'light',
    colors: { /* ... */ },
  },
});
```

## Scope Precedence

The theme engine resolves themes using the following precedence:

1. **Default Theme** (hardcoded fallback)
2. **Tenant Theme** (from JSON config)
3. **Store Theme** (from database)
4. **User Theme** (from database, respecting locks)

### Theme Locks

Store administrators can lock specific theme dimensions to prevent user overrides:

- `lockMode`: Prevents users from changing light/dark mode
- `lockAccent`: Prevents users from changing accent color
- `lockContrast`: (Future) Prevents users from changing contrast settings

**Example:**

```typescript
// Store locks mode to 'light'
const storeTheme = {
  mode: 'light',
  locks: {
    lockMode: true,
    lockAccent: false,
  },
};

// User tries to change to dark mode
await themeEngine.saveThemePreference('user', { mode: 'dark' });
// ❌ Throws: "Theme mode is locked by store policy"

// User can still change accent (not locked)
await themeEngine.saveThemePreference('user', {
  colors: { accent: { 500: '#ef4444', 600: '#dc2626' } },
});
// ✅ Success
```

## Offline Support

The theme engine caches the last applied theme in localStorage for offline startup:

```typescript
interface ThemeCache {
  lastStoreId: string;
  lastTheme: ThemeConfig;
  timestamp: number;
}
```

**Cache Key:** `EasySale_theme_cache` (configurable)

**Fallback Order:**
1. Try to load from ConfigStore (online)
2. Fall back to cached theme (offline)
3. Fall back to default theme (no cache)

## CSS Variables

The theme engine injects CSS variables from the theme configuration:

```css
:root {
  /* Color scales */
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  
  /* Semantic colors */
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-text: #111827;
  
  /* Action tokens (derived) */
  --color-action-primary-bg: #3b82f6;
  --color-action-primary-hover: #2563eb;
  
  /* Fonts */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  
  /* Animations */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
}
```

## API Reference

### ThemeEngine

#### Constructor

```typescript
constructor(configStore: IConfigStore, cacheKey?: string)
```

- `configStore`: ConfigStore instance for persistence
- `cacheKey`: localStorage key for theme cache (default: `'EasySale_theme_cache'`)

#### Methods

##### `initialize(storeId: string, userId?: string): Promise<void>`

Initialize theme engine with store and user context. Loads and applies the resolved theme.

##### `applyTheme(config: ThemeConfig): void`

Apply theme configuration to DOM. Sets data attributes and injects CSS variables.

##### `resolveTheme(preferences: ThemePreferences): ThemeConfig`

Resolve theme with scope precedence logic. Respects theme locks.

##### `saveThemePreference(scope: 'store' | 'user', partialTheme: Partial<ThemeConfig>): Promise<void>`

Save theme preference at a specific scope. Validates theme locks for user scope.

##### `loadCachedTheme(): ThemeConfig | null`

Load cached theme from localStorage. Returns null if no cache exists or cache is invalid.

##### `getCurrentTheme(): ThemeConfig | null`

Get currently applied theme from DOM. Returns null if no theme is applied.

### bootTheme

```typescript
function bootTheme(options?: ThemeBootOptions): void
```

Boot theme before React renders to prevent theme flash.

**Options:**
- `cacheKey`: localStorage key (default: `'EasySale_theme_cache'`)
- `defaultTheme`: Fallback theme (default: `DEFAULT_THEME`)

## Testing

The theme module includes comprehensive unit tests:

```bash
npm test -- ThemeEngine.test.ts
```

**Test Coverage:**
- Theme application and resolution
- Scope precedence logic
- Theme locks validation
- Offline cache fallback
- Boot sequence
- Error handling

## Integration with React

The theme engine is designed to work with React via the `ThemeProvider`:

```typescript
import { ThemeProvider } from '@/config/ThemeProvider';
import { ThemeEngine } from '@/theme';

function App() {
  return (
    <ThemeProvider>
      {/* Your app components */}
    </ThemeProvider>
  );
}
```

The `ThemeProvider` uses the theme engine internally to apply themes and provide theme context to components.

## Migration from Old System

If you're migrating from the old theme system:

1. Replace direct DOM manipulation with `ThemeEngine.applyTheme()`
2. Replace localStorage reads with `ThemeEngine.loadCachedTheme()`
3. Replace theme persistence with `ThemeEngine.saveThemePreference()`
4. Add `bootTheme()` call in `index.html` to prevent flash

## Troubleshooting

### Theme Flash on Page Load

**Problem:** Page briefly shows wrong theme before correct theme loads.

**Solution:** Ensure `bootTheme()` is called in `index.html` before React renders.

### Theme Not Persisting

**Problem:** Theme changes don't persist after page reload.

**Solution:** Check that ConfigStore is properly configured and localStorage is accessible.

### Theme Locks Not Working

**Problem:** Users can override locked theme settings.

**Solution:** Ensure store theme has `locks` property set and `saveThemePreference()` is called with correct scope.

### CSS Variables Not Applied

**Problem:** Theme colors don't appear in components.

**Solution:** Ensure `applyTheme()` is called after theme resolution and components use CSS variables (not hardcoded colors).

## Related Documentation

- [ConfigStore](../config/README.md) - Configuration and persistence layer
- [Theme Bridge](../config/themeBridge.ts) - Tenant config → CSS variables mapping
- [Design Tokens](../styles/tokens.css) - Base design token system
- [Themes](../styles/themes.css) - Theme-specific token values

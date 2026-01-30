# Tenant Configuration System

The tenant configuration system provides a comprehensive solution for managing multi-tenant white-label POS configurations with runtime theming, offline support, and strict validation.

## Overview

The system implements a four-layer configuration merge strategy:

```
defaultConfig (code) ← tenantConfig (JSON) ← storeConfig (DB) ← userConfig (DB, respecting locks)
```

## Features

### 1. Schema Validation

Validates tenant configuration files against JSON schema using Zod:

- **Hard-fail in development**: Throws errors for invalid configs
- **Soft-fail in production**: Logs warnings and uses defaults
- **Type-safe**: Full TypeScript support with inferred types

```typescript
import { validateConfig } from './config';

const result = validateConfig(configData);
if (result.success) {
  // Use result.data
} else {
  // Handle result.errors
}
```

### 2. Config Merge Strategy

Merges configurations with proper precedence and theme lock support:

```typescript
import { mergeConfigs } from './config';

const merged = mergeConfigs({
  default: defaultConfig,
  tenant: tenantConfig,
  store: storeConfig,
  user: userConfig,
});
```

**Theme Locks**: Store-level flags that prevent user overrides:
- `lockMode`: Prevents users from changing light/dark mode
- `lockAccent`: Prevents users from changing accent colors
- `lockContrast`: Prevents users from changing contrast settings

### 3. Theme JSON → CSS Variables Bridge

Maps tenant theme configuration to CSS custom properties:

```typescript
import { applyThemeToCSS } from './config';

applyThemeToCSS(theme);
// Injects CSS variables into document root
```

**Mapped Variables**:
- `--color-primary-500`, `--color-primary-600`, etc.
- `--color-background`, `--color-surface`, `--color-text`
- `--color-action-primary-bg`, `--color-action-primary-hover`
- `--font-heading`, `--font-body`, `--font-mono`
- `--spacing-0` through `--spacing-16`
- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- `--duration-fast`, `--duration-normal`, `--duration-slow`

### 4. Asset Handling & Offline Cache

Caches tenant assets (logos, backgrounds) for offline operation:

```typescript
import { preloadBrandingAssets, resolveLogo } from './config';

// Preload all branding assets
await preloadBrandingAssets(branding);

// Resolve logo with fallback order: logoDark → logo → built-in default
const logoUrl = resolveLogo(branding, { preferDark: true });
```

**Features**:
- Converts assets to data URLs for offline storage
- Automatic cache pruning when quota exceeded
- Fallback order for logos based on theme mode
- Cache statistics and management

## Usage

### Basic Setup

```typescript
import { ConfigProvider } from './config';

function App() {
  return (
    <ConfigProvider configPath="/api/config">
      <YourApp />
    </ConfigProvider>
  );
}
```

### Using Configuration

```typescript
import { useConfig } from './config';

function MyComponent() {
  const {
    branding,
    theme,
    categories,
    isModuleEnabled,
    formatCurrency,
    getLogo,
  } = useConfig();

  return (
    <div>
      <img src={getLogo()} alt={branding.company.name} />
      <h1>{branding.company.name}</h1>
      {isModuleEnabled('loyalty') && <LoyaltyWidget />}
      <p>{formatCurrency(1234.56)}</p>
    </div>
  );
}
```

### Setting Store/User Config

```typescript
import { useConfig } from './config';

function ThemeSettings() {
  const { setStoreConfig, setUserConfig } = useConfig();

  const handleStoreThemeChange = () => {
    setStoreConfig({
      theme: {
        mode: 'dark',
      },
      locks: {
        lockMode: true, // Prevent users from changing mode
      },
    });
  };

  const handleUserThemeChange = () => {
    setUserConfig({
      theme: {
        mode: 'light', // Will be ignored if store has lockMode: true
      },
    });
  };

  return (
    <div>
      <button onClick={handleStoreThemeChange}>Set Store Theme</button>
      <button onClick={handleUserThemeChange}>Set User Theme</button>
    </div>
  );
}
```

## Configuration File Structure

### Minimal Config

```json
{
  "version": "1.0.0",
  "tenant": {
    "id": "my-tenant",
    "name": "My Business",
    "slug": "my-business"
  },
  "branding": {
    "company": {
      "name": "My Business",
      "logo": "/assets/logo.svg"
    }
  },
  "theme": {
    "mode": "dark",
    "colors": {
      "primary": {
        "500": "#3b82f6",
        "600": "#2563eb"
      },
      "background": "#0f172a",
      "surface": "#1e293b",
      "text": "#f1f5f9",
      "success": "#22c55e",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    }
  },
  "categories": [],
  "navigation": {
    "main": []
  },
  "modules": {
    "inventory": { "enabled": true }
  }
}
```

### Logo Fallback Order

The system uses the following fallback order for logos:

1. **Dark mode**: `logoDark` → `logo` → built-in default dark
2. **Light mode**: `logoLight` → `logo` → built-in default light

```json
{
  "branding": {
    "company": {
      "logo": "/assets/logo.svg",
      "logoLight": "/assets/logo-light.svg",
      "logoDark": "/assets/logo-dark.svg"
    }
  }
}
```

## API Reference

### Validation

- `validateConfig(config, mode?)`: Validate configuration
- `validateConfigFromJSON(json, mode?)`: Validate from JSON string
- `isValidConfig(config)`: Check if config is valid

### Config Merge

- `mergeConfigs(layers)`: Merge configuration layers
- `resolveTheme(...)`: Resolve theme with scope precedence

### Theme Bridge

- `applyThemeToCSS(theme)`: Apply theme to DOM
- `themeToCSSVariables(theme)`: Convert theme to CSS variables
- `removeThemeFromCSS()`: Remove theme from DOM
- `getCurrentThemeVariables()`: Get current CSS variables

### Asset Cache

- `cacheAsset(url)`: Cache single asset
- `cacheAssets(urls)`: Cache multiple assets
- `getCachedAsset(url)`: Get cached asset
- `clearAssetCache()`: Clear all cached assets
- `resolveLogo(branding, options?)`: Resolve logo with fallback
- `resolveAndCacheLogo(branding, options?)`: Resolve and cache logo
- `preloadBrandingAssets(branding)`: Preload all branding assets
- `getCacheStats()`: Get cache statistics

## Testing

The system includes comprehensive tests for:

- Configuration validation (hard-fail vs soft-fail)
- Config merge strategy with precedence
- Theme lock enforcement
- CSS variable mapping
- Asset caching and fallback

Run tests:

```bash
npm test -- tenantConfig.test.ts
```

## Performance Considerations

- **Validation**: Runs once on config load, cached for subsequent use
- **Merge**: Shallow merge with deep merge for nested objects
- **Theme Application**: Direct DOM manipulation, no React re-renders
- **Asset Cache**: Uses localStorage with automatic pruning
- **Cache Size**: 10MB limit per asset, automatic cleanup

## Security

- **Validation**: Strict schema validation prevents malicious configs
- **Sanitization**: All URLs and strings are validated
- **Isolation**: Tenant configs are isolated from each other
- **Offline**: Cached assets are stored as data URLs (no external requests)

## Migration Guide

### From Old Config System

1. Update config files to match new schema
2. Replace old config loading with `ConfigProvider`
3. Use `useConfig()` hook instead of direct imports
4. Update theme application to use `applyThemeToCSS()`
5. Migrate asset loading to use `preloadBrandingAssets()`

### Breaking Changes

- Config validation is now strict (use schema.json)
- Theme locks are enforced (check store config)
- Asset URLs must be absolute or relative to public root
- CSS variables are now prefixed with `--color-`, `--font-`, etc.

## Troubleshooting

### Config Validation Fails

- Check config against `configs/schema.json`
- Ensure all required fields are present
- Verify semver version format (`1.0.0`)
- Check for typos in field names

### Theme Not Applying

- Verify theme is valid (check console for errors)
- Ensure `applyThemeToCSS()` is called after config load
- Check if theme locks are preventing changes
- Inspect DOM for CSS variables (`--color-*`)

### Assets Not Caching

- Check asset URLs are accessible
- Verify assets are under 10MB size limit
- Check localStorage quota (may be full)
- Clear cache and try again

### Offline Mode Issues

- Ensure assets are preloaded before going offline
- Check localStorage for cached config
- Verify fallback logos are available
- Test with network throttling

## Future Enhancements

- [ ] IndexedDB support for larger asset cache
- [ ] Service Worker integration for true offline support
- [ ] Config versioning and migration system
- [ ] Real-time config updates via WebSocket
- [ ] Config diff and rollback functionality
- [ ] Multi-language support for config UI
- [ ] Config validation in backend API
- [ ] Automated config testing and linting

## Related Documentation

- [Configuration Types](./types.ts)
- [Default Configuration](./defaultConfig.ts)
- [Schema Definition](../../../configs/schema.json)
- [Design System Spec](../.kiro/specs/unified-design-system/)

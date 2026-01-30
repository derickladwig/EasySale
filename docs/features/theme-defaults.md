# Theme Default Support

**Feature**: Theme Default Support  
**Task**: 15.3 Add theme default support  
**Validates**: Requirements 5.5

## Overview

EasySale now supports tenant-level theme defaults that users can override with their personal preferences. This allows store owners to set a default theme for their business while giving individual users the flexibility to choose their preferred appearance.

## Architecture

### Three-Level Theme Resolution

The theme system resolves the effective theme through three levels:

1. **Tenant Default** (BrandConfig): Store owner sets default theme
2. **User Preference**: Individual user can override or use store default
3. **System Preference**: For "system" mode, follows OS dark/light preference

### Resolution Flow

```
User Preference
    ↓
Is it "store-default"?
    ↓ Yes
Tenant Default (from BrandConfig)
    ↓
Is it "system"?
    ↓ Yes
System Preference (OS setting)
    ↓
Final Theme: "light" or "dark"
```

## Configuration

### Tenant Configuration (BrandConfig)

Store owners configure the default theme in their tenant configuration:

```typescript
interface BrandConfig {
  theme: {
    defaultAppearance?: 'light' | 'dark' | 'system';
  };
}
```

**Example tenant config:**
```json
{
  "branding": {
    "company": {
      "name": "My Store"
    }
  },
  "theme": {
    "mode": "dark"  // Maps to defaultAppearance: 'dark'
  }
}
```

### User Preferences

Users can choose from four options in their preferences:

1. **Store Default** (`'store-default'`): Use the tenant's default theme
2. **Light** (`'light'`): Always use light theme
3. **Dark** (`'dark'`): Always use dark theme
4. **System** (`'system'`): Follow OS preference

**Storage:**
- Stored in localStorage per user
- Key format: `userPrefs_{userId}`
- Default value: `'store-default'`

## User Interface

### Preferences Page

Location: Profile Menu → Preferences → Theme

The preferences page shows:
- Four theme options (Store Default, Light, Dark, System)
- Visual cards with icons for each option
- "Effective Theme" display showing what theme will actually be used

**Example displays:**
- User selects "Store Default" + Tenant default is "Dark" → Shows "Using store default (Dark)"
- User selects "System" + OS is in light mode → Shows "Following system (Light)"
- User selects "Light" → Shows "Light"

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/common/utils/themeResolver.ts` | Theme resolution logic |
| `frontend/src/common/utils/userPreferences.ts` | User preference storage |
| `frontend/src/config/brandConfig.ts` | Tenant default configuration |
| `frontend/src/features/preferences/pages/PreferencesPage.tsx` | User preferences UI |

### Theme Resolution Function

```typescript
function resolveTheme(
  userPreference: ThemeAppearance,
  brandConfig?: BrandConfig
): ResolvedThemeMode {
  // If user wants store default, use tenant's default
  if (userPreference === 'store-default') {
    const tenantDefault = brandConfig?.theme?.defaultAppearance || 'system';
    
    // If tenant default is also 'system', resolve it
    if (tenantDefault === 'system') {
      return getSystemPreference();
    }
    
    return tenantDefault as ResolvedThemeMode;
  }
  
  // If user wants system preference, resolve it
  if (userPreference === 'system') {
    return getSystemPreference();
  }
  
  // Otherwise, use user preference directly
  return userPreference as ResolvedThemeMode;
}
```

### System Preference Monitoring

The system automatically monitors OS theme changes when needed:

```typescript
function needsSystemPreferenceMonitoring(
  userPreference: ThemeAppearance,
  brandConfig?: BrandConfig
): boolean {
  // Direct system preference
  if (userPreference === 'system') {
    return true;
  }
  
  // Store default that resolves to system
  if (userPreference === 'store-default') {
    const tenantDefault = brandConfig?.theme?.defaultAppearance || 'system';
    return tenantDefault === 'system';
  }
  
  return false;
}
```

## Testing

### Unit Tests

Location: `frontend/src/common/utils/themeResolver.test.ts`

**Test Coverage:**
- ✅ Direct theme preferences (light, dark)
- ✅ System preference resolution
- ✅ Store default resolution
- ✅ Nested resolution (store default → system → OS)
- ✅ Effective theme descriptions
- ✅ System preference monitoring detection
- ✅ Edge cases (missing config, undefined values)

**Test Results:**
```
✓ Theme Resolver (25 tests)
  ✓ resolveTheme (9 tests)
  ✓ getSystemPreference (2 tests)
  ✓ getEffectiveThemeDescription (6 tests)
  ✓ needsSystemPreferenceMonitoring (5 tests)
  ✓ Edge Cases (3 tests)
```

## Usage Examples

### Example 1: Store with Dark Default

**Tenant Config:**
```json
{
  "theme": {
    "mode": "dark"
  }
}
```

**User Scenarios:**
- User A selects "Store Default" → Gets dark theme
- User B selects "Light" → Gets light theme (overrides store default)
- User C selects "System" → Gets theme based on their OS

### Example 2: Store with System Default

**Tenant Config:**
```json
{
  "theme": {
    "mode": "auto"
  }
}
```

**User Scenarios:**
- User A selects "Store Default" → Gets theme based on their OS
- User B selects "Dark" → Gets dark theme regardless of OS
- User C selects "System" → Gets theme based on their OS (same as store default)

### Example 3: First-Run Store

**No Tenant Config Yet:**

**User Scenarios:**
- All users get "Store Default" which resolves to "System"
- After setup wizard, tenant can set a specific default

## Migration

### Existing Users

Users with existing theme preferences will continue to work:
- Old preference values ('light', 'dark', 'system') remain valid
- New default for new users is 'store-default'
- No data migration needed

### Legacy Theme Storage

The system includes migration logic for legacy theme storage:

```typescript
function migrateUserPreferences(userId: string): void {
  const legacyThemeKey = 'theme';
  const legacyTheme = localStorage.getItem(legacyThemeKey);
  
  if (legacyTheme && isValidTheme(legacyTheme)) {
    setUserTheme(userId, legacyTheme as ThemeAppearance);
    localStorage.removeItem(legacyThemeKey);
  }
}
```

## Benefits

### For Store Owners
- Set consistent branding across all users
- Control default appearance for their business
- Users can still personalize if desired

### For Users
- Flexibility to override store defaults
- Clear indication of what theme is active
- Respects OS preferences when desired

### For Developers
- Clean separation of concerns (tenant vs user preferences)
- Testable theme resolution logic
- Extensible for future theme features

## Future Enhancements

Potential future improvements:
- Per-role theme defaults (e.g., cashiers always get light theme)
- Time-based theme switching (light during day, dark at night)
- Custom theme presets beyond light/dark
- Theme preview before applying

## Related Documentation

- [User Preferences System](./user-preferences.md)
- [Branding Configuration](./branding-configuration.md)
- [Design Tokens](./design-tokens.md)

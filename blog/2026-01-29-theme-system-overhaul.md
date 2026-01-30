# Theme System Overhaul - Light Mode Fix and New Defaults

**Date:** 2026-01-29

## Summary

Major overhaul of the theme system to fix light mode (which was stuck on dark), update default colors, and ensure branding properly overrides presets.

## Changes Made

### 1. New Default Colors

- **Default Accent**: Changed from teal (#14b8a6) to blue (#0756d9)
- **Default Mode**: Changed from dark to light
- **Dark Theme Background**: Changed from slate-900 (#0f172a) to charcoal gray (#222224)

### 2. Dark Theme Improvements

The dark theme now uses a softer charcoal gray (#222224) instead of the very dark slate:

```css
[data-theme="dark"] {
  --color-background: #222224;
  --color-surface: #2a2a2c;
  --color-surface-elevated: #333336;
  --color-text-primary: #f5f5f7;
  --color-text-secondary: #d1d1d6;
  --color-text-muted: #8e8e93;
}
```

### 3. Light Mode Fix

Light mode was stuck because:
1. `DEFAULT_THEME` in ThemeEngine had `mode: 'dark'` hardcoded
2. Boot fallback defaulted to dark mode
3. CSS tokens weren't properly applying light theme variables

Fixed by:
- Changed `DEFAULT_THEME.mode` to `'light'`
- Updated boot fallback to use light mode
- Ensured CSS tokens properly cascade for both themes

### 4. Branding Override Priority

The theme system now properly respects branding selections:
1. User selects accent color in wizard/settings
2. Color is saved to localStorage immediately (prevents flickering)
3. CSS variables are applied at boot time before React renders
4. Store-level locks can prevent user overrides

### 5. Files Modified

- `frontend/src/styles/tokens.css` - Dark theme colors updated to #222224 base
- `frontend/src/styles/themes.css` - Default accent changed to blue, dark theme updated
- `frontend/src/theme/ThemeEngine.ts` - DEFAULT_THEME now uses light mode and blue accent
- `frontend/src/admin/components/wizard/BrandingStepContent.tsx` - Blue is now first/default preset
- `frontend/src/theme/ThemeEngine.test.ts` - Tests updated for new defaults

## Security Note

Verified npm dependencies are secure:
- npm 11.7.0 and Node.js v24.8.0 (latest versions)
- `npm audit` shows 0 vulnerabilities
- `chalk` packages are safe versions (3.0.0, 4.1.2) - not affected by Dec 2025 supply chain attacks

## Testing

All bootTheme tests pass (7/7). Theme switching between light and dark modes now works correctly.

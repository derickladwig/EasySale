# Theme Persistence and Flickering Fix

**Date:** 2026-01-29

## Summary

Implemented localStorage-based theme caching to prevent color flickering when the setup wizard branding step saves accent colors. The theme now persists across page reloads without a flash of default colors.

## Problem

When users selected a custom accent color in the setup wizard's branding step, the color would briefly flash back to the default teal on page reload before the theme API response arrived. This created a jarring visual experience.

## Solution

### 1. Expanded Color Presets

Increased the theme presets from 4 blue-ish colors to 16 diverse options:
- Teal, Emerald, Green, Lime
- Blue, Indigo, Violet, Purple
- Fuchsia, Pink, Rose, Red
- Orange, Amber, Yellow, Cyan
- Plus custom hex input

### 2. Custom Hex Color Input

Added a hex color input with:
- Text input for manual hex entry (e.g., `#14b8a6`)
- Native color picker (`<input type="color">`)
- Real-time validation with visual feedback
- Auto-generation of accent600 (darker shade) from accent500

### 3. localStorage Caching

The branding step now saves to localStorage immediately:
- `theme_accent_500` - Primary accent color
- `theme_accent_600` - Darker accent shade
- `theme_preset` - Selected preset name

### 4. Boot-Time Theme Application

Updated `bootTheme()` in ThemeEngine to:
1. Check for simple localStorage accent colors first
2. Apply them immediately before React renders
3. Generate full color scale from accent500/accent600
4. Fall back to full theme cache or defaults if not found

### 5. ThemeProvider Integration

Updated ThemeProvider to recognize when localStorage accent colors are present and skip unnecessary API calls during setup wizard flow.

## Technical Details

### Color Scale Generation

```typescript
function generateColorScale(accent500: string, accent600: string): Record<string, string> {
  return {
    '50': adjustBrightness(accent500, 90),
    '100': adjustBrightness(accent500, 75),
    '200': adjustBrightness(accent500, 55),
    '300': adjustBrightness(accent500, 35),
    '400': adjustBrightness(accent500, 15),
    '500': accent500,
    '600': accent600,
    '700': adjustBrightness(accent600, -15),
    '800': adjustBrightness(accent600, -30),
    '900': adjustBrightness(accent600, -45),
    '950': adjustBrightness(accent600, -60),
  };
}
```

### CSS Variable Application

Colors are applied to both `--color-accent-*` and `--color-primary-*` CSS variables, ensuring consistent theming across all components that use either token family.

## Files Modified

- `frontend/src/admin/components/wizard/BrandingStepContent.tsx` - Color picker UI
- `frontend/src/theme/ThemeEngine.ts` - Boot-time localStorage check
- `frontend/src/config/ThemeProvider.tsx` - React state sync
- `frontend/src/theme/ThemeEngine.test.ts` - Updated test expectations

## Testing

All bootTheme tests pass. The theme now persists correctly across page reloads without flickering.

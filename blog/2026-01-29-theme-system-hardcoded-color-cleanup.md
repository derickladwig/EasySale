# Theme System: Hardcoded Color Cleanup

**Date**: January 29, 2026

## Summary

Completed comprehensive cleanup of hardcoded color values across the frontend CSS files. All colors now flow from the centralized theme system defined in `tokens.css` and `themes.css`.

## Changes Made

### SetupWizard.module.css
- Removed all hardcoded hex colors (#070B16, #0C1424, #111B2E, #14b8a6, #2dd4bf, etc.)
- Replaced with CSS variables from the theme system
- Used `color-mix()` for dynamic opacity-based colors (e.g., `color-mix(in srgb, var(--color-primary-500) 25%, transparent)`)
- Updated header comment to reflect new theme-agnostic approach

### Select.module.css
- Removed nested `var()` fallbacks with hardcoded slate colors
- Simplified to use single-level CSS variables
- Removed theme-specific background-image SVGs (now uses `currentColor`)

### Input.module.css
- Removed hardcoded `#ffffff` fallback
- Removed hardcoded `rgba(255, 255, 255, 0.08)` for dark mode
- Now uses `var(--color-surface-elevated)` and `var(--color-hover)` consistently

### index.css
- Verified fallback colors match new theme system:
  - Light mode: `#ffffff` background, `#1a1a1a` text
  - Dark mode: `#2a2a2c` surface, `#f5f5f7` text
  - Accent: `#0756d9` (blue)
- These fallbacks are intentional for boot-time before CSS vars load

## Theme System Architecture

```
tokens.css (source of truth)
    ↓
themes.css (theme definitions)
    ↓
Component CSS files (use CSS variables only)
```

### Key Principles
1. **Single source of truth**: Only `tokens.css` and `themes.css` contain raw color values
2. **No hardcoded fallbacks**: Component CSS uses CSS variables without hex fallbacks
3. **Dynamic opacity**: Use `color-mix()` for opacity-based variations
4. **Theme-agnostic**: Components work in both light and dark modes automatically

## Test Results

All 66 ThemeEngine tests pass, confirming:
- Theme application updates DOM correctly
- Theme switching works without page reload
- Scope precedence resolution works correctly
- Boot-time theme application works

## Files Modified

- `frontend/src/admin/pages/SetupWizard.module.css`
- `frontend/src/components/ui/Select.module.css`
- `frontend/src/components/ui/Input.module.css`

## Build Verification

Frontend build completes successfully with no CSS-related errors.

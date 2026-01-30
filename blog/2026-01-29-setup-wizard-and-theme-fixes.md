# Setup Wizard and Theme System Fixes

**Date:** 2026-01-29

## Summary

Fixed multiple issues with the setup wizard and theme system:

1. **500 Error on Import** - The import endpoint was receiving incorrect payload format
2. **Scrolling Issues** - Content area wasn't scrollable in the wizard
3. **Real-time Color Preview** - Branding colors now apply immediately when selected
4. **Compact Card Design** - Reduced padding and sizing for better fit
5. **Global Theme Colors** - Login page and sidebar now use theme CSS variables

## Changes Made

### Import Endpoint Fix (`ImportStepContent.tsx`)
- Changed from sending `{ entity_type, filename }` to `{ entity_type, csv_data }`
- Now reads file content using FileReader before sending to backend
- Added proper error handling for partial import success

### Real-time Color Preview (`BrandingStepContent.tsx`)
- Added `applyAccentPreview()` function that applies colors to CSS variables immediately
- Generates full color scale from accent500/accent600
- Updates both `--color-accent-*` and `--color-primary-*` variables
- Colors now reflect in real-time as user selects presets or custom hex

### Scrolling and Compact Design (`SetupWizard.module.css`)
- Added `overflow-x: hidden` and `scroll-behavior: smooth` to content scroll area
- Added `scrollbar-gutter: stable` for consistent layout
- Reduced card padding and border-radius for more compact appearance
- Reduced card header icon size from 36px to 32px
- Reduced overall spacing throughout the wizard

### Theme-Aware Login Page (`LoginPageV2.tsx`)
- Changed hardcoded `blue-*` classes to `primary-*` classes
- Updated inline styles to use CSS variables: `var(--color-primary-500)`
- Login button, links, and status indicators now follow theme colors

## Technical Details

The theme system uses CSS custom properties that flow through:
1. `tokens.css` - Base color definitions
2. `themes.css` - Theme-specific overrides
3. `ThemeEngine.ts` - Runtime color application
4. Tailwind config - Maps CSS vars to utility classes

When branding colors are selected in the wizard:
1. `applyAccentPreview()` generates a full color scale
2. CSS variables are set on `document.documentElement`
3. All components using `primary-*` or `accent-*` classes update immediately
4. On save, colors are persisted to localStorage and backend

## Files Modified

- `frontend/src/admin/components/wizard/ImportStepContent.tsx`
- `frontend/src/admin/components/wizard/BrandingStepContent.tsx`
- `frontend/src/admin/pages/SetupWizard.module.css`
- `frontend/src/auth/pages/LoginPageV2.tsx`

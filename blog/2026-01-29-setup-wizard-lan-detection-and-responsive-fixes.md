# Setup Wizard: LAN Detection & Responsive Scaling Fixes

**Date**: 2026-01-29

## Summary

Fixed issues in the Setup Wizard's Network & Access step:

1. **LAN Access Detection** - Now detects when user is accessing via LAN IP and shows a warning if the toggle is off
2. **Full-Width Card Layout** - Card now fills the entire content area instead of being a tiny centered box
3. **Responsive Scaling** - All elements scale properly on resize

## Changes

### LAN Detection (`NetworkStepContent.tsx`)

Added `isAccessingViaLan` detection that checks if `window.location.hostname` is a private IP:
- 10.x.x.x (Class A)
- 172.16-31.x.x (Class B)  
- 192.168.x.x (Class C)

When accessing via LAN but toggle is off, shows amber warning:
> "You're accessing via LAN (192.168.x.x). Enable LAN access above to ensure other devices can continue connecting after restart."

### Full-Width Card Layout (`SetupWizard.module.css`)

**Before:** Card was constrained to `max-width: 640px` and centered, leaving lots of empty space.

**After:** 
- Card now uses `flex: 1` to fill available height
- No max-width constraint - fills the content area
- Card body scrolls independently with `overflow-y: auto`
- Sidebar uses responsive `clamp(200px, 18vw, 260px)` width

Key CSS changes:
```css
.card {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.cardBody {
  flex: 1;
  overflow-y: auto;
  padding: clamp(16px, 2vw, 24px) clamp(18px, 2.5vw, 32px);
}
```

## No Hardcoded IPs

Confirmed: The 192.x address shown in the URL is dynamically detected from `window.location.hostname`, not hardcoded.

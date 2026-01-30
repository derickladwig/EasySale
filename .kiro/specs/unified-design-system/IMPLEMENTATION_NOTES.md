# Implementation Notes: Unified Design System

## Overview

This spec has been updated to address the complete picture of your EasySale design system, including:

1. **Tenant Config Integration** - Your JSON-based multi-tenant configuration system
2. **Tailwind Alignment** - Proper integration with your existing Tailwind setup
3. **Accessibility Enhancements** - POS-specific accessibility features
4. **Derived Semantic Tokens** - Proper separation between brand colors and action colors

## Key Additions

### 1. Tenant Config System (Epic 1, Task 2.0)

**What it does:**
- Validates tenant config JSON against schema.json on load
- Merges configs with precedence: default → tenant → store → user
- Maps tenant theme colors into CSS custom properties
- Caches logos/backgrounds for offline operation

**Why it matters:**
- Your existing `configs/` directory with schema.json is now integrated
- Each tenant can have custom branding, categories, navigation without code changes
- Theme colors from JSON flow into the CSS variable system

### 2. Tailwind-Token Alignment (Epic 1, Task 2.0.1)

**What it does:**
- Ensures Tailwind colors reference CSS vars (already mostly done in your config)
- Adds linting rule: no hard-coded Tailwind colors allowed
- Documents when to use Tailwind vs CSS modules

**Why it matters:**
- Your existing `tailwind.config.js` already uses `var(--color-primary-500)` pattern
- This formalizes the approach and prevents drift
- Tailwind utilities work seamlessly with theme switching

### 3. Derived Semantic Tokens (Epic 1, Task 2.1)

**What it does:**
- Adds interaction-state tokens: `--color-action-primary-bg/fg/hover`
- Separates "brand colors" from "action colors"
- Allows flexibility in color role assignment

**Why it matters:**
- Solves the "which CAPS theme is right?" question
- You can choose: orange-forward (orange primary) or calm UI (blue primary, orange accent)
- Components use semantic tokens, not brand tokens directly

### 4. Accessibility Enhancements (Epic 1, Task 2.2)

**What it does:**
- Adds `prefers-reduced-motion` support
- Adds high contrast mode (increased separation + focus ring thickness)
- Adds font-size scaling for different POS screens

**Why it matters:**
- POS systems need to work in bright retail environments (glare)
- Users may have different screen sizes and accessibility needs
- These are cheap to add now, expensive to retrofit later

## Color Strategy Decision

You asked about the CAPS theme colors. Here's the guidance:

### Option 1: Orange-Forward (Orange Primary)
```json
{
  "theme": {
    "colors": {
      "primary": "#f97316",    // Orange - CAPS brand
      "secondary": "#3b82f6",  // Blue - secondary actions
      "accent": "#f97316"      // Orange - highlights
    }
  }
}
```

**Use when:**
- You want primary actions (buttons, links) to feel "CAPS branded"
- Orange is the dominant visual element
- You want high energy, attention-grabbing UI

### Option 2: Calm UI (Blue Primary, Orange Accent)
```json
{
  "theme": {
    "colors": {
      "primary": "#3b82f6",    // Blue - primary actions
      "secondary": "#64748b",  // Gray - secondary actions
      "accent": "#f97316"      // Orange - highlights, badges, emphasis
    }
  }
}
```

**Use when:**
- You want a calmer UI where orange is highlight-only
- Primary actions should be neutral/professional
- Orange reserved for sales alerts, emphasis, badges

**Recommendation:** Start with Option 2 (calm UI). It's more flexible and less fatiguing for all-day POS use. Orange as accent gives you the CAPS brand presence without overwhelming the interface.

## Implementation Order

1. **Start with Epic 0** (Audit) - Understand what you have
2. **Epic 1** (Tokens + Theme + Config) - Foundation
3. **Epic 2** (AppShell) - Fix overlaps immediately
4. **Checkpoint** - Verify foundation works
5. **Epic 3** (Components) - Build library
6. **Epic 4** (Settings) - Golden path migration
7. **Epic 5** (Store Theming) - Multi-tenant theming
8. **Epic 6** (Migration) - Migrate remaining pages

## Critical Files to Create

### New Files
- `src/styles/tokens.css` - Design tokens (colors, spacing, typography)
- `src/styles/themes.css` - Theme definitions (light/dark/accents)
- `src/theme/ThemeEngine.ts` - Theme application logic
- `src/config/ConfigStore.ts` - Configuration interface
- `src/components/AppShell.tsx` - Layout contract
- `src/settings/SettingsRegistry.ts` - Settings system

### Files to Update
- `frontend/tailwind.config.js` - Add CSS var enforcement
- `configs/private/*.json` - Add theme color mappings
- `.stylelintrc` - Add linting rules

## Testing Strategy

1. **Property-based tests** - Universal correctness (theme switching, scope precedence)
2. **Unit tests** - Specific examples (theme locks, settings groups)
3. **Visual regression** - 48 screenshots across 6 golden pages (light/dark, 2 accents, 2 breakpoints)

## Migration Safety

- **Compatibility layer** ensures legacy pages work during migration
- **Settings as golden path** proves the system before migrating other pages
- **Incremental approach** means you can ship partial migrations
- **Visual regression tests** catch unintended changes

## Questions to Answer Before Starting

1. **Color strategy:** Orange-forward or calm UI? (Recommendation: calm UI)
2. **Tailwind future:** Keep long-term or migrate away? (Recommendation: keep, it's already integrated)
3. **Migration timeline:** All at once or incremental? (Recommendation: incremental, Settings first)
4. **Accessibility priority:** MVP or full? (Recommendation: include prefers-reduced-motion and high contrast now)

## Next Steps

1. Review this spec with your team
2. Decide on color strategy (Option 1 or 2)
3. Open `.kiro/specs/unified-design-system/tasks.md`
4. Start with Epic 0 (Audit) to understand current state
5. Execute tasks sequentially, using checkpoints to validate progress

---

**Spec Status:** ✅ Complete and ready for implementation

**Estimated Effort:** 6-8 weeks for full implementation (with incremental shipping)

**Risk Level:** Low (incremental approach with compatibility layer)

# EasySale Global Rules

This document defines non-negotiable rules for the EasySale codebase. All contributors and AI agents must follow these rules.

---

## 1. Branding

- **Product name is EasySale** — no FlexiPOS, CAPS POS, or other names in UI, manifest, or icons
- Brand colors must come from theme tokens only — no literal blue/navy/teal hardcoded
- Logo and favicon references must use the tenant-configurable branding system
- Historical names (FlexiPOS, CAPS POS) may remain in `archive/` and `docs/consolidated/` for searchability

---

## 2. Theming & Styling Non-Negotiables

### Single Source of Truth
- **`frontend/src/styles/tokens.css`** — primitive color tokens (the ONLY file with raw hex values)
- **`frontend/src/styles/themes.css`** — theme variants (light/dark/accent)
- **`frontend/tailwind.config.js`** — maps CSS vars to Tailwind utilities (fallbacks allowed for build)

### Single Injection Point
- **`frontend/src/theme/ThemeEngine.ts`** — the ONLY place that sets CSS variables on `<html>`
- **`frontend/src/config/themeBridge.ts`** — converts JSON theme config to CSS variables
- React components NEVER manipulate DOM theme directly — only ThemeEngine does

### Color Rules
- Components must use semantic tokens: `bg-surface`, `text-primary`, `border-default`, etc.
- No hex/rgb/hsl outside `src/styles/` and `src/theme/` directories
- No Tailwind base color utilities (`slate-*`, `blue-*`, `gray-*`) in app components
- CSS modules may only define layout/spacing — colors must use CSS vars

### Login Theme Exception
- `LoginThemeProvider` is an intentional separate system for pre-auth theming
- Uses `--login-*` CSS variable namespace to avoid conflicts
- Documented in `audit/THEME_CONFLICT_MAP.md#FE-0005`

---

## 3. Scope & Locks

### Theme Precedence (lowest to highest)
1. **System Defaults** — hardcoded in `ThemeEngine.DEFAULT_THEME`
2. **Tenant/Company** — from tenant config JSON
3. **Store/Location** — from store settings
4. **Station/Register** — from station settings (future)
5. **User** — from user preferences

### Admin Locks
- Store admins can lock: `mode`, `accent`, `contrast`
- Locked fields cannot be overridden by lower scopes
- Lock state stored in `StoreThemeConfig.locks`

### Resolution
- `ThemeEngine.resolveTheme()` returns effective theme + source scope
- Locks are validated before saving user preferences

---

## 4. Offline-First / Performance Rules

- Cache effective theme in localStorage (`EasySale_theme_cache_v2`)
- Hydrate theme on boot BEFORE React renders (prevents flash)
- `bootTheme()` runs in `<head>` before app bundle loads
- No network requests for theme on initial render
- Idempotent writes — same input produces same output
- Backoff/retry on sync failures
- Queue changes when offline, sync when online

---

## 5. WooCommerce + QBO Integration Rules

### Sync Direction
- Explicit direction per entity: `pull` / `push` / `hybrid` / `manual`
- Default is `manual` — no automatic sync without user configuration
- Direction stored in mapping tables

### Safe Delete Policy
- POS delete ≠ WooCommerce delete unless explicitly enabled
- Soft deletes preferred (`deleted_at` timestamp)
- Hard deletes require confirmation and audit log

### Mapping Tables
- Mapping tables are canonical — never "guess" mappings
- All mapping changes logged for user review
- Conflicts require human resolution

### Idempotency
- All sync operations must be idempotent
- Use `sync_version` and `synced_at` for conflict detection
- No duplicate records from repeated sync attempts

---

## 6. File Hygiene

### Before Creating Files
- Always search for existing files first
- Prefer modifying existing theme provider/config
- No duplicate token systems or parallel CSS frameworks

### Naming Conventions
- Theme files: `tokens.css`, `themes.css`, `ThemeEngine.ts`
- CSS modules: `ComponentName.module.css` (layout only)
- Test files: `*.test.ts`, `*.test.tsx`

### Archive Policy
- No deletes — quarantine by moving to `archive/`
- Document moves in `archive/README.md`
- Preserve git history

---

## 7. Acceptance Checklists

### Theme System
- [ ] Change ONE setting in Admin Branding → whole app updates (including wizard)
- [ ] Wizard screens match the rest of UI
- [ ] No hardcoded colors remain outside theme files
- [ ] Locks prevent overrides at lower scopes
- [ ] Scopes merge correctly (tenant → store → user)
- [ ] Theme persists across page refresh
- [ ] Theme loads without flash on cold start

### CI Enforcement
- [ ] `npm run lint:colors` passes (no hardcoded colors)
- [ ] No Tailwind base color utilities in components
- [ ] All new components use semantic tokens

### Minimal Diff Footprint
- [ ] No unnecessary new folders/files
- [ ] Reused existing structures where possible
- [ ] Changes are traceable and documented

---

## Quick Reference

| What | Where |
|------|-------|
| Primitive tokens | `frontend/src/styles/tokens.css` |
| Theme variants | `frontend/src/styles/themes.css` |
| Tailwind mapping | `frontend/tailwind.config.js` |
| Theme injection | `frontend/src/theme/ThemeEngine.ts` |
| JSON→CSS bridge | `frontend/src/config/themeBridge.ts` |
| React context | `frontend/src/config/ThemeProvider.tsx` |
| Login theme | `frontend/src/auth/theme/LoginThemeProvider.tsx` |
| Color lint script | `frontend/scripts/check-hardcoded-colors.js` |
| Theme conflict map | `audit/THEME_CONFLICT_MAP.md` |

---

*Last updated: 2026-01-30*

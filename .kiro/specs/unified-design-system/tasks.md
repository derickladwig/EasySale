# Implementation Plan: Unified Design System

## Overview

This implementation follows a 6-epic structure to transform EasySale from inconsistent styling to a systematic design system. The approach is incremental, with Settings module serving as the golden path migration.

## Tasks

- [x] 1. Epic 0: Audit, Inventory, and Storage Decision
  - [x] 1.0 Produce "Current State Audit Report"
    - List current CSS/theming approach across all pages
    - List existing Rust endpoints + local persistence for settings/theme
    - List sync mechanism (queue tables, conflict resolution, etc.)
    - Decide: extend existing config tables vs create new
    - Output: docs/design-system/current_state_audit.md
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.1 Audit existing CSS files and identify color/spacing patterns
    - Scan all CSS modules for color values (hex, rgb, hsl)
    - Document spacing patterns (margins, paddings, gaps)
    - Identify theme toggle implementations
    - Document layout code (fixed positioning, z-index usage)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.2 Document current layout issues with screenshots
    - Capture Dashboard title overlap with sidebar
    - Capture Sell page filter positioning issues
    - Document any other overlap or spacing problems
    - _Requirements: 3.3, 3.4_

- [-] 2. Epic 1: Token System, Theme Engine, and Tenant Config Integration
  - [x] 2.0 Tenant Config System (JSON → runtime config)
    - Implement config schema validation at load (AJV/Zod) against schema.json
    - Hard fail in dev, soft-fallback in prod (log + use defaults)
    - Implement config merge strategy: defaultConfig (code) ← tenantConfig (JSON) ← storeConfig (DB) ← userConfig (DB, respecting locks)
    - Create theme JSON → CSS variables bridge (map theme.colors.primary/secondary/accent into CSS vars)
    - Implement asset handling + offline cache (logos/backgrounds referenced by config)
    - Define fallback order: logoDark → logo → built-in default
    - _Requirements: 6.1, 6.4, 6.7_
  
  - [x] 2.0.1 Tailwind-token alignment
    - Ensure Tailwind color entries (success/warning/error/info, radius, shadow) reference CSS vars
    - Add rule: Tailwind classes are allowed, but only if they resolve to CSS vars (no "hard" palette usage)
    - Update tailwind.config.js to use var(--color-*) for all theme colors
    - Document Tailwind usage guidelines (when to use Tailwind vs CSS modules)
    - _Requirements: 1.7, 1.8_
  
  - [x] 2.0.2 Add CSS ownership rules and linting enforcement
    - Document ownership rules (only tokens.css/themes.css may define raw colors)
    - Add Stylelint rule: disallow hex in all CSS except tokens/themes
    - Add Stylelint rule: disallow position: fixed except AppShell/modal/toast
    - Add Stylelint rule: disallow z-index literals (must use tokens)
    - Test rules with sample violations
    - _Requirements: 1.7, 1.8, 1.9_
  
  - [x] 2.1 Create design tokens file (src/styles/tokens.css)
    - Define color semantic tokens (--color-bg-primary, --color-text-primary, etc.)
    - Define surface elevation tokens (--color-surface-1/2/3)
    - Define separation tokens (--color-border-subtle, --color-divider, --color-text-muted)
    - Define derived interaction-state tokens (--color-action-primary-bg/fg/hover, --color-action-secondary-bg/fg/hover)
    - Define spacing scale (--space-1 through --space-16)
    - Define typography scale (font sizes, weights, line heights)
    - Define scale tokens (border widths, focus ring thickness, z-index, row heights, durations)
    - Define layout contract tokens (--appHeaderH, --appSidebarW, --pageGutter)
    - Define border radius values (--radius-none through --radius-full)
    - Define shadow values (--shadow-sm through --shadow-xl)
    - Add dark mode shadow adjustments (shadows behave differently in dark themes)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [x] 2.2 Create theme files (src/styles/themes.css)
    - Define light theme with all --theme-* variables (including surface/separation tokens)
    - Define dark theme with all --theme-* variables (including surface/separation tokens)
    - Define accent color variations (blue, green, purple, orange, red)
    - Define density mode variations (compact, comfortable, spacious)
    - Ensure WCAG AA contrast ratios for all theme combinations
    - Add support for prefers-reduced-motion (disable animations when requested)
    - Add support for high contrast mode (increase separation + focus ring thickness)
    - Add support for font-size scaling (POS users on different screens)
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 8.1, 8.2, 8.4_
  
  - [x] 2.3 Create ConfigStore interface layer (src/config/ConfigStore.ts)
    - Define getSetting(key, scope) interface
    - Define setSetting(key, scope, value) interface
    - Define getTheme(storeId, userId?) interface
    - Define setTheme(scope, partialTheme) interface
    - Define getTenantConfig() interface (loads and validates JSON config)
    - Define getResolvedConfig() interface (merges default + tenant + store + user)
    - Create adapters: ConfigStoreSqliteAdapter, ConfigStoreApiAdapter, ConfigStoreCachedAdapter
    - Ensure offline-first: writes go to local DB first, then sync queue
    - _Requirements: 5.8, 6.4_
  
  - [x] 2.4 Implement ThemeEngine class (src/theme/ThemeEngine.ts)
    - Implement applyTheme() to set HTML data attributes
    - Implement resolveTheme() with scope precedence logic (tenant → store → user, respecting locks)
    - Implement saveThemePreference() using ConfigStore
    - Implement loadCachedTheme() for offline startup
    - Implement theme boot sequence (pre-React script)
    - Implement tenant config → CSS variables bridge (inject tenant colors into CSS vars)
    - _Requirements: 2.4, 2.5, 2.8, 2.9, 2.10, 6.1_
  
  - [x] 2.5 Create ThemeProvider and useTheme hook
    - Implement ThemeProvider component wrapping app
    - Implement useTheme() hook for accessing theme state
    - Implement setTheme() function calling ConfigStore
    - Ensure React never manipulates DOM directly (only ThemeEngine)
    - _Requirements: 2.4, 2.5_
  
  - [x] 2.6 Implement theme persistence (extend existing or create new)
    - IF existing tables exist → extend them with theme fields
    - ELSE create theme_preferences table (store and user scopes only)
    - Add indexes for store_id and user_id
    - Ensure offline-first: writes to local DB first, then sync queue
    - Create migration for existing theme data
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [x] 2.7 Write property test for theme application

    - **Property 1: Theme Application Updates DOM**
    - **Validates: Requirements 2.4**
  
  - [x] 2.8 Write property test for theme switching

    - **Property 2: Theme Switching Without Reload**
    - **Validates: Requirements 2.5**
  
  - [x] 2.9 Write property test for scope precedence

    - **Property 4: Scope Precedence Resolution**
    - **Validates: Requirements 2.8, 2.9, 5.5, 5.6, 6.3**
  
  - [ ]* 2.10 Write unit tests for theme locks
    - Test locked mode prevents user override
    - Test locked accent prevents user override
    - Test unlocked settings allow user override
    - _Requirements: 2.3, 6.3_


- [ ] 3. Epic 2: AppShell Layout Contract
  - [x] 3.1 Create AppShell component (src/components/AppShell.tsx)
    - Implement CSS Grid layout with sidebar and main area
    - Add min-height: 0 to prevent scroll bugs
    - Apply layout contract tokens (--appHeaderH, --appSidebarW, --pageGutter)
    - Apply z-index tokens (--z-sidebar, --z-header)
    - Implement responsive behavior for mobile viewports
    - Enforce: AppShell is the ONLY component that sets sidebar/header positioning
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 3.2 Create PageHeader component (src/components/PageHeader.tsx)
    - Implement title, actions, and breadcrumbs props
    - Use design tokens for spacing and typography
    - Ensure works in both light and dark themes
    - _Requirements: 3.8_
  
  - [x] 3.3 Update navigation to show active indicators
    - Add active state styling (background, border, icon color)
    - Use design tokens for colors
    - Test in both light and dark themes
    - _Requirements: 3.7_
  
  - [x] 3.4 Write property test for layout overlap prevention

    - **Property 5: Layout Overlap Prevention**
    - **Validates: Requirements 3.3, 3.4**
  
  - [x] 3.5 Write property test for active navigation indicators

    - **Property 6: Active Navigation Indicators**
    - **Validates: Requirements 3.7**
  


  - [x] 3.6 Write unit tests for AppShell responsive behavior

    - Test sidebar collapse on mobile viewport
    - Test sidebar toggle functionality
    - _Requirements: 3.6_

- [ ] 4. Checkpoint - Verify foundation is solid
  - **Definition of Done:**
  - ✅ Sidebar/header never overlap content on Dashboard + Sell
  - ✅ Mobile sidebar opens/closes, no scroll lock bugs
  - ✅ All linting rules pass (no hardcoded colors, no invalid positioning)
  - ✅ Theme switching works without page reload
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Epic 3: Shared Component Library
  - [x] 5.1 Create layout primitives (Stack, Inline, Grid)
    - Create Stack component (vertical spacing)
    - Create Inline component (horizontal spacing)
    - Create Grid component (grid layout)
    - Use design tokens for all spacing
    - These replace ad-hoc margins everywhere
    - _Requirements: 4.1_
  
  - [x] 5.2 Create Card component (src/styles/components/Card.tsx)
    - Implement variants (default, outlined, elevated)
    - Implement padding options (none, sm, md, lg)
    - Use design tokens for all styling
    - Test in both light and dark themes
    - _Requirements: 4.1_
  
  - [x] 5.3 Create Button component (src/styles/components/Button.tsx)
    - Implement variants (primary, secondary, ghost, danger)
    - Implement sizes (sm, md, lg)
    - Ensure minimum 40px height for accessibility
    - Add visible focus ring with --ring-2 thickness
    - Add disabled state styling
    - Use design tokens for all styling
    - _Requirements: 4.2, 8.3_
  
  - [x] 5.4 Create Input component (src/styles/components/Input.tsx)
    - Implement label, error, and helperText props
    - Add visible focus ring with --ring-2 thickness
    - Add disabled state styling
    - Use design tokens for all styling
    - Test in both light and dark themes
    - _Requirements: 4.3_
  
  - [x] 5.5 Create Select component (src/styles/components/Select.tsx)
    - Implement label, error, and helperText props
    - Add visible focus ring with --ring-2 thickness
    - Add disabled state styling
    - Use design tokens for all styling
    - Test in both light and dark themes
    - _Requirements: 4.4_
  
  - [x] 5.6 Create DataTable component (src/styles/components/DataTable.tsx)
    - Implement columns, data, and keyExtractor props
    - Add row hover styling
    - Add column alignment support
    - Add empty, loading, and error states
    - Use --row-h-* tokens for row heights
    - Test in both light and dark themes
    - _Requirements: 4.5_
  
  - [x] 5.7 Create app primitive components
    - Create SectionHeader component (title + actions + helper text)
    - Create Toolbar component (search left, filters right, actions far right)
    - Create EmptyState component (friendly message when no data)
    - Create InlineAlert component (warning/info/error blocks)
    - Create Badge component (scope badges, status indicators)
    - Use design tokens for all styling
    - _Requirements: 4.1, 4.2_
  
  - [x] 5.8 Write property test for focus ring visibility

    - **Property 7: Focus Ring Visibility**
    - **Validates: Requirements 4.6, 8.4**
  

  - [x] 5.9 Write property test for disabled state consistency

    - **Property 8: Disabled State Consistency**
    - **Validates: Requirements 4.7**
  
  - [x] 5.10 Write property test for theme compatibility

    - **Property 9: Theme Compatibility**
    - **Validates: Requirements 4.8**
  
  - [x] 5.11 Write property test for interactive target size

    - **Property 14: Interactive Target Size**
    - **Validates: Requirements 8.3**
  
  - [x] 5.12 Write unit tests for DataTable keyboard navigation

    - Test row up/down navigation
    - Test enter to open
    - Test esc to exit
    - _Requirements: 4.9_


- [ ] 6. Epic 4: Settings Module Refactor (Golden Path Migration)
  - [x] 6.0 Create settings definitions inventory
    - List every existing setting key currently in use
    - Map each setting to one of the 9 groups
    - Mark each setting as policy vs preference
    - Mark allowed scopes for each setting (store/user/default)
    - Output: src/settings/definitions/*.ts
    - _Requirements: 5.1, 5.9_
  
  - [x] 6.1 Create SettingsRegistry class (src/settings/SettingsRegistry.ts)
    - Implement register() for setting definitions
    - Implement get() with scope resolution logic
    - Implement set() with scope validation
    - Implement getGroup() for grouping settings
    - Implement search() for filtering settings
    - Implement handleUnknownKey() for safe error handling
    - Add schemaVersion tracking
    - Ensure only store/user scopes are persisted (default lives in code)
    - _Requirements: 5.5, 5.6, 5.9_
  
  - [x] 6.2 Implement settings persistence (extend existing or create new)
    - IF existing tables exist → extend them with setting fields
    - ELSE create setting_values table (store and user scopes only)
    - Add indexes for setting_key, store_id, and user_id
    - Ensure offline-first: writes to local DB first, then sync queue
    - Create migration for existing settings data
    - _Requirements: 5.8, 5.9_
  
  - [x] 6.3 Add backend scope enforcement
    - Mirror allowed scopes + validators in Rust backend
    - Create backend whitelist of { setting_key, allowed_scopes, type }
    - Reject invalid scope writes server-side
    - _Requirements: 5.9_
  
  - [x] 6.4 Create SettingsLayout component (src/settings/SettingsLayout.tsx)
    - Implement sidebar with search input
    - Implement navigation for 9 setting groups
    - Implement active group highlighting
    - Use AppShell and shared components
    - Use design tokens for all styling
    - _Requirements: 5.1, 5.7_
  
  - [x] 6.5 Create ScopeBadge component (src/settings/ScopeBadge.tsx)
    - Implement store, user, and default badge variants
    - Use Badge primitive component
    - Use design tokens for colors
    - _Requirements: 5.3_
  
  - [x] 6.6 Migrate Settings page to use new components
    - Replace old layout with SettingsLayout
    - Replace old CSS with shared components (Card, Input, Select, Button)
    - Add scope badges to all settings
    - Implement search functionality
    - Remove old CSS module file
    - _Requirements: 5.7, 7.4_
  
  - [x] 6.7 Write property test for settings search filtering

    - **Property 10: Settings Search Filtering**
    - **Validates: Requirements 5.2, 5.4**
  
  - [x] 6.8 Write property test for scope badge display

    - **Property 11: Scope Badge Display**
    - **Validates: Requirements 5.3**
  
  - [x] 6.9 Write property test for setting persistence

    - **Property 12: Setting Persistence**
    - **Validates: Requirements 5.8, 6.4**
  
  - [ ]* 6.10 Write property test for setting scope enforcement
    - **Property 13: Setting Scope Enforcement**
    - **Validates: Requirements 5.9**
  
  - [ ]* 6.11 Write unit tests for settings groups
    - Test all 9 groups are defined
    - Test group navigation
    - _Requirements: 5.1_

- [ ] 7. Checkpoint - Verify Settings migration is complete
  - **Definition of Done:**
  - ✅ Settings page uses SettingsLayout with 9 groups
  - ✅ Search filters settings correctly
  - ✅ Scope badges display correctly (store/user/default)
  - ✅ Visual tests pass for Settings page in light+dark
  - ✅ No old CSS files remain for Settings
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Epic 5: Store Theming and Login Unification
  - [x] 8.1 Create store theme configuration UI
    - Add theme settings to Stores & Tax group
    - Add mode, accent, and density selectors
    - Add theme lock checkboxes (lockMode, lockAccent, lockContrast)
    - Add logo upload field
    - Add company name field
    - Use shared components (Card, Input, Select, Button)
    - _Requirements: 6.1_
  
  - [x] 8.2 Implement theme preference synchronization
    - Add theme preferences to sync queue
    - Test offline theme changes sync when online
    - _Requirements: 6.5_
  
  - [x] 8.3 Migrate login screen to use shared components
    - Replace old login CSS with shared components
    - Explicitly enforce: pre-auth uses store theme only
    - Post-auth merges store + user respecting locks
    - Use cached theme for offline startup
    - Remove old CSS module file
    - _Requirements: 6.6, 6.7_
  
  - [ ]* 8.4 Write unit tests for store theme configuration
    - Test theme locks prevent user overrides
    - Test theme persistence
    - Test offline theme cache
    - Test pre-auth uses store theme only
    - Test post-auth merges store + user
    - _Requirements: 6.3, 6.7_


- [ ] 9. Epic 6: Migration and Regression Safety
  - [x] 9.1 Create compatibility layer (src/styles/compatibility.css)
    - Define .legacy-page class with typography and color mappings
    - Define .legacy-page--with-padding for opt-in padding
    - Ensure legacy pages render correctly under AppShell
    - _Requirements: 7.3_
  
  - [x] 9.2 Set up visual regression testing infrastructure
    - Install and configure Playwright
    - Create visual test harness (seeded data, frozen time, disabled animations)
    - Create golden dataset fixture for deterministic screenshots
    - Create baseline screenshot directory structure
    - Implement contrast validation helper
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 9.3 Create visual regression tests for golden pages
    - Dashboard (light/dark, desktop/tablet, blue/green accent)
    - Sell (light/dark, desktop/tablet, blue/green accent)
    - Settings (light/dark, desktop/tablet, blue/green accent)
    - Inventory list (light/dark, desktop/tablet, blue/green accent)
    - Customer list + details (light/dark, desktop/tablet, blue/green accent)
    - Reports home (light/dark, desktop/tablet, blue/green accent)
    - Total: 48 baseline screenshots
    - _Requirements: 9.5, 9.6, 9.7_
  
  - [ ]* 9.4 Write property test for ARIA attribute presence
    - **Property 15: ARIA Attribute Presence**
    - **Validates: Requirements 8.6**
  
  - [ ]* 9.5 Write property test for state change announcements
    - **Property 16: State Change Announcements**
    - **Validates: Requirements 8.7**
  
  - [ ]* 9.6 Write unit tests for keyboard navigation
    - Test tab navigation through interactive elements
    - Test enter/space activation
    - Test escape to close modals/dropdowns
    - _Requirements: 8.5_
  
  - [x] 9.7 Migrate Dashboard page
    - Wrap in AppShell component
    - Replace old CSS with shared components (use Stack/Inline/Grid for spacing)
    - Use PageHeader for title and actions
    - Run visual regression tests
    - Remove old CSS module file
    - _Requirements: 7.4_
  
  - [x] 9.8 Migrate Sell page
    - Wrap in AppShell component
    - Replace old CSS with shared components (use Stack/Inline/Grid for spacing)
    - Use PageHeader and Toolbar components
    - Run visual regression tests
    - Remove old CSS module file
    - _Requirements: 7.4_
  
  - [x] 9.9 Migrate Inventory page
    - Wrap in AppShell component
    - Replace old CSS with shared components (use Stack/Inline/Grid for spacing)
    - Use DataTable component
    - Run visual regression tests
    - Remove old CSS module file
    - _Requirements: 7.4_
  
  - [x] 9.10 Migrate Customer pages
    - Wrap in AppShell component
    - Replace old CSS with shared components (use Stack/Inline/Grid for spacing)
    - Use DataTable and Card components
    - Run visual regression tests
    - Remove old CSS module files
    - _Requirements: 7.4_
  
  - [x] 9.11 Migrate Reports page
    - Wrap in AppShell component
    - Replace old CSS with shared components (use Stack/Inline/Grid for spacing)
    - Use Card and DataTable components
    - Run visual regression tests
    - Remove old CSS module file
    - _Requirements: 7.4_
  
  - [x] 9.12 Migrate remaining pages
    - Users page
    - Store configuration page
    - Advanced settings pages
    - System logs page
    - Integrations page
    - Use Stack/Inline/Grid for all spacing (no custom margins)
    - Run visual regression tests for each
    - Remove old CSS module files
    - _Requirements: 7.4_
  
  - [x] 9.13 Delete unused CSS files and legacy code
    - Remove all old CSS module files
    - Remove compatibility layer (no longer needed)
    - Remove any unused color/spacing constants
    - Run full test suite to verify nothing broke
    - _Requirements: 7.7_

- [x] 10. Final Checkpoint - Verify complete migration
  - **Definition of Done:**
  - ✅ All pages use AppShell
  - ✅ All pages use shared components (no custom CSS)
  - ✅ All pages use Stack/Inline/Grid for spacing (no custom margins)
  - ✅ Visual regression tests pass for all golden pages
  - ✅ No old CSS module files remain
  - ✅ Linting passes (no hardcoded colors, no invalid positioning)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Documentation and Developer Experience
  - [x] 11.1 Create design token documentation
    - Document all color tokens with usage examples
    - Document spacing scale with usage examples
    - Document typography scale with usage examples
    - Document layout contract tokens
    - _Requirements: 10.1_
  
  - [x] 11.2 Create component library documentation
    - Document all shared components with props and variants
    - Create visual component gallery (Storybook or similar)
    - Add code examples for common patterns
    - _Requirements: 10.2, 10.5_
  
  - [x] 11.3 Create migration guide
    - Document step-by-step migration process
    - Include before/after code examples
    - Document common pitfalls and solutions
    - Include migration checklist
    - _Requirements: 10.3_
  
  - [x] 11.4 Add deprecation warnings for old patterns
    - Add console warnings for deprecated CSS classes
    - Add console warnings for hardcoded colors in development
    - _Requirements: 10.6_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Visual regression tests ensure no unintended styling changes
- Migration follows golden path (Settings) before other pages
- Compatibility layer allows legacy and migrated pages to coexist

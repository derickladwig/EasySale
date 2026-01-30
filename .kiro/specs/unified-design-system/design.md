# Design Document: Unified Design System

## Overview

The Unified Design System transforms EasySale from a collection of inconsistently styled pages into a cohesive, maintainable application with systematic design patterns. This design addresses critical issues including layout overlaps, duplicated CSS, incomplete theming, and poor maintainability.

### Core Problems Solved

1. **Layout Overlaps**: Dashboard titles appearing under sidebar, Sell page filters too close to header
2. **No Design Token System**: Colors and spacing duplicated across hundreds of CSS declarations
3. **Incomplete Theme System**: No proper dark/light switching, no accent customization, no store/user precedence
4. **Settings Navigation Chaos**: 20+ flat items instead of logical groupings
5. **No Shared Components**: Every page reinvents Card, Button, Input styling
6. **Maintainability Crisis**: Adding new screens requires inventing new CSS patterns

### Design Goals

- **Zero Overlap**: Sidebar and header never overlap content through systematic layout contracts
- **Theme Parity**: Every component works in dark + light + any accent color
- **Consistency**: Cards, tables, inputs look identical across all screens
- **Maintainability**: Add new pages without inventing new CSS
- **Accessibility**: Visible focus rings, contrast targets, keyboard navigation
- **Incremental Migration**: Migrate pages one at a time without breaking existing functionality

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Application Pages                     │
│  (Dashboard, Sell, Inventory, Settings, Reports, etc.)  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Component Library                       │
│  (Card, Button, Input, Select, DataTable, etc.)        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      AppShell                            │
│  (Sidebar, Header, Content Area Layout Contract)        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Theme Engine                          │
│  (Mode, Accent, Density, Scope Resolution)              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Tenant Config + Design Tokens               │
│  (JSON Config → CSS Variables, Colors, Spacing, etc.)  │
└─────────────────────────────────────────────────────────┘
```

### Configuration Merge Strategy

The system uses a four-layer configuration merge with clear precedence:

```
defaultConfig (code)
  ↓ overridden by
tenantConfig (JSON from configs/private/*.json)
  ↓ overridden by
storeConfig (DB, per-store settings)
  ↓ overridden by
userConfig (DB, per-user preferences, respecting Theme_Locks)
  ↓
resolvedConfig (final runtime configuration)
```

**Key Rules:**
- **Tenant config** defines branding, categories, navigation, modules, and default theme
- **Store config** can override theme mode/accent/density and set locks
- **User config** can override preferences unless locked by store
- **Theme locks** prevent user overrides for specific dimensions (mode, accent, contrast)

### Tenant Config → CSS Variables Bridge

Tenant configuration (JSON) maps to CSS custom properties:

```typescript
// Tenant config (configs/private/tenant.json)
{
  "theme": {
    "colors": {
      "primary": { "500": "#3b82f6", "600": "#2563eb" },
      "secondary": { "500": "#64748b", "600": "#475569" },
      "accent": { "500": "#f97316", "600": "#ea580c" }
    }
  }
}

// Mapped to CSS variables (injected at runtime)
:root {
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-secondary-500: #64748b;
  --color-secondary-600: #475569;
  --color-accent-500: #f97316;
  --color-accent-600: #ea580c;
}
```

**Semantic Token Mapping:**
- `theme.colors.primary` → `--color-action-primary-bg` (for buttons, links)
- `theme.colors.secondary` → `--color-action-secondary-bg` (for secondary actions)
- `theme.colors.accent` → `--color-accent` (for highlights, badges, emphasis)

**Important:** The design token system uses **derived semantic tokens** so components don't need to know if "primary" means "brand" or "action". This allows flexibility in choosing color roles per tenant.

### Tailwind Integration

Tailwind CSS is configured to reference CSS custom properties, ensuring theme consistency:

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          500: 'var(--color-primary-500, #3b82f6)',
          600: 'var(--color-primary-600, #2563eb)',
        },
        // All colors reference CSS vars with fallbacks
      }
    }
  }
}
```

**Usage Guidelines:**
- **Tailwind classes allowed** when they resolve to CSS variables
- **No hard-coded Tailwind colors** (e.g., `bg-blue-500` is forbidden, use `bg-primary-500`)
- **CSS modules preferred** for component-specific styling
- **Tailwind utilities preferred** for layout, spacing, and responsive design
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Design Tokens                          │
│  (Colors, Spacing, Typography, Shadows, Radii)         │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Design Tokens**: CSS custom properties (variables) in `src/styles/tokens.css`
- **Theme System**: CSS files with data attribute selectors in `src/styles/themes.css`
- **Component Library**: React components with CSS modules in `src/styles/components/`
- **Layout System**: CSS Grid-based AppShell in `src/components/AppShell.tsx`
- **Settings Registry**: TypeScript registry with scope resolution in `src/settings/`
- **Linting**: ESLint + Stylelint rules to enforce token usage
- **Testing**: Vitest for unit tests, Playwright for visual regression


## Components and Interfaces

### 1. Design Token System

**File Structure:**
```
src/styles/
├── tokens.css          # Base design tokens
├── themes.css          # Theme-specific token values
└── compatibility.css   # Legacy page compatibility layer
```

**Token Categories:**

**Colors** (`tokens.css`):
```css
:root {
  /* Semantic color tokens */
  --color-bg-primary: var(--theme-bg-primary);
  --color-bg-secondary: var(--theme-bg-secondary);
  --color-text-primary: var(--theme-text-primary);
  --color-text-secondary: var(--theme-text-secondary);
  --color-text-muted: var(--theme-text-muted);
  --color-accent: var(--theme-accent);
  --color-accent-hover: var(--theme-accent-hover);
  --color-border: var(--theme-border);
  --color-border-subtle: var(--theme-border-subtle);
  --color-divider: var(--theme-divider);
  --color-focus-ring: var(--theme-focus-ring);
  
  /* Surface elevation tokens (for visual hierarchy) */
  --color-surface-1: var(--theme-surface-1);  /* Page background */
  --color-surface-2: var(--theme-surface-2);  /* Cards/panels */
  --color-surface-3: var(--theme-surface-3);  /* Inputs/table headers */
  
  /* Status colors */
  --color-success: var(--theme-success);
  --color-warning: var(--theme-warning);
  --color-error: var(--theme-error);
  --color-info: var(--theme-info);
}
```

**Spacing Scale**:
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
}
```

**Scale Tokens** (non-semantic):
```css
:root {
  /* Font family */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Border widths */
  --border-1: 1px;
  --border-2: 2px;
  
  /* Focus ring thickness */
  --ring-2: 2px;
  --ring-3: 3px;
  
  /* Z-index scale */
  --z-sidebar: 900;
  --z-header: 800;
  --z-dropdown: 1000;
  --z-modal: 2000;
  --z-toast: 3000;
  
  /* Row heights for tables and lists */
  --row-h-compact: 32px;
  --row-h-comfortable: 40px;
  --row-h-spacious: 48px;
  
  /* Animation durations */
  --duration-1: 150ms;
  --duration-2: 300ms;
}
```

**Typography Scale**:
```css
:root {
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}
```

**Layout Contract Tokens**:
```css
:root {
  --appHeaderH: 64px;
  --appSidebarW: 240px;
  --pageGutter: 16px;
}
```

**Border Radius**:
```css
:root {
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

**Shadows**:
```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```


### 2. Theme Engine

**Theme Application Mechanism:**

Themes are applied via HTML data attributes on the root element:
```html
<html data-theme="dark" data-accent="blue" data-density="comfortable">
```

**Theme Files** (`themes.css`):

```css
/* Light Theme */
[data-theme="light"] {
  --theme-bg-primary: #ffffff;
  --theme-bg-secondary: #f5f5f5;
  --theme-text-primary: #1a1a1a;
  --theme-text-secondary: #666666;
  --theme-text-muted: #999999;
  --theme-border: #e0e0e0;
  --theme-border-subtle: #f0f0f0;
  --theme-divider: #e5e5e5;
  --theme-focus-ring: #0066cc;
  --theme-surface-1: #ffffff;
  --theme-surface-2: #f9f9f9;
  --theme-surface-3: #f5f5f5;
  --theme-success: #059669;
  --theme-warning: #d97706;
  --theme-error: #dc2626;
  --theme-info: #2563eb;
}

/* Dark Theme */
[data-theme="dark"] {
  --theme-bg-primary: #1a1a1a;
  --theme-bg-secondary: #2a2a2a;
  --theme-text-primary: #ffffff;
  --theme-text-secondary: #b0b0b0;
  --theme-text-muted: #808080;
  --theme-border: #404040;
  --theme-border-subtle: #2f2f2f;
  --theme-divider: #353535;
  --theme-focus-ring: #4d9fff;
  --theme-surface-1: #1a1a1a;
  --theme-surface-2: #242424;
  --theme-surface-3: #2a2a2a;
  --theme-success: #10b981;
  --theme-warning: #f59e0b;
  --theme-error: #ef4444;
  --theme-info: #3b82f6;
}

/* Accent Colors */
[data-accent="blue"] {
  --theme-accent: #0066cc;
  --theme-accent-hover: #0052a3;
}

[data-accent="green"] {
  --theme-accent: #00a86b;
  --theme-accent-hover: #008556;
}

[data-accent="purple"] {
  --theme-accent: #7c3aed;
  --theme-accent-hover: #6d28d9;
}

[data-accent="orange"] {
  --theme-accent: #f97316;
  --theme-accent-hover: #ea580c;
}

[data-accent="red"] {
  --theme-accent: #dc2626;
  --theme-accent-hover: #b91c1c;
}

/* Density Modes */
[data-density="compact"] {
  --density-padding: var(--space-2);
  --density-gap: var(--space-2);
}

[data-density="comfortable"] {
  --density-padding: var(--space-4);
  --density-gap: var(--space-4);
}

[data-density="spacious"] {
  --density-padding: var(--space-6);
  --density-gap: var(--space-6);
}
```

**Theme Engine Interface** (`src/theme/ThemeEngine.ts`):

```typescript
interface ThemeConfig {
  mode: 'light' | 'dark';
  accent: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  density: 'compact' | 'comfortable' | 'spacious';
}

interface ThemeLocks {
  lockMode?: boolean;
  lockAccent?: boolean;
  lockContrast?: boolean;
}

interface StoreThemeConfig extends ThemeConfig {
  locks: ThemeLocks;
  logo?: string;
  companyName?: string;
}

interface ThemePreferences {
  store: StoreThemeConfig;
  user: Partial<ThemeConfig>;
  default: ThemeConfig;
}

class ThemeEngine {
  // Apply theme to DOM
  applyTheme(config: ThemeConfig): void;
  
  // Resolve theme with scope precedence
  resolveTheme(preferences: ThemePreferences): ThemeConfig;
  
  // Persist theme preferences
  saveThemePreference(scope: 'store' | 'user', config: Partial<ThemeConfig>): Promise<void>;
  
  // Load cached theme for offline startup
  loadCachedTheme(): ThemeConfig | null;
  
  // Validate contrast ratios (used in CI/tests, not runtime)
  validateContrast(config: ThemeConfig): boolean;
}
```

**Theme Boot Sequence:**

The theme must be applied before React renders to prevent theme flash:

1. **Load cached theme**: Read `{ lastStoreId, storeTheme }` from localStorage/IndexedDB
2. **Apply immediately**: Set data attributes on `<html>` before React mounts
3. **Render login**: Login/store picker uses cached store theme
4. **Fetch if online**: If online, fetch store theme from backend and reapply only if changed
5. **Fallback**: If no cache exists, apply hardcoded default (light mode, blue accent, comfortable density), then replace when store is chosen

**Critical Rule**: Pre-auth theme MUST use store theme only; user preferences are applied only after user identity is known.

**Implementation**:
```typescript
// In index.html or early boot script (before React)
(function() {
  const cached = localStorage.getItem('EasySale_theme_cache');
  if (cached) {
    const { lastTheme } = JSON.parse(cached);
    document.documentElement.dataset.theme = lastTheme.mode;
    document.documentElement.dataset.accent = lastTheme.accent;
    document.documentElement.dataset.density = lastTheme.density;
  } else {
    // Hardcoded default
    document.documentElement.dataset.theme = 'light';
    document.documentElement.dataset.accent = 'blue';
    document.documentElement.dataset.density = 'comfortable';
  }
})();
```

**Scope Resolution Logic:**

```typescript
function resolveTheme(preferences: ThemePreferences): ThemeConfig {
  const { store, user, default: defaultTheme } = preferences;
  
  return {
    mode: store.locks.lockMode 
      ? store.mode 
      : (user.mode ?? store.mode ?? defaultTheme.mode),
    
    accent: store.locks.lockAccent 
      ? store.accent 
      : (user.accent ?? store.accent ?? defaultTheme.accent),
    
    density: user.density ?? store.density ?? defaultTheme.density,
  };
}
```


### 3. AppShell Layout System

**AppShell Component** (`src/components/AppShell.tsx`):

```typescript
interface AppShellProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <div className={styles.appShell}>
      {sidebar && <aside className={styles.sidebar}>{sidebar}</aside>}
      <div className={styles.mainArea}>
        {header && <header className={styles.header}>{header}</header>}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
```

**AppShell Styles** (`src/components/AppShell.module.css`):

```css
.appShell {
  display: grid;
  grid-template-columns: var(--appSidebarW) 1fr;
  grid-template-rows: 100vh;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  grid-column: 1;
  grid-row: 1;
  overflow-y: auto;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  z-index: var(--z-sidebar);
}

.mainArea {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;  /* Prevents flex/grid scroll bugs */
  min-height: 0;
}

.header {
  flex-shrink: 0;
  height: var(--appHeaderH);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--pageGutter);
  display: flex;
  align-items: center;
  z-index: var(--z-header);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--pageGutter);
  min-height: 0;  /* Allows proper scrolling in nested flex */
}

/* Responsive behavior */
@media (max-width: 768px) {
  .appShell {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  
  .sidebar[data-open="true"] {
    transform: translateX(0);
    z-index: var(--z-sidebar);
  }
}
```

**PageHeader Component** (Extension Point):

```typescript
interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function PageHeader({ title, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
```


### 4. Component Library

**Core Components**:
- Card / Panel
- Button (variants: primary, secondary, ghost, danger)
- Input / Select
- DataTable

**App Primitives** (reusable patterns):
- SectionHeader: title + right-side actions + optional helper text
- Toolbar: consistent "search left, filters right, actions far right"
- EmptyState: friendly message when no data
- InlineAlert: warning/info/error blocks
- Badge / Pill: scope badges, status indicators

**Card Component** (`src/styles/components/Card.tsx`):

```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, variant = 'default', padding = 'md' }: CardProps) {
  return (
    <div className={cn(styles.card, styles[variant], styles[`padding-${padding}`])}>
      {children}
    </div>
  );
}
```

**Button Component** (`src/styles/components/Button.tsx`):

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={cn(styles.button, styles[variant], styles[size])} 
      {...props}
    >
      {children}
    </button>
  );
}
```

**Button Styles** (`src/styles/components/Button.module.css`):

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  transition: all 0.2s;
  cursor: pointer;
  border: none;
  min-height: 40px; /* Accessibility: minimum touch target */
}

.button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Variants */
.primary {
  background: var(--color-accent);
  color: white;
}

.primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.ghost {
  background: transparent;
  color: var(--color-text-primary);
}

.danger {
  background: var(--color-error);
  color: white;
}

/* Sizes */
.sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}

.md {
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-base);
}

.lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-lg);
}
```

**Input Component** (`src/styles/components/Input.tsx`):

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, ...props }: InputProps) {
  return (
    <div className={styles.inputWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <input 
        className={cn(styles.input, error && styles.error)} 
        {...props} 
      />
      {error && <span className={styles.errorText}>{error}</span>}
      {helperText && !error && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
}
```

**DataTable Component** (`src/styles/components/DataTable.tsx`):

```typescript
interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string;
}

export function DataTable<T>({ 
  data, 
  columns, 
  keyExtractor, 
  emptyMessage = 'No data available',
  loading,
  error 
}: DataTableProps<T>) {
  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (data.length === 0) return <div className={styles.empty}>{emptyMessage}</div>;
  
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} className={styles[`align-${col.align || 'left'}`]}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={keyExtractor(item)} className={styles.row}>
            {columns.map(col => (
              <td key={col.key} className={styles[`align-${col.align || 'left'}`]}>
                {col.render(item)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```


### 5. Settings Registry System

**Settings Registry Interface** (`src/settings/SettingsRegistry.ts`):

```typescript
type SettingType = 'policy' | 'preference';
type SettingScope = 'store' | 'user' | 'default';

interface SettingDefinition<T = any> {
  key: string;
  label: string;
  description: string;
  type: SettingType;
  group: SettingGroup;
  defaultValue: T;
  allowedScopes: SettingScope[];  // e.g., policy settings: ['store', 'default'] only
  validator?: (value: T) => boolean;
  schemaVersion?: number;  // For migration tracking
}

type SettingGroup = 
  | 'personal'
  | 'stores-tax'
  | 'sell-payments'
  | 'inventory-products'
  | 'customers-ar'
  | 'users-security'
  | 'devices-offline'
  | 'integrations'
  | 'advanced';

interface SettingValue<T = any> {
  value: T;
  scope: SettingScope;
}

class SettingsRegistry {
  private settings: Map<string, SettingDefinition> = new Map();
  private schemaVersion: number = 1;
  
  // Register a setting definition
  register<T>(definition: SettingDefinition<T>): void;
  
  // Get setting value with scope resolution
  get<T>(key: string, preferences: { store?: T; user?: T }): SettingValue<T>;
  
  // Set setting value at specific scope (validates allowed scopes)
  set<T>(key: string, value: T, scope: SettingScope): Promise<void>;
  
  // Get all settings in a group
  getGroup(group: SettingGroup): SettingDefinition[];
  
  // Search settings by name or description
  search(query: string): SettingDefinition[];
  
  // Handle unknown keys safely
  handleUnknownKey(key: string): void {
    console.warn(`Unknown setting key: ${key}. Ignoring stored value.`);
    // Never crash, just log and continue
  }
}
```

**Backend Scope Enforcement:**

The backend must mirror scope validation to prevent corruption:

```typescript
// Backend whitelist (small and stable)
interface SettingScopeRule {
  setting_key: string;
  allowed_scopes: SettingScope[];
  type: SettingType;
}

// Backend validates before writing
function validateSettingWrite(
  key: string,
  scope: SettingScope,
  rules: SettingScopeRule[]
): void {
  const rule = rules.find(r => r.setting_key === key);
  if (!rule) throw new Error(`Unknown setting: ${key}`);
  if (!rule.allowed_scopes.includes(scope)) {
    throw new InvalidScopeError(key, scope, rule.allowed_scopes);
  }
}
```

**Scope Resolution Logic:**

```typescript
function resolveSetting<T>(
  definition: SettingDefinition<T>,
  preferences: { store?: T; user?: T }
): SettingValue<T> {
  const { type, defaultValue, allowedScopes } = definition;
  const { store, user } = preferences;
  
  // Policy settings: store > user > default
  if (type === 'policy') {
    if (store !== undefined && allowedScopes.includes('store')) {
      return { value: store, scope: 'store' };
    }
    if (user !== undefined && allowedScopes.includes('user')) {
      return { value: user, scope: 'user' };
    }
    return { value: defaultValue, scope: 'default' };
  }
  
  // Preference settings: user > store > default
  if (type === 'preference') {
    if (user !== undefined && allowedScopes.includes('user')) {
      return { value: user, scope: 'user' };
    }
    if (store !== undefined && allowedScopes.includes('store')) {
      return { value: store, scope: 'store' };
    }
    return { value: defaultValue, scope: 'default' };
  }
  
  return { value: defaultValue, scope: 'default' };
}
```

**Settings Layout Component** (`src/settings/SettingsLayout.tsx`):

```typescript
interface SettingsLayoutProps {
  groups: SettingGroup[];
  activeGroup: SettingGroup;
  onGroupChange: (group: SettingGroup) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  children: React.ReactNode;
}

export function SettingsLayout({
  groups,
  activeGroup,
  onGroupChange,
  searchQuery,
  onSearchChange,
  children
}: SettingsLayoutProps) {
  return (
    <div className={styles.settingsLayout}>
      <aside className={styles.sidebar}>
        <Input 
          placeholder="Search settings..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <nav className={styles.nav}>
          {groups.map(group => (
            <button
              key={group}
              className={cn(styles.navItem, activeGroup === group && styles.active)}
              onClick={() => onGroupChange(group)}
            >
              {formatGroupName(group)}
            </button>
          ))}
        </nav>
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
```

**Scope Badge Component:**

```typescript
interface ScopeBadgeProps {
  scope: SettingScope;
}

export function ScopeBadge({ scope }: ScopeBadgeProps) {
  const labels = {
    store: 'Store',
    user: 'Personal',
    default: 'Default'
  };
  
  return (
    <span className={cn(styles.badge, styles[scope])}>
      {labels[scope]}
    </span>
  );
}
```


## Data Models

### Theme Configuration Schema

```typescript
// Database table: theme_preferences
// Note: Only store and user scopes are persisted; default values live in code
interface ThemePreferenceRecord {
  id: string;
  scope: 'store' | 'user';  // 'default' is NOT stored in DB
  store_id?: string;  // null for user preferences
  user_id?: string;   // null for store preferences
  mode?: 'light' | 'dark';
  accent?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  density?: 'compact' | 'comfortable' | 'spacious';
  // Lock fields only valid for store scope
  lock_mode?: boolean;  // Only store records can have locks
  lock_accent?: boolean;
  lock_contrast?: boolean;
  logo_url?: string;  // Only store records
  company_name?: string;  // Only store records
  created_at: string;
  updated_at: string;
}
```

### Settings Registry Schema

```typescript
// Database table: setting_values
// Note: Only store and user scopes are persisted; default values live in code
interface SettingValueRecord {
  id: string;
  setting_key: string;
  scope: 'store' | 'user';  // 'default' is NOT stored in DB
  store_id?: string;
  user_id?: string;
  value: string;  // JSON-encoded value
  created_at: string;
  updated_at: string;
}

// In-memory registry
interface SettingRegistryData {
  definitions: Map<string, SettingDefinition>;  // Includes defaultValue
  values: Map<string, Map<SettingScope, any>>;  // key -> scope -> value
}
```

### Local Storage Schema

```typescript
// localStorage key: 'EasySale_theme_cache'
interface ThemeCache {
  lastStoreId: string;
  lastTheme: ThemeConfig;
  timestamp: number;
}

// localStorage key: 'EasySale_settings_cache'
type PersistedScope = 'store' | 'user';  // 'default' is NOT cached (lives in code)

interface SettingsCache {
  [key: string]: {
    value: any;
    scope: PersistedScope;
    timestamp: number;
  };
}

// Optional: Resolved settings cache for fast startup
interface ResolvedSettingsCache {
  resolved: Record<string, any>;
  timestamp: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme Application Updates DOM

*For any* valid theme configuration (mode, accent, density), when the theme is applied, the HTML root element should have the corresponding data attributes set correctly.

**Validates: Requirements 2.4**

### Property 2: Theme Switching Without Reload

*For any* initial theme and any target theme, when switching from the initial theme to the target theme, the DOM should update without triggering a page reload (window.location should remain unchanged).

**Validates: Requirements 2.5**

### Property 3: Contrast Ratio Compliance

*For any* theme configuration, all text elements should maintain minimum contrast ratios: 4.5:1 for normal text and 3:1 for large text and UI components.

**Note**: This property is validated in CI/tests by sampling critical components (Button primary text, Input text, DataTable header text, sidebar nav text), not at runtime for all elements.

**Validates: Requirements 2.6, 8.1, 8.2**

### Property 4: Scope Precedence Resolution

*For any* setting with policy or preference type and any combination of store/user/default values, the resolved value should follow the correct precedence rules: policy settings use store > user > default, preference settings use user > store > default (unless locked).

**Validates: Requirements 2.8, 2.9, 5.5, 5.6, 6.3**

### Property 5: Layout Overlap Prevention

*For any* AppShell configuration with sidebar and header, the content area should never overlap with the sidebar or header (measured by bounding box intersection).

**Validates: Requirements 3.3, 3.4**

### Property 6: Active Navigation Indicators

*For any* navigation item, when it is marked as active, it should display visual indicators (background color, border, or icon color different from inactive state).

**Validates: Requirements 3.7**

### Property 7: Focus Ring Visibility

*For any* interactive component (button, input, select, link), when it receives focus, it should display a visible focus ring meeting WCAG standards (minimum 2px thickness, sufficient contrast).

**Validates: Requirements 4.6, 8.4**

### Property 8: Disabled State Consistency

*For any* component with a disabled state, when disabled, it should apply consistent styling (reduced opacity, cursor not-allowed, no hover effects).

**Validates: Requirements 4.7**

### Property 9: Theme Compatibility

*For any* component in the component library, it should render correctly (no missing backgrounds, readable text, visible borders) in both light and dark themes with any accent color.

**Validates: Requirements 4.8**

### Property 10: Settings Search Filtering

*For any* search query, the settings search should return only settings whose name or description contains the query (case-insensitive), and all returned settings should match the query.

**Validates: Requirements 5.2, 5.4**

### Property 11: Scope Badge Display

*For any* setting with a resolved value, the displayed scope badge should match the actual scope from which the value was resolved (store, user, or default).

**Validates: Requirements 5.3**

### Property 12: Setting Persistence

*For any* setting modification at a specific scope, after saving, retrieving the setting should return the saved value at the correct scope.

**Validates: Requirements 5.8, 6.4**

### Property 13: Setting Scope Enforcement

*For any* policy setting, attempting to set it at user scope should be rejected, and attempting to set a preference setting at an invalid scope should be rejected.

**Validates: Requirements 5.9**

### Property 14: Interactive Target Size

*For any* interactive element (button, input, checkbox, link), it should have a minimum height of 40px to meet touch target accessibility requirements.

**Validates: Requirements 8.3**

### Property 15: ARIA Attribute Presence

*For any* component with interactive or semantic meaning, it should have appropriate ARIA labels, roles, or descriptions to support screen readers.

**Validates: Requirements 8.6**

### Property 16: State Change Announcements

*For any* state change or error condition, the system should provide aria-live regions or announcements that screen readers can detect.

**Validates: Requirements 8.7**


## Error Handling

### Token Usage Violations

**Error**: Developer uses hardcoded color value (e.g., `#0066cc`) outside tokens.css or themes.css

**Handling**: 
- ESLint/Stylelint rule catches violation during development
- Build fails with clear error message pointing to the violation
- Error message suggests the correct token to use

**Example**:
```
Error: Hardcoded color value detected
  File: src/pages/Dashboard.module.css:15
  Found: color: #0066cc;
  Suggestion: Use var(--color-accent) instead
```

### Theme Contrast Validation Failures

**Error**: Theme configuration results in insufficient contrast ratio

**Handling**:
- Visual regression tests detect contrast violations
- Test fails with specific elements and measured ratios
- Developer must adjust theme colors or component styling

**Example**:
```
Contrast Violation: Button text on accent background
  Measured: 3.2:1
  Required: 4.5:1
  Element: .button.primary
  Theme: dark mode, blue accent
```

### Layout Overlap Detection

**Error**: Content overlaps with sidebar or header

**Handling**:
- Visual regression tests detect overlaps via bounding box intersection
- Test fails with screenshot showing overlap region
- Developer must adjust AppShell grid or component positioning

### Invalid Setting Scope

**Error**: Attempting to set policy setting at user scope

**Handling**:
```typescript
class InvalidScopeError extends Error {
  constructor(key: string, attemptedScope: SettingScope, allowedScopes: SettingScope[]) {
    super(
      `Cannot set policy setting "${key}" at ${attemptedScope} scope. ` +
      `Allowed scopes: ${allowedScopes.join(', ')}`
    );
  }
}
```

**Recovery**: 
- Reject the operation
- Display error message to user
- Suggest correct scope for the setting

### Theme Lock Violations

**Error**: User attempts to change locked theme setting

**Handling**:
```typescript
function validateThemeChange(
  key: keyof ThemeConfig,
  locks: ThemeLocks
): void {
  if (key === 'mode' && locks.lockMode) {
    throw new ThemeLockError('Theme mode is locked by store policy');
  }
  if (key === 'accent' && locks.lockAccent) {
    throw new ThemeLockError('Accent color is locked by store policy');
  }
}
```

**Recovery**:
- Display user-friendly message explaining the lock
- Disable UI controls for locked settings
- Show badge indicating "Locked by Store"

### Missing Theme Cache (Offline Startup)

**Error**: No cached theme available during offline startup

**Handling**:
- Fall back to hardcoded default theme (light mode, blue accent, comfortable density)
- Log warning for debugging
- Apply cached theme once connectivity returns

### Component Rendering Errors

**Error**: Component fails to render due to missing props or invalid state

**Handling**:
```typescript
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryComponent
      fallback={
        <Card variant="outlined" padding="lg">
          <p>Something went wrong. Please refresh the page.</p>
        </Card>
      }
    >
      {children}
    </ErrorBoundaryComponent>
  );
}
```

**Recovery**:
- Display error boundary with user-friendly message
- Log error details for debugging
- Provide refresh or retry action


## Testing Strategy

### Dual Testing Approach

This design system requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Together, they provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Unit Testing

**Framework**: Vitest

**Focus Areas**:
- Specific theme configurations (light mode with blue accent, dark mode with green accent)
- Edge cases (empty settings search, missing theme cache)
- Error conditions (invalid scope, locked theme changes)
- Component rendering (Button variants, Card padding options)
- Integration points (ThemeEngine with localStorage, SettingsRegistry with database)

**Example Unit Tests**:

```typescript
describe('ThemeEngine', () => {
  it('should apply light theme with blue accent', () => {
    const engine = new ThemeEngine();
    engine.applyTheme({ mode: 'light', accent: 'blue', density: 'comfortable' });
    
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.accent).toBe('blue');
    expect(document.documentElement.dataset.density).toBe('comfortable');
  });
  
  it('should throw error when changing locked theme setting', () => {
    const engine = new ThemeEngine();
    const locks = { lockMode: true };
    
    expect(() => {
      engine.validateThemeChange('mode', locks);
    }).toThrow(ThemeLockError);
  });
});

describe('SettingsRegistry', () => {
  it('should reject policy setting at user scope', () => {
    const registry = new SettingsRegistry();
    registry.register({
      key: 'tax_rate',
      type: 'policy',
      allowedScopes: ['store', 'default']
    });
    
    expect(() => {
      registry.set('tax_rate', 0.08, 'user');
    }).toThrow(InvalidScopeError);
  });
});
```

### Property-Based Testing

**Framework**: fast-check (for TypeScript/JavaScript)

**Configuration**: Minimum 100 iterations per property test

**Tag Format**: Each test must include a comment referencing the design property:
```typescript
// Feature: unified-design-system, Property 1: Theme Application Updates DOM
```

**Focus Areas**:
- Theme configurations (all combinations of mode, accent, density)
- Scope precedence resolution (all combinations of store/user/default values)
- Contrast ratio validation (all theme combinations)
- Layout overlap detection (various sidebar/header configurations)
- Settings search (random queries against random setting sets)

**Example Property Tests**:

```typescript
import fc from 'fast-check';

// Feature: unified-design-system, Property 1: Theme Application Updates DOM
describe('Property 1: Theme Application Updates DOM', () => {
  it('should set correct data attributes for any theme config', () => {
    fc.assert(
      fc.property(
        fc.record({
          mode: fc.constantFrom('light', 'dark'),
          accent: fc.constantFrom('blue', 'green', 'purple', 'orange', 'red'),
          density: fc.constantFrom('compact', 'comfortable', 'spacious')
        }),
        (config) => {
          const engine = new ThemeEngine();
          engine.applyTheme(config);
          
          expect(document.documentElement.dataset.theme).toBe(config.mode);
          expect(document.documentElement.dataset.accent).toBe(config.accent);
          expect(document.documentElement.dataset.density).toBe(config.density);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: unified-design-system, Property 4: Scope Precedence Resolution
describe('Property 4: Scope Precedence Resolution', () => {
  it('should resolve policy settings with store > user > default precedence', () => {
    fc.assert(
      fc.property(
        fc.record({
          store: fc.option(fc.float()),
          user: fc.option(fc.float()),
          default: fc.float()
        }),
        (values) => {
          const registry = new SettingsRegistry();
          registry.register({
            key: 'test_policy',
            type: 'policy',
            defaultValue: values.default,
            allowedScopes: ['store', 'user', 'default']
          });
          
          const result = registry.get('test_policy', {
            store: values.store,
            user: values.user
          });
          
          // Verify precedence: store > user > default
          if (values.store !== null) {
            expect(result.value).toBe(values.store);
            expect(result.scope).toBe('store');
          } else if (values.user !== null) {
            expect(result.value).toBe(values.user);
            expect(result.scope).toBe('user');
          } else {
            expect(result.value).toBe(values.default);
            expect(result.scope).toBe('default');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: unified-design-system, Property 10: Settings Search Filtering
describe('Property 10: Settings Search Filtering', () => {
  it('should return only settings matching the query', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          key: fc.string(),
          label: fc.string(),
          description: fc.string()
        })),
        fc.string(),
        (settings, query) => {
          const registry = new SettingsRegistry();
          settings.forEach(s => registry.register(s));
          
          const results = registry.search(query);
          
          // All results should match the query
          results.forEach(result => {
            const matches = 
              result.label.toLowerCase().includes(query.toLowerCase()) ||
              result.description.toLowerCase().includes(query.toLowerCase());
            expect(matches).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Visual Regression Testing

**Framework**: Playwright with screenshot comparison

**Test Matrix Strategy**:

**Pull Request Tests** (fast feedback):
- Full suite: dark/light + default accent (blue) at desktop resolution
- Smoke subset: 2-3 accents (blue, green, red) at tablet resolution
- Runtime: ~5 minutes

**Nightly Tests** (comprehensive):
- All accent colors (blue, green, purple, orange, red)
- All breakpoints (mobile 375px, tablet 768px, desktop 1920px)
- Both themes (light, dark)
- Runtime: ~30 minutes

**Baseline Management**:
- Baselines stored in `tests/visual/baselines/`
- Separate baselines per theme and breakpoint
- Update baselines via `npm run test:visual:update`

**Golden Pages List** (required coverage):
1. **Dashboard** - light/dark, desktop + tablet, default accent + 1 alternate
2. **Sell** - light/dark, desktop + tablet, default accent + 1 alternate
3. **Settings** (one group + search results) - light/dark, desktop + tablet, default accent + 1 alternate
4. **Inventory list** - light/dark, desktop + tablet, default accent + 1 alternate
5. **Customer list + details** - light/dark, desktop + tablet, default accent + 1 alternate
6. **Reports home** - light/dark, desktop + tablet, default accent + 1 alternate

**Coverage Requirements**:
- All golden pages must be tested in light and dark themes
- All golden pages must be tested at desktop (1920px) and tablet (768px) breakpoints
- All golden pages must be tested with default accent (blue) + 1 alternate accent (green)
- Total: 6 pages × 2 themes × 2 breakpoints × 2 accents = 48 baseline screenshots

**Example Visual Tests**:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Dashboard renders correctly in light theme', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
      document.documentElement.dataset.accent = 'blue';
    });
    
    await expect(page).toHaveScreenshot('dashboard-light-blue.png');
  });
  
  test('Settings page renders correctly in dark theme', async ({ page }) => {
    await page.goto('/settings');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.dataset.accent = 'green';
    });
    
    await expect(page).toHaveScreenshot('settings-dark-green.png');
  });
});
```

**Visual Test Harness** (deterministic environment):

To prevent flaky visual tests, the test environment must be controlled:

1. **Seeded dataset**: Use fixture API mode or seeded database with consistent data
2. **Frozen time**: Override Date/time to fixed values
   ```typescript
   await page.addInitScript(() => {
     Date.now = () => 1704067200000; // Fixed timestamp
   });
   ```
3. **Disable animations**: Set `prefers-reduced-motion` and CSS overrides
   ```typescript
   await page.emulateMedia({ reducedMotion: 'reduce' });
   ```
4. **Stable fonts**: Use system fonts or embed test fonts
5. **Consistent viewport**: Always use same viewport dimensions per breakpoint

**Contrast Validation in Tests**:

```typescript
test('Button primary text meets contrast requirements', async ({ page }) => {
  await page.goto('/components/button');
  
  const button = page.locator('.button.primary');
  const bgColor = await button.evaluate(el => 
    getComputedStyle(el).backgroundColor
  );
  const textColor = await button.evaluate(el => 
    getComputedStyle(el).color
  );
  
  const ratio = calculateContrastRatio(bgColor, textColor);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
```

### Linting and Static Analysis

**ESLint Rules**:
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/#[0-9a-fA-F]{3,6}/]',
        message: 'Use design tokens instead of hardcoded hex colors'
      }
    ]
  }
};
```

**Stylelint Rules**:
```javascript
// .stylelintrc.js
module.exports = {
  rules: {
    'color-no-hex': true,
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    'declaration-property-value-allowed-list': {
      '/^(color|background|border|outline)/': ['/^var\\(--/']
    }
  },
  ignoreFiles: [
    'src/styles/tokens.css',
    'src/styles/themes.css'
  ]
};
```

**ESLint Rules** (for inline styles in JSX):
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Ban inline style prop to enforce CSS modules and tokens
    'react/forbid-component-props': [
      'error',
      {
        forbid: [
          {
            propName: 'style',
            message: 'Use CSS modules or design tokens instead of inline styles'
          }
        ]
      }
    ],
    'react/forbid-dom-props': [
      'error',
      {
        forbid: [
          {
            propName: 'style',
            message: 'Use CSS modules or design tokens instead of inline styles'
          }
        ]
      }
    ]
  }
};
```

**Note**: Stylelint handles CSS enforcement; ESLint handles JSX inline styles. This combination catches all violations.

### Test Coverage Goals

- **Unit test coverage**: 80% for business logic (ThemeEngine, SettingsRegistry)
- **Property test coverage**: All correctness properties implemented
- **Visual regression coverage**: All major pages in both themes
- **Accessibility coverage**: All interactive components tested for WCAG compliance


## Migration Strategy

### Overview

The migration follows an incremental approach where pages are migrated one at a time, with the Settings module serving as the golden path. Legacy pages coexist with migrated pages through a compatibility layer.

### Migration Phases

**Phase 0: Foundation** (Epic 0-2)
- Audit existing CSS and identify patterns
- Create design tokens and theme system
- Build AppShell layout contract
- Establish compatibility layer

**Phase 1: Component Library** (Epic 3)
- Build shared components (Card, Button, Input, Select, DataTable)
- Test components in isolation
- Document component API and variants

**Phase 2: Golden Path Migration** (Epic 4)
- Migrate Settings module as proof of concept
- Validate migration checklist
- Document lessons learned

**Phase 3: Store Theming** (Epic 5)
- Implement store theme configuration
- Migrate login screen
- Test theme precedence and locks

**Phase 4: Incremental Page Migration** (Epic 6)
- Migrate remaining pages one by one
- Run visual regression tests after each migration
- Delete old CSS files as pages are migrated

### Layout Spacing Rules

To prevent future CSS duplication and maintain consistency:

**Rules**:
1. **Only** AppShell, PageHeader, SectionHeader, and Toolbar may define page-level spacing
2. Pages may **only** compose components and use Card, Panel, Stack, Grid primitives
3. Pages **must not** add custom margin or padding outside of component composition
4. If a page needs unique spacing, it must use AppShell extension points (PageHeader slots, side panels)

**Enforcement**:
- Code review checklist
- Linting rules to detect margin/padding in page-level CSS modules
- Migration checklist includes "No custom spacing" verification

### Compatibility Layer

**Purpose**: Allow legacy pages to render correctly under the new AppShell and token system without modification.

**Implementation** (`src/styles/compatibility.css`):

```css
/* Ensure legacy pages have correct base typography */
.legacy-page {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

/* Prevent legacy pages from breaking layout */
.legacy-page {
  /* Don't use fixed positioning that conflicts with AppShell */
  position: relative;
  
  /* Ensure proper stacking context */
  z-index: auto;
  
  /* Note: Do NOT apply padding here - legacy pages may already have their own */
}

/* Map legacy color classes to tokens */
.legacy-page .bg-primary { background: var(--color-bg-primary); }
.legacy-page .bg-secondary { background: var(--color-bg-secondary); }
.legacy-page .text-primary { color: var(--color-text-primary); }
.legacy-page .text-secondary { color: var(--color-text-secondary); }
.legacy-page .border-color { border-color: var(--color-border); }

/* Opt-in padding for pages that need it */
.legacy-page--with-padding {
  padding: var(--pageGutter);
}
```

**Usage**:
```typescript
// Wrap legacy pages with compatibility class
function LegacyPageWrapper({ 
  children, 
  needsPadding = false 
}: { 
  children: React.ReactNode;
  needsPadding?: boolean;
}) {
  return (
    <div className={cn('legacy-page', needsPadding && 'legacy-page--with-padding')}>
      {children}
    </div>
  );
}
```

### Migration Checklist

For each page being migrated, verify:

**Layout**:
- [ ] Page uses AppShell component
- [ ] No custom fixed positioning or z-index hacks
- [ ] Uses PageHeader for title and actions
- [ ] Content area has proper padding using --pageGutter
- [ ] No overlap with sidebar or header (visual test)

**Styling**:
- [ ] All colors use design tokens (no hardcoded hex values)
- [ ] All spacing uses spacing scale tokens
- [ ] All typography uses typography tokens
- [ ] All border radius uses radius tokens
- [ ] All shadows use shadow tokens

**Components**:
- [ ] Uses shared Card/Panel components
- [ ] Uses shared Button components
- [ ] Uses shared Input/Select components
- [ ] Uses shared DataTable component (if applicable)
- [ ] All components work in both light and dark themes

**Accessibility**:
- [ ] All interactive elements have minimum 40px height
- [ ] All interactive elements have visible focus rings
- [ ] All text meets contrast ratio requirements
- [ ] Keyboard navigation works correctly
- [ ] Screen reader announcements work correctly

**Testing**:
- [ ] Unit tests pass
- [ ] Property tests pass (if applicable)
- [ ] Visual regression tests pass in both themes
- [ ] Manual testing in light and dark modes
- [ ] Manual testing with all accent colors

**Cleanup**:
- [ ] Old CSS module file deleted
- [ ] Old component files deleted (if replaced)
- [ ] No unused imports
- [ ] No console warnings

### Migration Order

**Priority 1: Settings Module** (Golden Path)
- Validates entire migration approach
- Tests all shared components
- Establishes patterns for other pages

**Priority 2: High-Traffic Pages**
- Dashboard
- Sell page
- Inventory page

**Priority 3: Administrative Pages**
- Reports
- Users
- Store configuration

**Priority 4: Low-Traffic Pages**
- Advanced settings
- System logs
- Integrations

### Rollback Strategy

If a migration causes critical issues:

1. **Immediate**: Revert the page to use LegacyPageWrapper
2. **Short-term**: Fix the issue in a separate branch
3. **Long-term**: Re-migrate with fixes applied

**Rollback Example**:
```typescript
// Before migration
export function SettingsPage() {
  return <div className={styles.settings}>...</div>;
}

// After migration (if issues found)
export function SettingsPage() {
  return (
    <LegacyPageWrapper>
      <div className={styles.settings}>...</div>
    </LegacyPageWrapper>
  );
}
```

### Success Metrics

**Per-Page Metrics**:
- Zero layout overlaps (measured by visual tests)
- Zero hardcoded colors (enforced by linting)
- 100% component reuse (no custom buttons/inputs)
- Both themes render correctly (visual tests pass)

**System-Wide Metrics**:
- 90% reduction in CSS lines of code
- 100% of pages use AppShell
- 100% of pages use shared components
- Zero visual regressions detected

### Documentation Updates

After each migration:
- Update component usage examples
- Document any new patterns discovered
- Update migration checklist if needed
- Add page to visual regression test suite


# Frontend Scripts

This directory contains utility scripts for maintaining code quality and enforcing project standards.

## Color Scanner (`check-hardcoded-colors.js`)

Automated scanner that detects hardcoded colors in the codebase to enforce theme compliance.

### Purpose

Prevents regression by failing CI builds if hardcoded colors are found outside designated theme files. This ensures all colors come from the theme system, enabling proper theming and branding customization.

### What It Detects

1. **Hex Colors**: `#fff`, `#ffffff`, `#3b82f6`, `#3b82f6ff` (with alpha)
2. **RGB/RGBA Colors**: `rgb(255, 0, 0)`, `rgba(59, 130, 246, 0.5)`
3. **HSL/HSLA Colors**: `hsl(217, 91%, 60%)`, `hsla(0, 0%, 0%, 0.8)`
4. **Named Colors**: `color: 'red'`, `backgroundColor: 'blue'` (in style attributes)
5. **Tailwind Base Colors**: `text-blue-600`, `bg-gray-100`, `border-red-500`

### Allowed Files

The scanner excludes files that legitimately need hardcoded colors:

- **Theme System Files**:
  - `src/styles/tokens.css` - Primitive color tokens (ONLY file with raw hex values)
  - `src/styles/themes.css` - Theme variants (light/dark/accent)
  - `src/theme/ThemeEngine.ts` - Theme engine with fallback colors
  - `src/config/themeBridge.ts` - JSON to CSS variable conversion

- **Special Cases**:
  - `src/auth/` - Login theme system (separate pre-auth theming)
  - `src/components/FaviconManager.tsx` - Favicon generation
  - Print styles (`src/styles/print.css`, etc.)
  - Color picker components (need color presets)

- **Test Files**:
  - `*.test.ts`, `*.test.tsx`
  - `*.stories.ts`, `*.stories.tsx`
  - `*.spec.ts`, `*.spec.tsx`
  - `test/fixtures/`

- **Legacy Code**:
  - `legacy_quarantine/` - Quarantined code awaiting refactoring

### Usage

```bash
# Run manually
npm run lint:colors

# Or directly
node scripts/check-hardcoded-colors.js

# In CI/CD pipeline
npm run lint:colors  # Exits with code 1 if violations found
```

### Output Format

When violations are found:

```
🎨 Checking for hardcoded colors...

Files checked: 566

❌ Found 3 violation(s):

📄 src/components/MyComponent.tsx
   Line 15: [HEX] #3b82f6
   > const color = '#3b82f6';
   Line 20: [TAILWIND] text-blue-600
   > <div className="text-blue-600">

💡 Fix: Use CSS variables (var(--color-*)) or Tailwind semantic classes
   Examples:
   - Instead of #3b82f6 → use var(--color-primary-500)
   - Instead of rgb(59, 130, 246) → use var(--color-primary-500)
   - Instead of text-blue-600 → use text-primary-600
   - Instead of color="red" → use className="text-error-600"
   Allowed theme files: tokens.css, themes.css, ThemeEngine.ts, themeBridge.ts
```

When no violations:

```
🎨 Checking for hardcoded colors...

Files checked: 563

✅ No hardcoded colors found. Theme system is clean!
```

### Exit Codes

- **0**: No violations found (CI passes)
- **1**: Violations found (CI fails)

### How to Fix Violations

#### 1. Hex/RGB/HSL Colors

**Before:**
```typescript
const color = '#3b82f6';
const bg = 'rgb(59, 130, 246)';
```

**After:**
```typescript
const color = 'var(--color-primary-500)';
const bg = 'var(--color-primary-500)';
```

#### 2. Tailwind Base Colors

**Before:**
```tsx
<div className="text-blue-600 bg-gray-100">
  Content
</div>
```

**After:**
```tsx
<div className="text-primary-600 bg-surface-elevated">
  Content
</div>
```

#### 3. Named Colors in Styles

**Before:**
```tsx
<div style={{ color: 'red', backgroundColor: 'blue' }}>
  Content
</div>
```

**After:**
```tsx
<div className="text-error-600 bg-primary-500">
  Content
</div>
```

### Semantic Token Reference

Use these semantic tokens instead of hardcoded colors:

**Status Colors:**
- Success: `text-success-600`, `bg-success-100`
- Error: `text-error-600`, `bg-error-100`
- Warning: `text-warning-600`, `bg-warning-100`
- Info: `text-info-600`, `bg-info-100`

**Surface Colors:**
- `bg-surface` - Base surface
- `bg-surface-elevated` - Elevated surface (cards, modals)
- `bg-surface-sunken` - Sunken surface (inputs)

**Text Colors:**
- `text-primary` - Primary text
- `text-secondary` - Secondary text
- `text-tertiary` - Tertiary text
- `text-inverse` - Inverse text (on dark backgrounds)

**Border Colors:**
- `border-default` - Default borders
- `border-subtle` - Subtle borders
- `border-strong` - Strong borders

**Interactive Colors:**
- `text-primary-600`, `bg-primary-500` - Primary actions
- `text-accent-600`, `bg-accent-500` - Accent elements

### Testing

The scanner includes comprehensive tests:

```bash
# Run scanner tests
npm test -- check-hardcoded-colors.test.js
```

Tests cover:
- Detection of all color formats (hex, rgb, hsl, named, Tailwind)
- Proper exclusion of allowed files
- Comment detection
- Edge cases (empty files, multiple violations)
- Performance (large files, many files)
- Exit codes

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check for hardcoded colors
  run: npm run lint:colors
```

Or in package.json:

```json
{
  "scripts": {
    "lint": "npm run lint:colors && eslint .",
    "lint:colors": "node scripts/check-hardcoded-colors.js"
  }
}
```

### Performance

- Scans ~500-600 files in < 1 second
- Handles large files (1000+ lines) efficiently
- Memory efficient (streams file content)

### Maintenance

To add new allowed files:

1. Edit `check-hardcoded-colors.js`
2. Add path to `ALLOWED_FILES` array
3. Add comment explaining why it's allowed
4. Run tests to verify

Example:

```javascript
const ALLOWED_FILES = [
  // ... existing files
  'src/new-feature/ColorPicker.tsx', // Color picker needs color presets
];
```

### Related Documentation

- [GLOBAL_RULES_EASYSALE.md](../../GLOBAL_RULES_EASYSALE.md) - Theme system rules
- [Theme System Guide](../../docs/theming/) - Complete theming documentation
- [Semantic Tokens](../../docs/theming/semantic-token-mapping.md) - Token reference

---

## DOM Manipulation Scanner (`scan-dom-manipulation.js`)

Automated scanner that detects direct DOM manipulation for theme changes to enforce ThemeEngine compliance.

### Purpose

Prevents regression by failing CI builds if direct DOM manipulation for theme changes is found outside ThemeEngine. This ensures all theme changes route through the centralized ThemeEngine, maintaining consistency and enabling proper scope resolution, lock enforcement, and persistence.

### What It Detects

1. **document.documentElement.style.setProperty()**: Direct manipulation of root element styles
2. **document.body.style.setProperty()**: Direct manipulation of body element styles
3. **root.style.setProperty()**: Manipulation via root variable (typically document.documentElement)
4. **element.style.setProperty()**: Manipulation of theme CSS variables (--color-*, --theme-*)
5. **document.documentElement.setAttribute('data-theme')**: Direct theme attribute manipulation
6. **document.body.setAttribute('data-theme')**: Direct theme attribute manipulation on body
7. **root.setAttribute('data-theme')**: Theme attribute manipulation via root variable
8. **document.documentElement.classList**: Theme class manipulation (dark, light, theme-*)

### Allowed Files

The scanner excludes files that legitimately need direct DOM manipulation:

- **Theme System Files**:
  - `src/theme/ThemeEngine.ts` - ONLY file that should manipulate theme DOM
  - `src/auth/theme/LoginThemeProvider.tsx` - Separate pre-auth theme system
  - `src/auth/theme/LoginThemeEngine.ts` - Login theme engine

- **Special Cases**:
  - `src/components/FaviconManager.tsx` - Favicon manipulation (not theme-related)

- **Test Files**:
  - `*.test.ts`, `*.test.tsx`
  - `*.stories.ts`, `*.stories.tsx`
  - `*.spec.ts`, `*.spec.tsx`
  - `test/fixtures/`

- **Legacy Code**:
  - `legacy_quarantine/` - Quarantined code awaiting refactoring

### Usage

```bash
# Run manually
npm run lint:dom

# Or directly
node scripts/scan-dom-manipulation.js

# In CI/CD pipeline
npm run lint:dom  # Exits with code 1 if violations found
```

### Output Format

When violations are found:

```
🔍 Checking for direct DOM manipulation...

Files checked: 566

❌ Found 2 violation(s):

📄 src/admin/pages/BrandingSettingsPage.tsx
   Line 87: [root.style.setProperty]
   Description: Direct manipulation via root variable (likely document.documentElement)
   > root.style.setProperty('--color-primary-500', accent500);

📄 src/admin/components/wizard/BrandingStepContent.tsx
   Line 128: [documentElement.style.setProperty]
   Description: Direct manipulation of document.documentElement.style
   > document.documentElement.style.setProperty('--color-accent-500', color);

💡 Fix: Route all theme changes through ThemeEngine
   Examples:
   
   ❌ WRONG:
   const root = document.documentElement;
   root.style.setProperty("--color-primary-500", "#3b82f6");
   
   ✅ CORRECT:
   import { ThemeEngine } from "@/theme/ThemeEngine";
   const themeEngine = ThemeEngine.getInstance();
   themeEngine.saveThemePreference("store", {
     colors: { primary: { 500: "#3b82f6" } }
   });
   
   Only ThemeEngine.ts should manipulate theme DOM directly.
   All other components must use ThemeEngine API.
```

When no violations:

```
🔍 Checking for direct DOM manipulation...

Files checked: 563

✅ No direct DOM manipulation found. Theme system is clean!
```

### Exit Codes

- **0**: No violations found (CI passes)
- **1**: Violations found (CI fails)

### How to Fix Violations

#### 1. Direct Style Manipulation

**Before (WRONG):**
```typescript
function applyTheme(color: string) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary-500', color);
  root.style.setProperty('--color-accent-500', color);
}
```

**After (CORRECT):**
```typescript
import { ThemeEngine } from '@/theme/ThemeEngine';

function applyTheme(color: string) {
  const themeEngine = ThemeEngine.getInstance();
  themeEngine.saveThemePreference('store', {
    colors: {
      primary: { 500: color },
      accent: { 500: color },
    },
  });
}
```

#### 2. Theme Attribute Manipulation

**Before (WRONG):**
```typescript
function setDarkMode(enabled: boolean) {
  document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
}
```

**After (CORRECT):**
```typescript
import { ThemeEngine } from '@/theme/ThemeEngine';

function setDarkMode(enabled: boolean) {
  const themeEngine = ThemeEngine.getInstance();
  themeEngine.saveThemePreference('user', {
    mode: enabled ? 'dark' : 'light',
  });
}
```

#### 3. Theme Class Manipulation

**Before (WRONG):**
```typescript
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
}
```

**After (CORRECT):**
```typescript
import { ThemeEngine } from '@/theme/ThemeEngine';

function toggleDarkMode() {
  const themeEngine = ThemeEngine.getInstance();
  const currentTheme = themeEngine.getCurrentTheme();
  const newMode = currentTheme.mode === 'dark' ? 'light' : 'dark';
  themeEngine.saveThemePreference('user', { mode: newMode });
}
```

### Why This Matters

Direct DOM manipulation for theme changes bypasses:

1. **Scope Resolution**: ThemeEngine merges theme preferences from multiple scopes (system → tenant → store → user)
2. **Lock Enforcement**: Admin-configured locks prevent users from overriding certain theme settings
3. **Persistence**: ThemeEngine handles localStorage caching and sync
4. **Consistency**: Single source of truth for theme application
5. **Offline Support**: ThemeEngine manages offline theme state

### ThemeEngine API Reference

```typescript
import { ThemeEngine } from '@/theme/ThemeEngine';

const themeEngine = ThemeEngine.getInstance();

// Save theme preference at specific scope
themeEngine.saveThemePreference('user', {
  mode: 'dark',
  accent: 'blue',
  contrast: 'normal',
  colors: {
    primary: { 500: '#3b82f6' },
  },
});

// Get current effective theme
const theme = themeEngine.getCurrentTheme();

// Get theme with source information
const { theme, source } = themeEngine.resolveTheme();

// Apply theme immediately (usually automatic)
themeEngine.applyTheme(theme);
```

### Testing

The scanner includes comprehensive tests:

```bash
# Run scanner tests
npm test -- scan-dom-manipulation.test.js
```

Tests cover:
- Detection of all DOM manipulation patterns
- Proper exclusion of allowed files (ThemeEngine, LoginThemeProvider, tests)
- Comment detection (single-line, multi-line, JSDoc)
- Edge cases (empty files, multiple violations, multiple files)
- Real-world violation patterns (BrandingSettingsPage, BrandingStepContent)
- Performance (large files, many files)
- Exit codes

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check for direct DOM manipulation
  run: npm run lint:dom
```

Or in package.json:

```json
{
  "scripts": {
    "lint": "npm run lint:colors && npm run lint:dom && eslint .",
    "lint:dom": "node scripts/scan-dom-manipulation.js"
  }
}
```

### Performance

- Scans ~500-600 files in < 1 second
- Handles large files (1000+ lines) efficiently
- Memory efficient (streams file content)

### Maintenance

To add new allowed files:

1. Edit `scan-dom-manipulation.js`
2. Add path to `ALLOWED_FILES` array
3. Add comment explaining why it's allowed
4. Run tests to verify

Example:

```javascript
const ALLOWED_FILES = [
  // ... existing files
  'src/new-feature/CustomThemeEngine.ts', // Alternative theme engine for specific use case
];
```

### Related Documentation

- [GLOBAL_RULES_EASYSALE.md](../../GLOBAL_RULES_EASYSALE.md) - Theme system rules
- [Theme System Guide](../../docs/theming/) - Complete theming documentation
- [ThemeEngine API](../../docs/theming/theme-engine-api.md) - ThemeEngine usage guide

---

*Last updated: 2026-01-30*

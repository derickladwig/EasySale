# Theme Compliance CI/CD Integration

This document describes the automated theme compliance checks integrated into the CI/CD pipeline.

## Overview

The EasySale project enforces strict theme system rules to maintain consistency and prevent regressions. Two automated scanners run on every pull request and push to `main`/`develop` branches:

1. **Hardcoded Color Scanner** (`lint:colors`)
2. **DOM Manipulation Scanner** (`lint:dom`)

Both scanners **fail the build** if violations are detected, preventing non-compliant code from being merged.

## Scanners

### 1. Hardcoded Color Scanner

**Script**: `frontend/scripts/check-hardcoded-colors.js`  
**Command**: `npm run lint:colors`

#### What It Checks

- ❌ Hex colors (`#3b82f6`, `#rgb`, `#rrggbb`, `#rrggbbaa`) outside theme files
- ❌ RGB/RGBA colors (`rgb(59, 130, 246)`) outside theme files
- ❌ HSL/HSLA colors (`hsl(217, 91%, 60%)`) outside theme files
- ❌ Tailwind base color utilities (`text-blue-600`, `bg-slate-100`, etc.)
- ❌ Named colors in style attributes (`color="red"`, `backgroundColor="blue"`)

#### Allowed Files

Colors are **only** allowed in these theme system files:

- `src/styles/tokens.css` — Primitive color tokens (single source of truth)
- `src/styles/themes.css` — Theme variants (light/dark/accent)
- `src/theme/ThemeEngine.ts` — Theme engine with fallback colors
- `src/config/themeBridge.ts` — JSON to CSS variable conversion
- `src/auth/theme/` — Pre-auth login theme system
- `*.test.*` files — Test assertions
- `*.stories.*` files — Storybook examples

#### Example Violations

```typescript
// ❌ WRONG - Hardcoded hex color
<div style={{ backgroundColor: '#3b82f6' }}>

// ❌ WRONG - Tailwind base color utility
<span className="text-blue-600">

// ✅ CORRECT - Semantic token
<div className="bg-primary-500">

// ✅ CORRECT - CSS variable
<div style={{ backgroundColor: 'var(--color-primary-500)' }}>
```

### 2. DOM Manipulation Scanner

**Script**: `frontend/scripts/scan-dom-manipulation.js`  
**Command**: `npm run lint:dom`

#### What It Checks

- ❌ `document.documentElement.style.setProperty()` outside ThemeEngine
- ❌ `document.body.style.setProperty()` for theme properties
- ❌ `root.style.setProperty()` (where root is document.documentElement)
- ❌ `element.style.setProperty()` for theme CSS variables (`--color-*`, `--theme-*`)
- ❌ `document.documentElement.setAttribute('data-theme')`
- ❌ `document.documentElement.classList` manipulation for theme classes

#### Allowed Files

Direct DOM manipulation is **only** allowed in:

- `src/theme/ThemeEngine.ts` — The ONLY file that should manipulate theme DOM
- `src/auth/theme/LoginThemeProvider.tsx` — Separate pre-auth theme system
- `*.test.*` files — Test setup

#### Example Violations

```typescript
// ❌ WRONG - Direct DOM manipulation
const root = document.documentElement;
root.style.setProperty('--color-primary-500', '#3b82f6');

// ❌ WRONG - Direct attribute manipulation
document.documentElement.setAttribute('data-theme', 'dark');

// ✅ CORRECT - Use ThemeEngine API
import { ThemeEngine } from '@/theme/ThemeEngine';
const themeEngine = ThemeEngine.getInstance();
themeEngine.saveThemePreference('store', {
  colors: { primary: { 500: '#3b82f6' } }
});
```

## CI/CD Integration

### GitHub Actions Workflow

The scanners are integrated into `.github/workflows/ci.yml`:

```yaml
- name: Check for hardcoded colors
  run: npm run lint:colors

- name: Check for direct DOM manipulation
  run: npm run lint:dom
```

These steps run **after** linting and type checking, but **before** tests.

### When Scanners Run

- ✅ Every pull request to `main` or `develop`
- ✅ Every push to `main` or `develop`
- ✅ Locally via `npm run lint:all`

### Build Failure Behavior

If violations are found:

1. Scanner prints detailed violation report
2. Build fails with exit code 1
3. PR cannot be merged until violations are fixed
4. Developer receives clear error messages with file/line numbers

### Example Output

**Success:**
```
🎨 Checking for hardcoded colors...
Files checked: 563
✅ No hardcoded colors found. Theme system is clean!
```

**Failure:**
```
🎨 Checking for hardcoded colors...
Files checked: 563

❌ Found 3 violation(s):

📄 src/components/MyComponent.tsx
   Line 42: [TAILWIND] text-blue-600
   > <span className="text-blue-600">Status</span>

📄 src/pages/Dashboard.tsx
   Line 15: [HEX] #3b82f6
   > backgroundColor: '#3b82f6'

💡 Fix: Use CSS variables (var(--color-*)) or Tailwind semantic classes
```

## Local Development

### Running Scanners Locally

```bash
# Run both scanners
npm run lint:all

# Run individual scanners
npm run lint:colors
npm run lint:dom

# Run with other checks
npm run lint && npm run lint:colors && npm run lint:dom
```

### Pre-commit Hook

Consider adding a pre-commit hook to catch violations early:

```bash
# .husky/pre-commit
npm run lint:colors
npm run lint:dom
```

## Fixing Violations

### Hardcoded Colors

1. **Identify the semantic meaning** of the color
   - Is it a primary action? → `text-primary-600`
   - Is it an error state? → `text-error-600`
   - Is it a success state? → `text-success-600`
   - Is it a surface? → `bg-surface-elevated`

2. **Replace with semantic token**
   ```typescript
   // Before
   className="text-blue-600"
   
   // After
   className="text-primary-600"
   ```

3. **For CSS variables**
   ```typescript
   // Before
   style={{ color: '#3b82f6' }}
   
   // After
   style={{ color: 'var(--color-primary-500)' }}
   ```

### DOM Manipulation

1. **Import ThemeEngine**
   ```typescript
   import { ThemeEngine } from '@/theme/ThemeEngine';
   ```

2. **Use ThemeEngine API**
   ```typescript
   const themeEngine = ThemeEngine.getInstance();
   themeEngine.saveThemePreference('user', {
     mode: 'dark',
     accent: 'blue',
   });
   ```

3. **Remove direct DOM manipulation**
   ```typescript
   // Remove this
   document.documentElement.style.setProperty('--color-primary-500', color);
   ```

## Maintenance

### Adding New Allowed Files

If you need to add a new file to the allowed list:

1. **Hardcoded colors**: Edit `frontend/scripts/check-hardcoded-colors.js`
   ```javascript
   const ALLOWED_FILES = [
     'styles/tokens.css',
     'your/new/file.ts',  // Add here
   ];
   ```

2. **DOM manipulation**: Edit `frontend/scripts/scan-dom-manipulation.js`
   ```javascript
   const ALLOWED_FILES = [
     'theme/ThemeEngine.ts',
     'your/new/file.ts',  // Add here
   ];
   ```

3. **Document the reason** in this file and in code comments

### Updating Scanner Rules

To add new patterns or rules:

1. Edit the scanner script
2. Add test cases
3. Update this documentation
4. Test locally before committing

## References

- [GLOBAL_RULES_EASYSALE.md](../../GLOBAL_RULES_EASYSALE.md) — Theme system rules
- [Theme System Architecture](../architecture/theme-system.md)
- [CI/CD Pipeline](.github/workflows/ci.yml)
- [README.md](../../README.md#theme-compliance-enforcement) — Theme compliance section

## Troubleshooting

### Scanner False Positives

If the scanner reports a false positive:

1. Check if the file should be in the allowed list
2. Verify the pattern is actually a violation
3. If legitimate, add to allowed files with documentation

### Scanner Not Running

If scanners don't run in CI:

1. Check `.github/workflows/ci.yml` includes the steps
2. Verify `package.json` has the scripts
3. Check scanner scripts are executable
4. Review CI logs for errors

### Build Passing Locally But Failing in CI

1. Ensure you're running the same Node.js version
2. Run `npm ci` instead of `npm install`
3. Check for uncommitted changes
4. Verify scanner scripts are committed

---

**Last Updated**: 2026-01-30  
**Maintained By**: Frontend Team

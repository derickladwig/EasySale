# Linting Setup for Design System Enforcement

## Overview

The EasySale design system uses automated linting to enforce CSS ownership rules and prevent common styling mistakes. This document explains the linting setup and how to use it.

## Linting Tools

### 1. Stylelint (CSS Linting)

**Purpose**: Enforces CSS ownership rules for colors, positioning, and z-index values.

**Configuration**: `.stylelintrc.cjs`

**Rules Enforced**:
- ❌ No hex colors outside `tokens.css` and `themes.css`
- ❌ No `rgb()`, `rgba()`, `hsl()`, `hsla()` functions
- ❌ No `position: fixed` outside AppShell, Modal, Toast components
- ❌ No literal z-index values (must use tokens)
- ✅ Must use CSS variables for all color properties
- ✅ Must use z-index tokens like `var(--z-dropdown)`

**Exceptions**:
- `src/styles/tokens.css` - Can define raw values
- `src/styles/themes.css` - Can define raw colors
- `src/styles/print.css` - Special print styling allowed
- `**/AppShell.module.css` - Can use `position: fixed`
- `**/Modal.module.css` - Can use `position: fixed`
- `**/Toast.module.css` - Can use `position: fixed`

### 2. ESLint (JavaScript/TypeScript Linting)

**Purpose**: Enforces no inline styles in JSX.

**Configuration**: `eslint.config.js`

**Rules Enforced**:
- ❌ No `style` prop on DOM elements
- ❌ No `style` prop on React components
- ✅ Must use CSS modules or design tokens

## Running Linting

### Manual Commands

```bash
# Lint CSS files only
npm run lint:css

# Lint and auto-fix CSS files
npm run lint:css:fix

# Lint TypeScript/TSX files only
npm run lint

# Lint and auto-fix TypeScript/TSX files
npm run lint:fix

# Lint everything (CSS + TypeScript)
npm run lint:all

# Format all files with Prettier
npm run format

# Check formatting without changing files
npm run format:check
```

### Automatic Linting

#### Pre-commit Hooks

Linting runs automatically before every commit via Husky and lint-staged:

1. **Staged files are linted**: Only files you're committing are checked
2. **Auto-fix applied**: Fixable issues are corrected automatically
3. **Commit blocked on errors**: Unfixable errors prevent the commit

**What runs on pre-commit**:
- ESLint on `*.ts` and `*.tsx` files
- Stylelint on `*.css` files
- Prettier on all supported files
- Unit tests

#### CI/CD Pipeline

Linting should be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Lint CSS
  run: npm run lint:css

- name: Lint TypeScript
  run: npm run lint

- name: Check formatting
  run: npm run format:check
```

## Common Violations and Fixes

### Violation 1: Hardcoded Hex Color

❌ **Wrong**:
```css
.button {
  background: #0066cc;
}
```

✅ **Correct**:
```css
.button {
  background: var(--color-accent);
}
```

### Violation 2: RGB/RGBA Function

❌ **Wrong**:
```css
.card {
  background: rgba(255, 255, 255, 0.5);
}
```

✅ **Correct**:
```css
.card {
  background: var(--color-bg-primary);
  opacity: 0.5;
}
```

Or define a semi-transparent token in `themes.css`:
```css
/* themes.css */
[data-theme="light"] {
  --theme-overlay-bg: rgba(255, 255, 255, 0.5);
}
```

### Violation 3: Position Fixed

❌ **Wrong**:
```css
/* MyComponent.module.css */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
}
```

✅ **Correct**:
```tsx
// Use AppShell for layout
<AppShell sidebar={<MySidebar />}>
  <MyContent />
</AppShell>
```

### Violation 4: Literal Z-Index

❌ **Wrong**:
```css
.dropdown {
  z-index: 1000;
}
```

✅ **Correct**:
```css
.dropdown {
  z-index: var(--z-dropdown);
}
```

### Violation 5: Inline Styles in JSX

❌ **Wrong**:
```tsx
<div style={{ color: '#0066cc', padding: '16px' }}>
  Content
</div>
```

✅ **Correct**:
```tsx
import styles from './Component.module.css';

<div className={styles.container}>
  Content
</div>
```

```css
/* Component.module.css */
.container {
  color: var(--color-accent);
  padding: var(--space-4);
}
```

## Disabling Rules (Use Sparingly)

### Disable Stylelint for a Line

```css
/* stylelint-disable-next-line color-no-hex */
.special-case {
  color: #ff0000;
}
```

### Disable ESLint for a Line

```tsx
{/* eslint-disable-next-line react/forbid-dom-props */}
<div style={{ color: 'red' }}>Emergency</div>
```

**⚠️ Warning**: Only disable rules when absolutely necessary and document why.

## Adding New Design Tokens

If you need a color, spacing, or z-index value that doesn't exist:

1. **Check existing tokens**: Review `src/styles/tokens.css`
2. **Propose addition**: Discuss with team if new token is needed
3. **Add to tokens.css**: Add the token definition
4. **Add to themes.css**: Add theme-specific values if needed
5. **Document**: Update token documentation

**Never** add hardcoded values directly to component CSS.

## Troubleshooting

### "Unexpected hex color" in my component CSS

**Solution**: Replace with a CSS variable from `tokens.css` or `themes.css`.

### "Unexpected value 'fixed' for property 'position'"

**Solution**: 
- Use AppShell for layout positioning
- If building a modal/toast, add your component to the exceptions list in `.stylelintrc.cjs`

### "Unexpected value '1000' for property 'z-index'"

**Solution**: Use a z-index token like `var(--z-dropdown)` or add a new token to `tokens.css`.

### "Use CSS modules or design tokens instead of inline styles"

**Solution**: Move styles to a CSS module file and use `className`.

### Linting passes locally but fails in CI

**Possible causes**:
- Different Node.js versions
- Missing dependencies
- Cached files

**Solution**:
```bash
# Clear caches and reinstall
rm -rf node_modules package-lock.json
npm install
npm run lint:all
```

## IDE Integration

### VS Code

Install these extensions for real-time linting:

1. **Stylelint** (`stylelint.vscode-stylelint`)
2. **ESLint** (`dbaeumer.vscode-eslint`)
3. **Prettier** (`esbenp.prettier-vscode`)

Add to `.vscode/settings.json`:
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "stylelint.validate": ["css"],
  "css.validate": false
}
```

### WebStorm / IntelliJ IDEA

1. Enable Stylelint: Settings → Languages & Frameworks → Style Sheets → Stylelint
2. Enable ESLint: Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
3. Enable Prettier: Settings → Languages & Frameworks → JavaScript → Prettier

## Benefits

Following these linting rules provides:

1. **Consistency**: All colors come from design tokens
2. **Themability**: Theme changes update all components automatically
3. **Maintainability**: No hunting for hardcoded values
4. **Accessibility**: Centralized contrast management
5. **Layout Safety**: No accidental overlaps
6. **Code Quality**: Catch mistakes before code review

## Resources

- [CSS Ownership Rules](./CSS_OWNERSHIP_RULES.md)
- [Linting Test Results](./LINTING_TEST_RESULTS.md)
- [Stylelint Documentation](https://stylelint.io/)
- [ESLint Documentation](https://eslint.org/)

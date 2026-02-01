# EasySale Theming Developer Guide

## Overview

This guide covers the EasySale theming system architecture, implementation details, and best practices for developers. The theming system is designed to provide consistent, configurable, and maintainable styling across the entire application.

## Architecture Principles

### Single Source of Truth

EasySale uses a strict hierarchy for theme management:

1. **Primitive Tokens** (`frontend/src/styles/tokens.css`) - Raw color values
2. **Theme Variants** (`frontend/src/styles/themes.css`) - Light/dark/accent themes
3. **Tailwind Config** (`frontend/tailwind.config.js`) - Maps CSS vars to utilities
4. **ThemeEngine** (`frontend/src/theme/ThemeEngine.ts`) - Runtime theme management

**Critical Rule**: Only `tokens.css` contains raw hex values. All other files reference CSS variables.

### Single Injection Point

**ThemeEngine is the ONLY place that manipulates theme CSS variables on the DOM.**

```typescript
// ✅ CORRECT - Use ThemeEngine
import { ThemeEngine } from '@/theme/ThemeEngine';

const themeEngine = ThemeEngine.getInstance();
themeEngine.saveThemePreference('user', {
  mode: 'dark',
  accent: 'blue',
});

// ❌ WRONG - Never manipulate DOM directly
document.documentElement.style.setProperty('--color-primary-500', '#3B82F6');
```

### Configuration-Driven

Themes are configured via JSON and applied through the ThemeEngine:

```json
{
  "branding": {
    "theme": {
      "mode": "light",
      "accent": "blue",
      "contrast": "normal"
    }
  }
}
```

## File Structure

```
frontend/src/
├── styles/
│   ├── tokens.css              # Primitive color tokens (ONLY file with hex values)
│   ├── themes.css              # Theme variants (light/dark/accent)
│   └── semantic-tokens.css     # Semantic color mappings
├── theme/
│   ├── ThemeEngine.ts          # Core theme management (ONLY DOM manipulation)
│   ├── types.ts                # TypeScript types for themes
│   └── __tests__/
│       └── ThemeEngine.test.ts # Theme engine tests
├── config/
│   ├── themeBridge.ts          # JSON config → CSS variables
│   ├── ThemeProvider.tsx       # React context for theme
│   └── ConfigProvider.tsx      # Configuration context
└── auth/theme/
    └── LoginThemeProvider.tsx  # Pre-auth theming (separate system)
```

## Primitive Tokens

### tokens.css

This is the **ONLY** file that should contain raw hex color values.

```css
/* frontend/src/styles/tokens.css */

:root {
  /* Base Colors - Primitive Tokens */
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  /* ... more slate shades ... */
  
  --color-blue-50: #eff6ff;
  --color-blue-100: #dbeafe;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  /* ... more blue shades ... */
  
  --color-green-50: #f0fdf4;
  --color-green-600: #16a34a;
  /* ... more green shades ... */
  
  --color-red-50: #fef2f2;
  --color-red-600: #dc2626;
  /* ... more red shades ... */
  
  --color-yellow-50: #fefce8;
  --color-yellow-600: #ca8a04;
  /* ... more yellow shades ... */
}
```

**Rules:**
- Only primitive color definitions
- No semantic naming at this level
- Complete color palettes (50-900 shades)
- No theme-specific logic

## Theme Variants

### themes.css

Defines light, dark, and accent theme variants using primitive tokens.

```css
/* frontend/src/styles/themes.css */

/* Light Theme (Default) */
:root,
[data-theme="light"] {
  /* Surface Colors */
  --color-surface: var(--color-slate-50);
  --color-surface-elevated: var(--color-slate-100);
  --color-surface-overlay: var(--color-slate-200);
  
  /* Text Colors */
  --color-text-primary: var(--color-slate-900);
  --color-text-secondary: var(--color-slate-600);
  --color-text-tertiary: var(--color-slate-500);
  
  /* Border Colors */
  --color-border-default: var(--color-slate-300);
  --color-border-subtle: var(--color-slate-200);
  
  /* Primary/Accent Colors */
  --color-primary-50: var(--color-blue-50);
  --color-primary-500: var(--color-blue-500);
  --color-primary-600: var(--color-blue-600);
  --color-accent-500: var(--color-blue-500);
}

/* Dark Theme */
[data-theme="dark"] {
  --color-surface: var(--color-slate-900);
  --color-surface-elevated: var(--color-slate-800);
  --color-surface-overlay: var(--color-slate-700);
  
  --color-text-primary: var(--color-slate-50);
  --color-text-secondary: var(--color-slate-300);
  --color-text-tertiary: var(--color-slate-400);
  
  --color-border-default: var(--color-slate-700);
  --color-border-subtle: var(--color-slate-800);
  
  --color-primary-50: var(--color-blue-900);
  --color-primary-500: var(--color-blue-400);
  --color-primary-600: var(--color-blue-300);
  --color-accent-500: var(--color-blue-400);
}

/* Accent Variants */
[data-accent="green"] {
  --color-accent-500: var(--color-green-500);
  --color-primary-500: var(--color-green-500);
}

[data-accent="red"] {
  --color-accent-500: var(--color-red-500);
  --color-primary-500: var(--color-red-500);
}
```

**Rules:**
- Reference primitive tokens only
- Define semantic color names
- Support light/dark modes
- Support accent color variants

## Semantic Tokens

### semantic-tokens.css

Maps semantic meaning to theme colors.

```css
/* frontend/src/styles/semantic-tokens.css */

:root {
  /* Status Colors - Semantic Tokens */
  --color-success-50: var(--color-green-50);
  --color-success-100: var(--color-green-100);
  --color-success-600: var(--color-green-600);
  --color-success-700: var(--color-green-700);
  
  --color-error-50: var(--color-red-50);
  --color-error-100: var(--color-red-100);
  --color-error-600: var(--color-red-600);
  --color-error-700: var(--color-red-700);
  
  --color-warning-50: var(--color-yellow-50);
  --color-warning-100: var(--color-yellow-100);
  --color-warning-600: var(--color-yellow-600);
  --color-warning-700: var(--color-yellow-700);
  
  --color-info-50: var(--color-blue-50);
  --color-info-100: var(--color-blue-100);
  --color-info-600: var(--color-blue-600);
  --color-info-700: var(--color-blue-700);
}
```

**Usage in Components:**
```tsx
// ✅ CORRECT - Use semantic tokens
<div className="bg-success-100 text-success-700">
  Success message
</div>

<div className="bg-error-100 text-error-700">
  Error message
</div>

// ❌ WRONG - Don't use base color utilities
<div className="bg-green-100 text-green-700">
  Success message
</div>
```

## Tailwind Configuration

### tailwind.config.js

Maps CSS variables to Tailwind utilities.

```javascript
// frontend/tailwind.config.js

module.exports = {
  theme: {
    extend: {
      colors: {
        // Surface colors
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          overlay: 'var(--color-surface-overlay)',
        },
        
        // Text colors
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        
        // Border colors
        border: {
          default: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
        },
        
        // Primary/Accent
        primary: {
          50: 'var(--color-primary-50)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
        },
        accent: {
          500: 'var(--color-accent-500)',
        },
        
        // Semantic colors
        success: {
          50: 'var(--color-success-50)',
          100: 'var(--color-success-100)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
        },
        error: {
          50: 'var(--color-error-50)',
          100: 'var(--color-error-100)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
        },
        info: {
          50: 'var(--color-info-50)',
          100: 'var(--color-info-100)',
          600: 'var(--color-info-600)',
          700: 'var(--color-info-700)',
        },
      },
    },
  },
};
```

**Rules:**
- All colors reference CSS variables
- Fallback colors allowed for build-time safety
- No direct color values in config

## ThemeEngine

### Core Implementation

```typescript
// frontend/src/theme/ThemeEngine.ts

export class ThemeEngine {
  private static instance: ThemeEngine;
  
  private constructor() {
    // Singleton pattern
  }
  
  public static getInstance(): ThemeEngine {
    if (!ThemeEngine.instance) {
      ThemeEngine.instance = new ThemeEngine();
    }
    return ThemeEngine.instance;
  }
  
  /**
   * Apply theme to DOM
   * This is the ONLY method that manipulates CSS variables
   */
  public applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    // Set theme mode
    root.setAttribute('data-theme', theme.mode);
    
    // Set accent color
    if (theme.accent) {
      root.setAttribute('data-accent', theme.accent);
    }
    
    // Set contrast level
    if (theme.contrast) {
      root.setAttribute('data-contrast', theme.contrast);
    }
    
    // Set custom colors if provided
    if (theme.colors) {
      this.applyCustomColors(theme.colors);
    }
    
    // Cache theme
    this.cacheTheme(theme);
  }
  
  /**
   * Apply custom color overrides
   */
  private applyCustomColors(colors: CustomColors): void {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'object') {
        // Handle nested color objects (e.g., primary: { 500: '#xxx' })
        Object.entries(value).forEach(([shade, color]) => {
          root.style.setProperty(`--color-${key}-${shade}`, color);
        });
      } else {
        // Handle flat color values
        root.style.setProperty(`--color-${key}`, value);
      }
    });
  }
  
  /**
   * Save theme preference at specific scope
   */
  public saveThemePreference(
    scope: 'system' | 'tenant' | 'store' | 'user',
    theme: Partial<Theme>
  ): void {
    // Validate locks
    const locks = this.getThemeLocks();
    if (locks) {
      this.validateLocks(theme, locks);
    }
    
    // Save to appropriate storage
    switch (scope) {
      case 'user':
        this.saveUserTheme(theme);
        break;
      case 'store':
        this.saveStoreTheme(theme);
        break;
      case 'tenant':
        this.saveTenantTheme(theme);
        break;
    }
    
    // Apply resolved theme
    const resolvedTheme = this.resolveTheme();
    this.applyTheme(resolvedTheme);
  }
  
  /**
   * Resolve theme from all scopes
   * Precedence: User > Store > Tenant > System
   */
  public resolveTheme(): Theme {
    const systemTheme = this.getSystemTheme();
    const tenantTheme = this.getTenantTheme();
    const storeTheme = this.getStoreTheme();
    const userTheme = this.getUserTheme();
    
    // Merge themes with proper precedence
    return {
      ...systemTheme,
      ...tenantTheme,
      ...storeTheme,
      ...userTheme,
    };
  }
  
  /**
   * Validate theme changes against locks
   */
  private validateLocks(theme: Partial<Theme>, locks: ThemeLocks): void {
    if (locks.mode && theme.mode) {
      throw new Error('Theme mode is locked by administrator');
    }
    if (locks.accent && theme.accent) {
      throw new Error('Accent color is locked by administrator');
    }
    if (locks.contrast && theme.contrast) {
      throw new Error('Contrast level is locked by administrator');
    }
  }
  
  /**
   * Cache theme in localStorage
   */
  private cacheTheme(theme: Theme): void {
    localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify(theme));
  }
  
  /**
   * Load cached theme
   */
  public loadCachedTheme(): Theme | null {
    const cached = localStorage.getItem('EasySale_theme_cache_v2');
    return cached ? JSON.parse(cached) : null;
  }
}
```

### Boot Theme

Theme must be applied before React renders to prevent flash.

```html
<!-- frontend/index.html -->
<head>
  <script>
    // Boot theme before React loads
    (function() {
      const cached = localStorage.getItem('EasySale_theme_cache_v2');
      if (cached) {
        const theme = JSON.parse(cached);
        document.documentElement.setAttribute('data-theme', theme.mode || 'light');
        if (theme.accent) {
          document.documentElement.setAttribute('data-accent', theme.accent);
        }
      }
    })();
  </script>
</head>
```

## React Integration

### ThemeProvider

```tsx
// frontend/src/config/ThemeProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeEngine } from '@/theme/ThemeEngine';
import type { Theme } from '@/theme/types';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
  resolvedTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeEngine = ThemeEngine.getInstance();
  const [theme, setThemeState] = useState<Theme>(() => {
    return themeEngine.loadCachedTheme() || themeEngine.resolveTheme();
  });
  
  useEffect(() => {
    // Apply theme on mount
    themeEngine.applyTheme(theme);
  }, [theme]);
  
  const setTheme = (newTheme: Partial<Theme>) => {
    themeEngine.saveThemePreference('user', newTheme);
    const resolved = themeEngine.resolveTheme();
    setThemeState(resolved);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Using Theme in Components

```tsx
// ✅ CORRECT - Use semantic tokens in className
function MyComponent() {
  return (
    <div className="bg-surface text-text-primary border border-border-default">
      <h1 className="text-primary-600">Title</h1>
      <p className="text-text-secondary">Description</p>
      <button className="bg-primary-500 text-white hover:bg-primary-600">
        Action
      </button>
    </div>
  );
}

// ✅ CORRECT - Use theme context for dynamic changes
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  const toggleMode = () => {
    setTheme({ mode: theme.mode === 'light' ? 'dark' : 'light' });
  };
  
  return (
    <button onClick={toggleMode}>
      {theme.mode === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

// ❌ WRONG - Never use base color utilities
function WrongComponent() {
  return (
    <div className="bg-slate-100 text-slate-900 border border-slate-300">
      <h1 className="text-blue-600">Title</h1>
    </div>
  );
}

// ❌ WRONG - Never manipulate DOM directly
function WrongThemeToggle() {
  const toggleMode = () => {
    document.documentElement.style.setProperty('--color-primary-500', '#ff0000');
  };
  
  return <button onClick={toggleMode}>Toggle</button>;
}
```

## Component Styling Best Practices

### Use Semantic Tokens

```tsx
// Status indicators
<div className="bg-success-100 text-success-700">Success</div>
<div className="bg-error-100 text-error-700">Error</div>
<div className="bg-warning-100 text-warning-700">Warning</div>
<div className="bg-info-100 text-info-700">Info</div>

// Surface hierarchy
<div className="bg-surface">Base surface</div>
<div className="bg-surface-elevated">Elevated surface</div>
<div className="bg-surface-overlay">Overlay surface</div>

// Text hierarchy
<h1 className="text-text-primary">Primary text</h1>
<p className="text-text-secondary">Secondary text</p>
<span className="text-text-tertiary">Tertiary text</span>

// Borders
<div className="border border-border-default">Default border</div>
<div className="border border-border-subtle">Subtle border</div>
```

### CSS Modules (Layout Only)

```css
/* MyComponent.module.css */

.container {
  /* ✅ CORRECT - Layout and spacing */
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  
  /* ✅ CORRECT - Use CSS variables for colors */
  background-color: var(--color-surface-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
}

.title {
  /* ❌ WRONG - Don't hardcode colors */
  /* color: #1e293b; */
  
  /* ✅ CORRECT - Use CSS variables */
  color: var(--color-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
}
```

### Conditional Styling

```tsx
// ✅ CORRECT - Use semantic tokens with conditions
function StatusBadge({ status }: { status: 'success' | 'error' | 'warning' }) {
  const colorMap = {
    success: 'bg-success-100 text-success-700',
    error: 'bg-error-100 text-error-700',
    warning: 'bg-warning-100 text-warning-700',
  };
  
  return (
    <span className={`px-2 py-1 rounded ${colorMap[status]}`}>
      {status}
    </span>
  );
}

// ❌ WRONG - Don't use base colors
function WrongStatusBadge({ status }: { status: string }) {
  const colorMap = {
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };
  
  return <span className={colorMap[status]}>{status}</span>;
}
```

## Testing

### Theme Engine Tests

```typescript
// frontend/src/theme/__tests__/ThemeEngine.test.ts

import { ThemeEngine } from '../ThemeEngine';

describe('ThemeEngine', () => {
  let themeEngine: ThemeEngine;
  
  beforeEach(() => {
    themeEngine = ThemeEngine.getInstance();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-accent');
  });
  
  it('should apply light theme', () => {
    themeEngine.applyTheme({ mode: 'light' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
  
  it('should apply dark theme', () => {
    themeEngine.applyTheme({ mode: 'dark' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
  
  it('should apply accent color', () => {
    themeEngine.applyTheme({ mode: 'light', accent: 'green' });
    expect(document.documentElement.getAttribute('data-accent')).toBe('green');
  });
  
  it('should enforce theme locks', () => {
    // Set up locked theme
    themeEngine.saveThemePreference('store', {
      mode: 'light',
      locks: { mode: true },
    });
    
    // Attempt to change locked setting
    expect(() => {
      themeEngine.saveThemePreference('user', { mode: 'dark' });
    }).toThrow('Theme mode is locked by administrator');
  });
  
  it('should resolve theme with correct precedence', () => {
    themeEngine.saveThemePreference('tenant', { mode: 'light', accent: 'blue' });
    themeEngine.saveThemePreference('store', { accent: 'green' });
    themeEngine.saveThemePreference('user', { mode: 'dark' });
    
    const resolved = themeEngine.resolveTheme();
    expect(resolved.mode).toBe('dark'); // User override
    expect(resolved.accent).toBe('green'); // Store override
  });
});
```

### Component Tests

```typescript
// MyComponent.test.tsx

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/config/ThemeProvider';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should use semantic tokens', () => {
    const { container } = render(
      <ThemeProvider>
        <MyComponent />
      </ThemeProvider>
    );
    
    // Check that component uses semantic classes
    const element = container.querySelector('.bg-surface');
    expect(element).toBeInTheDocument();
    
    // Verify no base color utilities
    const wrongElement = container.querySelector('[class*="bg-slate"]');
    expect(wrongElement).not.toBeInTheDocument();
  });
});
```

## Linting and Enforcement

### ESLint Rule for Color Checking

```javascript
// frontend/scripts/check-hardcoded-colors.js

const fs = require('fs');
const path = require('path');

const ALLOWED_FILES = [
  'frontend/src/styles/tokens.css',
  'frontend/src/styles/themes.css',
  'frontend/tailwind.config.js',
];

const BASE_COLOR_PATTERN = /(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+/g;

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  const matches = content.matchAll(BASE_COLOR_PATTERN);
  for (const match of matches) {
    violations.push({
      file: filePath,
      color: match[0],
      line: content.substring(0, match.index).split('\n').length,
    });
  }
  
  return violations;
}

function scanDirectory(dir, violations = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, violations);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (!ALLOWED_FILES.includes(filePath)) {
        violations.push(...checkFile(filePath));
      }
    }
  }
  
  return violations;
}

const violations = scanDirectory('frontend/src');

if (violations.length > 0) {
  console.error('❌ Found hardcoded Tailwind base colors:');
  violations.forEach(v => {
    console.error(`  ${v.file}:${v.line} - ${v.color}`);
  });
  process.exit(1);
} else {
  console.log('✅ No hardcoded colors found');
}
```

### Package.json Script

```json
{
  "scripts": {
    "lint:colors": "node scripts/check-hardcoded-colors.js",
    "lint": "eslint . && npm run lint:colors"
  }
}
```

## Migration Guide

### Migrating Existing Components

**Step 1: Identify Violations**
```bash
npm run lint:colors
```

**Step 2: Replace Base Colors**
```tsx
// Before
<div className="bg-slate-100 text-slate-900 border-slate-300">

// After
<div className="bg-surface text-text-primary border-border-default">
```

**Step 3: Update Status Colors**
```tsx
// Before
<span className="text-green-600">Success</span>
<span className="text-red-600">Error</span>

// After
<span className="text-success-600">Success</span>
<span className="text-error-600">Error</span>
```

**Step 4: Remove Direct DOM Manipulation**
```tsx
// Before
function applyTheme(color: string) {
  document.documentElement.style.setProperty('--color-primary-500', color);
}

// After
import { ThemeEngine } from '@/theme/ThemeEngine';

function applyTheme(color: string) {
  const themeEngine = ThemeEngine.getInstance();
  themeEngine.saveThemePreference('user', {
    colors: { primary: { 500: color } },
  });
}
```

## Troubleshooting

### Theme Not Applying

**Problem**: Theme changes not visible

**Solutions:**
1. Check ThemeEngine is initialized
2. Verify theme is cached in localStorage
3. Check browser console for errors
4. Verify CSS variables are set on `:root`
5. Clear cache and reload

### Flash of Unstyled Content

**Problem**: Brief flash before theme applies

**Solutions:**
1. Ensure `bootTheme()` runs in `<head>`
2. Verify theme is cached in localStorage
3. Check theme loads before React renders
4. Minimize time between page load and theme application

### Colors Not Updating

**Problem**: Component colors don't change with theme

**Solutions:**
1. Verify component uses CSS variables, not hardcoded colors
2. Check component uses semantic tokens
3. Verify Tailwind config maps CSS variables correctly
4. Check for CSS specificity issues

## Best Practices Summary

### DO ✅

- Use semantic tokens (`bg-surface`, `text-primary`, etc.)
- Use ThemeEngine for all theme changes
- Reference CSS variables in CSS modules
- Test theme changes in both light and dark modes
- Cache theme in localStorage
- Validate theme locks before applying changes

### DON'T ❌

- Use Tailwind base color utilities (`slate-*`, `blue-*`, etc.)
- Manipulate DOM theme directly
- Hardcode hex/rgb/hsl colors outside `tokens.css`
- Create duplicate theme systems
- Bypass ThemeEngine for theme changes
- Ignore theme locks

## Related Documentation

- [Admin Configuration Guide](../admin-guides/configuration.md) - Theme configuration
- [Semantic Token Mapping](../theming/semantic-token-mapping.md) - Token reference
- [Theme Conflict Map](../../audit/THEME_CONFLICT_MAP.md) - Known issues
- [Global Rules](../../GLOBAL_RULES_EASYSALE.md) - Theming rules

## Support

For technical questions:
- GitHub Issues: https://github.com/easysale/easysale/issues
- Developer Forum: https://dev.easysale.com
- Email: dev@easysale.com

---

*Last updated: 2026-01-30*
*Version: 1.0*

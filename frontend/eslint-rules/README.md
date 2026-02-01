# Custom ESLint Rules

This directory contains custom ESLint rules for enforcing EasySale coding standards and best practices.

## Available Rules

### `no-tailwind-base-colors`

Prevents the use of Tailwind base color utilities in components, enforcing the use of semantic tokens from the theme system.

#### Rule Details

This rule aims to maintain consistency with the EasySale theme system by preventing direct use of Tailwind's base color utilities (e.g., `bg-blue-500`, `text-red-600`) in favor of semantic tokens (e.g., `bg-primary-500`, `text-error-600`).

**Why this rule exists:**

1. **Theme Consistency**: Ensures all colors come from the centralized theme system
2. **Maintainability**: Makes it easy to update colors across the entire application
3. **Branding**: Allows white-label customization without code changes
4. **Accessibility**: Semantic tokens can be optimized for contrast and readability

#### Examples

❌ **Incorrect** code for this rule:

```jsx
// Direct use of Tailwind base colors
<div className="bg-blue-500 text-white">
  <h1 className="text-red-600">Error</h1>
  <button className="border-green-400 hover:bg-green-500">
    Success
  </button>
</div>

// In template literals
<div className={`bg-slate-100 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
  Content
</div>

// In utility functions
<button className={clsx('bg-indigo-600', 'hover:bg-indigo-700')}>
  Click me
</button>
```

✅ **Correct** code for this rule:

```jsx
// Use semantic tokens
<div className="bg-primary-500 text-white">
  <h1 className="text-error-600">Error</h1>
  <button className="border-success-400 hover:bg-success-500">
    Success
  </button>
</div>

// In template literals
<div className={`bg-surface-100 ${isActive ? 'text-info-600' : 'text-surface-500'}`}>
  Content
</div>

// In utility functions
<button className={clsx('bg-primary-600', 'hover:bg-primary-700')}>
  Click me
</button>
```

#### Options

The rule accepts an options object with the following properties:

```js
{
  // Additional file patterns to exclude (regex strings)
  excludePatterns: [
    'src/legacy/',
    'src/examples/',
  ],
  
  // Enable/disable auto-fix (default: true)
  autoFix: true,
}
```

#### Configuration

##### Basic Configuration

Add the rule to your ESLint configuration:

```js
// eslint.config.js
import customRules from './eslint-rules/index.js';

export default [
  {
    plugins: {
      'custom': customRules,
    },
    rules: {
      'custom/no-tailwind-base-colors': 'error',
    },
  },
];
```

##### With Options

```js
export default [
  {
    plugins: {
      'custom': customRules,
    },
    rules: {
      'custom/no-tailwind-base-colors': [
        'error',
        {
          excludePatterns: [
            'src/legacy/',
            'src/examples/',
          ],
          autoFix: true,
        },
      ],
    },
  },
];
```

##### Disable for Specific Files

```js
export default [
  {
    files: ['src/theme/**/*.{ts,tsx}'],
    rules: {
      'custom/no-tailwind-base-colors': 'off',
    },
  },
];
```

#### Auto-Fix

This rule supports auto-fix! When you run ESLint with the `--fix` flag, it will automatically replace base color utilities with semantic alternatives:

```bash
# Fix all files
npm run lint:fix

# Fix specific file
npx eslint --fix src/components/Button.tsx
```

**Auto-fix mapping:**

| Base Color | Semantic Token |
|------------|----------------|
| `red-*` | `error-*` |
| `green-*` | `success-*` |
| `yellow-*`, `amber-*`, `orange-*` | `warning-*` |
| `blue-*` | `info-*` |
| `slate-*`, `gray-*`, `zinc-*`, `neutral-*`, `stone-*` | `surface-*` |
| `indigo-*`, `violet-*`, `purple-*` | `primary-*` |
| `sky-*`, `cyan-*`, `teal-*` | `accent-*` |

**Note:** Auto-fix provides sensible defaults, but you may need to manually adjust some replacements based on context.

#### Excluded Files

The rule automatically excludes the following files:

- **Theme system files**: `styles/tokens.css`, `styles/themes.css`, `theme/ThemeEngine.ts`, `config/themeBridge.ts`, `auth/theme/**`
- **Test files**: `*.test.{ts,tsx}`, `*.spec.{ts,tsx}`, `__tests__/**`
- **Storybook files**: `*.stories.{ts,tsx}`
- **Legacy code**: `legacy_quarantine/**`, `archive/**`
- **Config files**: `*.config.{ts,js}`, `tailwind.config.*`

#### Semantic Token Reference

EasySale uses the following semantic token categories:

##### Status Colors
- `error-*` - Error states (red)
- `success-*` - Success states (green)
- `warning-*` - Warning states (yellow/amber/orange)
- `info-*` - Informational states (blue)

##### Brand Colors
- `primary-*` - Primary brand color
- `accent-*` - Accent/secondary brand color

##### Surface Colors
- `surface-*` - Backgrounds, borders, dividers
- `text-*` - Text colors (primary, secondary, muted)

##### Shades
All semantic tokens support the same shade scale as Tailwind:
- `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`

##### Usage Examples

```jsx
// Status colors
<div className="bg-error-50 text-error-700 border-error-200">Error message</div>
<div className="bg-success-50 text-success-700 border-success-200">Success message</div>
<div className="bg-warning-50 text-warning-700 border-warning-200">Warning message</div>
<div className="bg-info-50 text-info-700 border-info-200">Info message</div>

// Brand colors
<button className="bg-primary-600 hover:bg-primary-700 text-white">
  Primary Action
</button>
<button className="bg-accent-600 hover:bg-accent-700 text-white">
  Secondary Action
</button>

// Surface colors
<div className="bg-surface-50 border-surface-200">
  <p className="text-text-primary">Primary text</p>
  <p className="text-text-secondary">Secondary text</p>
  <p className="text-text-muted">Muted text</p>
</div>
```

#### Integration with CI/CD

Add the rule to your CI/CD pipeline to prevent violations from being merged:

```yaml
# .github/workflows/ci.yml
- name: Lint
  run: |
    npm run lint
    npm run lint:colors
```

```json
// package.json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "lint:colors": "node scripts/check-hardcoded-colors.js"
  }
}
```

#### Troubleshooting

##### False Positives

If the rule incorrectly flags a legitimate use case:

1. **Add to exclude patterns** in the rule options
2. **Disable for specific line**:
   ```jsx
   // eslint-disable-next-line custom/no-tailwind-base-colors
   <div className="bg-blue-500">Special case</div>
   ```
3. **Disable for file**:
   ```jsx
   /* eslint-disable custom/no-tailwind-base-colors */
   ```

##### Auto-Fix Issues

If auto-fix produces incorrect results:

1. **Disable auto-fix** in options: `autoFix: false`
2. **Manually fix** the violations
3. **Report the issue** with examples for improvement

##### Performance

For large codebases, you may want to:

1. **Run on changed files only** in pre-commit hooks
2. **Cache ESLint results** in CI/CD
3. **Exclude large directories** that don't need checking

#### Related Rules

- `react/forbid-component-props` - Prevents inline styles
- `react/forbid-dom-props` - Prevents inline styles on DOM elements

#### Further Reading

- [EasySale Theme System Documentation](../../docs/theming/semantic-tokens.md)
- [GLOBAL_RULES_EASYSALE.md](../../GLOBAL_RULES_EASYSALE.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Contributing

To add a new custom rule:

1. Create a new file in `eslint-rules/` (e.g., `my-rule.js`)
2. Export the rule following ESLint's rule structure
3. Add the rule to `index.js`
4. Document the rule in this README
5. Add tests for the rule
6. Update ESLint configuration to use the rule

### Rule Structure

```js
export default {
  meta: {
    type: 'problem', // or 'suggestion', 'layout'
    docs: {
      description: 'Rule description',
      category: 'Best Practices',
      recommended: true,
      url: 'https://docs.example.com/rule',
    },
    fixable: 'code', // or 'whitespace', or omit if not fixable
    schema: [], // Options schema
    messages: {
      messageId: 'Error message with {{placeholder}}',
    },
  },
  
  create(context) {
    return {
      // AST node visitors
      JSXAttribute(node) {
        // Rule logic
        context.report({
          node,
          messageId: 'messageId',
          data: { placeholder: 'value' },
          fix: (fixer) => fixer.replaceText(node, 'newText'),
        });
      },
    };
  },
};
```

## License

MIT

# Pre-Commit Hooks

This document describes the pre-commit hooks configured for the EasySale project and how to use them.

## Overview

Pre-commit hooks automatically run checks before code is committed to ensure code quality and consistency. The hooks are managed by [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged).

## What Gets Checked

### Frontend (TypeScript/React)

For all staged `.ts` and `.tsx` files:

1. **ESLint** - Lints code and enforces coding standards
   - Includes custom `no-tailwind-base-colors` rule
   - Auto-fixes violations when possible
   - Prevents hardcoded Tailwind base colors (e.g., `bg-blue-500`)
   - Enforces semantic tokens (e.g., `bg-primary-500`)

2. **Prettier** - Formats code consistently
   - Auto-formats all staged files

For all staged `.css` files:

1. **Stylelint** - Lints CSS files
   - Auto-fixes violations when possible

2. **Prettier** - Formats CSS consistently

For all staged `.json` and `.md` files:

1. **Prettier** - Formats files consistently

## How It Works

1. You stage files with `git add`
2. You attempt to commit with `git commit`
3. Husky intercepts the commit
4. lint-staged runs configured tools on staged files only
5. If all checks pass, the commit proceeds
6. If any check fails, the commit is blocked

## Configuration Files

- **`.husky/pre-commit`** - The pre-commit hook script
- **`frontend/package.json`** - Contains `lint-staged` configuration
- **`frontend/eslint.config.js`** - ESLint configuration with custom rules

## Custom ESLint Rule: no-tailwind-base-colors

This custom rule enforces the EasySale theming system by preventing the use of Tailwind base color utilities.

### What It Catches

❌ **Violations:**
```tsx
<div className="bg-blue-500 text-red-600">
<p className="text-green-700">
```

✅ **Correct:**
```tsx
<div className="bg-primary-500 text-error-600">
<p className="text-success-700">
```

### Auto-Fix

The rule automatically fixes violations by replacing base colors with semantic tokens:

- `bg-blue-*` → `bg-info-*`
- `text-red-*` → `text-error-*`
- `text-green-*` → `text-success-*`
- `text-yellow-*` → `text-warning-*`
- `bg-slate-*` → `bg-surface-*`
- And more...

See `frontend/eslint-rules/no-tailwind-base-colors.js` for the complete mapping.

## Bypassing the Hook

In rare cases where you need to bypass the pre-commit hook (e.g., work-in-progress commits), use:

```bash
git commit --no-verify -m "WIP: incomplete feature"
```

⚠️ **Warning:** Only use `--no-verify` when absolutely necessary. The checks exist to maintain code quality.

## Troubleshooting

### Hook Not Running

If the pre-commit hook doesn't run:

1. Check that the hooks path is configured:
   ```bash
   git config core.hooksPath
   # Should output: .husky
   ```

2. If not set, configure it:
   ```bash
   git config --local core.hooksPath .husky
   ```

3. Ensure Husky is installed:
   ```bash
   cd frontend
   npm run prepare
   ```

### ESLint Errors

If ESLint reports errors:

1. Review the error messages
2. Fix the violations manually, or
3. Run ESLint with auto-fix:
   ```bash
   cd frontend
   npm run lint:fix
   ```

### Lint-Staged Fails

If lint-staged fails:

1. Check the error output
2. Fix the issues in the affected files
3. Re-stage the files: `git add <files>`
4. Try committing again

## Manual Checks

You can run the checks manually without committing:

```bash
# Run ESLint on all files
cd frontend
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Run Prettier check
npm run format:check

# Run Prettier with auto-fix
npm run format

# Run all linting
npm run lint:all
```

## CI/CD Integration

The same checks run in the CI/CD pipeline to ensure code quality even if pre-commit hooks are bypassed.

## Adding New Checks

To add new checks to the pre-commit hook:

1. Update `frontend/package.json` in the `lint-staged` section:
   ```json
   "lint-staged": {
     "*.{ts,tsx}": [
       "eslint --fix",
       "prettier --write",
       "your-new-tool"
     ]
   }
   ```

2. Test the hook:
   ```bash
   # Stage a test file
   git add frontend/src/test.tsx
   
   # Try to commit
   git commit -m "Test new hook"
   ```

## Best Practices

1. **Commit frequently** - Small, focused commits are easier to review
2. **Fix violations immediately** - Don't bypass the hook unless necessary
3. **Use auto-fix** - Let the tools fix formatting issues automatically
4. **Review changes** - Check what auto-fix changed before committing
5. **Keep hooks fast** - Only check staged files, not the entire codebase

## Related Documentation

- [ESLint Configuration](../theming/eslint-color-rule.md)
- [Theme System](../theming/theme-system.md)
- [Semantic Tokens](../theming/semantic-token-mapping.md)
- [GLOBAL_RULES_EASYSALE.md](../../GLOBAL_RULES_EASYSALE.md)

## Support

If you encounter issues with the pre-commit hooks:

1. Check this documentation
2. Review the error messages carefully
3. Try the troubleshooting steps
4. Ask the team for help if needed

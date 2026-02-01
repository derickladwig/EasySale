# Pre-Commit Hooks - Quick Reference

## What Happens When You Commit

Every time you run `git commit`, the following checks run automatically on your **staged files only**:

### ✅ Checks That Run

1. **ESLint** - Catches code quality issues and theme violations
2. **Prettier** - Formats code consistently
3. **Stylelint** - Lints CSS files (for `.css` files)

### 🎯 Theme Enforcement

The custom `no-tailwind-base-colors` ESLint rule prevents hardcoded Tailwind colors:

❌ **Blocked:**

```tsx
<div className="bg-blue-500 text-red-600">
```

✅ **Allowed (auto-fixed):**

```tsx
<div className="bg-info-500 text-error-600">
```

## Quick Commands

```bash
# Run checks manually
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
npm run format            # Format all files
npm run lint:all          # Run all checks

# Bypass hook (use sparingly!)
git commit --no-verify -m "WIP"
```

## Troubleshooting

### Hook not running?

```bash
git config --local core.hooksPath .husky
cd frontend && npm run prepare
```

### Commit blocked?

1. Read the error message
2. Run `npm run lint:fix` to auto-fix
3. Review and stage the changes
4. Commit again

## More Info

See [docs/development/pre-commit-hooks.md](../docs/development/pre-commit-hooks.md) for complete documentation.

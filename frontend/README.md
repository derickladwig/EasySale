# Frontend - EasySale

React + TypeScript + Vite application for the EasySale user interface.

## Structure

- `src/features/`: Feature modules (sell, lookup, inventory, customers, reporting, admin)
- `src/common/`: Shared components, layouts, contexts, utilities
- `src/domains/`: Business logic modules (cart, pricing, stock, auth, documents)
- `src/assets/`: Static assets (images, icons, styles)

### Module Boundaries

The codebase enforces strict module boundaries through ESLint rules:

- **Features** cannot import from other features (use `domains/` or `common/` instead)
- **Domains** cannot import from features (keep business logic independent)
- **Common** cannot import from features or domains (keep utilities generic)

See [Module Boundaries Quick Reference](../docs/MODULE_BOUNDARIES_QUICK_REFERENCE.md) for details.

## Development

```bash
npm install      # Install dependencies
npm run dev      # Start development server
npm run build    # Build for production
npm test         # Run tests
npm run lint     # Run linter (includes module boundary checks)
npm run verify:no-mocks  # Verify no mock data remains
```

### Mock Data Verification

The `verify:no-mocks` script ensures no hardcoded mock data arrays remain in production code. It checks for:
- Mock identifiers (e.g., `mockInventory`, `mockProducts`)
- Large inline array literals (>10 lines) with "mock" in variable names

Run this before committing changes to components that previously contained mock data. See the main README.md for CI/CD integration details.

## Configuration

- `vite.config.ts`: Vite configuration
- `tsconfig.json`: TypeScript configuration
- `tailwind.config.js`: Tailwind CSS configuration (to be created)

See root README.md for complete setup instructions.

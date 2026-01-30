# Security Exceptions Registry

This document tracks known security vulnerabilities that have been reviewed and accepted with justification.

## Policy

- **High/Critical in production deps**: MUST be fixed immediately or have documented exception with expiration
- **Moderate in production deps**: Should be fixed within 30 days
- **Low in production deps**: Track and fix in next maintenance window
- **Dev dependencies**: Informational only, fix when convenient

## Active Exceptions

| Package | Severity | CVE | Justification | Expiration | Owner |
|---------|----------|-----|---------------|------------|-------|
| *None currently* | - | - | - | - | - |

## Resolved Exceptions

| Package | Severity | CVE | Resolution | Date |
|---------|----------|-----|------------|------|
| *None yet* | - | - | - | - |

## How to Add an Exception

1. Verify the vulnerability is not exploitable in our context
2. Document the justification clearly
3. Set an expiration date (max 90 days)
4. Assign an owner responsible for tracking
5. Create a tracking issue

## Audit Commands

```bash
# Check production dependencies (blocking in CI)
npm audit --omit=dev --audit-level=high

# Check all dependencies (informational)
npm audit --audit-level=moderate

# Apply safe fixes
npm audit fix

# Force fixes (use with caution, may break things)
npm audit fix --force
```

## CI Integration

The CI pipeline enforces:
- `npm ci` (lockfile enforcement)
- `npm audit --omit=dev --audit-level=high` (production deps, blocking)
- `npm audit --audit-level=moderate` (all deps, informational)

See `.github/workflows/ci.yml` for implementation.

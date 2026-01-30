## Archive Policy (Code + Docs)

### Purpose

This repository uses `archive/` to preserve historical artifacts **without deleting** them, while keeping active code and current documentation easy to navigate.

### What goes into `archive/`

- **Historical docs**: older status reports, deprecated guides, audits (existing subfolders).
- **Quarantined code**: code that is proven unreachable or legacy, placed under `archive/code/`.

### Non-negotiables for quarantining code

- **No deletion**: only move/quarantine.
- **Evidence required**:
  - For “truly dead” code, provide evidence that it is:
    - not referenced
    - not dynamically imported
    - not mounted in frontend routes
    - not registered in backend routers
- **Mapping required**:
  - Every move must be recorded as `OldPath -> NewPath` in `audit/CHANGELOG_AUDIT.md`.
- **Minimal refactors**:
  - Prefer moving code + documenting wiring tasks over rewriting.

### Folder conventions

- `archive/code/...`: quarantined code preserving original path structure.
  - Example: `frontend/src/pages/examples/Foo.tsx` → `archive/code/frontend/src/pages/examples/Foo.tsx`

### Stop conditions

Do **not** quarantine if any of the following are true:
- the code is referenced by production code
- the code is reachable via routes/handlers/config registries
- the code is referenced by build scripts or tests in a way that would break builds

reporting.rs -> archive/code/reporting_handler_pre_sql_fix.rs
user_handlers.rs -> archive/code/user_handlers_pre_password_fix.rs
main.rs -> archive/code/main_pre_cors_fix.rs
profile.rs -> archive/code/profile_pre_oauth_fix.rs
RolesTab.tsx -> archive/code/RolesTab_pre_api_integration.tsx
UsersRolesPage.tsx -> archive/code/frontend/unused-pages/UsersRolesPage.tsx
components/review/ -> archive/code/frontend/unused-components-review/ [RESTORED - STILL IN USE]
components/design-system/ -> archive/code/frontend/unused-components-design-system/

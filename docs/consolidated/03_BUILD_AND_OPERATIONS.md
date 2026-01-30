# Build & Operations (Consolidated)

This is the **one place** to look for “how do I run it / build it / ship it”.

> Naming note: docs may say **EasySale** or **CAPS POS**. This canon uses **FlexiPOS**.

---

## Quick start (Windows, Docker)

From repo root:

```bat
copy .env.example .env
start-dev.bat
```

Expected URLs:
- Frontend: `http://localhost:7945`
- Backend API: `http://localhost:8923`
- Health: `http://localhost:8923/health`

Primary reference: [spec/INSTALL.md](spec/INSTALL.md).

---

## Script entrypoints (what to run)

These scripts are intended to be the “single source of truth” for local ops:

- **Dev**
  - `start-dev.bat` / `stop-dev.bat`
  - `build-dev.bat`
  - `update-dev.bat`

- **Prod**
  - `build-prod.bat` (supports **variants**)
  - `start-prod.bat` / `stop-prod.bat`
  - `update-prod.bat`

- **Utility**
  - `docker-clean.bat` (full reset)
  - `validate-build.sh` (cross-platform validation helper)

See: [spec/AUTOMATION_SCRIPTS.md](spec/AUTOMATION_SCRIPTS.md).

---

## Build variants (lite / export / full)

Production builds support variant selection (example):

```bat
build-prod.bat --lite
build-prod.bat --export
build-prod.bat --full
```

When you add new “heavy” capabilities, they must be **feature-gated** so lite stays small.  
Evidence and guardrails: [Split build architecture complete (2026-01-29)](blog/2026-01-29-split-build-architecture-complete.md).

---

## Environment configuration

### Files
- `.env` — local runtime config (not committed)
- `.env.example` — safe template

### What you should customize in `.env`
At minimum:
- `TENANT_ID`, `STORE_ID`
- `JWT_SECRET` (generate a strong value)
- `DATABASE_PATH` (and ensure `data/` exists)
- Integration credentials (if used): Woo/QBO keys, encryption key, redirect URI, etc.

Design principle: **local-only config** should live under `runtime/` (gitignored) when it’s machine/station-specific.  
See: [system_patterns.md](memory-bank/system_patterns.md).

---

## LAN / station identity (recommended approach)

For LAN access and station identity without hardcoding:
- Keep the shipped defaults at **localhost-only** (safe by default).
- Add a *runtime* config/override file in `runtime/` (gitignored) that declares:
  - bind address (0.0.0.0 vs 127.0.0.1),
  - station identifier (stable UUID),
  - optional “advertised URL” for UI links.

This matches the “safe defaults + local-only overrides” pattern in [system_patterns.md](memory-bank/system_patterns.md).

---

## Common “submission readiness” checks

- Ensure `.env` is not committed (secrets)
- Ensure `node_modules/` is not committed
- Ensure `.kiro/` is committed (required by submission)
- Ensure `README.md` uses your real GitHub URL + correct setup steps
- Ensure the demo flow is reproducible with **one command** (ideally `start-dev.bat`)

---

## Troubleshooting (high-signal)

- **npm audit fix fails with ENOLOCK**: you need a lockfile (`package-lock.json`) and should prefer `npm ci` in CI/production.  
- **Port already in use**: stop existing containers (`stop-dev.bat` / `docker-stop.bat`) then retry.
- **Docker is “stale”**: use `docker-clean.bat` for a clean slate.


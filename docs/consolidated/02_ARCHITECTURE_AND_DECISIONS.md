# Architecture & Decisions (Consolidated)

This document captures the **intended architecture** (spec) and the **evidence-backed implementation shape** (audit/blog), without repeating hundreds of pages.

> Naming note: the repo documentation uses **FlexiPOS**, **EasySale**, and **CAPS POS** interchangeably.  
> In this canonical set, **FlexiPOS** is the product name; the others are historical codenames.

---

## System at a glance

FlexiPOS is an **offline-first POS** built as:

- **Frontend**: React + Vite + TypeScript (touch-friendly, role-based screens)
- **Backend**: Rust + Actix-web REST API
- **Local data**: SQLite (WAL mode) with sync/event patterns
- **Deployment**: Docker-first dev/prod workflows (plus native dev)

Ports (as documented in spec):
- Frontend dev: **7945**
- Backend API: **8923**
- Prod frontend: **80** (via nginx)  

Primary reference: [spec/design.md](spec/design.md).

---

## Build variants (lite / export / full)

A core design decision is to support **smaller “lite” installs** that do not ship heavy document/OCR dependencies, while keeping a full build for complete capability.

| Variant | Intended scope | Typical inclusions |
|---|---|---|
| **lite** | core POS only | sales, lookup, inventory, customers, settings |
| **export** | lite + exports | CSV export packs, batch export tooling |
| **full** | export + docs/OCR | document center, OCR pipeline, document cleanup |

Evidence: [Split build architecture complete (2026-01-29)](blog/2026-01-29-split-build-architecture-complete.md).

---

## Backend workspace shape (crates + features)

Spec describes a workspace with a **server crate** plus core domain/storage crates and optional packs, with Cargo features controlling inclusion:

- server (main API)
- pos_core_domain / pos_core_models / pos_core_storage
- accounting_snapshots / export_batches
- capabilities
- optional: csv_export_pack

See: [Design spec — workspace & feature list](spec/design.md).

---

## Settings & configuration hierarchy

Key principle: settings have **scope**, and scope determines storage + override behavior.

Spec hierarchy (highest → lowest):
1. `.env` runtime overrides  
2. `configs/private/{tenant_id}.json` (tenant)  
3. `configs/default.json`  
4. `configs/schema.json` (validation)

Settings categories are split by scope (tenant / store / user), including: company info, store info, tax rules, user prefs, theme, hardware, integrations, feature flags.

See: [Design spec — Settings Scopes](spec/design.md) and [system_patterns.md](memory-bank/system_patterns.md).

---

## Theming model

The theme system is structured around:
- a theme payload (mode + semantic colors + branding),
- a ThemeProvider that loads theme from API,
- CSS variables applied on `:root` / `[data-theme="dark"]`.

See: [Design spec — Theming System](spec/design.md).

---

## Integrations

Spec + late-stage truth-sync work point to two major integrations:

- **QuickBooks Online (QBO)**: OAuth flow, token storage, export/sync
- **WooCommerce**: REST API, product sync, order import

See: [Design spec — Integrations](spec/design.md) and [WooCommerce + QBO integration truth-sync (2026-01-29)](blog/2026-01-29-woo-qbo-integration-truth-sync-complete.md).

---

## Document center / OCR / document-cleanup

The “full” variant includes document-heavy workflows:
- document ingestion and review,
- OCR extraction,
- “document cleanup engine” capability.

Evidence:
- [Document cleanup engine complete (2026-01-29)](blog/2026-01-29-document-cleanup-engine-complete.md)
- [E2E wiring spec (OCR/Document Center/Template blocker)](audit/e2e/spec.md)
- [E2E wiring plan (OCR/Document Center/Template blocker)](audit/e2e/plan.md)

---

## Explicit ADRs (kept small, on purpose)

- [ADR-001: Memory bank system](memory-bank/adr/001-memory-bank-system.md) — establishes how context, decisions, and docs persist.
- [ADR-002: POS project choice](memory-bank/adr/002-pos-system-project-choice.md) — commits to building a POS system for the target retail workflow.

---

## “Hidden” decisions that matter (consolidated)

These are repeated throughout docs/audits/blogs, but weren’t formalized as ADRs:

- **Docs are the source of truth** (not chat): memory-bank + audit truth-sync process.
- **Runtime local-only config** should live in `runtime/` and be gitignored (safety + per-station config).
- **Port standardization**: consistent 7945/8923 across scripts and docs.
- **Feature gating** is enforced via build scripts + CI to prevent “feature drift”.

Primary sources:
- [system_patterns.md](memory-bank/system_patterns.md)
- [Port configuration standardization (2026-01-09)](blog/2026-01-09-port-configuration-standardization.md)
- [Split build architecture complete (2026-01-29)](blog/2026-01-29-split-build-architecture-complete.md)


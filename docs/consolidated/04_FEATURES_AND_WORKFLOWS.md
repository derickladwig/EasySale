# Features & Workflows (Consolidated)

This document is the **high-level product guide**: what modules exist, what workflows look like, and where deeper docs live.

Primary references:
- [Requirements spec](spec/req.md)
- [Quick start guide](docs/user-guides/quick-start.md)
- [OCR review guide (full build)](docs/user-guides/ocr_review_guide.md)  

---

## Product scope (what FlexiPOS is)

FlexiPOS is a **white-label, multi-tenant POS** intended to run reliably in-store (offline-first) and sync when online.

Key pillars (per requirements):
- Role-based UI (cashier → admin)
- Fast checkout + product lookup
- Inventory receiving + stock tracking
- Customer management + purchase history
- Configurable settings (tenant/store/user scopes)
- Optional document/OCR ingestion (full build)

---

## Module map (high-signal)

| Module | Typical users | Purpose | Build variants |
|---|---|---|---|
| **Sell / POS** | Cashier, Manager | checkout, returns, payments, receipts | lite / export / full |
| **Lookup** | Cashier, Parts/Inventory | fast product search, details | lite / export / full |
| **Inventory/Warehouse** | Inventory staff | receiving, adjustments, transfers, counts | lite / export / full |
| **Customers** | Sales staff | profiles, history, pricing/tiers | lite / export / full |
| **Reports/Analytics** | Managers | sales + inventory + customer reports | export / full (varies) |
| **Settings / Setup Wizard** | Managers/Admin | tenant/store setup, tax, integrations, theme | lite / export / full |
| **Document Center / OCR Review** | Admin/Backoffice | invoice ingestion, extraction, approval | **full** |

---

## Core workflows (compressed)

### 1) Login → role-based navigation
- users authenticate (JWT session)
- UI shows permitted modules
- user prefs + theme load at startup

See: [Quick start](docs/user-guides/quick-start.md).

### 2) Sale / checkout
Typical loop:
1. Search/scan item
2. Add to cart, adjust qty/discount
3. Choose customer (optional)
4. Take payment
5. Print/emit receipt
6. Persist transaction locally (offline-safe)

See: [Quick start — Processing a sale](docs/user-guides/quick-start.md).

### 3) Inventory receiving / stock changes
Typical loop:
1. Receive shipment / invoice
2. Match items to catalog
3. Adjust on-hand counts
4. Record costs / vendor context
5. Sync to other stores when online

See: [Quick start — Receiving stock](docs/user-guides/quick-start.md).

### 4) Settings (tenant/store/user scopes)
- tenant: company info, tax rules, integrations, feature flags
- store: location info, hardware
- user: theme, preferences

See: [Design spec — Settings Scopes](spec/design.md).

### 5) Documents & OCR review (full build)
High-level flow:
1. Upload invoice PDF
2. OCR + extraction runs
3. Cases land in a **review queue**
4. Guided or Power review mode
5. Approve → downstream actions (inventory import / accounting export)

See: [OCR Review User Guide](docs/user-guides/ocr_review_guide.md)  
and wiring plan/spec: [audit/e2e/spec.md](audit/e2e/spec.md) / [audit/e2e/plan.md](audit/e2e/plan.md).

---

## API surface (where to look)

API docs are split across:
- [docs/api/README.md](docs/api/README.md) (structured API docs)
- [audit/API_WIRING_MATRIX.md](audit/API_WIRING_MATRIX.md) (backend/frontend parity matrix)

If you’re trying to answer “is this endpoint real, and is the UI wired?” start with the wiring matrix.


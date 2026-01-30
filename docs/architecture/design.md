# Configurable POS Design (system rules + implementation guidance)

This file defines the **deterministic rules** that make the POS configurable without becoming chaotic. For rollout/goals see `plan.md`; for implementation backlog see `task.md`.

## Glossary (unified terms)

- **DetailRail**: right-side rail with details + actions for the selected entity.
- **ListDetailLayout**: list/table left, DetailRail right.
- **FocusManager**: scan/focus router that decides where scan input goes.
- **ScanReadyIndicator**: visible indicator of scan state/target.
- **PresetPack**: named bundle of settings + optional feature flags applied at a scope.
- **Policy**: enforced constraint (discount limits, approvals) that may lock preferences.
- **Preference**: user-tunable UX choice (density, theme) unless locked by policy.

## Design principles

- **Preset-first customization**: users start from a preset pack; deviations are explicit and reviewable.
- **Policy vs preference separation**:
  - Preferences (density, theme, default tab) are user-scoped.
  - Policies (discount limits, refund approvals) are role/store-scoped and audited.
- **Deterministic scan & focus rules**: always consistent per station profile.
- **Progressive disclosure** controlled by state + config: show tender only when ready; show manager-only data only when allowed.
- **Effective value transparency**: every setting shows its active value and override source.

## Configuration architecture (implementable in React/TS)

### Resolution precedence (highest → lowest)

**Station > User > Role > Store > Global**

### Policy vs preference conflict rule (deterministic)

1. Resolve the raw value via precedence.
2. If the key is a **Preference** and a higher-level **Policy lock** applies, the effective value becomes the policy value.
3. UI must show:
   - effective value
   - source (scope + id)
   - lock state + reason (when a preference is overridden/locked by policy)

### SettingsRegistry schema (recommended)

Each setting entry should be a typed record like:

```json
{
  "key": "ui.density",
  "type": "enum",
  "policyOrPreference": "preference",
  "default": "comfortable",
  "allowedScopes": ["user", "role", "station", "store", "global"],
  "validation": { "enum": ["comfortable", "compact"] },
  "visibility": { "roles": ["cashier", "manager", "warehouse"] },
  "ui": { "label": "Density", "group": "UI", "description": "Row density for lists and tables" },
  "telemetry": { "tags": ["density"] }
}
```

Notes:
- `allowedScopes` prevents accidentally allowing unsafe overrides (ex: discount limits should not be user-scoped).
- `policyOrPreference` enables consistent lock behavior and UI display.

### Preset packs

A preset is a named bundle of settings + optional feature flags, for example:

- **Counter Classic**: Sell landing enabled, list-mode default, stronger confirmations for overrides.
- **Counter Compact**: density=compact, stronger focus cues, minimized side panels.
- **Warehouse Scan**: receiving tab default, inline actions visible.
- **Manager Ops**: dashboard landing, approvals queue, margin-visible drilldowns (role gated).

Presets must be:
- **diffable** (what changed from preset)
- **resettable** (reset user prefs; reset station overrides; reset store to preset)
- **audited** when policies change

## Design system (lightweight but specific)

### Layout and spacing

Use **ListDetailLayout** wherever possible:
- Left: list/table
- Right: DetailRail with actions

DetailRail is configurable:
- on/off
- width (narrow/standard/wide)
- sections (stock/alternates/history) toggled by role

### Typography rules (glare-ready)

- Critical numbers (totals, change due, AR balance) use larger scale and tabular numerals.
- Never rely on thin borders for structure; use surface contrast + spacing.

### Status + badges (consistent)

- Stock: In Stock / Low / Out / Backorder
- Customer: AR / Terms / Tax Exempt / Notes
- Sale: Held / Pending / Completed / Voided

Badges must be readable in glare mode and must not rely on color alone.

## Deterministic scan & focus rules

### Scanner profile (station-scoped)

Station defines:
- prefix/suffix behavior
- whether Enter is appended
- debounce window / “burst” handling (common scanner behavior)

### FocusManager rules (Sell/Warehouse)

Rules are strict and visible:

1. **ScanReadyIndicator is always on** in Sell/Warehouse.
2. A scan is either:
   - routed to an explicit scan target, or
   - rejected/ignored with a visible reason (only if configured)
3. If a modal is open, the scan routes to:
   - modal-designated scan field, or
   - the global scan target if the modal is non-blocking, or
   - ignored with visible reason (configurable per modal type)
4. If the user is editing a line item (qty/discount/price):
   - scan does not corrupt the edit field
   - scan either queues or routes to the scan target (configurable), but must not silently disappear

## Minimum API contracts (to unblock UI work)

These are the minimum backend contracts needed for the UI goals (shape, not implementation):

### Tax rules (store-scoped)

- List: `GET /api/settings/tax-rules?store_id=...`
- CRUD: create/update/delete rules
- Each rule: `id`, `store_id`, `name`, `rate`, `is_default`, `category?`, `effective_from?`, `effective_to?`

### Alerts (store-scoped + persistence)

- List: `GET /api/alerts?store_id=...`
- Actions: ack/snooze + timestamp + actor
- Fields: `id`, `severity`, `title`, `message`, `created_at`, `ack_state`, `actions[]`

### Inventory + receiving

- Inventory list includes: `quantity_on_hand`, `reorder_point`, `location?`, `last_received?`
- Receiving endpoints support a scan-staging workflow (create session, add scanned items, commit, audit log)

### Customers (counter-critical summary)

- List includes: phone, AR balance, terms, tax flags, notes badge/summary

## Screen-by-screen upgraded specs (configurable)

### Image 1 — Dashboard

Configurable:
- default landing per role (cashier: Sell, manager: Dashboard)
- which panels appear (alerts, approvals, held sales, pending receiving, cash drawer)
- KPI cards shown (revenue, transactions, avg, items)

Hard rules:
- Primary CTA for cashiers is always “New Sale” when Dashboard is visible.
- Alerts must be actionable (open item, create task, snooze, acknowledge).

### Image 2 — Sell

Configurable:
- results view default: list vs grid
- DetailRail sections: customer always, cart always, tender conditional
- tender methods visible (cash/card/other) per store/station
- confirmation thresholds (discount, price override, below cost) per store/role

Hard rules:
- FocusManager + ScanReadyIndicator is always on in Sell.
- Tender is not actionable until cart contains items and validations pass.
- Tax display is store-configured and explicit (GST/PST etc), never hard-coded.

Cart row interaction (standard):
- Up/down selects line
- Q qty, D discount, P price (role gated), Del remove
- Inline validation shows warning badges (avoid modal spam)

### Image 3 — Product Lookup

Configurable:
- DetailRail sections: alternates, fitment, history (on/off per role)
- quick filters per store (brand, category, in-stock)

Hard rules:
- Selecting a product must populate the DetailRail; empty right pane is not allowed.

### Image 4 — Warehouse

Configurable:
- inline row actions enabled per role (warehouse vs manager)
- columns shown (min/max, bin, vendor, last received)
- receiving mode default tab

Hard rules:
- Scan target is always explicit (indicator + focused input).
- “Below Min” is filterable and readable.

### Image 5 — Customers

Configurable:
- visible list metadata (choose 3–5 fields: phone, AR, terms, tags, notes)
- warnings/notes acknowledgement required (on/off, threshold)
- quick actions in DetailRail

Hard rules:
- Customer list exposes counter-critical data at a glance (AR/terms/tax/notes at minimum).

### Image 6 — Reports

Configurable:
- default time range per role
- which KPIs show
- drilldowns enabled per role (margin manager-only)

Hard rules:
- Every KPI card and top list must have a drilldown route (no dead-end analytics).

### Image 7 — Settings

Configurable:
- settings available per role (cashier sees preferences only)
- advanced sections behind admin toggle

Hard rules:
- Settings are searchable.
- Each setting shows effective value + override source and has a reset-to-preset option.

## Operational governance (so customization stays safe)

- **Change auditing**: store/role policy changes logged (who/when/what).
- **Config export/import**: presets and overrides exportable for multi-store rollout.
- **Reset paths**: reset user prefs → reset station overrides → reset store to preset.
- **Debug view**: “why does this look/behave this way?” shows effective config stack.

---

## [2026-01-25] Design Truth Sync — Architecture/Flows/Constraints Updated (Insert-Only)

This addendum records durable design/constraint truths discovered during a repo-wide truth sync. It does **not** delete or rewrite earlier design guidance.

### Clarified doc roles (current)
- `plan.md`: **product/rollout spec** (goals + measurement + rollout strategy)
- `task.md`: **engineering backlog** (epics/stories/tasks)
- `design.md` (this file): **deterministic rules + implementable guidance**

### Preserved constraints / policies
- **NO DELETES / insert-only history preservation**: quarantine by moving + mapping only (Source: `archive/ARCHIVE_POLICY.md`).
- **Evidence-first reconciliation**: when docs disagree, record both and point to evidence (Sources: `audit/PRODUCTION_READINESS_GAPS.md`, `audit/DOCS_VS_CODE_MATRIX.md`, `PROD_READINESS_INFO_PACK.md`, and `audit/truth_sync_2026-01-25/*`).


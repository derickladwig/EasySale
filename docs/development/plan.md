# POS UX + Workflow Plan (goals, rollout, measurement)

This file is the **product/rollout spec** (what + why + how we prove it). The implementable system rules live in `design.md`, and the backlog lives in `task.md`.

## Goals (measurable)

- **Throughput**: Reduce median **start_sale → tender_complete** time for a typical 5‑item ticket by **25–40%** (scanner + keyboard).
- **Determinism**: **99%+** of scans in **Sell/Warehouse** route to the intended target without refocus (**no “why didn’t it add?”** moments).
- **Error reduction**: Reduce price/qty/tax mistakes by **30%** using inline validation + clearer state + guardrails.
- **Training**: New cashier can complete: scan, qty adjust, customer attach, tender in **< 30 minutes**.
- **Configurability**: Deliver preset packs + per‑store/per‑station/per‑role overrides so rollout is safe and tunable without code changes.

## Definitions + measurement (so the goals are testable)

### Core events (single source of truth)

- `start_sale`: new sale created and UI enters **Sell** in an “active cart” state.
- `time_to_first_item`: duration from `start_sale` to first successful add-to-cart event.
- `time_to_tender`: duration from `start_sale` to tender UI becoming actionable.
- `tender_complete`: tender finalized and sale committed (receipt state shown).

### Scan determinism metric

- `scan_misroute_rate` = scans routed somewhere other than the configured scan target / workflow intent.
- “Intended target” means:
  - **Sell**: add product line (or open typeahead) while remaining “scan ready”.
  - **Warehouse**: receive/transfer/lookup staging list depending on active mode.
- A “misroute” includes:
  - scan text ending up in a non-scan input field
  - scan lost/ignored without a visible reason (unless intentionally configured)
  - scan causing focus to leave the scan target without user action

### Baseline + comparison

- Compare **median + P90** against a **baseline window** (default: previous 7 days) for the same stores/stations/roles.
- Rollout comparison uses controlled cohorts: **1 station → 1 store → all stores**.

## Non-goals

- Replacing your underlying data model (SKUs, customers, inventory) or rebuilding back-end logic.
- Over-animating or “designing for pretty” at the expense of speed.
- A full BI suite; keep reports operational and drilldown-friendly.

## Personas

- **Cashier**: Sell-first, scan-first, minimal clicks, obvious errors, fast tender.
- **Manager**: approvals, refunds, end-of-day, reporting drilldowns, configuration governance.
- **Warehouse**: scan-first receiving/transfers, fast actions, low stock/reorder visibility.

## Terminology (unified across all docs)

- **DetailRail**: the right-side rail that shows details and actions for the selected entity.
- **ListDetailLayout**: “list/table on the left, DetailRail on the right”.
- **FocusManager**: the scan/focus router that enforces deterministic scan behavior.
- **ScanReadyIndicator**: the visible state indicator for the current scan target and readiness.
- **PresetPack**: named bundle of settings + (optionally) feature flags, applied per scope.

## Evidence-based UI audit (what we’re fixing and why)

### Image 1 — Dashboard
- **P0**: Quick Actions → New Sale not dominant → slows down primary job; adds cognitive load.
- **P1**: Alerts list non-actionable + subtle → low stock/out-of-stock ignored.
- **P1**: Empty lower area → wasted space for held sales, pending transfers, cash drawer state.

### Image 2 — Sell
- **P1**: Product tiles mostly empty → fewer items visible; slows browsing.
- **P0**: Scan/search behavior not explicit; focus not obviously locked → scanning mistakes block sales.
- **P0**: Tender controls visible while cart empty → misclick risk; confusing for new staff.
- **P0**: Tax display shown as “Tax (13%)” → likely wrong per store rules; compliance/trust risk.

### Image 3 — Product Lookup
- **P1**: Right DetailRail unused → lookup isn’t a workflow tool.
- **P2**: Filters subtle → slower narrowing; more typing than needed.

### Image 4 — Warehouse
- **P1**: Row actions hidden in kebab → slows frequent tasks.
- **P1**: Min/reorder info tiny → critical operations missed.
- **P0**: Scan flow unclear → risk of scanning into wrong target.

### Image 5 — Customers
- **P0**: No AR/terms/tax flags/notes/phone in list → counter decisions become guesswork.
- **P1**: DetailRail unused → no customer workflow.

### Image 6 — Reports
- **P1/P2**: Trend placeholder + limited drilldown → reports don’t answer “why” quickly.

### Image 7 — Settings
- **P1**: Long tree + no search → slow config; higher misconfiguration risk.
- **P2**: Empty space + small controls → hard to understand/tune behavior.

## Configurable + flexible by design (how we keep it customizable)

### Configuration layers (highest priority wins)

**Precedence (highest → lowest):** **Station > User > Role > Store > Global**.

- **Station**: scanner model quirks, receipt printer, touch mode, scan routing rules.
- **User preferences**: density, glare mode, shortcut style, default module (when not policy-locked).
- **Role policy**: cashier vs manager capabilities, override thresholds, approvals.
- **Store rules**: tax rules, pricing policies, default tender methods.
- **Global defaults**: safe baseline.

### Preset packs (ship these so rollout is safe)

Presets are named bundles of **settings + optional flags**, applicable at Store/Station (and optionally Role/User for preference-only items):

- **Counter Classic (default)**: scan-first + strong guardrails; medium density; minimal manager prompts.
- **Counter Compact**: denser lists, more visible rows, fewer animations, stronger focus cues.
- **Warehouse Scan**: receiving/transfers front-and-center; table actions visible.
- **Manager Ops**: dashboard-first, drilldowns enabled, margin visible, approvals surfaced.

## Feature flags (to roll out safely)

Flags are scoped (default: Station) and are always discoverable via a visible “flag enabled” marker in UI debug mode.

| Flag | Default | Scope | Purpose | Rollback |
|---|---:|---|---|---|
| `ui.sellV2` | off | station | new Sell layout + progressive tender | instant per station |
| `ui.commandPalette` | off | role | Ctrl+K command palette | instant per role |
| `ui.listDetailPanes` | off | role/store | enable ListDetailLayout + DetailRail | instant |
| `ui.alertsActionable` | off | store | actionable alerts + ack/snooze | instant |
| `ui.settingsSearch` | off | store | settings tree search + jump-to | instant |
| `ui.glareMode` | off | station | glare theme variant + stronger focus cues | instant |
| `workflow.receivingV2` | off | station | receiving scan staging list | instant |

## Target workflows and how the new UI supports them

### Sell workflow (fast + correct)

- **Start sale**: cashier lands on Sell (configurable per role). Focus is always ScanReady.
- **Add items**: scan adds instantly; typing opens typeahead; Enter adds.
- **Adjust qty/price/discount**: inline edits on cart rows (keyboard-first), with configurable guardrails.
- **Customer attach mid-sale**: F3 opens customer overlay; selecting shows AR/terms/tax/notes.
- **Tender**: only appears when cart has items; validates totals; confirms unusual discounts/price below cost (configurable thresholds).
- **Receipt**: reprint and email/text options (if enabled) from completion screen.

### Returns/credits/voids (default design even if missing today)

- Dedicated “Return” entry point: scan receipt barcode, search receipt/invoice, or search customer + date.
- Configurable: manager approval required above threshold; restock/non-restock; reasons required.

### Inventory lookup + receiving/transfers

- Warehouse scan input always available; receive and transfer are primary actions (not hidden).
- Reorder signals visible + filterable (“Below Min”, “Out of Stock”, “No Sales in 90 days” optional).

### Daily ops

- Cash drawer: open/close, paid-outs/drops, X/Z reports, over/short tracking (manager-only).
- Dashboard surfaces “Open work” (held sales, pending receiving/transfers, approvals queue).

## Navigation / Information Architecture proposal (configurable)

- Left nav modules: Home/Dashboard, Sell, Lookup, Warehouse, Customers, Reports, Admin
- Per-role configurable nav: reorder/hide modules; Sell can be pinned as default.
- Optional global command palette: Ctrl+K to jump to product/customer/invoice from anywhere.

## Phased rollout (safe + reversible)

### Phase 1 — Quick wins + scaffolding (no major layout disruption)

- Typography/spacing/hierarchy improvements (reduce thin-border flatness).
- Settings search (`ui.settingsSearch`).
- Actionable alerts (`ui.alertsActionable`).
- ListDetailLayout + DetailRail for Lookup and Customers (`ui.listDetailPanes`).
- FocusManager + ScanReadyIndicator in Sell/Warehouse (behind station flag; opt-in per station).

### Phase 2 — Sell V2 (highest impact, controlled rollout)

- New Sell layout + cart-first rail + progressive tender (`ui.sellV2`).
- Scanner/typeahead rules + keyboard map.
- Customer attach mid-sale with warnings + acknowledgment rules.

### Phase 3 — Warehouse V2 + operational workflows

- Receiving V2 scan staging list (`workflow.receivingV2`) + unknown barcode flow.
- Transfers scan-verify.
- Reorder workflow surfaced from low-stock alerts.

## Risks + mitigations

- **Muscle-memory risk**: ship “Counter Classic” preset; allow per-user opt-in to Sell V2 where allowed.
- **Scanner edge cases**: station-level scanner profiles + parser rules; e2e tests simulating scan input.
- **Over-configurability chaos**: lock critical policies behind manager/admin permissions; audit config changes; “Reset to preset”.

## Validation plan (prove improvements worked)

### KPIs (per store/station/role)

- `time_to_first_item`
- `items_per_minute`
- `time_to_tender`
- `override_rate`
- `void_rate`, `return_rate`
- `abandoned_sale_rate`
- `scan_misroute_rate`

### Usability scripts

- walk-in sale, attach customer, tax-exempt, return, hold/resume, receiving

### Qual feedback

- in-app “report friction” with context (screen, mode, last actions)


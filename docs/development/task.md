# POS Implementation Backlog (epics/stories/tasks)

This file is the **engineering backlog** for the POS UI/workflow plan.

## Legend (normalize language across tasks)

- **priority**
  - **P0**: required to safely run a store (blocking)
  - **P1**: high leverage / strong ROI
  - **P2**: nice-to-have / polish / expansion
- **effort**
  - **S**: 1–3 days
  - **M**: ~1 week
  - **L**: multi-week / cross-cutting

## Cross-cutting requirements (apply to every task below)

- **Flags**: every user-facing change must name the feature flag(s) that gate it (see `plan.md`).
- **Telemetry**: tasks that support measurable goals must emit metrics/events (see `plan.md` definitions).
- **Terminology**: use `DetailRail`, `ListDetailLayout`, `FocusManager`, `ScanReadyIndicator`, `PresetPack`.
- **Config precedence**: **Station > User > Role > Store > Global** (highest wins).

---

Epic 0 — Config architecture (make flexibility real, not accidental)
Story 0.1: Settings registry + layered overrides

Task: Implement a typed SettingsRegistry (keys, types, defaults, visibility, validation rules)

priority: P0

acceptance criteria: Every configurable UI/workflow behavior in this plan is represented as a registry entry with default + validation

definition of done: registry in TS, unit tests, migration for existing prefs

dependencies: none

effort: L

flags: (none — foundational)

telemetry: registry coverage metric (e.g., % of referenced keys present)

Task: Add override layering (precedence highest→lowest: Station → User → Role → Store → Global) + audit log

priority: P0

acceptance criteria: Any setting can be overridden at permitted scopes; UI shows “effective value” + source; changes logged

definition of done: resolver + UI + audit table/events

dependencies: SettingsRegistry

effort: L

flags: (none — foundational)

telemetry: config_change events (who/what/scope), config_resolution debug view usage

Task: Preset packs system (Counter Classic/Compact, Warehouse Scan, Manager Ops)

priority: P1

acceptance criteria: Admin can apply preset to store/station; users can reset to preset; diff view shows changes

definition of done: preset format + apply/reset + diff UI

dependencies: override layering

effort: M

flags: (none — foundational)

telemetry: preset_apply events, preset_diff_view opens, preset_reset events

Task: Feature flag framework (station-level enable + rollback)

priority: P1

acceptance criteria: Flags can be enabled per station; instant rollback; visible “flag enabled” marker for debugging

definition of done: flag storage + resolver + UI

dependencies: override layering

effort: M

flags: (implements flags)

telemetry: flag_enable/disable events, rollback usage

---

Epic 0.5 — Telemetry + KPI instrumentation (prove improvements)

Task: Instrument core POS KPIs (start_sale → tender_complete, scan_misroute_rate, override_rate)

priority: P0

acceptance criteria: KPIs in `plan.md` can be computed per store/station/role with consistent definitions

definition of done: event schema + client emission + server ingestion/storage + basic dashboard/query

dependencies: Feature flag framework (for cohorting), SettingsRegistry (for tagging effective configs)

effort: L

flags: (none — foundational)

telemetry: this is the telemetry system itself

Task: Controlled rollout tooling (cohort compare: baseline vs enabled flags)

priority: P1

acceptance criteria: can compare median + P90 for a station before/after enabling a flag

definition of done: reporting query + UI page or script that outputs before/after metrics

dependencies: Instrument core POS KPIs

effort: M

flags: (none)

telemetry: rollout_analysis runs logged

Epic 1 — Foundation UI (hierarchy, density, glare)
Story 1.1: Typography/spacing/hierarchy pass (Images 1–7)

Task: Introduce spacing + typography tokens and refactor core layout components

priority: P1

acceptance criteria: Screens in Images 1–7 use shared tokens; fewer thin borders; clear headers

definition of done: tokens + updated components + visual regression snapshots

dependencies: none

effort: M

Task: Density modes (Comfortable/Compact) configurable per user and role

priority: P2

acceptance criteria: tables/lists show more rows in Compact without breaking hit targets; saved per user

definition of done: density tokens applied across ListRow/Table

dependencies: SettingsRegistry

effort: M

flags: ui.density (setting), optional feature flag if needed

telemetry: density selection distribution; list interaction speed deltas

Task: Glare Mode theme variant (contrast + focus ring) configurable per station

priority: P2

acceptance criteria: toggle in Settings; thicker separators; larger text; clearer focus

definition of done: theme variant + QA checklist for readability

dependencies: tokens

effort: M

flags: ui.glareMode

telemetry: glareMode enablement rate; focus loss events in glare mode

Epic 2 — Keyboard/scanner-first core (P0)
Story 2.1: Focus lock + scan routing (Sell/Warehouse)

Task: Implement “Scan Ready” focus manager with visible state indicator

priority: P0

acceptance criteria: scanning always routes correctly; focus returns after modals; indicator visible

definition of done: e2e tests covering scan during typical actions

dependencies: none

effort: L

flags: (foundation for Sell/Warehouse; may be behind station flag)

telemetry: scan_received, scan_routed(target), scan_misroute, focus_lost, focus_restored

Task: Scanner profiles (suffix, prefix, enter behavior) configurable per station

priority: P0

acceptance criteria: station can choose scanner profile; parser handles common variations

definition of done: profile UI + parser tests

dependencies: focus manager, SettingsRegistry

effort: M

flags: (station setting), optional rollout gating

telemetry: scan parsing failures by profile; misroute by profile

Task: Keyboard shortcut system (keymap per role, configurable) + help overlay

priority: P1

acceptance criteria: role-based keymaps; conflicts handled; Ctrl+/ shows current shortcuts

definition of done: keymap registry + overlay + tests

dependencies: SettingsRegistry

effort: M

flags: (role setting)

telemetry: shortcut_usage events; help overlay opens; conflict warnings

Task: Command palette (Ctrl+K) optional per role

priority: P1

acceptance criteria: grouped results (product/customer/invoice); keyboard nav; configurable enable

definition of done: component + integration + telemetry

dependencies: search endpoints

effort: M

flags: ui.commandPalette

telemetry: palette opens, selection type counts, time_to_selection

Epic 3 — Sell V2 (cart-first, progressive disclosure)
Story 3.1: Fix empty cart/tender misuse (Image 2 P0)

Task: Hide/disable tender until cart has items; show “Scan or Search” guidance state

priority: P0

acceptance criteria: no tender action possible with empty cart; guidance visible; scan field focused

definition of done: state machine + tests

dependencies: focus manager

effort: S

flags: ui.sellV2 (or existing Sell if phased)

telemetry: tender_open attempts while empty; time_to_first_item

Task: Replace tile emptiness with dense grid OR default to list results (config)

priority: P1

acceptance criteria: grid tiles show name+sku+price+stock; or list mode default is configurable

definition of done: grid component update + setting toggle

dependencies: tokens/density

effort: M

Story 3.2: Inline line-item editing + guardrails

Task: Cart list with keyboard-first editing (qty/discount/price)

priority: P0

acceptance criteria: edit without modal for qty/discount; price override prompts per policy; audit events logged

definition of done: cart row component + validation + tests

dependencies: role policy system

effort: L

Task: Policy engine for overrides (thresholds configurable per store/role)

priority: P0

acceptance criteria: define max discount, min margin, override approval thresholds; enforced consistently

definition of done: policy evaluator + UI prompts + audit

dependencies: SettingsRegistry, roles

effort: L

flags: (policy settings), manager-only UI

telemetry: override_prompt_shown, override_approved/denied, below_cost_attempts

Task: Tax display and logic presentation (GST/PST/etc) configurable per store

priority: P0

acceptance criteria: no “hard-coded 13%”; totals show tax breakdown; tax-exempt clear

definition of done: store tax config + receipt preview + tests

dependencies: store settings

effort: M

flags: (store tax config), possibly ui.sellV2

telemetry: tax_exempt toggles; tax config changes; tax-related override events

Story 3.3: Customer attach mid-sale (Image 5 P0)

Task: Customer overlay search (F3) with fast attach + warnings acknowledgment

priority: P0

acceptance criteria: attach customer in ≤2 keystrokes + Enter; critical notes require acknowledgment (configurable)

definition of done: overlay + note rules + tests

dependencies: customer fields

effort: M

Task: In-sale customer summary badges (AR/terms/tax flags)

priority: P0

acceptance criteria: visible at all times on Sell; updates immediately

definition of done: summary component + role gating

dependencies: AR data availability

effort: M

Story 3.4: Tender flow safety + speed

Task: Tender pane/modal with validation and optional confirmations

priority: P0

acceptance criteria: change due correct; split tender optional; large discount confirm configurable; cannot finalize invalid state

definition of done: tender UI + tests + telemetry

dependencies: policy engine

effort: L

flags: ui.sellV2

telemetry: tender_errors by type; time_to_tender; tender_complete

Epic 4 — Lookup + Customers list/detail rails (Images 3 & 5)

Task: Product detail rail with actionable sections and actions

priority: P1

acceptance criteria: selecting product fills rail; includes stock by location + add to sale

definition of done: rail + routing + role gating

dependencies: inventory endpoints

effort: M

Task: Customer list row enrichment (phone, AR, terms, tax badge, notes badge)

priority: P0

acceptance criteria: cashier can see decision-critical info at a glance; configurable columns

definition of done: list row component + column config UI

dependencies: customer fields

effort: M

Task: Customer detail rail with quick actions

priority: P1

acceptance criteria: “Add to sale / Take payment / New invoice” actions exist and are role gated

definition of done: detail rail + actions

dependencies: AR/payment

effort: M

Epic 5 — Warehouse speed (Image 4)

Task: Promote common row actions inline (Receive/Transfer/Adjust/Label) configurable per role

priority: P1

acceptance criteria: top actions visible; overflow retains rare actions; keyboard accessible

definition of done: actions column refactor + settings

dependencies: role policy

effort: M

Task: Emphasize reorder/min info (badge, sort, filter “Below Min”)

priority: P1

acceptance criteria: “Below Min” view exists; min values readable; configurable thresholds

definition of done: table updates + filters

dependencies: inventory thresholds

effort: S

Task: Receiving V2 scan staging list behind feature flag

priority: P0

acceptance criteria: scan increments; unknown barcode flow; post receive audit log

definition of done: receiving module + tests

dependencies: backend receiving support

effort: L

flags: workflow.receivingV2

telemetry: receiving_scan_added, unknown_barcode_rate, receive_commit_time

Epic 6 — Alerts + Dashboard operationalization (Image 1)

Task: Actionable alerts component (severity, timestamps, actions) + ack/snooze state

priority: P1

acceptance criteria: alerts have 1-click actions; ack state persists; configurable notifications

definition of done: alerts UI + state model

dependencies: alerts API/state

effort: M

Task: Dashboard “Open work” panels configurable per role

priority: P2

acceptance criteria: admin can choose which panels show; cashier sees minimal

definition of done: dashboard layout config

dependencies: SettingsRegistry

effort: M

Epic 7 — Settings usability (Image 7)

Task: Settings search + jump-to section

priority: P1

acceptance criteria: typing filters tree; Enter navigates; shows effective values and override source

definition of done: search UI + override badges

dependencies: SettingsRegistry

effort: M

Task: “Effective value + override source” UI pattern across Settings

priority: P1

acceptance criteria: each setting shows where value comes from (global/store/role/user/station)

definition of done: shared component SettingValueBadge

dependencies: override resolver

effort: M


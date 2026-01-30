# Kiro Workflow & Documentation Discipline (Consolidated)

FlexiPOS was built with **Kiro-assisted, doc-driven engineering**. The whole system works best when:

- context lives in files,
- every major change leaves an audit trail,
- docs are kept “insert-only” and never erase history.

Primary references:
- [memory-bank/MEMORY_SYSTEM.md](memory-bank/MEMORY_SYSTEM.md)
- [memory-bank/active-state.md](memory-bank/active-state.md)
- [memory-bank/system_patterns.md](memory-bank/system_patterns.md)
- [spec/plan.md](spec/plan.md)

---

## The “Memory Bank” protocol

At the start of each session, the agent should read:
1. `memory-bank/active-state.md` (current focus)
2. `memory-bank/project_brief.md` (static context)
3. `memory-bank/system_patterns.md` (standards + landmines)
4. relevant ADRs under `memory-bank/adr/`

At the end of each session:
- update `active-state.md`
- add new gotchas to `system_patterns.md`
- create ADRs for significant decisions

Core principle (verbatim from Memory System):  
**“Files, not chat. Documents, not memory. Receipts, not vibes.”**

---

## Truth-sync + audit workflow

The repo uses `audit/` as “evidence”:
- backend vs frontend parity (what exists vs what UI wires)
- production readiness checks
- patch plans (safe subset changes)  
Example sources:
- [truth_sync PATCH_PLAN](audit/truth_sync_2026-01-25/PATCH_PLAN.md)
- [frontend wiring PATCH_PLAN](audit/frontend_wiring_2026-01-25/PATCH_PLAN.md)

---

## Recommended doc hygiene (so you don’t get 1000 readmes again)

- **Canonical**: keep “how it works” docs in `docs/consolidated/`.
- **Evidence**: keep audits in `audit/` and link them from canon.
- **Narrative**: keep progress writeups in `blog/`.
- **History**: keep older snapshots in `archive/`.

---

## Copy/paste: multi-agent prompt to consolidate docs

Use this as the task prompt inside Kiro (or your orchestrator):

```text
You are working in this repo root:

C:\Users\CAPS\Documents\GitHub\dynamous-kiro-hackathon

Task: consolidate documentation sprawl into a small canonical set under docs/consolidated/.

Constraints:
- NO DELETES (do not delete or rewrite history). Create/overwrite only the new consolidated files.
- Do not duplicate content; link to source docs instead.
- Treat audit/ as evidence for “what exists”, spec/ as intended design, archive/ as history.

Work to do:
1) Inventory all markdown in: README*.md (root), blog/, audit/, docs/, memory-bank/, spec/, specs/, archive/.
   - Exclude: node_modules/, data/, *.zip, runtime/ (gitignored), generated artifacts.
2) Produce exactly these canonical files (max 8) in docs/consolidated/:
   - 00_OVERVIEW.md
   - 01_TIMELINE.md
   - 02_ARCHITECTURE_AND_DECISIONS.md
   - 03_BUILD_AND_OPERATIONS.md
   - 04_FEATURES_AND_WORKFLOWS.md
   - 05_KIRO_PROCESS.md
   - 06_GAPS_AND_NEXT.md
   - 99_SOURCE_MAP.md
3) Timeline requirements:
   - Build a milestone timeline + daily log.
   - Prefer blog + audit changelogs; include absolute dates.
4) Gap-filling requirements:
   - Detect placeholders (e.g., 'your-org', 'EasySale', 'CAPS POS', TBD/TODO/coming soon).
   - Create a prioritized gap list (Submission blockers vs later).
5) Source map requirements:
   - Provide a compact inventory of docs by folder and a full path list (no summaries).
   - For each canonical doc, list the top source files used.

Use parallel subagents:
- Agent A: inventory + source map + placeholder scanning
- Agent B: timeline + milestones
- Agent C: architecture/decisions + build variants
- Agent D: build/ops + scripts + env + troubleshooting
- Agent E: features/workflows + API surface + UI wiring status
- Agent F: gaps + next actions + contradiction resolution

After subagents report, the orchestrator writes the canonical docs and verifies:
- no duplicated sections
- all key claims have a source link
- naming is consistent (FlexiPOS primary; note EasySale/CAPS as aliases)
```


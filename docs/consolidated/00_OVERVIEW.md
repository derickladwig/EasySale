# Consolidated Build & Documentation Set (Canonical)

This folder is the **single “judge-friendly” view** of the FlexiPOS (a.k.a. EasySale / CAPS POS) build.  
It exists because the repo contains **642 markdown files** spread across multiple styles and eras.

## Goals

- Create **1–10 canonical docs** that explain what was built, why, and how to run it.
- Keep **links to originals** (audit evidence, dev blogs, historical archives) without repeating content.
- Highlight **gaps + contradictions** so you can fix the *highest-value* problems fast.

## What you should read first

1. **01_TIMELINE.md** — what happened, in order
2. **02_ARCHITECTURE_AND_DECISIONS.md** — what the system is (and why)
3. **03_BUILD_AND_OPERATIONS.md** — how to run/build/deploy
4. **06_GAPS_AND_NEXT.md** — what’s missing / what to fix next

## Where the original source material lives (in your repo)

- `blog/` — devlog-style narratives and implementation writeups
- `audit/` — truth-sync, parity, wiring and production readiness evidence
- `docs/` — structured product/architecture/API/user guides (mixed “current vs planned”)
- `spec/` — requirements/design/plan/installation “single-set” drafts (often most current)
- `archive/` — historical summaries and older status reports

## Canonical vs. historical truth

**Canon = this folder.**  
**Evidence = audit/blog/spec/docs.**  
**History = archive.**

When something conflicts:
- Prefer **audit** (truth-sync / parity evidence) for “what exists”
- Prefer **spec** for “what we intended to ship”
- Use **archive** only for historical context

## Source highlights

These files drove most of the consolidation:
- [memory-bank/active-state.md](memory-bank/active-state.md) — **Last Updated:** 2026-01-29 **Last Session By:** Kiro AI (Session 39 - Dev/Prod Separation + Health Fixes)
- [memory-bank/system_patterns.md](memory-bank/system_patterns.md) — **Last Updated:** 2026-01-29
- [spec/design.md](spec/design.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Status**: Production-Ready Documentation
- [spec/INSTALL.md](spec/INSTALL.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Platforms**: Windows 10/11, Linux, macOS (Docker)
- [docs/architecture/overview.md](docs/architecture/overview.md) — The CAPS POS system is an offline-first, desktop application designed for automotive retail stores selling caps, parts, paint, and equipment. The architecture prioritizes local-first operation with background synchronization.
- [audit/AUDIT_EXECUTION_PLAN.md](audit/AUDIT_EXECUTION_PLAN.md) — This audit covers both:
- [audit/truth_sync_2026-01-25/PATCH_PLAN.md](audit/truth_sync_2026-01-25/PATCH_PLAN.md) — This plan lists the **insert-only patches** to apply to canonical targets. It is the execution map for reconciling memory + steering + product + design without deleting history.
- [audit/frontend_wiring_2026-01-25/PATCH_PLAN.md](audit/frontend_wiring_2026-01-25/PATCH_PLAN.md) — **Generated**: 2026-01-25 **Approach**: Insert-only changes to wire unwired features and resolve drift

---

## How to keep docs from exploding again (rule of thumb)

- Put *new “overall” docs* only in `docs/consolidated/` (this folder).
- Put *implementation evidence* in `audit/` and link it here.
- Put *narratives/weekly progress* in `blog/`.
- Treat `archive/` as **read-only history**.


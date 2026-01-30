# Gaps & Next Actions (Consolidated)

This is the **prioritized** “what’s left” list, derived from placeholder scans + “coming soon” markers + audit plans.

---

## Submission blockers (do these first)

### 1) Public repo hygiene (required for hackathon submission)
- Ensure the repository is **public** and includes `.kiro/` configs.
- Ensure **no secrets** are committed (verify `.env` is ignored; keys removed; rotate if leaked).
- Ensure `node_modules/` is not committed (should be in `.gitignore`).
- Ensure the repo size is reasonable (large `*.zip` and `data/` can bloat a public repo—keep only what you need).

### 2) README and demo requirements
Submission asks for:
- Public GitHub repo
- README with setup & deployment instructions
- 2–5 minute demo video

On your end you still need to:
- Record the **2–5 minute demo video** (there’s a script template in [spec/VIDEO_GUIDE_SCRIPT.md](spec/VIDEO_GUIDE_SCRIPT.md)).
- Final pass on README placeholders and links (see “Placeholder cleanup” below).

### 3) Proof the “one-command” demo path
For judges, you want:  
**clone → copy env → run one script → UI opens**

Your scripts already aim for that (see [spec/AUTOMATION_SCRIPTS.md](spec/AUTOMATION_SCRIPTS.md)); verify locally on a clean machine.

---

## Documentation gaps called out explicitly in docs/README

From [docs/README.md](docs/README.md):

- - **offline-sync.md** ⬜ - Offline operation and synchronization (coming soon)
- - **deployment.md** ⬜ - Deployment procedures (coming soon)
- - Product endpoints ⬜ (coming soon)
- - Transaction endpoints ⬜ (coming soon)
- - Customer endpoints ⬜ (coming soon)
- - Inventory endpoints ⬜ (coming soon)
- - **cashier-guide.md** ⬜ - Detailed guide for cashiers (coming soon)
- - **inventory-guide.md** ⬜ - Warehouse and inventory management (coming soon)
- - **admin-guide.md** ⬜ - System administration (coming soon)
- - **troubleshooting.md** ⬜ - Common issues and solutions (coming soon)

Action: either (a) finish these docs, or (b) remove “coming soon” markers if the content exists elsewhere and link it from canon.

---

## Placeholder cleanup (high-signal)

These placeholders appear repeatedly and will confuse judges:

### `your-org` / template placeholders
Top offenders:
- [docs/REPO_HYGIENE_RECOMMENDATIONS.md](docs/REPO_HYGIENE_RECOMMENDATIONS.md) (≈32 hits)
- [spec/README_MASTER.md](spec/README_MASTER.md) (≈10 hits)
- [docs/INDEX.md](docs/INDEX.md) (≈6 hits)
- [spec/INSTALL.md](spec/INSTALL.md) (≈4 hits)
- [docs/INSTALL.md](docs/INSTALL.md) (≈4 hits)
- [docs/architecture/testing-coverage.md](docs/architecture/testing-coverage.md) (≈3 hits)
- [docs/deployment/ocr_deployment.md](docs/deployment/ocr_deployment.md) (≈2 hits)
- [docs/deployment/CI_CD_GUIDE.md](docs/deployment/CI_CD_GUIDE.md) (≈2 hits)
- [spec/USER_GUIDE.md](spec/USER_GUIDE.md) (≈1 hits)
- [docs/build/build_matrix.md](docs/build/build_matrix.md) (≈1 hits)

### Naming drift: “EasySale” vs “FlexiPOS” vs “CAPS POS”
This is fine historically, but canon should be consistent.

Top offenders for “EasySale”:
- [archive/status-reports/DOCKER_NAMING_FIXES.md](archive/status-reports/DOCKER_NAMING_FIXES.md) (≈59 hits)
- [archive/status-reports/DOCKER_ARCHITECTURE.md](archive/status-reports/DOCKER_ARCHITECTURE.md) (≈52 hits)
- [archive/status-reports/DOCKER_NAMING_STANDARD.md](archive/status-reports/DOCKER_NAMING_STANDARD.md) (≈50 hits)
- [archive/status-reports/STANDARDIZATION_STATUS.md](archive/status-reports/STANDARDIZATION_STATUS.md) (≈44 hits)
- [archive/status-reports/NAMING_STANDARDIZATION_COMPLETE.md](archive/status-reports/NAMING_STANDARDIZATION_COMPLETE.md) (≈35 hits)
- [audit/PATH_TRUTH.md](audit/PATH_TRUTH.md) (≈34 hits)
- [docs/split-build/TASKS.md](docs/split-build/TASKS.md) (≈31 hits)
- [docs/RUNBOOK.md](docs/RUNBOOK.md) (≈31 hits)

Top offenders for “CAPS POS”:
- [audit/DECAPS_SWEEP.md](audit/DECAPS_SWEEP.md) (≈5 hits)
- [docs/user-guides/quick-start.md](docs/user-guides/quick-start.md) (≈4 hits)
- [docs/architecture/deployment.md](docs/architecture/deployment.md) (≈4 hits)
- [audit/FORBIDDEN_SCAN_BASELINE.md](audit/FORBIDDEN_SCAN_BASELINE.md) (≈4 hits)
- [archive/status-reports/BAT_FILES_CLEANUP.md](archive/status-reports/BAT_FILES_CLEANUP.md) (≈3 hits)
- [memory-bank/active-state.md](memory-bank/active-state.md) (≈2 hits)
- [docs/SECURITY.md](docs/SECURITY.md) (≈2 hits)
- [blog/2026-01-12-settings-consolidation-complete.md](blog/2026-01-12-settings-consolidation-complete.md) (≈2 hits)

Recommended approach:
- Keep **FlexiPOS** as the product name in README + consolidated docs.
- Mention once: “formerly EasySale / CAPS POS” for searchability.
- Don’t mass-rewrite `archive/` (history). Focus on README + `docs/consolidated/` + any “current” specs.

---

## Product/implementation gaps (based on audits/specs)

These are the most common recurring themes in `audit/`:

- **Frontend↔Backend wiring parity** (buttons exist but endpoints/state may not)
  - see [API_WIRING_MATRIX.md](audit/API_WIRING_MATRIX.md)
  - see [frontend wiring PATCH_PLAN](audit/frontend_wiring_2026-01-25/PATCH_PLAN.md)
- **OCR/Document Center end-to-end** (upload → case → review → action)
  - see [audit/e2e/spec.md](audit/e2e/spec.md)
  - see [audit/e2e/plan.md](audit/e2e/plan.md)
- **Settings master completion** (all controls wired + persisted correctly)
  - see [INTERACTION_WIRING_AUDIT.md](audit/settings-master-2026-01-27/INTERACTION_WIRING_AUDIT.md)

---

## Recommended “next 7 days” plan (minimal, high impact)

1. **Finalize canon docs**: keep only `docs/consolidated/` as the judge path.
2. **Fix placeholders** in README + specs used by judges.
3. **Run a clean-room install** (new folder / new machine) and confirm:
   - `start-dev.bat` works
   - browser opens to `localhost:7945`
4. **Record demo video** (2–5 minutes): Setup → login → sell flow → settings → (optional) docs/OCR.
5. **Tag a release** (optional but helps): `v0.1-hackathon` or similar.


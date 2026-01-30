# Suspicious Files Manifest

**Audit Date:** 2026-01-29  
**Scope:** frontend/ directory root  
**Auditor:** Automated hygiene audit

---

## Executive Summary

This audit identified **5 zero-byte files with suspicious names** in the frontend root directory. These files appear to be accidental artifacts from code fragment copy-paste operations or terminal mishaps. All 5 files are **tracked by git**, which is problematic.

Additionally, several build/report artifact directories exist, with some files tracked by git that should not be.

---

## 1. Zero-Byte Suspicious Files

| File Name | Size | Git Tracked | Created | Likely Cause |
|-----------|------|-------------|---------|--------------|
| `(` | 0 bytes | ✅ YES | 2026-01-28 8:15 PM | Accidental file creation from code fragment |
| `{` | 0 bytes | ✅ YES | 2026-01-28 8:15 PM | Accidental file creation from code fragment |
| `f.required).length}` | 0 bytes | ✅ YES | 2026-01-28 8:15 PM | Partial JS expression accidentally saved as filename |
| `setTimeout(resolve` | 0 bytes | ✅ YES | 2026-01-28 8:15 PM | Partial Promise/timeout code fragment |
| `setSubmittedData(null)}` | 0 bytes | ✅ YES | 2026-01-28 8:15 PM | Partial React state setter code fragment |

### Cause Hypothesis

These files were likely created by one of the following scenarios:
1. **Terminal mishap**: Running a command like `touch` or `>` with a code fragment as argument
2. **IDE/Editor glitch**: Auto-save or file creation with clipboard content as filename
3. **Script error**: A build or automation script that incorrectly parsed output
4. **Copy-paste accident**: Pasting code into a "Save As" dialog or terminal

All files share the same timestamp (2026-01-28 8:15:03 PM), suggesting they were created in a single incident.

---

## 2. Build/Report Artifact Directories

| Directory | Exists | Files | Git Tracked Files | In .gitignore | Status |
|-----------|--------|-------|-------------------|---------------|--------|
| `dist/` | ✅ | 82 | 0 | ✅ YES | OK - properly ignored |
| `node_modules/` | ✅ | Many | 0 | ✅ YES | OK - properly ignored |
| `coverage/` | ✅ | 28 | 0 | ✅ YES | OK - properly ignored |
| `storybook-static/` | ✅ | 132 | 0 | ✅ YES | OK - properly ignored |
| `playwright-report/` | ✅ | 1 | 1 (`index.html`) | ❌ NO | ⚠️ TRACKED - should be ignored |
| `test-results/` | ✅ | 1 | 1 (`.last-run.json`) | ❌ NO | ⚠️ TRACKED - should be ignored |

### Issues Found

1. **`playwright-report/index.html`** - Tracked by git but should be ignored (build artifact)
2. **`test-results/.last-run.json`** - Tracked by git but should be ignored (test artifact)

---

## 3. Recommended Actions

### 3.1 Quarantine Suspicious Files

The 5 zero-byte suspicious files should be:
1. **Moved** to `frontend/audit/submission_cleanup/quarantine/` (preserving history per NO DELETES policy)
2. **Removed from git tracking** via `git rm --cached`
3. **Added to .gitignore** to prevent recurrence

### 3.2 Fix .gitignore

Add the following entries to `frontend/.gitignore`:

```gitignore
# Playwright
playwright-report/
test-results/

# Accidental code fragment files (prevent recurrence)
\(
\{
```

### 3.3 Remove Tracked Artifacts from Git

```bash
git rm --cached "frontend/("
git rm --cached "frontend/{"
git rm --cached "frontend/f.required).length}"
git rm --cached "frontend/setTimeout(resolve"
git rm --cached "frontend/setSubmittedData(null)}"
git rm --cached "frontend/playwright-report/index.html"
git rm --cached "frontend/test-results/.last-run.json"
```

---

## 4. Files Inventory

### 4.1 Suspicious Files (Full Paths)

```
frontend/(
frontend/{
frontend/f.required).length}
frontend/setTimeout(resolve
frontend/setSubmittedData(null)}
```

### 4.2 Artifact Files Tracked by Git

```
frontend/playwright-report/index.html
frontend/test-results/.last-run.json
```

---

## 5. Risk Assessment

| Issue | Severity | Impact |
|-------|----------|--------|
| Zero-byte suspicious files | Low | Repo clutter, confusion, potential build issues on some systems |
| Tracked test artifacts | Low | Unnecessary git history bloat, merge conflicts |
| Missing .gitignore entries | Low | Future artifacts may be accidentally committed |

---

## Appendix: Git Status Excerpt (Suspicious Files)

From `git ls-files` output, the following suspicious files are tracked:
```
(
f.required).length}
setSubmittedData(null)}
setTimeout(resolve
{
```

All 5 files appear in the tracked files list, confirming they were committed to the repository.

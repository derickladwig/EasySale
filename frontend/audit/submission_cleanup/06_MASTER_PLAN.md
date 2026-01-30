# Master Plan — Frontend Submission Cleanup

**Date:** 2026-01-29  
**Status:** READY FOR EXECUTION

---

## Implementation Order

Execute in this exact order. Each step has acceptance criteria that must pass before proceeding.

---

## Step 1: Quarantine Suspicious Files

**Goal:** Move zero-byte garbage files to quarantine (NO DELETES policy)

### Commands
```powershell
# Run from frontend/ directory
cd frontend

# Create quarantine directory
New-Item -ItemType Directory -Path "audit/submission_cleanup/quarantine" -Force

# Move suspicious files to quarantine
Move-Item -Path "(" -Destination "audit/submission_cleanup/quarantine/suspicious_paren" -Force
Move-Item -Path "{" -Destination "audit/submission_cleanup/quarantine/suspicious_brace" -Force
Move-Item -Path "f.required).length}" -Destination "audit/submission_cleanup/quarantine/suspicious_f_required" -Force
Move-Item -Path "setTimeout(resolve" -Destination "audit/submission_cleanup/quarantine/suspicious_setTimeout" -Force
Move-Item -Path "setSubmittedData(null)}" -Destination "audit/submission_cleanup/quarantine/suspicious_setSubmittedData" -Force

# Remove from git tracking
git rm --cached "(" "{" "f.required).length}" "setTimeout(resolve" "setSubmittedData(null)}"
```

### Acceptance Criteria
- [ ] No zero-byte files in frontend root
- [ ] Files exist in quarantine directory
- [ ] Files no longer tracked by git

---

## Step 2: Fix .gitignore + Remove Tracked Artifacts

**Goal:** Update .gitignore and remove tracked generated files

### Commands
```powershell
# Remove tracked generated files
git rm --cached lint-errors.txt
git rm --cached test-output.txt
git rm --cached badge-size-verification.html
git rm --cached -r playwright-report/
git rm --cached -r test-results/
```

### .gitignore Additions
Add these lines to `frontend/.gitignore`:
```gitignore
# Playwright artifacts
playwright-report/
test-results/

# Generated output files
lint-errors.txt
test-output.txt
badge-size-verification.html
*.verification.html
```

### Acceptance Criteria
- [ ] `git ls-files | Select-String "lint-errors"` returns nothing
- [ ] `git ls-files | Select-String "playwright-report"` returns nothing
- [ ] `git ls-files | Select-String "test-results"` returns nothing
- [ ] .gitignore contains new patterns

---

## Step 3: Fix Dependency Placement

**Goal:** Move axios to dependencies, add lodash

### Commands
```powershell
# Move axios from devDependencies to dependencies
npm install axios --save

# Add lodash (or lodash-es for better tree-shaking)
npm install lodash --save
```

### Acceptance Criteria
- [ ] `npm ls axios` shows it in dependencies
- [ ] `npm ls lodash` shows it in dependencies
- [ ] `npm run build` succeeds
- [ ] `npm audit --omit=dev` shows 0 vulnerabilities

---

## Step 4: Verify Docker Build

**Goal:** Confirm production image is clean

### Commands
```powershell
# Build production image
docker build -t EasySale-frontend:test -f Dockerfile .

# Verify image contents
docker run --rm EasySale-frontend:test ls -la /usr/share/nginx/html/

# Verify no node_modules
docker run --rm EasySale-frontend:test ls /app 2>$null; if ($LASTEXITCODE -ne 0) { Write-Host "PASS: /app not present" }
```

### Acceptance Criteria
- [ ] Docker build succeeds
- [ ] Final image contains only dist/ contents
- [ ] No /app directory in final image
- [ ] No node_modules in final image

---

## Step 5: Verify Bundle Budgets

**Goal:** Confirm all bundle budgets pass

### Commands
```powershell
# Build and check budgets
npm run build
node audit/submission_cleanup/scripts/bundle-budget-check.js
```

### Acceptance Criteria
- [ ] Build succeeds without errors
- [ ] All bundle budgets pass
- [ ] No new Vite chunk warnings

---

## Step 6: Add Guard Scripts

**Goal:** Install CI-ready verification scripts

### Scripts to Verify
- `scripts/quarantine-suspicious-files.ps1` — Quarantine script
- `scripts/repo-clean-check.ps1` — Repo hygiene check
- `scripts/bundle-budget-check.js` — Bundle budget enforcement

### Commands
```powershell
# Run repo clean check
.\audit\submission_cleanup\scripts\repo-clean-check.ps1

# Run bundle budget check
node audit/submission_cleanup/scripts/bundle-budget-check.js
```

### Acceptance Criteria
- [ ] repo-clean-check.ps1 exits with code 0
- [ ] bundle-budget-check.js exits with code 0

---

## Commit Plan

| Commit # | Description | Files Changed |
|----------|-------------|---------------|
| 1 | chore(frontend): quarantine suspicious zero-byte files | 5 files moved, git tracking updated |
| 2 | chore(frontend): update .gitignore and untrack artifacts | .gitignore, 5 files untracked |
| 3 | fix(frontend): move axios/lodash to dependencies | package.json, package-lock.json |
| 4 | chore(frontend): add submission cleanup audit and scripts | audit/submission_cleanup/* |

---

## Rollback Plan

If any step fails:

1. **Step 1 rollback:** Move files back from quarantine, `git checkout -- .`
2. **Step 2 rollback:** `git checkout -- .gitignore`, `git reset HEAD`
3. **Step 3 rollback:** `git checkout -- package.json package-lock.json`, `npm ci`
4. **Step 4-6:** No changes to rollback (verification only)

---

## Post-Implementation Verification

Run these commands after all steps complete:

```powershell
# Full verification suite
.\audit\submission_cleanup\scripts\repo-clean-check.ps1
npm run build
node audit/submission_cleanup/scripts/bundle-budget-check.js
npm audit --omit=dev
```

All commands must exit with code 0.

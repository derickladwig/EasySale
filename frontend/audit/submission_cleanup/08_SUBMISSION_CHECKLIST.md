# Submission Checklist — Frontend

**Date:** 2026-01-29  
**Purpose:** Pre-submission verification checklist

---

## Quick Verification (Run These Commands)

```powershell
# Navigate to frontend directory
cd frontend

# 1. Repo cleanliness check
.\audit\submission_cleanup\scripts\repo-clean-check.ps1
# Expected: All [PASS], exit code 0

# 2. Build verification
npm run build
# Expected: "✓ built in Xs", no errors

# 3. Bundle budget check
node audit/submission_cleanup/scripts/bundle-budget-check.js
# Expected: All budgets pass, exit code 0

# 4. Security audit (production only)
npm audit --omit=dev
# Expected: "found 0 vulnerabilities"

# 5. Git status check
git status
# Expected: No unexpected untracked files in root
```

---

## Detailed Checklist

### 1. Repository Hygiene

| Check | Command | Expected | Status |
|-------|---------|----------|--------|
| No zero-byte files in root | `Get-ChildItem -File \| Where-Object { $_.Length -eq 0 }` | Empty result | ☐ |
| No suspicious filenames tracked | `git ls-files \| Select-String "^\(\|^\{"` | Empty result | ☐ |
| No generated files tracked | `git ls-files \| Select-String "lint-errors\|test-output"` | Empty result | ☐ |
| No test artifacts tracked | `git ls-files \| Select-String "playwright-report\|test-results"` | Empty result | ☐ |

### 2. .gitignore Coverage

| Pattern | Should Be Ignored | Status |
|---------|-------------------|--------|
| `node_modules/` | ✅ | ☐ |
| `dist/` | ✅ | ☐ |
| `coverage/` | ✅ | ☐ |
| `playwright-report/` | ✅ | ☐ |
| `test-results/` | ✅ | ☐ |
| `storybook-static/` | ✅ | ☐ |
| `lint-errors.txt` | ✅ | ☐ |
| `test-output.txt` | ✅ | ☐ |

### 3. Dependencies

| Check | Command | Expected | Status |
|-------|---------|----------|--------|
| axios in dependencies | `npm ls axios` | Listed under dependencies | ☐ |
| lodash in dependencies | `npm ls lodash` | Listed under dependencies | ☐ |
| No prod vulnerabilities | `npm audit --omit=dev` | 0 vulnerabilities | ☐ |

### 4. Build Verification

| Check | Command | Expected | Status |
|-------|---------|----------|--------|
| Build succeeds | `npm run build` | Exit code 0 | ☐ |
| No TypeScript errors | `npm run type-check` | Exit code 0 | ☐ |
| Bundle budgets pass | `node audit/submission_cleanup/scripts/bundle-budget-check.js` | Exit code 0 | ☐ |

### 5. Bundle Budgets

| Metric | Budget | Current | Status |
|--------|--------|---------|--------|
| Initial JS (gzip) | < 100 KB | 77.42 KB | ☐ |
| Largest Chunk (gzip) | < 80 KB | 77.42 KB | ☐ |
| Total JS (gzip) | < 500 KB | 365.17 KB | ☐ |
| Total CSS (gzip) | < 30 KB | 22.83 KB | ☐ |

### 6. Docker Build (Optional)

| Check | Command | Expected | Status |
|-------|---------|----------|--------|
| Docker build succeeds | `docker build -t test .` | Exit code 0 | ☐ |
| No node_modules in image | `docker run --rm test ls /app 2>&1` | Error (no /app) | ☐ |
| Only dist in nginx | `docker run --rm test ls /usr/share/nginx/html` | dist contents | ☐ |

---

## Final Sign-Off

Before submitting, confirm:

- [ ] All verification commands pass
- [ ] No unexpected files in git status
- [ ] Build output is clean (no warnings about missing deps)
- [ ] Bundle sizes are within budget
- [ ] Security audit shows 0 vulnerabilities

---

## Troubleshooting

### If repo-clean-check fails:
```powershell
# Re-run quarantine script
.\audit\submission_cleanup\scripts\quarantine-suspicious-files.ps1

# Update .gitignore if needed
# Then: git add .gitignore && git commit -m "fix: update gitignore"
```

### If build fails:
```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
npm ci --legacy-peer-deps
npm run build
```

### If bundle budget fails:
```powershell
# Check which chunk is over budget
node audit/submission_cleanup/scripts/bundle-budget-check.js --json

# Review dist/stats.html for optimization opportunities
```

---

## Audit Trail

| Document | Location |
|----------|----------|
| Orchestrator Summary | `audit/submission_cleanup/00_ORCHESTRATOR_SUMMARY.md` |
| Suspicious Files Manifest | `audit/submission_cleanup/01_SUSPICIOUS_FILES_MANIFEST.md` |
| Git Tracking Audit | `audit/submission_cleanup/02_GIT_TRACKING_AUDIT.md` |
| Dependency Audit | `audit/submission_cleanup/03_DEPENDENCY_DEVTOOLS_AUDIT.md` |
| Docker Audit | `audit/submission_cleanup/04_BUILD_DOCKER_ARTIFACTS_AUDIT.md` |
| Bundle Audit | `audit/submission_cleanup/05_BUNDLE_SPLIT_PERF_AUDIT.md` |
| Master Plan | `audit/submission_cleanup/06_MASTER_PLAN.md` |
| Implementation Log | `audit/submission_cleanup/07_IMPLEMENTATION_LOG.md` |
| This Checklist | `audit/submission_cleanup/08_SUBMISSION_CHECKLIST.md` |
| Quarantined Files | `audit/submission_cleanup/quarantine/` |

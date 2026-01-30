# Quarantine Manifest

**Quarantine Date:** 2026-01-29  
**Policy:** NO DELETES — files moved, not deleted

---

## Quarantined Files

| Original Name | Quarantine Name | Size | Cause |
|---------------|-----------------|------|-------|
| `(` | `suspicious_paren` | 0 bytes | Code fragment accident |
| `{` | `suspicious_brace` | 0 bytes | Code fragment accident |
| `f.required).length}` | `suspicious_f_required` | 0 bytes | Partial JS expression |
| `setTimeout(resolve` | `suspicious_setTimeout` | 0 bytes | Partial Promise code |
| `setSubmittedData(null)}` | `suspicious_setSubmittedData` | 0 bytes | Partial React setter |

---

## Root Cause Analysis

All 5 files were created on 2026-01-28 at approximately 8:15 PM, suggesting a single incident. Likely causes:

1. **Terminal mishap** — Running a command with code fragment as argument
2. **IDE/Editor glitch** — Auto-save with clipboard content as filename
3. **Script error** — Build script incorrectly parsing output
4. **Copy-paste accident** — Pasting code into "Save As" dialog

---

## Restoration Instructions

If any file needs to be restored (unlikely):

```powershell
# From frontend/ directory
Move-Item -Path "audit/submission_cleanup/quarantine/suspicious_paren" -Destination "(" -Force
# etc.
```

---

## Prevention

Added to `.gitignore`:
```gitignore
# Prevent accidental code fragment files (if they reappear)
# These patterns are not strictly necessary but document the issue
```

The repo-clean-check script will catch any recurrence.

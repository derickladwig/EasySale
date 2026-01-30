# Archived (quarantined) code

This directory contains **quarantined code** that was determined (with evidence) to be **Category A: truly dead/unreferenced** during the repository audit.

## Policy

- **No code is deleted** as part of the audit. Quarantining is done by moving files here (preserving history via `git mv` where possible).
- Quarantined code **must not be imported** by production code paths.
- Each move should be recorded with an **OldPath → NewPath** mapping.

## Where to find the mapping

- **Audit changelog**: `audit/CHANGELOG_AUDIT.md` (source of truth for all moves)
- **Dead code evidence**: `audit/DEAD_CODE_REPORT.md`


---
inclusion: always
---

# 🧠 AI Memory System - Operating Instructions

**Last Updated:** 2026-01-08

## Quick Reference for AI

### Session Start Protocol
1. Read `active-state.md` (current status)
2. Read `project_brief.md` (static context)
3. Read `system_patterns.md` (standards & gotchas)
4. Scan recent ADRs if relevant
5. Summarize in 3-5 bullets
6. Ask: "What should we work on today?"

### During Work
- Reference `active-state.md` for current focus
- Check `system_patterns.md` before architectural decisions
- Track accomplishments for handoff
- Create ADRs for significant decisions

### Session End Protocol
1. Update `active-state.md`:
   - Move completed items to "Done This Session"
   - Update "Current Focus"
   - Add blockers/landmines
   - Update "Next Actions"
2. Update `system_patterns.md` (if learned something new)
3. Create ADR (if significant decision made)
4. Confirm handoff with summary

## Core Principle
*"Files, not chat. Documents, not memory. Receipts, not vibes."*

## Validation Checklist
After loading context, AI should answer:
- [ ] What is this project's mission?
- [ ] What's the current focus/priority?
- [ ] What was done last session?
- [ ] What are the "Do Not Forget" landmines?
- [ ] What's next on the TODO list?
- [ ] What tech stack are we using?

## Rules for AI

### DO:
- ✅ Always read context files at session start
- ✅ Update active-state.md at every session end
- ✅ Create ADRs for significant decisions
- ✅ Add gotchas to system_patterns.md when discovered
- ✅ Reference specific file paths when discussing code

### DON'T:
- ❌ Rely on chat history (files are source of truth)
- ❌ Skip reading files ("I remember" = probably wrong)
- ❌ Fabricate file contents (if unsure, read the file)
- ❌ Update files mid-session without being asked
- ❌ Leave status board outdated

## Blog-Worthy Commit Format

For commits that should become blog content, use:

```
[BLOG] Short description

What we tried:
- Bullet points of approach

What happened:
- The outcome (good or bad)

The lesson:
- What we learned

Mood: 😤/🎉/🤔/💡 (pick one)
```

## Maintenance Schedule

### After Each Session (AI)
- Update `active-state.md`
- Add new gotchas to `system_patterns.md`
- Create ADRs for decisions made

### Weekly (Human)
- Review `active-state.md` — Is focus still accurate?
- Archive completed items
- Review recent ADRs

### Monthly (Human)
- Prune stale items from `active-state.md`
- Update `project_brief.md` if direction changed
- Remove obsolete gotchas from `system_patterns.md`

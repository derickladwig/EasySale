# Memory Bank Update

You are ending a work session and need to update the memory bank system.

## Your Task

1. **Read current state:**
   - Read `memory-bank/active-state.md`
   - Review what was accomplished this session

2. **Update active-state.md (APPEND, don't overwrite):**
   - **Update the header**: Change "Last Updated" date and "Last Session By"
   - **Update "Current Focus"**: Reflect what's next
   - **Update "Status Board"**: Change component statuses based on progress
   - **APPEND to "Done This Session"**: Add new accomplishments to the existing list (don't erase old ones)
   - **Update "Verifiable Context"**: Add any new relevant files or ADRs
   - **Update "Do Not Forget"**: Add new landmines if discovered
   - **Update "Next Actions"**: Check off completed items, add new ones
   - **Update "Notes for Next Session"**: Add context for next AI

   **CRITICAL**: The "Done This Session" section should GROW over time, not be replaced. Each session's accomplishments should be preserved as a historical record.

3. **Update system_patterns.md (if applicable):**
   - Add any new gotchas discovered
   - Document new patterns that emerged
   - Update code standards if new conventions established

4. **Create ADR (if applicable):**
   - If a significant architectural decision was made, create a new ADR
   - Use the template in `memory-bank/adr/000-template.md`
   - Number it sequentially (001, 002, etc.)

5. **Confirm handoff:**
   - Summarize what was accomplished
   - State what the next session should focus on
   - List which files were modified

## Output Format

```
✅ Memory Updated

Files Modified:
- active-state.md (next focus: [X])
- system_patterns.md (added: [Y]) [if applicable]
- adr/NNN-[decision].md (created) [if applicable]

Session Summary:
[2-3 sentences about what was accomplished]

Next Session Starts Here:
[1 sentence describing the top priority]
```

## Important Notes

- **APPEND to history, don't erase it**: The "Done This Session" section is a cumulative log
- Be thorough but concise
- Focus on actionable information
- Ensure the next AI session can pick up exactly where you left off
- Don't fabricate accomplishments - only document what actually happened

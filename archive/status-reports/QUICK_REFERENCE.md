# 🚀 Quick Reference Card

## Session Workflow

### 1️⃣ Start Session
```bash
kiro-cli
@memory-load
```
**What it does:** Loads all context, shows priorities, asks what to work on

### 2️⃣ During Work
- Make regular commits
- Use `[BLOG]` prefix for significant work
- Update DEVLOG.md as you go
- Reference memory-bank files when needed

### 3️⃣ End Session
```bash
@memory-update
```
**What it does:** Updates active-state.md, creates ADRs, confirms handoff

### 4️⃣ Generate Blog (End of Day)
```bash
@blog-generate
```
**What it does:** Synthesizes [BLOG] commits into narrative blog post

---

## [BLOG] Commit Format

```
[BLOG] Short description

What we tried:
- Approach 1
- Approach 2

What happened:
- The outcome (good or bad)

The lesson:
- What we learned

Mood: 😤/🎉/🤔/💡
```

---

## Essential Prompts

| Prompt | Purpose |
|--------|---------|
| `@memory-load` | Start session - load context |
| `@memory-update` | End session - save progress |
| `@blog-generate` | Generate blog from commits |
| `@prime` | Load project context |
| `@plan-feature` | Plan new feature |
| `@execute` | Implement systematically |
| `@code-review` | Quality check |
| `@code-review-hackathon` | Final evaluation |

---

## Memory Bank Files

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `active-state.md` | Current status | Every session end |
| `project_brief.md` | Static context | Rarely |
| `system_patterns.md` | Patterns & gotchas | When learned |
| `adr/NNN-*.md` | Decisions | When made |

---

## File Locations

```
project-root/
├── memory-bank/          # AI context
├── .kiro/
│   ├── steering/         # Project knowledge
│   └── prompts/          # Custom commands
├── blog/                 # Generated posts
├── DEVLOG.md             # Development log
└── README.md             # Project overview
```

---

## Hackathon Scoring

| Criterion | Weight | Status |
|-----------|--------|--------|
| Application Quality | 40% | TBD |
| Kiro CLI Usage | 20% | ✅ Strong |
| Documentation | 20% | ✅ Strong |
| Innovation | 15% | ✅ Good |
| Presentation | 5% | TBD |

---

## Common Commands

```bash
# Start Kiro
kiro-cli

# List prompts
/prompts list

# View context
/context show

# Switch models
/model

# Git log
git log --oneline --decorate

# Find [BLOG] commits
git log --all --grep="\[BLOG\]"
```

---

## Next Steps

1. Test memory bank workflow
2. Decide on hackathon project
3. Make first [BLOG] commit
4. Generate first blog post

---

**Remember:** Files over chat. Documents over memory. Receipts over vibes. 📝

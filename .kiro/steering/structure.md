# Project Structure

## Directory Layout
```
project-root/
├── .git/                      # Version control
├── .kiro/                     # Kiro CLI configuration
│   ├── steering/              # Project knowledge
│   │   ├── product.md         # Product overview
│   │   ├── tech.md            # Technical architecture
│   │   └── structure.md       # This file
│   ├── prompts/               # Custom workflow commands
│   │   ├── memory-load.md     # Load context at session start
│   │   ├── memory-update.md   # Update context at session end
│   │   ├── blog-generate.md   # Generate blog posts
│   │   ├── prime.md           # Load project context
│   │   ├── plan-feature.md    # Feature planning
│   │   ├── execute.md         # Systematic implementation
│   │   └── code-review*.md    # Code quality checks
│   ├── agents/                # Custom AI agents (if needed)
│   └── settings/              # Kiro configuration
├── memory-bank/               # AI persistent context
│   ├── MEMORY_SYSTEM.md       # Operating instructions
│   ├── project_brief.md       # Static project context
│   ├── active-state.md        # Current session state
│   ├── system_patterns.md     # Patterns and gotchas
│   └── adr/                   # Architecture Decision Records
│       ├── 000-template.md
│       └── 001-*.md
├── blog/                      # Generated blog posts
│   └── YYYY-MM-DD-*.md
├── examples/                  # Example documentation
│   ├── README.md
│   └── DEVLOG.md
├── README.md                  # Project overview
├── DEVLOG.md                  # Development log
└── kiro-guide.md              # Kiro CLI reference

[Application code structure TBD based on project choice]
```

## File Naming Conventions
- **Memory bank files**: `snake_case.md`
- **ADRs**: `NNN-kebab-case-title.md` (e.g., `001-memory-bank-system.md`)
- **Steering documents**: `kebab-case.md`
- **Custom prompts**: `kebab-case.md`
- **Blog posts**: `YYYY-MM-DD-slug.md` (e.g., `2026-01-08-setting-up-memory-bank.md`)
- **Application code**: TBD based on project language/framework

## Module Organization

### Memory Bank System
- **MEMORY_SYSTEM.md**: AI operating instructions (read first)
- **project_brief.md**: Static context (mission, tech stack, phases)
- **active-state.md**: Dynamic state (current focus, status, next actions)
- **system_patterns.md**: Learned patterns, standards, gotchas
- **adr/**: Immutable decision records

### Kiro Configuration
- **steering/**: Always-included project knowledge
- **prompts/**: Reusable workflow commands
- **agents/**: Specialized AI assistants (if needed)
- **settings/**: MCP servers, hooks, etc.

### Documentation
- **README.md**: Project overview, setup, usage
- **DEVLOG.md**: Development timeline, decisions, challenges
- **blog/**: Narrative blog posts from development process
- **examples/**: Reference documentation

## Configuration Files
- `.kiro/settings/mcp.json`: MCP server configuration (if needed)
- `.kiro/settings/hooks.json`: Workflow automation hooks (if needed)
- `.env`: Environment variables (not committed)
- `.gitignore`: Exclude sensitive/generated files

## Documentation Structure

### Primary Documentation
1. **README.md**: First thing people read
   - What the project does
   - How to set it up
   - How to use it
   - Architecture overview

2. **DEVLOG.md**: Development process
   - Timeline and milestones
   - Technical decisions
   - Challenges and solutions
   - Time tracking

3. **blog/**: Narrative posts
   - Developer diary style
   - Honest and vulnerable
   - Technical details with story

### Supporting Documentation
- **kiro-guide.md**: Kiro CLI reference
- **examples/**: Example documentation
- **memory-bank/**: AI context (not for human reading)

## Asset Organization
(TBD based on actual project requirements)

**General principles:**
- Keep assets close to code that uses them
- Use descriptive names
- Document asset sources and licenses

## Build Artifacts
(TBD based on actual project requirements)

**General principles:**
- Exclude from version control (.gitignore)
- Document build process in README.md
- Include build instructions in tech.md

## Environment-Specific Files
- `.env.example`: Template for environment variables
- `.env`: Local environment (not committed)
- Document required environment variables in README.md

---

## [2026-01-25] Structure Truth Sync — Canonical paths (Insert-Only)

- **Backend runtime path (observed)**: server startup lives under `backend/crates/server/src/main.rs` (verified during truth sync).
- **Known drift to preserve**: multiple docs/scripts still reference `backend/rust` as a working directory; record this as drift rather than deleting history (Sources: `PROD_READINESS_INFO_PACK.md`; `.kiro/specs/production-readiness-windows-installer/tasks.md`).
- **Pointer**: truth-sync audit package `audit/truth_sync_2026-01-25/*` (see `SOURCES_INDEX.md` for scanned scope).

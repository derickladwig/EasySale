# ⚙️ System Patterns

**Last Updated:** 2026-01-29

## Architecture Principles
Foundational decisions that guide all implementation:
- **Memory over chat**: Files are the source of truth, not conversation history
- **Documentation-driven**: Every decision, pattern, and gotcha gets written down
- **Blog-worthy commits**: Development process is captured in detailed commit messages
- **Kiro-first workflow**: Leverage steering, prompts, and agents extensively
- **Local-only config**: Runtime configuration stored in gitignored `runtime/` directory
- **Safe defaults**: Security-sensitive features (like LAN access) default to most restrictive option

## Code Standards

### Commit Message Format
**Standard commits:**
```
type(scope): brief description

Detailed explanation if needed
```

**Blog-worthy commits:**
```
[BLOG] Short description

What we tried:
- Bullet points of approach

What happened:
- The outcome (good or bad)

The lesson:
- What we learned

Mood: 😤/🎉/🤔/💡
```

### File Organization
- Memory bank: `/memory-bank/` (AI's persistent context)
- Steering docs: `/.kiro/steering/` (project knowledge)
- Custom prompts: `/.kiro/prompts/` (workflow automation)
- ADRs: `/memory-bank/adr/` (architecture decisions)
- Runtime config: `/runtime/` (local-only, gitignored)

### Naming Conventions
- Memory files: `snake_case.md`
- ADRs: `NNN-kebab-case-title.md`
- Steering docs: `kebab-case.md`
- Prompts: `kebab-case.md`

## Preferred Patterns

### Local-Only Configuration Pattern
For settings that should NOT be committed to git (machine-specific, security-sensitive):
1. Store in `runtime/` directory (gitignored)
2. Generate override files (e.g., `docker-compose.override.yml`)
3. Backend API writes to local files, not database
4. Frontend reads current config via API
5. Changes require restart (no hot-reload for security settings)

Example: LAN Access Configuration
- `runtime/network-config.json` - JSON settings
- `runtime/docker-compose.override.yml` - Docker port binding override
- API: `GET/POST /api/network/config`

### Session Management
1. **Session Start:**
   - Read `active-state.md`
   - Read `project_brief.md`
   - Read `system_patterns.md`
   - Scan relevant ADRs
   - Summarize context
   - Ask what to work on

2. **During Session:**
   - Reference memory files, not chat history
   - Track accomplishments for handoff
   - Create ADRs for big decisions

3. **Session End:**
   - Update `active-state.md`
   - Update `system_patterns.md` if learned something
   - Create ADR if made significant decision
   - Confirm handoff

### Documentation Workflow
- **DEVLOG.md**: Update continuously, not just at end
- **README.md**: Keep synchronized with actual implementation
- **ADRs**: Create when making architectural decisions
- **Blog posts**: Generate from [BLOG] commits at end of day

## 🚨 Known Gotchas
| Gotcha | Why It Happens | Solution |
|--------|----------------|----------|
| AI forgets context between sessions | Chat history isn't persistent | Always read memory-bank files at start |
| Commits lack detail for blog | Standard commits too brief | Use [BLOG] format for significant work |
| Documentation falls behind | Updated at end instead of continuously | Update DEVLOG.md as you work |
| Steering docs stay generic | Templates not customized | Customize for specific project needs |
| NodeJS types in browser code | Using NodeJS.Timeout instead of number | Use `number` for setTimeout in browser, `window.setTimeout` explicitly |
| OpenSSL errors in Alpine Rust builds | Transitive dependencies need OpenSSL | Include `openssl-dev openssl-libs-static` in Alpine Dockerfile |
| Docker binary name mismatch | Dockerfile uses wrong binary name | Match Dockerfile binary name to Cargo.toml package name |

## UX Patterns
- **Memory bank updates**: Always at session end, never mid-session
- **ADR creation**: When making decisions that affect architecture
- **Blog generation**: End of day, synthesizing [BLOG] commits
- **Context loading**: Start of every session, no exceptions

## Kiro CLI Patterns

### Essential Workflow
```bash
# Session start
@prime              # Load project context

# Feature development
@plan-feature       # Plan new feature
@execute            # Implement systematically
@code-review        # Quality check

# Submission prep
@code-review-hackathon  # Final evaluation
```

### Custom Prompt Usage
- Prompts ask for details if not provided
- Local prompts override global prompts
- MCP prompts support arguments
- Use `/prompts list` to see available prompts

### Steering Document Strategy
- `product.md`: What we're building and why
- `tech.md`: Technology choices and constraints
- `structure.md`: File organization and patterns
- Custom docs: Domain-specific standards

## Testing Patterns

### Frontend Testing (Vitest + React Testing Library)
- **Test setup**: Global mocks in `src/test/setup.ts` (matchMedia, IntersectionObserver, ResizeObserver)
- **Test utilities**: `renderWithProviders` for components with contexts
- **API mocking**: MSW handlers for consistent API responses
- **Fixtures**: Reusable test data in `src/test/fixtures/`
- **Coverage**: Use `@vitest/coverage-v8` for reporting

### Backend Testing (Cargo Test)
- **Test utilities**: Centralized in `src/test_utils/mod.rs`
- **Mock database**: In-memory SQLite for integration tests
- **Fixtures**: Reusable test data (users, products) in test_utils
- **Integration tests**: Separate from unit tests, use mock database
- **Test organization**: Unit tests in same file as code, integration tests in `tests/` directory

## Database Patterns

### SQLite Compatibility
- **DateTime handling**: Use `String` (ISO 8601 format) instead of `DateTime<Utc>`
  - SQLite doesn't have native datetime type
  - Store as TEXT in ISO 8601 format: `2026-01-09T12:34:56Z`
  - Parse/format in application code
- **Query macros**: Use runtime `query_as::<_, Type>` instead of compile-time `query_as!`
  - Avoids DATABASE_URL requirement at compile time
  - More flexible for development
  - Still type-safe with explicit type annotations

### Migration System
- **Auto-run on startup**: Migrations run automatically when app starts
- **Idempotent**: Safe to run multiple times
- **Seed data**: Include default users/roles in initial migration
- **Indexes**: Add indexes for frequently queried fields (username, email, role)
- **Transaction safety**: Only record migration as "applied" AFTER all statements succeed
- **SQL Parser gotcha**: Semicolons inside parentheses (e.g., `DEFAULT (datetime('now'))`) must be handled specially

### SQL Statement Parsing
When parsing SQL files with multiple statements:
- Track parenthesis depth - don't split on `;` inside `()`
- Track string literals - don't split on `;` inside quotes
- Handle SQL comments - skip `--` line comments
- Handle escaped quotes - `''` is an escaped single quote, not end of string
- Always trim whitespace from parsed statements

## Authentication Patterns

### Password Hashing (Argon2)
- **Dependency**: Add `getrandom` feature to `rand_core` for proper salt generation
  ```toml
  rand_core = { version = "0.6", features = ["getrandom"] }
  ```
- **Configuration**: Use default Argon2 config (secure defaults)
- **Verification**: Use `verify_password` method, not manual comparison

### JWT Tokens
- **Header extraction**: Use `HttpRequest.headers()` instead of `web::Header<String>`
  ```rust
  let auth_header = req.headers().get("Authorization");
  ```
- **Token format**: `Bearer <token>`
- **Expiration**: Set reasonable expiration (8 hours recommended)
- **Storage**: Frontend stores in localStorage (httpOnly cookies preferred for production)

### Permissions System
- **Role-based**: Map roles to permissions (many-to-many)
- **Granular**: 11 permissions covering all operations
- **Frontend context**: Separate AuthContext and PermissionsContext for clarity
- **Route guards**: Use RequirePermission component for protected routes

## Build & Compilation Patterns

### Rust Compilation
- **Release mode**: Always test in release mode before marking complete
  ```bash
  cargo build --release
  ```
- **Strict warnings**: Treat warnings as errors in CI
- **Feature flags**: Use features for optional dependencies

### TypeScript Compilation
- **Strict mode**: Enable all strict checks in tsconfig.json
- **Path aliases**: Use `@common`, `@features`, `@domains` for clean imports
- **Type safety**: No `any` types, use proper type definitions

### TLS/SSL in Rust
- **Prefer rustls over native-tls**: Avoids OpenSSL dependency issues in Docker
- **Static linking**: rustls compiles cleanly without system dependencies
- **Docker builds**: Even with rustls, some transitive dependencies may need OpenSSL
- **Alpine Linux**: Always include `openssl-dev openssl-libs-static` in build stage
  ```toml
  # Use rustls instead of native-tls
  reqwest = { version = "0.11", default-features = false, features = ["rustls-tls", "json"] }
  ```
  ```dockerfile
  # Alpine Dockerfile - include OpenSSL for transitive dependencies
  RUN apk add --no-cache musl-dev sqlite-dev sqlite-static pkgconfig openssl-dev openssl-libs-static
  ```

## Code Quality Patterns

### Pre-commit Hooks
- **Cross-platform**: Create both `.sh` and `.bat` versions
- **Fast**: Run only formatters, not full test suite
- **Fail fast**: Exit on first error
- **Husky**: Use for Git hook management

### Linting & Formatting
- **Consistent**: Same rules across all developers
- **Automated**: Run on pre-commit and in CI
- **Language-specific**: ESLint/Prettier (TS), rustfmt/clippy (Rust), black/flake8 (Python)
- **Root scripts**: `lint-all` and `format-all` for convenience

## Environment Notes
- **OS:** Windows (using cmd shell)
- **Kiro CLI:** Installed and authenticated
- **Project Type:** Hackathon submission template
- **Timeline:** January 5-23, 2026

## Docker Naming Conventions

### Resource Naming
- **Network**: `caps-pos-network` (explicit name, not auto-generated)
- **Volumes**: `caps-pos-*` prefix (e.g., `caps-pos-data`, `caps-pos-cargo-registry`)
- **Containers (dev)**: `caps-pos-*-dev` suffix (e.g., `caps-pos-frontend-dev`)
- **Containers (prod)**: `caps-pos-*` (e.g., `caps-pos-frontend`, `caps-pos-backend`)
- **Images**: `caps-pos-*:latest` (e.g., `caps-pos-frontend:latest`)

### Docker Compose Best Practices
- **Always use explicit names**: Set `name:` property on networks and volumes
  ```yaml
  networks:
    caps-pos-network:
      name: caps-pos-network  # Prevents auto-prefixing with project name
  volumes:
    caps-pos-data:
      name: caps-pos-data     # Consistent naming across environments
  ```
- **Legacy cleanup**: Scripts should clean up old naming conventions
- **Health checks**: Use proper health checks with `depends_on: condition: service_healthy`
- **Restart policies**: Use `restart: unless-stopped` for production

### Bat File Best Practices
- **Always clean up legacy resources**: Remove old volumes/networks/containers
- **Check prerequisites**: Docker running, files exist, ports available
- **Wait for health**: Don't just start containers, wait for them to be healthy
- **Clear error messages**: Tell users exactly what went wrong and how to fix it
- **Pause on completion**: Always pause so users can read output


## Port Configuration Patterns

### Port Selection Strategy
- **Avoid common ports**: Don't use 3000, 5173, 6006, 8000, 8080 (conflict with other dev tools)
- **Use uncommon ports**: Choose ports like 7945, 8923, 7946 to avoid conflicts
- **Sequential numbering**: Keep related services sequential (7945, 7946) for easy memory
- **Document everywhere**: Update all config files, docs, and examples consistently

### Configuration File Hierarchy
1. **Docker Compose** - Port mappings (host:container)
2. **Environment files** - .env.example templates
3. **Application code** - Default values in config modules
4. **Documentation** - README, setup guides, specs

### Port Standardization Process
1. **Audit first**: Search for all port references before making changes
2. **Update systematically**: Environment → Code → Documentation → Cleanup
3. **Verify at checkpoints**: Test after each major phase
4. **Security audit**: Check for vulnerabilities and exposed secrets
5. **Final verification**: Automated checks before manual testing

### Security Audit Checklist
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Check for exposed secrets (passwords, API keys, tokens)
- [ ] Verify .env files excluded from git
- [ ] Review port binding security (localhost vs 0.0.0.0)
- [ ] Confirm privacy compliance (no telemetry, local data)
- [ ] Review third-party dependencies

## Spec Implementation Patterns

### Spec Workflow
1. **Requirements** - User stories with EARS patterns, acceptance criteria
2. **Design** - Architecture, components, correctness properties
3. **Tasks** - Actionable sub-tasks with requirement traceability
4. **Implementation** - Execute tasks systematically with checkpoints
5. **Verification** - Automated checks, manual testing, reports

### Task Organization
- **Group related tasks**: Environment, code, documentation, cleanup
- **Add checkpoints**: Verify progress at logical milestones
- **Reference requirements**: Link each task to specific requirements
- **Mark completion**: Update task status as work progresses

### Report Generation
- **Audit reports**: Document current state before changes
- **Checkpoint reports**: Verify progress at milestones
- **Security reports**: Document security audit findings
- **Verification reports**: Final automated verification results
- **Implementation summaries**: Comprehensive overview of all changes

## Documentation Maintenance Patterns

### Deprecation Strategy
- **Add notices at top**: Clear warning that document is outdated
- **Link to current docs**: Point to replacement documentation
- **Explain historical context**: Why the document exists
- **Consider removal**: Archive or delete if no longer needed

### Documentation Consistency
- **Update primary docs first**: README, setup guides, specs
- **Update secondary docs**: Old summaries, historical documents
- **Remove outdated scripts**: Delete scripts that reference old configuration
- **Verify examples**: Ensure all code examples use current configuration

## Automated Verification Patterns

### Search Strategies
- **Use regex patterns**: `\b(5173|5174|8001|3000|6006)\b` for exact matches
- **Exclude build artifacts**: node_modules, .git, target directories
- **Include relevant files**: yml, yaml, env, ts, tsx, rs, toml, json, md
- **Document findings**: Create reports with file paths and line numbers

### Verification Checklist
1. **Old references**: Search for deprecated values
2. **New references**: Verify correct values in all files
3. **Configuration consistency**: Cross-check all config files
4. **Documentation accuracy**: Verify docs match implementation
5. **Security compliance**: Check for vulnerabilities and secrets

## Context Transfer Patterns

### Session Handoff
When context limit is reached:
1. **Create summary**: Document completed tasks and current state
2. **List next steps**: Clear actions for continuation
3. **Reference key files**: Point to important documents
4. **Update memory bank**: Ensure active-state.md is current
5. **Transfer context**: Provide summary to new session

### Continuation Strategy
When resuming work:
1. **Read summary**: Understand what was completed
2. **Check task status**: Review tasks.md for progress
3. **Read reports**: Review audit and verification reports
4. **Continue systematically**: Pick up where previous session left off
5. **Update memory**: Add new accomplishments to active-state.md


## Settings Implementation Patterns (2026-01-12)

### Rapid UI Development Pattern
**Context:** Implemented 10 settings pages in 120 minutes (~12 min/page)

**Success Factors:**
1. **Consistent Structure:** Every page follows same layout pattern
   - Header with title/description
   - Card-based sections
   - Toggle switches for enable/disable
   - Save buttons with loading states
   - Toast notifications

2. **Mock Data First:** Realistic test data enables:
   - Visual design validation
   - User flow testing
   - Demo/presentation readiness
   - Parallel frontend/backend development

3. **Reusable Components:** Design system components (Card, Button, Input)
   - No custom styling needed
   - Type-safe props
   - Consistent behavior

4. **Incremental Integration:** Each page immediately integrated into navigation
   - Continuous visible progress
   - Immediate testing
   - Small wins build momentum

**Code Template:**
```typescript
export const SettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(mockData);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: API call
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-dark-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-dark-50">Title</h1>
          <p className="text-dark-300 mt-2">Description</p>
        </div>
        
        <Card>
          <div className="p-6">
            {/* Content */}
          </div>
        </Card>
      </div>
    </div>
  );
};
```

### Live Preview Pattern
**Use Case:** Currency and date/time formatting

**Implementation:**
```typescript
// Live currency preview
<div className="text-2xl font-bold text-dark-50">
  {currencyPosition === 'before' 
    ? `${currencySymbol}${amount.toFixed(decimalPlaces)}`
    : `${amount.toFixed(decimalPlaces)}${currencySymbol}`
  }
</div>

// Live date/time preview
<div className="text-lg font-semibold text-dark-50">
  {new Date().toLocaleDateString('en-CA')} 
  {new Date().toLocaleTimeString('en-CA', { hour12: timeFormat === '12h' })}
</div>
```

**Benefits:**
- Immediate visual feedback
- Reduces configuration errors
- Better user understanding

### Confirmation Dialog Pattern
**Use Case:** Destructive actions (delete, disable with data)

**Implementation:**
```typescript
const handleDelete = () => {
  if (!confirm('Are you sure? This cannot be undone.')) {
    return;
  }
  // Proceed with deletion
};

// With context
if (feature.enabled && feature.hasActiveData) {
  const confirmed = confirm(
    `Warning: Disabling "${feature.name}" will hide this feature.\n\n` +
    `Active data exists. Are you sure?`
  );
  if (!confirmed) return;
}
```

**Best Practices:**
- Always explain consequences
- Mention if action is irreversible
- Show what data will be affected

### Expandable Configuration Pattern
**Use Case:** Integration settings, advanced options

**Implementation:**
```typescript
const [selectedItem, setSelectedItem] = useState<string | null>(null);

<Button onClick={() => setSelectedItem(
  selectedItem === item.id ? null : item.id
)}>
  {selectedItem === item.id ? 'Hide' : 'Configure'}
</Button>

{selectedItem === item.id && (
  <div className="pt-3 border-t border-dark-700 space-y-3">
    {/* Configuration fields */}
  </div>
)}
```

**Benefits:**
- Cleaner initial view
- Progressive disclosure
- Reduces cognitive load

### Status Badge Pattern
**Use Case:** Connection status, feature status, sync status

**Implementation:**
```typescript
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'connected':
      return 'px-2 py-1 text-xs font-medium bg-success-500/20 text-success-400 rounded';
    case 'error':
      return 'px-2 py-1 text-xs font-medium bg-error-500/20 text-error-400 rounded';
    default:
      return 'px-2 py-1 text-xs font-medium bg-dark-700 text-dark-400 rounded';
  }
};

<span className={getStatusBadge(status)}>
  {status === 'connected' ? 'Connected' : 'Not Connected'}
</span>
```

**Color Coding:**
- Success: Green (bg-success-500/20, text-success-400)
- Warning: Yellow (bg-warning-500/20, text-warning-400)
- Error: Red (bg-error-500/20, text-error-400)
- Neutral: Gray (bg-dark-700, text-dark-400)

## Performance Optimization Patterns

### Avoid Premature Optimization
**Lesson:** Focus on functionality first, optimize later

**Approach:**
1. Build with mock data
2. Ensure UI works correctly
3. Add API integration
4. Measure performance
5. Optimize if needed

**Don't:**
- Add virtualization before testing with real data
- Implement complex caching before measuring
- Optimize queries before profiling

### Mock Data Strategy
**Purpose:** Enable rapid development without backend

**Structure:**
```typescript
interface Entity {
  id: string;
  // ... other fields
}

const mockData: Entity[] = [
  { id: '1', /* realistic data */ },
  { id: '2', /* realistic data */ },
];
```

**Best Practices:**
- Use realistic data (not "test1", "test2")
- Include edge cases (empty, long text, special chars)
- Match expected API response structure
- Keep data minimal but representative

## Gotchas & Solutions

### Toggle Switch Styling
**Issue:** Custom checkbox styling is verbose

**Solution:** Create reusable toggle component or use consistent pattern:
```typescript
<label className="relative inline-flex items-center cursor-pointer">
  <input type="checkbox" checked={value} onChange={handler} className="sr-only peer" />
  <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
</label>
```

### Form State Management
**Issue:** Many form fields require lots of useState calls

**Solution:** Consider using a form library (React Hook Form) or group related state:
```typescript
// Instead of:
const [field1, setField1] = useState('');
const [field2, setField2] = useState('');

// Consider:
const [formData, setFormData] = useState({
  field1: '',
  field2: '',
});
```

### Icon Import Organization
**Issue:** Many icon imports clutter the file

**Solution:** Group imports logically:
```typescript
import {
  // Navigation
  Settings, Users, Store,
  // Actions
  Plus, Edit, Trash2,
  // Status
  Check, X, AlertCircle,
} from 'lucide-react';
```

## Next Phase Patterns

### API Integration Pattern
**Upcoming:** Connect settings pages to backend

**Structure:**
```typescript
// 1. Create API service
export const settingsApi = {
  getPreferences: () => api.get('/api/settings/preferences'),
  updatePreferences: (data) => api.put('/api/settings/preferences', data),
};

// 2. Use in component
const { data, isLoading, error } = useQuery('preferences', settingsApi.getPreferences);
const mutation = useMutation(settingsApi.updatePreferences);

// 3. Handle submission
const handleSave = async () => {
  try {
    await mutation.mutateAsync(formData);
    toast.success('Settings saved');
  } catch (error) {
    toast.error(error.message);
  }
};
```

**Tools to Consider:**
- React Query for data fetching
- Zod for validation
- React Hook Form for form management


## Sync System Patterns (Added 2026-01-15)

### Credential Management
- **Pattern**: Use `CredentialService` for all credential operations
- **Why**: Ensures AES-256-GCM encryption, no plaintext in memory
- **Implementation**: 
  - Store credentials with `store_credentials(tenant_id, PlatformCredentials)`
  - Retrieve with `get_credentials(tenant_id, platform)` - auto-decrypts
  - OAuth tokens stored separately with `store_oauth_tokens()`
  - Never log plaintext credentials or tokens

### Incremental Sync
- **Pattern**: Track `last_sync_at` per tenant/connector/entity
- **Why**: Reduces API calls, faster sync, less data transfer
- **Implementation**:
  - Store timestamp in `sync_state` table after successful sync
  - Query with `WHERE updated_at > last_sync_at` for incremental mode
  - Fall back to full sync if no timestamp exists
  - Only update timestamp on success or partial success

### Webhook Processing
- **Pattern**: Queue → Background Processing
- **Why**: Non-blocking webhook responses, reliable processing
- **Implementation**:
  - Webhook handler validates signature and queues to `sync_queue`
  - Spawn background task with `tokio::spawn`
  - Process queue with `orchestrator.process_queue()`
  - Track status: pending → processing → completed/failed

### Transformer Configuration
- **Pattern**: Database-driven with fallback to defaults
- **Why**: Per-tenant customization without code changes
- **Implementation**:
  - Store config as JSON in `settings` table
  - Query with `key = 'transformer_config'`
  - Deserialize with `serde_json::from_str()`
  - Fall back to `TransformerConfig::default()` if not found

### Order Fetching
- **Pattern**: Dynamic query building with filters
- **Why**: Flexible filtering, batch size control, incremental support
- **Implementation**:
  - Start with base query: `SELECT id FROM orders WHERE tenant_id = ?`
  - Add filters dynamically: date range, status, payment_status
  - Add incremental filter: `AND updated_at > last_sync_at`
  - Limit batch size: `LIMIT 1000` (configurable)
  - Log query parameters for debugging

### Error Handling in Sync
- **Pattern**: Classify, log, retry with backoff
- **Why**: Resilient to transient failures, clear error messages
- **Implementation**:
  - Classify errors: authentication, validation, rate_limit, conflict, network
  - Log with context: tenant_id, entity_type, entity_id, error details
  - Retry with exponential backoff for transient errors
  - Skip or fail for permanent errors
  - Update queue status appropriately

## Rust Patterns (Added 2026-01-15)

### Async in Sync Context
- **Gotcha**: Can't call async from sync function
- **Solution**: Use `tokio::task::block_in_place()` with `Handle::current().block_on()`
- **Example**:
  ```rust
  let tokens = tokio::task::block_in_place(|| {
      tokio::runtime::Handle::current().block_on(async {
          self.credential_service.get_oauth_tokens(tenant_id, platform).await
      })
  })?;
  ```

### Serde Derives for Config
- **Pattern**: Add `#[derive(Serialize, Deserialize)]` to config structs
- **Why**: Enables JSON storage in database
- **Implementation**:
  ```rust
  #[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
  pub struct TransformerConfig { ... }
  ```

### Match Expression Assignment
- **Pattern**: Use match as expression, not statement
- **Why**: Cleaner code, no unused variable warnings
- **Bad**:
  ```rust
  let mut result = default_value;
  match condition {
      Case1 => { result = value1; }
      Case2 => { result = value2; }
  }
  ```
- **Good**:
  ```rust
  let result = match condition {
      Case1 => value1,
      Case2 => value2,
  };
  ```

### Arc for Shared Services
- **Pattern**: Wrap services in `Arc<T>` for shared ownership
- **Why**: Multiple references without cloning, thread-safe
- **Implementation**:
  ```rust
  pub struct SyncOrchestrator {
      credential_service: Arc<CredentialService>,
      direction_control: Arc<SyncDirectionControl>,
  }
  ```

## Testing Patterns (Added 2026-01-15)

### Sandbox Environment Setup
- **Pattern**: Use staging/sandbox for all external services
- **Why**: Safe testing without affecting production data
- **Services**:
  - WooCommerce: Create staging store
  - QuickBooks: Use sandbox realm
  - Supabase: Create test project
- **Configuration**: Separate credentials per environment

### Integration Test Flow
1. Set up sandbox credentials
2. Trigger manual sync
3. Verify data in target system
4. Test webhook flow
5. Test incremental sync
6. Test error scenarios
7. Clean up test data

### Manual Testing Checklist
- [ ] Configure credentials via API
- [ ] Test connection status
- [ ] Trigger full sync
- [ ] Verify orders synced
- [ ] Send test webhook
- [ ] Verify webhook processed
- [ ] Trigger incremental sync
- [ ] Verify only new orders synced
- [ ] Check sync logs
- [ ] Test error handling

## Documentation Patterns (Added 2026-01-15)

### Session Summary Structure
1. **Overview**: What was accomplished
2. **Tasks Completed**: Detailed breakdown
3. **Files Modified**: List with line counts
4. **Build Status**: Errors, warnings, time
5. **What's Working**: Feature list
6. **What's Next**: Prioritized tasks
7. **Testing Checklist**: What to test

### Quick Reference Format
- **Quick Start**: How to run
- **API Endpoints**: List with examples
- **Configuration**: Environment variables, database settings
- **Debugging**: Common issues and solutions
- **Testing**: Manual test procedures

### Implementation Summary Format
- **What Was Done**: Bullet list
- **Files Modified**: With line counts
- **Key Changes**: Code snippets
- **Impact**: What this enables
- **Requirements Met**: Traceability


# Design Document: Port Configuration Standardization

## Overview

This design systematically updates all port configurations across the CAPS POS system to use standardized, conflict-free port numbers. The approach involves identifying all files with port references, updating them to use the correct ports (7945, 8923, 7946), and removing all references to old ports (5173, 5174, 8001, 3000, 6006).

**Target Port Configuration:**
- Frontend (Vite): 7945
- Backend (Rust API): 8923
- Storybook: 7946

**Rationale:**
- These ports are in uncommon ranges, avoiding conflicts with default development tools
- They're easy to remember (7945/7946 are adjacent)
- They don't conflict with common ports used by other services

## Architecture

### Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                  Docker Compose                         │
│              (docker-compose.yml)                       │
│  Defines port mappings and environment variables        │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Frontend   │  │   Backend    │  │  Storybook   │
│   Container  │  │   Container  │  │   Container  │
│              │  │              │  │              │
│  Port: 7945  │  │  Port: 8923  │  │  Port: 7946  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Vite Config  │  │  Rust main   │  │ SB Config    │
│ vite.config  │  │   main.rs    │  │ .storybook/  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Configuration Sources

**1. Docker Compose (docker-compose.yml)**
- Primary source of truth for port mappings
- Sets environment variables for containers
- Maps host ports to container ports

**2. Environment Files**
- `.env.example` (root) - Template for local development
- `backend/rust/.env.example` - Backend-specific configuration
- Developers copy these to `.env` for local overrides

**3. Application Configuration**
- `frontend/vite.config.ts` - Vite dev server port
- `frontend/.storybook/main.ts` - Storybook port
- `backend/rust/src/main.rs` - API server port binding
- `frontend/src/lib/api/client.ts` - API client base URL

**4. Documentation**
- `README.md` - Main project documentation
- `DOCKER_SETUP.md` - Docker setup instructions
- `.kiro/specs/foundation-infrastructure/design.md` - Architecture documentation
- Various summary and guide files

## Components and Interfaces

### Port Configuration Matrix

| Component | File | Current Value | Target Value | Update Method |
|-----------|------|---------------|--------------|---------------|
| Docker Frontend | docker-compose.yml | 7945:7945 | 7945:7945 | ✅ Already correct |
| Docker Backend | docker-compose.yml | 8923:8923 | 8923:8923 | ✅ Already correct |
| Docker Storybook | docker-compose.yml | 7946:7946 | 7946:7946 | ✅ Already correct |
| Root Env | .env.example | Mixed | 7945/8923 | Update values |
| Backend Env | backend/rust/.env.example | 3000 | 8923 | Update API_PORT |
| Vite Config | frontend/vite.config.ts | Check | 7945 | Update server.port |
| Storybook Config | frontend/.storybook/main.ts | Check | 7946 | Update port |
| API Client | frontend/src/lib/api/client.ts | Check | Use VITE_API_URL | Verify env var usage |
| Backend Main | backend/rust/src/main.rs | Check | 8923 | Verify env var usage |

### File Update Strategy

**Phase 1: Environment Files**
1. Update `.env.example` with correct ports
2. Update `backend/rust/.env.example` with API_PORT=8923
3. Verify Docker Compose already has correct mappings

**Phase 2: Application Code**
1. Update `frontend/vite.config.ts` to use port 7945
2. Update `frontend/.storybook/main.ts` to use port 7946
3. Verify `frontend/src/lib/api/client.ts` uses VITE_API_URL
4. Verify `backend/rust/src/main.rs` reads API_PORT from env

**Phase 3: Documentation**
1. Update `README.md` with correct ports
2. Update `DOCKER_SETUP.md` with correct ports
3. Update `.kiro/specs/foundation-infrastructure/design.md`
4. Update or remove outdated summary files

**Phase 4: Cleanup**
1. Search for and remove references to old ports:
   - 5173 (old Vite default)
   - 5174 (migration attempt)
   - 8001 (migration attempt)
   - 3000 (original backend)
   - 6006 (old Storybook default)
2. Verify no conflicting port references remain

## Data Models

### Environment Variable Schema

```typescript
// Root .env.example
interface RootEnvConfig {
  // Frontend
  VITE_PORT: 7945;
  VITE_API_URL: "http://localhost:8923";
  
  // Backend
  API_PORT: 8923;
  DATABASE_URL: string;
  
  // Other configs...
}

// Backend .env.example
interface BackendEnvConfig {
  API_PORT: 8923;
  DATABASE_URL: string;
  RUST_LOG: string;
  // Other backend configs...
}
```

### Vite Configuration

```typescript
// frontend/vite.config.ts
export default defineConfig({
  server: {
    port: 7945,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8923',
        changeOrigin: true,
      },
    },
  },
  // ... other config
});
```

### Storybook Configuration

```typescript
// frontend/.storybook/main.ts
const config: StorybookConfig = {
  // ... other config
  core: {
    builder: '@storybook/builder-vite',
  },
  viteFinal: async (config) => {
    return {
      ...config,
      server: {
        ...config.server,
        port: 7946,
      },
    };
  },
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Port Consistency Across Configuration Files
*For any* configuration file (Docker Compose, .env, Vite config, Storybook config), the port numbers must match the standardized values (7945, 8923, 7946).
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: No Old Port References
*For any* file in the repository (excluding node_modules, .git), there must be no references to the old ports (5173, 5174, 8001, 3000, 6006) in configuration contexts.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 3: Docker Port Mapping Consistency
*For any* service in docker-compose.yml, the host port must equal the container port (no port translation).
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 4: Environment Variable Propagation
*For any* application code that binds to a port, it must read the port from an environment variable, not hardcode it.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 5: Documentation Accuracy
*For any* documentation file that mentions port numbers, the ports must match the standardized values (7945, 8923, 7946).
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

## Error Handling

### Configuration Errors

**Port Already in Use:**
- Error: "Address already in use" when starting services
- Solution: Check if another process is using the port, kill it or change the port
- Prevention: Use uncommon ports (7945, 8923, 7946) to avoid conflicts

**Environment Variable Not Set:**
- Error: Service fails to start because port is undefined
- Solution: Ensure .env file exists and has correct values
- Prevention: Provide .env.example with all required variables

**Port Mismatch Between Docker and Application:**
- Error: Service starts but is inaccessible
- Solution: Ensure Docker port mapping matches application port binding
- Prevention: Use same port for host and container (no translation)

### Update Errors

**Missed File Update:**
- Error: Some files still reference old ports
- Solution: Use grep/search to find all port references
- Prevention: Follow systematic update checklist

**Conflicting Port References:**
- Error: Different files specify different ports for same service
- Solution: Identify source of truth (Docker Compose) and update all files to match
- Prevention: Update all files in same commit

## Testing Strategy

### Manual Verification Tests

**Test 1: Services Start Successfully**
1. Run `docker-compose up`
2. Verify frontend accessible at http://localhost:7945
3. Verify backend accessible at http://localhost:8923
4. Verify Storybook accessible at http://localhost:7946

**Test 2: API Communication**
1. Open frontend at http://localhost:7945
2. Verify API calls reach backend at http://localhost:8923
3. Check browser network tab for correct API URL

**Test 3: No Port Conflicts**
1. Start all services
2. Verify no "port already in use" errors
3. Verify all services bind to correct ports

### Automated Verification

**Property Test 1: Port Consistency**
```bash
# Search for port references in config files
grep -r "5173\|5174\|8001\|3000\|6006" \
  --include="*.yml" \
  --include="*.yaml" \
  --include="*.env*" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.rs" \
  --exclude-dir="node_modules" \
  --exclude-dir=".git" \
  --exclude-dir="target"

# Should return no results (or only in comments/docs explaining the change)
```

**Property Test 2: Correct Port Usage**
```bash
# Verify correct ports are used
grep -r "7945\|8923\|7946" \
  --include="*.yml" \
  --include="*.yaml" \
  --include="*.env*" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.rs" \
  --exclude-dir="node_modules" \
  --exclude-dir=".git" \
  --exclude-dir="target"

# Should find references in all config files
```

### Integration Tests

**Test: Full Stack Startup**
1. Clean environment (remove .env files)
2. Copy .env.example to .env
3. Run `docker-compose up`
4. Verify all services start without errors
5. Verify services accessible on correct ports
6. Verify API communication works

## Deployment Considerations

### Migration Steps

**For Existing Developers:**
1. Pull latest changes
2. Stop running containers: `docker-compose down`
3. Update .env file with new ports (or copy from .env.example)
4. Restart containers: `docker-compose up`
5. Update browser bookmarks to new URLs

**For New Developers:**
1. Clone repository
2. Copy .env.example to .env
3. Run `docker-compose up`
4. Access services at documented URLs

### Rollback Plan

If issues arise:
1. Revert commits that changed port configuration
2. Restore old .env files
3. Restart services

### Communication

**Notify Team:**
- Send message about port changes
- Update team wiki/documentation
- Include new URLs in onboarding docs

**Update CI/CD:**
- Verify CI/CD pipelines use correct ports
- Update any hardcoded port references in scripts
- Test deployment process with new ports

## Documentation Updates

### Files to Update

**Primary Documentation:**
- `README.md` - Update "Getting Started" section with new URLs
- `DOCKER_SETUP.md` - Update Docker instructions with new ports
- `.kiro/specs/foundation-infrastructure/design.md` - Update architecture diagrams

**Secondary Documentation:**
- `PORT_UPDATE_COMPLETE.md` - Update or remove (may be outdated)
- `QUICK_FIX_SUMMARY.md` - Update or remove old port references
- `README.old.md` - Update or mark as deprecated
- Any other files with port references

### Documentation Template

```markdown
## Development URLs

- Frontend: http://localhost:7945
- Backend API: http://localhost:8923
- Storybook: http://localhost:7946

## Port Configuration

The system uses the following ports:
- **7945**: Frontend (Vite dev server)
- **8923**: Backend (Rust API)
- **7946**: Storybook (Component documentation)

These ports are configured in:
- `docker-compose.yml` - Container port mappings
- `.env.example` - Environment variable templates
- `frontend/vite.config.ts` - Vite dev server
- `frontend/.storybook/main.ts` - Storybook server
```

## Security and Privacy Considerations

### Port Security

**Port Binding:**
- Services should bind to localhost (127.0.0.1) in development to prevent external access
- Docker containers should not expose ports to 0.0.0.0 unless necessary
- Use Docker's internal networking for container-to-container communication

**Environment Variables:**
- Never commit .env files with sensitive data
- .env.example should contain placeholder values only
- Sensitive data (API keys, passwords) should never be in version control

### Privacy Considerations

**Local Business Data:**
- This is a POS system handling private customer and business data
- All data must remain local and secure
- No data should be transmitted to external services without explicit configuration
- Audit logs should not expose sensitive customer information

### Dependency Security

**Package Vulnerabilities:**
- Run `npm audit` to check for known vulnerabilities in frontend dependencies
- Run `cargo audit` to check for known vulnerabilities in Rust dependencies
- Update vulnerable packages before deployment
- Review dependency licenses for compliance

**Third-Party Services:**
- Minimize external dependencies
- Review any third-party services for data privacy compliance
- Ensure no telemetry or analytics that could leak business data
- Verify all external connections are necessary and documented

### Configuration Security

**Exposed Secrets:**
- Check for accidentally committed secrets (API keys, passwords, tokens)
- Use tools like `git-secrets` or `trufflehog` to scan history
- Rotate any exposed credentials immediately

**File Permissions:**
- .env files should have restricted permissions (600)
- Database files should be readable only by application user
- Backup files should be encrypted and access-controlled

## Implementation Notes

### Search Patterns

**Find Old Port References:**
```bash
# Search for old ports in config files
rg "5173|5174|8001|3000|6006" \
  --type-add 'config:*.{yml,yaml,env,env.example,ts,tsx,rs}' \
  -t config \
  --no-ignore-vcs
```

**Find New Port References:**
```bash
# Verify new ports are used
rg "7945|8923|7946" \
  --type-add 'config:*.{yml,yaml,env,env.example,ts,tsx,rs}' \
  -t config \
  --no-ignore-vcs
```

**Security Audit Commands:**
```bash
# Check for exposed secrets
git secrets --scan

# Audit npm dependencies
cd frontend && npm audit

# Audit Rust dependencies
cd backend/rust && cargo audit

# Check for hardcoded credentials
rg -i "password|api_key|secret|token" \
  --glob '!node_modules' \
  --glob '!.git' \
  --glob '!target'
```

### Update Checklist

- [ ] Update `.env.example` (root)
- [ ] Update `backend/rust/.env.example`
- [ ] Verify `docker-compose.yml` (should already be correct)
- [ ] Update `frontend/vite.config.ts`
- [ ] Update `frontend/.storybook/main.ts`
- [ ] Verify `frontend/src/lib/api/client.ts`
- [ ] Verify `backend/rust/src/main.rs`
- [ ] Update `README.md`
- [ ] Update `DOCKER_SETUP.md`
- [ ] Update `.kiro/specs/foundation-infrastructure/design.md`
- [ ] Update/remove `PORT_UPDATE_COMPLETE.md`
- [ ] Update/remove `QUICK_FIX_SUMMARY.md`
- [ ] Update/remove `README.old.md`
- [ ] Search for and remove old port references
- [ ] Run security audit (npm audit, cargo audit)
- [ ] Check for exposed secrets
- [ ] Verify no privacy issues
- [ ] Test all services start correctly
- [ ] Test API communication works
- [ ] Commit changes with clear message


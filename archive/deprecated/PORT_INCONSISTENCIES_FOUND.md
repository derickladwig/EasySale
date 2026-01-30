# Port Configuration Inconsistencies - Audit Report

## Summary

The CAPS POS system has **multiple conflicting port configurations** across different files. This audit identifies all inconsistencies and proposes a standardized configuration.

## Current State (Inconsistent)

### Docker Compose (docker-compose.yml)
- ❌ Frontend: **7945** (WRONG - should be 5173)
- ❌ Backend: **8923** (WRONG - should be 8001)
- ❌ Storybook: **7946** (WRONG - should be 6006)
- ❌ VITE_API_URL: http://localhost:**8923** (WRONG - should be 8001)

### Environment Files

#### Root .env.example
- ✅ API_PORT: **8923** (matches docker-compose but WRONG standard)
- ✅ VITE_PORT: **7945** (matches docker-compose but WRONG standard)
- ✅ VITE_API_URL: http://localhost:**8923** (consistent but WRONG)

#### backend/rust/.env.example
- ❌ API_PORT: **3000** (WRONG - conflicts with docker-compose)

### Documentation Files

#### README.md
- ❌ Frontend: http://localhost:**7945**
- ❌ Backend: http://localhost:**8923**
- ❌ Storybook: http://localhost:**7946**

#### README.old.md
- ✅ Frontend: http://localhost:**5173** (CORRECT!)
- ❌ Backend: http://localhost:**3000** (OLD)
- ✅ Storybook: http://localhost:**6006** (CORRECT!)

#### QUICK_FIX_SUMMARY.md
- ❌ Frontend: http://localhost:**5174** (WRONG)
- ✅ Backend: http://localhost:**8001** (CORRECT!)

#### PORT_UPDATE_COMPLETE.md
- ❌ Frontend: **7945** (documents wrong migration)
- ❌ Backend: **8923** (documents wrong migration)
- ❌ Storybook: **7946** (documents wrong migration)

#### .kiro/specs/foundation-infrastructure/design.md
- ✅ Frontend baseURL: http://localhost:**5173** (CORRECT!)
- ❌ VITE_API_URL: http://localhost:**3000** (OLD)
- ✅ Storybook: **6006** (CORRECT!)

## Proposed Standard Configuration

| Service | Port | Rationale |
|---------|------|-----------|
| **Frontend** | **5173** | Vite's default port, widely recognized |
| **Backend** | **8001** | Avoids conflicts with 3000 (Node), 8000 (Python), 8080 (common) |
| **Storybook** | **6006** | Storybook's default port, widely recognized |

## Files Requiring Updates

### Critical (Breaks Functionality)
1. ✅ **docker-compose.yml** - Change all ports to 5173, 8001, 6006
2. ✅ **.env.example** - Update API_PORT, VITE_PORT, VITE_API_URL
3. ✅ **backend/rust/.env.example** - Update API_PORT to 8001

### Important (Documentation)
4. ✅ **README.md** - Update all port references
5. ✅ **DOCKER_SETUP.md** - Update port references
6. ✅ **.kiro/specs/foundation-infrastructure/design.md** - Fix VITE_API_URL

### Cleanup (Remove/Update Outdated)
7. ✅ **PORT_UPDATE_COMPLETE.md** - Mark as outdated or delete
8. ✅ **PORT_MIGRATION_PLAN.md** - Mark as outdated or delete
9. ✅ **PORT_CONFIGURATION_FIX.md** - Mark as outdated or delete
10. ✅ **QUICK_FIX_SUMMARY.md** - Update or mark as outdated

## Root Cause Analysis

The port confusion stems from **multiple migration attempts**:

1. **Original Setup**: Frontend 5173, Backend 3000, Storybook 6006
2. **First Migration** (PORT_CONFIGURATION_FIX.md): Changed Backend to 8001, Frontend to 5174
3. **Second Migration** (PORT_UPDATE_COMPLETE.md): Changed to 7945, 8923, 7946
4. **Current Docker Fix**: Reverted Frontend to 5173, kept Backend 8001, Storybook 6006

**Result**: Files updated at different times now have different port numbers.

## Recommended Action

Create a spec (`.kiro/specs/port-configuration-fix/`) to:
1. Standardize on 5173, 8001, 6006
2. Update all files systematically
3. Remove/archive outdated migration documents
4. Add port configuration tests to prevent future drift

## Impact Assessment

### High Impact (Service Won't Start)
- Docker Compose port conflicts
- Environment variable mismatches
- CORS configuration errors

### Medium Impact (Confusing for Developers)
- Documentation showing wrong ports
- Multiple "correct" port numbers in different files

### Low Impact (Historical)
- Old migration documents
- Outdated README files

## Next Steps

1. ✅ Create requirements spec (DONE - see `.kiro/specs/port-configuration-fix/requirements.md`)
2. ⬜ Create design spec with implementation plan
3. ⬜ Create tasks for systematic updates
4. ⬜ Execute port standardization
5. ⬜ Verify all services start correctly
6. ⬜ Update memory bank with final configuration

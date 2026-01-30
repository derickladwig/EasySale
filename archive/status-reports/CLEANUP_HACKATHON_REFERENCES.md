# Cleanup Plan - Remove Hackathon References & Update Node

**Status:** Action Required  
**Priority:** High (Professionalism & Security)

---

## Issues Found

### 1. Node.js Version (Security Risk)
**Current:** Node 18.20.8  
**Required:** Node 20+ (latest LTS)  
**Risk:** Security vulnerabilities, unsupported packages

### 2. Hackathon References (Professionalism)
**Found in 15+ files:**
- Docker cleanup scripts
- Documentation files
- Memory bank files
- Development logs
- Guide files

---

## Files That Need Updates

### Node Version Updates (3 files)

#### 1. `frontend/Dockerfile`
**Line 4:** `FROM node:18-alpine AS builder`  
**Change to:** `FROM node:20-alpine AS builder`

#### 2. `frontend/Dockerfile.dev`
**Line 1:** `FROM node:18-alpine`  
**Change to:** `FROM node:20-alpine`

#### 3. `frontend/package.json`
**Add engines field:**
```json
"engines": {
  "node": ">=20.0.0",
  "npm": ">=10.0.0"
}
```

### Hackathon Reference Removals (15+ files)

#### Documentation Files (Keep but Update)
1. **`START_HERE.md`** - Remove path reference
2. **`QUICK_REFERENCE.md`** - Remove hackathon scoring section
3. **`kiro-guide.md`** - Remove hackathon-specific tips
4. **`examples/DEVLOG.md`** - Remove hackathon reference
5. **`DEVLOG.md`** - Update title

#### Memory Bank Files (Keep for History)
These document the development process - keep but add note:
1. **`memory-bank/system_patterns.md`** - Add historical note
2. **`memory-bank/adr/001-memory-bank-system.md`** - Add historical note
3. **`memory-bank/active-state.md`** - Keep as-is (historical record)

#### Docker Scripts (Update)
1. **`docker-start.bat`** - Keep cleanup (it's removing old resources)
2. **`docker-start.sh`** - Keep cleanup
3. **`docker-clean.bat`** - Keep cleanup
4. **`docker-clean.sh`** - Keep cleanup

#### Status Documents (Update)
1. **`DOCKER_FIX_SUMMARY.md`** - Update wording
2. **`DOCKER_NAMING_FIXES.md`** - Update wording

---

## Recommended Approach

### Option 1: Complete Removal (Recommended)
- Remove all hackathon references
- Update to "development project" or "initial build"
- Keep technical content, remove competition context

### Option 2: Historical Note
- Keep references but add disclaimer:
  ```
  Note: This project was initially developed during a hackathon.
  All hackathon-specific content has been removed for production use.
  ```

### Option 3: Separate Branch
- Create `hackathon-history` branch with original content
- Clean main branch completely
- Best of both worlds

---

## White-Label Verification

### Brand Names to Check
- ✅ EasySale (generic, good)
- ✅ CAPS (your business, good)
- ❌ Dynamous (hackathon organizer, remove)
- ❌ Kiro Hackathon (competition, remove)

### What Should Remain
- ✅ EasySale (product name)
- ✅ CAPS (your business)
- ✅ Technical documentation
- ✅ Architecture decisions
- ✅ Development patterns

### What Should Be Removed
- ❌ Hackathon scoring criteria
- ❌ Competition deadlines
- ❌ Dynamous references
- ❌ Hackathon-specific tips
- ❌ Submission preparation

---

## Action Items

### Immediate (Security)
1. [ ] Update Node to 20 in Dockerfiles
2. [ ] Add engines field to package.json
3. [ ] Rebuild Docker images
4. [ ] Test with Node 20

### High Priority (Professionalism)
1. [ ] Remove hackathon references from user-facing docs
2. [ ] Update DEVLOG.md title
3. [ ] Clean up guide files
4. [ ] Update status documents

### Medium Priority (Polish)
1. [ ] Review memory bank files
2. [ ] Add historical notes where appropriate
3. [ ] Verify all brand references
4. [ ] Update README if needed

### Low Priority (Optional)
1. [ ] Create hackathon-history branch
2. [ ] Archive original content
3. [ ] Document the journey (blog post?)

---

## Verification Checklist

### Node Version
- [ ] Dockerfile uses node:20-alpine
- [ ] Dockerfile.dev uses node:20-alpine
- [ ] package.json has engines field
- [ ] Build succeeds with Node 20
- [ ] No EBADENGINE warnings

### Hackathon References
- [ ] No "hackathon" in user-facing docs
- [ ] No "dynamous" references
- [ ] No competition scoring
- [ ] No submission deadlines
- [ ] Memory bank has historical notes

### White-Label
- [ ] Only EasySale and CAPS branding
- [ ] No third-party competition names
- [ ] Professional documentation
- [ ] Production-ready appearance

---

## Impact Assessment

### Node 20 Update
**Risk:** Low  
**Benefit:** High (security, compatibility)  
**Time:** 30 minutes  
**Breaking Changes:** None expected

### Hackathon Cleanup
**Risk:** None  
**Benefit:** High (professionalism)  
**Time:** 1-2 hours  
**Breaking Changes:** None (documentation only)

---

## Recommendation

**Do both immediately:**

1. **Node 20 Update** (30 min)
   - Critical for security
   - Fixes EBADENGINE warnings
   - Required for latest packages

2. **Hackathon Cleanup** (1-2 hours)
   - Improves professionalism
   - Makes repo client-ready
   - Removes competition context

**Total Time:** ~2 hours  
**Result:** Production-ready, professional codebase

---

## Next Steps

1. Review this plan
2. Decide on approach (complete removal vs historical note)
3. Execute Node 20 update
4. Execute hackathon cleanup
5. Verify all changes
6. Rebuild and test


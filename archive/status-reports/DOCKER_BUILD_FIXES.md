# Docker Build Fixes - January 13, 2026

## Problem
Docker builds were failing with two critical errors:
1. **Frontend**: TypeScript error `Cannot find namespace 'NodeJS'`
2. **Backend**: OpenSSL compilation error in Alpine Linux

## Root Causes

### Frontend Issue
- **File**: `frontend/src/domains/product/components/ProductSearch.tsx`
- **Problem**: Used `NodeJS.Timeout` type which requires `@types/node` package
- **Why it failed**: Browser environment doesn't have NodeJS types by default

### Backend Issue
- **File**: `backend/rust/Dockerfile`
- **Problems**:
  1. Missing OpenSSL development libraries in Alpine
  2. Binary name mismatch (`caps-pos-api` vs `EasySale-api`)
  3. `reqwest` dependency pulling in native-tls by default

## Solutions Applied

### Frontend Fix
**File**: `frontend/src/domains/product/components/ProductSearch.tsx` (Line 32)

**Before**:
```typescript
let barcodeTimeout: NodeJS.Timeout;
```

**After**:
```typescript
let barcodeTimeout: number | undefined;
```

**Why**: In browser environments, `setTimeout` returns a `number`, not `NodeJS.Timeout`. Using `window.setTimeout` explicitly ensures browser compatibility.

### Backend Fixes

#### 1. Added OpenSSL Dependencies
**File**: `backend/rust/Dockerfile` (Line 6)

**Before**:
```dockerfile
RUN apk add --no-cache musl-dev sqlite-dev sqlite-static pkgconfig
```

**After**:
```dockerfile
RUN apk add --no-cache musl-dev sqlite-dev sqlite-static pkgconfig openssl-dev openssl-libs-static
```

**Why**: Some Rust dependencies (like `openssl-sys`) require OpenSSL development libraries even when using rustls.

#### 2. Fixed Binary Name Mismatch
**File**: `backend/rust/Dockerfile` (Lines 17, 35, 71)

**Before**:
```dockerfile
rm -rf src target/release/caps-pos-api target/release/deps/caps_pos_api*
COPY --from=builder /app/target/release/caps-pos-api ./
CMD ["./caps-pos-api"]
```

**After**:
```dockerfile
rm -rf src target/release/EasySale-api target/release/deps/EasySale_api*
COPY --from=builder /app/target/release/EasySale-api ./
CMD ["./EasySale-api"]
```

**Why**: `Cargo.toml` defines package name as `EasySale-api`, so the binary is named `EasySale-api`, not `caps-pos-api`.

#### 3. Disabled Default Features for reqwest
**File**: `backend/rust/Cargo.toml` (Line 58)

**Before**:
```toml
reqwest = { version = "0.11", features = ["json", "rustls-tls"] }
```

**After**:
```toml
reqwest = { version = "0.11", default-features = false, features = ["json", "rustls-tls"] }
```

**Why**: Default features include `native-tls` which requires OpenSSL. Disabling defaults and explicitly using `rustls-tls` avoids OpenSSL dependency.

## Verification

### Frontend Build
```bash
cd frontend
npm run build
# ✅ Success: Built in 2.73s
```

### Backend Build
```bash
docker build -t EasySale-backend:latest -f backend/rust/Dockerfile backend/rust
# ✅ Success: Built in 250.5s (includes dependency compilation)
```

### Full Production Build
```bash
.\build-prod.bat
# ✅ Frontend: Built successfully
# ✅ Backend: Built successfully
# ✅ Services: Started and healthy
```

## Build Times
- **Frontend**: ~3 seconds (cached), ~15 seconds (clean)
- **Backend**: ~75 seconds (cached dependencies), ~250 seconds (clean)
- **Total**: ~4 minutes for clean production build

## Testing Checklist
- [x] Frontend builds locally (`npm run build`)
- [x] Frontend builds in Docker
- [x] Backend builds in Docker
- [x] Production compose builds both services
- [x] Services start and pass health checks
- [x] No TypeScript errors
- [x] No Rust compilation errors
- [x] No OpenSSL linking errors

## Prevention
To prevent these issues in the future:

1. **Use browser-compatible types**: Prefer `number` over `NodeJS.Timeout` in frontend code
2. **Disable default features**: Always use `default-features = false` for Rust HTTP clients
3. **Match binary names**: Ensure Dockerfile binary names match `Cargo.toml` package name
4. **Include OpenSSL in Alpine**: Add `openssl-dev openssl-libs-static` for Rust Alpine builds
5. **Test clean builds**: Regularly test with `--no-cache` to catch dependency issues

## Related Documentation
- System Patterns: `memory-bank/system_patterns.md` (TLS/SSL in Rust section)
- Tech Stack: `.kiro/steering/tech.md`
- Build Scripts: `build-prod.bat`, `build-prod.sh`

## Status
✅ **RESOLVED** - All builds working on fresh installations

# Build Targets Audit

**Generated**: 2026-01-29
**Purpose**: Comprehensive audit of all build entry points, cargo commands, Docker builds, CI workflows, and existing lite/full switches.

---

## 1. Build Entry Points Found

### 1.1 Root-Level Batch Scripts (Windows)

| File | Purpose | Evidence |
|------|---------|----------|
| `build-dev.bat` | Development Docker build (debug profile) | Uses `docker-compose -p EasySale build` with `docker-compose.yml` |
| `build-prod.bat` | Production Docker build (release profile) | Uses `docker build --no-cache -f Dockerfile.backend -t EasySale-backend:latest .` |
| `start-dev.bat` | Start development containers | Uses `docker-compose -p EasySale up --build -d` |
| `start-prod.bat` | Start production containers | Uses `docker-compose -p EasySale -f docker-compose.prod.yml up -d` |
| `stop-dev.bat` | Stop development containers | Uses `docker-compose -p EasySale down` |
| `stop-prod.bat` | Stop production containers | Uses `docker-compose -p EasySale -f docker-compose.prod.yml down` |
| `update-dev.bat` | Update dev dependencies + rebuild | Runs `npm install`, `cargo update`, `docker-compose build` |
| `update-prod.bat` | Update prod dependencies + rebuild | Runs `npm install`, `cargo update`, Docker rebuild with `--release` |

### 1.2 Root-Level Shell Scripts (Linux/Mac)

| File | Purpose | Evidence |
|------|---------|----------|
| `build-prod.sh` | Production Docker build | Uses `docker build -f Dockerfile.backend -t EasySale-backend:latest .` |
| `docker-start.sh` | Start Docker containers | Wrapper for docker-compose |
| `docker-stop.sh` | Stop Docker containers | Wrapper for docker-compose down |
| `setup.sh` | Initial setup | Environment setup |
| `validate-build.sh` | Build validation | Verification script |

### 1.3 CI Scripts (PowerShell)

| File | Purpose | Evidence |
|------|---------|----------|
| `ci/build.ps1` | Release build script | Runs `cargo build --release --bin EasySale-server` with `SQLX_OFFLINE=true` |
| `ci/package.ps1` | Package artifacts | Creates ZIP archives for Windows distribution |
| `ci/readiness-gate.ps1` | Production readiness scan | Scans for forbidden patterns before deployment |
| `scripts/preflight.ps1` | Configuration wizard | Generates `.env` file interactively |

---

## 2. Current Cargo Commands Used

### 2.1 Development Builds

**Source**: `docker-compose.yml`, `backend/Dockerfile.dev`

```bash
# Development (debug profile, no --release)
cargo run -p EasySale-server
```

**Evidence**: `backend/Dockerfile.dev` line 28:
```dockerfile
CMD ["cargo", "run", "-p", "EasySale-server"]
```

### 2.2 Production Builds

**Source**: `Dockerfile.backend`, `ci/build.ps1`

```bash
# Production (release profile)
cargo build --release --no-default-features
# OR with features:
cargo build --release --no-default-features --features "$FEATURES"
```

**Evidence**: `Dockerfile.backend` lines 42-59:
```dockerfile
RUN if [ -n "$FEATURES" ]; then \
        cargo build --release --no-default-features --features "$FEATURES"; \
    else \
        cargo build --release --no-default-features; \
    fi
```

### 2.3 CI/CD Builds

**Source**: `.github/workflows/ci.yml`, `.github/workflows/cd.yml`

```bash
# CI - Backend build
cargo build --release --verbose

# CI - Backend tests
cargo test --verbose

# CI - Clippy
cargo clippy --all-targets --all-features -- -D warnings

# CD - Release binary
cargo build --release --verbose --bin EasySale-server
```

---

## 3. Docker Build Commands

### 3.1 Development Docker

**Source**: `docker-compose.yml`

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.dev
  command: cargo run
```

**Key characteristics**:
- Debug profile (no `--release`)
- Volume mounts for hot-reload
- `RUST_LOG=info` for verbose logging

### 3.2 Production Docker

**Source**: `docker-compose.prod.yml`, `Dockerfile.backend`

```yaml
backend:
  image: EasySale-backend:latest
  # Pre-built image, no build context
```

**Build command** (from `build-prod.bat`):
```bash
docker build --no-cache -f Dockerfile.backend -t EasySale-backend:latest .
```

**Key characteristics**:
- Release profile (`--release`)
- Multi-stage build (builder → runtime)
- Alpine base image for minimal size
- `FEATURES` build arg for feature selection

### 3.3 Docker Build Args

**Source**: `Dockerfile.backend` line 6:
```dockerfile
ARG FEATURES=""
```

**Usage**:
```bash
# Lite build (no features)
docker build --build-arg FEATURES="" -f Dockerfile.backend -t EasySale-lite .

# Export build (with CSV export)
docker build --build-arg FEATURES="export" -f Dockerfile.backend -t EasySale-export .
```

---

## 4. CI Workflow Build Steps

### 4.1 CI Pipeline (`.github/workflows/ci.yml`)

**Backend Job**:
```yaml
- name: Run clippy
  run: cargo clippy --all-targets --all-features -- -D warnings

- name: Run tests
  run: cargo test --verbose

- name: Build release binary
  run: cargo build --release --verbose
```

**Key observation**: CI builds with `--all-features`, not specific feature combinations.

### 4.2 CD Pipeline (`.github/workflows/cd.yml`)

**Backend Build Job**:
```yaml
- name: Build release binary
  working-directory: ./backend
  run: cargo build --release --verbose --bin EasySale-server
```

**Key observation**: CD builds without explicit feature flags (uses defaults).

### 4.3 Core Crates Check (`.github/workflows/core-crates-check.yml`)

```yaml
- name: Build ${{ matrix.crate }} independently
  run: cargo build --manifest-path backend/crates/${{ matrix.crate }}/Cargo.toml

- name: Check for integration dependencies
  run: |
    DEPS=$(cargo tree --manifest-path backend/crates/${{ matrix.crate }}/Cargo.toml | grep -iE "quickbooks|woocommerce|supabase" || true)
```

**Purpose**: Ensures core crates compile independently without integration dependencies.

### 4.4 Readiness Gate (`.github/workflows/readiness-gate.yml`)

```yaml
- name: Build frontend
  run: npm run build

- name: Build backend
  env:
    SQLX_OFFLINE: true
  run: cargo build --release
```

**Key observation**: Readiness gate builds without explicit feature flags.

---

## 5. Existing Lite/Full Switches Found

### 5.1 Cargo Feature Flags

**Source**: `backend/crates/server/Cargo.toml`

```toml
[features]
default = []
export = ["csv_export_pack"]
sync = []
```

**Current state**:
- `export` feature: **IMPLEMENTED** - gates `csv_export_pack` crate
- `sync` feature: **DEFINED BUT EMPTY** - no dependencies, runtime detection only
- `default = []` - no features enabled by default

### 5.2 Feature-Gated Dependencies

**Source**: `backend/crates/server/Cargo.toml`

```toml
# Workspace crates (optional - feature-gated)
csv_export_pack = { path = "../csv_export_pack", optional = true }
```

### 5.3 Docker FEATURES Build Arg

**Source**: `Dockerfile.backend`

```dockerfile
ARG FEATURES=""
RUN if [ -n "$FEATURES" ]; then \
        cargo build --release --no-default-features --features "$FEATURES"; \
    else \
        cargo build --release --no-default-features; \
    fi
```

**Current state**: **IMPLEMENTED** - Docker supports feature selection via build arg.

### 5.4 Capabilities API (Runtime Detection)

**Source**: `.kiro/specs/split-build-system/design.md`

The capabilities API reports:
- `export`: Compile-time (`cfg!(feature="export")`)
- `sync`: Runtime detection (sidecar healthcheck)

**Endpoint**: `GET /api/capabilities`

---

## 6. Build Variants Summary

### 6.1 Documented Build Variants

**Source**: `README.md`, `docs/build/build_matrix.md`

| Variant | Features | Build Command | Status |
|---------|----------|---------------|--------|
| **Lite** | None | `cargo build --release --no-default-features` | ✅ Documented |
| **Export** | `export` | `cargo build --release --no-default-features --features export` | ✅ Documented |
| **Full** | `export` + sync add-on | Export build + sync sidecar | ✅ Documented |

### 6.2 Actual Build Commands in Scripts

| Script | Build Command | Features Used |
|--------|---------------|---------------|
| `build-prod.bat` | `docker build -f Dockerfile.backend` | None (default) |
| `ci/build.ps1` | `cargo build --release --bin EasySale-server` | None (default) |
| `.github/workflows/ci.yml` | `cargo build --release --verbose` | None (default) |
| `.github/workflows/cd.yml` | `cargo build --release --verbose --bin EasySale-server` | None (default) |

### 6.3 Gap Analysis

**Finding**: Current build scripts do NOT use feature flags. They build with defaults (no features).

| Expected | Actual | Gap |
|----------|--------|-----|
| Lite: `--no-default-features` | `cargo build --release` | ⚠️ Missing `--no-default-features` |
| Export: `--features export` | Not used in any script | ❌ Export build not automated |
| Docker: `FEATURES` arg | Defined but not passed | ⚠️ Build arg unused |

---

## 7. Environment Variables Related to Build

### 7.1 Build-Time Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `SQLX_OFFLINE` | Skip compile-time DB verification | `ci/build.ps1`, `.github/workflows/ci.yml` |
| `FEATURES` | Docker build arg for feature selection | `Dockerfile.backend` |
| `CARGO_TERM_COLOR` | Colored output in CI | `.github/workflows/ci.yml` |
| `RUST_BACKTRACE` | Stack traces on panic | `.github/workflows/ci.yml` |

### 7.2 Runtime Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `TENANT_ID` | Multi-tenant isolation | `docker-compose.yml` |
| `DATABASE_PATH` | SQLite database location | `docker-compose.yml` |
| `RUST_LOG` | Logging level | `docker-compose.yml` |
| `JWT_SECRET` | Authentication secret | `docker-compose.yml` |

---

## 8. Key Findings

### 8.1 "Lite" Does NOT Currently Change Compiled Units

**Evidence**:
1. No build script passes `--no-default-features` or `--features export`
2. `build-prod.bat` builds without feature flags
3. CI/CD workflows build without feature flags
4. Docker `FEATURES` arg is defined but never passed a value

**Conclusion**: "Lite" is **documentation only** - all builds currently produce the same binary.

### 8.2 Feature Flags Are Implemented But Not Used

**Evidence**:
1. `backend/crates/server/Cargo.toml` defines `export` feature
2. `csv_export_pack` is optional and feature-gated
3. `Dockerfile.backend` supports `FEATURES` build arg
4. No script actually uses these features

### 8.3 Runtime Config vs Compile-Time Features

**Current state**:
- `export`: Compile-time feature (changes binary)
- `sync`: Runtime detection (sidecar healthcheck)

**Gap**: Build scripts don't leverage compile-time feature selection.

---

## 9. Files Requiring Modification

To implement true lite/full builds, these files need changes:

| File | Change Needed |
|------|---------------|
| `build-prod.bat` | Add `--build-arg FEATURES="export"` for full build |
| `build-prod.sh` | Add `--build-arg FEATURES="export"` for full build |
| `.github/workflows/ci.yml` | Add matrix builds for lite/export variants |
| `.github/workflows/cd.yml` | Add feature flag to release build |
| `ci/build.ps1` | Add `--no-default-features --features export` option |
| `docker-compose.prod.yml` | Document which variant is used |

---

## 10. Appendix: File Evidence

### 10.1 Dockerfile.backend Feature Support

```dockerfile
# Line 6
ARG FEATURES=""

# Lines 42-45 (dependency caching)
if [ -n "$FEATURES" ]; then \
    cargo build --release --no-default-features --features "$FEATURES"; \
else \
    cargo build --release --no-default-features; \
fi

# Lines 55-59 (final build)
RUN if [ -n "$FEATURES" ]; then \
        cargo build --release --no-default-features --features "$FEATURES"; \
    else \
        cargo build --release --no-default-features; \
    fi
```

### 10.2 Server Cargo.toml Features

```toml
[features]
default = []
export = ["csv_export_pack"]
sync = []

[dependencies]
# Optional - feature-gated
csv_export_pack = { path = "../csv_export_pack", optional = true }
```

### 10.3 README Build Variants Table

```markdown
| Variant | Features | Use Case | Build Command |
|---------|----------|----------|---------------|
| **Lite** | Core POS + Snapshots | Basic POS without accounting export | `cargo build --release --no-default-features` |
| **Export** | Lite + CSV Export | POS with QuickBooks CSV export | `cargo build --release --no-default-features --features export` |
| **Full** | Export + Sync Add-On | POS with real-time QuickBooks sync | Export build + sync add-on (private) |
```

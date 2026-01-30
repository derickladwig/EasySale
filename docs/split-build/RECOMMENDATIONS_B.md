# Recommendations: Build Targets, Profiles, Feature Flags, and Commands

**Generated**: 2026-01-29
**Purpose**: Proposed canonical build commands for lite vs full builds, with exact files to modify.

---

## 1. Proposed Canonical Build Commands

### 1.1 Lite Build (Core POS Only)

**Purpose**: Basic POS functionality without CSV export or sync capabilities.

#### Cargo Commands

```bash
# Development (debug)
cargo build --no-default-features

# Production (release)
cargo build --release --no-default-features

# Tests
cargo test --no-default-features

# Clippy
cargo clippy --no-default-features -- -D warnings
```

#### Docker Commands

```bash
# Build lite image
docker build \
  --build-arg FEATURES="" \
  -f Dockerfile.backend \
  -t EasySale-lite:latest \
  .

# Or with explicit tag
docker build \
  --build-arg FEATURES="" \
  -f Dockerfile.backend \
  -t EasySale-backend:lite \
  .
```

#### Expected Capabilities Response

```json
{
  "accounting_mode": "disabled",
  "features": {
    "export": false,
    "sync": false
  },
  "version": "0.1.0"
}
```

---

### 1.2 Export Build (Lite + CSV Export)

**Purpose**: POS with QuickBooks-compatible CSV export capability.

#### Cargo Commands

```bash
# Development (debug)
cargo build --no-default-features --features export

# Production (release)
cargo build --release --no-default-features --features export

# Tests
cargo test --no-default-features --features export

# Clippy
cargo clippy --no-default-features --features export -- -D warnings
```

#### Docker Commands

```bash
# Build export image
docker build \
  --build-arg FEATURES="export" \
  -f Dockerfile.backend \
  -t EasySale-export:latest \
  .

# Or with explicit tag
docker build \
  --build-arg FEATURES="export" \
  -f Dockerfile.backend \
  -t EasySale-backend:export \
  .
```

#### Expected Capabilities Response

```json
{
  "accounting_mode": "export_only",
  "features": {
    "export": true,
    "sync": false
  },
  "version": "0.1.0"
}
```

---

### 1.3 Full Build (Export + Sync Add-On)

**Purpose**: POS with real-time QuickBooks OAuth synchronization.

#### Cargo Commands

```bash
# Same as Export build (sync is runtime, not compile-time)
cargo build --release --no-default-features --features export
```

#### Docker Commands

```bash
# Build full image (same as export)
docker build \
  --build-arg FEATURES="export" \
  -f Dockerfile.backend \
  -t EasySale-full:latest \
  .

# Plus: Deploy sync sidecar (private)
# docker-compose -f docker-compose.sync.yml up -d
```

#### Expected Capabilities Response (with sync sidecar running)

```json
{
  "accounting_mode": "sync",
  "features": {
    "export": true,
    "sync": true
  },
  "version": "0.1.0"
}
```

---

## 2. Files to Modify

### 2.1 `build-prod.bat` - Add Build Variant Selection

**Current** (line ~100):
```batch
docker build --no-cache -f Dockerfile.backend -t EasySale-backend:latest .
```

**Proposed**:
```batch
REM Parse build variant argument
set "BUILD_VARIANT=export"
if /i "%~1"=="--lite" set "BUILD_VARIANT="
if /i "%~1"=="--export" set "BUILD_VARIANT=export"
if /i "%~1"=="--full" set "BUILD_VARIANT=export"

REM Build with selected features
echo [6/9] Building backend image (%BUILD_VARIANT% variant)...
if "%BUILD_VARIANT%"=="" (
    docker build --no-cache --build-arg FEATURES="" -f Dockerfile.backend -t EasySale-backend:latest .
) else (
    docker build --no-cache --build-arg FEATURES="%BUILD_VARIANT%" -f Dockerfile.backend -t EasySale-backend:latest .
)
```

**Add help text**:
```batch
:SHOW_HELP
echo.
echo Usage: build-prod.bat [options] [variant]
echo.
echo Variants:
echo   --lite      Build without export features (smallest binary)
echo   --export    Build with CSV export (default)
echo   --full      Build with export (sync is runtime add-on)
echo.
```

---

### 2.2 `build-prod.sh` - Add Build Variant Selection

**Current** (line ~30):
```bash
docker build -f Dockerfile.backend -t EasySale-backend:latest .
```

**Proposed**:
```bash
# Parse build variant
BUILD_VARIANT="${1:-export}"
case "$BUILD_VARIANT" in
  --lite|lite)
    FEATURES=""
    TAG="lite"
    ;;
  --export|export)
    FEATURES="export"
    TAG="export"
    ;;
  --full|full)
    FEATURES="export"
    TAG="full"
    ;;
  *)
    FEATURES="export"
    TAG="latest"
    ;;
esac

echo -e "${BLUE}[INFO]${NC} Building backend ($TAG variant, features: ${FEATURES:-none})..."
docker build \
  --build-arg FEATURES="$FEATURES" \
  -f Dockerfile.backend \
  -t EasySale-backend:$TAG \
  .
```

---

### 2.3 `.github/workflows/ci.yml` - Add Build Matrix

**Current backend job** (lines ~50-100):
```yaml
backend:
  name: Backend CI
  runs-on: ubuntu-latest
  steps:
    - name: Build release binary
      run: cargo build --release --verbose
```

**Proposed** - Add build matrix:
```yaml
backend:
  name: Backend CI
  runs-on: ubuntu-latest
  strategy:
    matrix:
      variant:
        - name: lite
          features: ""
        - name: export
          features: "export"
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Install Rust toolchain
      uses: actions-rust-lang/setup-rust-toolchain@v1
      with:
        toolchain: stable
        components: rustfmt, clippy
    
    - name: Build ${{ matrix.variant.name }} variant
      working-directory: ./backend
      env:
        SQLX_OFFLINE: true
      run: |
        if [ -n "${{ matrix.variant.features }}" ]; then
          cargo build --release --no-default-features --features "${{ matrix.variant.features }}"
        else
          cargo build --release --no-default-features
        fi
    
    - name: Test ${{ matrix.variant.name }} variant
      working-directory: ./backend
      run: |
        if [ -n "${{ matrix.variant.features }}" ]; then
          cargo test --no-default-features --features "${{ matrix.variant.features }}"
        else
          cargo test --no-default-features
        fi
    
    - name: Clippy ${{ matrix.variant.name }} variant
      working-directory: ./backend
      run: |
        if [ -n "${{ matrix.variant.features }}" ]; then
          cargo clippy --no-default-features --features "${{ matrix.variant.features }}" -- -D warnings
        else
          cargo clippy --no-default-features -- -D warnings
        fi
```

---

### 2.4 `.github/workflows/cd.yml` - Add Feature Flag

**Current** (lines ~50-60):
```yaml
- name: Build release binary
  working-directory: ./backend
  run: cargo build --release --verbose --bin EasySale-server
```

**Proposed**:
```yaml
- name: Build release binary (export variant)
  working-directory: ./backend
  env:
    SQLX_OFFLINE: true
  run: |
    cargo build --release --no-default-features --features export --bin EasySale-server
```

---

### 2.5 `ci/build.ps1` - Add Feature Flag Support

**Current** (lines ~60-70):
```powershell
$buildArgs = @(
    "build",
    "--release",
    "--bin", "EasySale-server"
)
```

**Proposed**:
```powershell
param(
    [string]$BackendPath = "backend",
    [string]$FrontendPath = "frontend",
    [ValidateSet("lite", "export", "full")]
    [string]$Variant = "export",
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$Verbose
)

# Determine features based on variant
$features = switch ($Variant) {
    "lite" { "" }
    "export" { "export" }
    "full" { "export" }
    default { "export" }
}

# Build args
$buildArgs = @(
    "build",
    "--release",
    "--no-default-features",
    "--bin", "EasySale-server"
)

if ($features) {
    $buildArgs += "--features"
    $buildArgs += $features
}

Write-Info "Building $Variant variant (features: $($features ? $features : 'none'))"
& cargo @buildArgs
```

---

### 2.6 `docker-compose.prod.yml` - Document Variant

**Current** (lines ~30-40):
```yaml
backend:
  image: EasySale-backend:latest
```

**Proposed** - Add comment:
```yaml
# Backend - Pre-built Rust binary (RELEASE profile)
# Default image is 'export' variant with CSV export capability
# For lite variant, build with: docker build --build-arg FEATURES="" ...
# For full variant, also deploy sync sidecar (see docker-compose.sync.yml)
backend:
  image: EasySale-backend:latest
```

---

### 2.7 New File: `docker-compose.build.yml` - Build Variants

**Create new file** for explicit build variant selection:

```yaml
# EasySale - Build Variants Configuration
# Usage:
#   Lite:   docker-compose -f docker-compose.build.yml build lite
#   Export: docker-compose -f docker-compose.build.yml build export
#   Full:   docker-compose -f docker-compose.build.yml build full

name: EasySale-build

services:
  lite:
    build:
      context: .
      dockerfile: Dockerfile.backend
      args:
        FEATURES: ""
    image: EasySale-backend:lite

  export:
    build:
      context: .
      dockerfile: Dockerfile.backend
      args:
        FEATURES: "export"
    image: EasySale-backend:export

  full:
    build:
      context: .
      dockerfile: Dockerfile.backend
      args:
        FEATURES: "export"
    image: EasySale-backend:full
```

---

## 3. CI Workflow Changes Needed

### 3.1 Add Build Matrix Job

**File**: `.github/workflows/ci.yml`

Add new job after existing backend job:

```yaml
# Build variant matrix test
build-variants:
  name: Build Variants
  runs-on: ubuntu-latest
  needs: backend
  
  strategy:
    matrix:
      variant:
        - name: lite
          features: ""
          expected_mode: "disabled"
        - name: export
          features: "export"
          expected_mode: "export_only"
  
  steps:
    - uses: actions/checkout@v4
    
    - name: Install Rust
      uses: actions-rust-lang/setup-rust-toolchain@v1
    
    - name: Build ${{ matrix.variant.name }}
      working-directory: ./backend
      env:
        SQLX_OFFLINE: true
      run: |
        if [ -n "${{ matrix.variant.features }}" ]; then
          cargo build --release --no-default-features --features "${{ matrix.variant.features }}"
        else
          cargo build --release --no-default-features
        fi
    
    - name: Verify binary size
      working-directory: ./backend
      run: |
        SIZE=$(stat -c%s target/release/EasySale-server)
        SIZE_MB=$((SIZE / 1024 / 1024))
        echo "Binary size: ${SIZE_MB}MB"
        if [ $SIZE_MB -gt 30 ]; then
          echo "ERROR: Binary too large (>30MB)"
          exit 1
        fi
```

### 3.2 Add Docker Build Matrix

**File**: `.github/workflows/ci.yml`

Add Docker build verification:

```yaml
docker-variants:
  name: Docker Build Variants
  runs-on: ubuntu-latest
  needs: build-variants
  
  strategy:
    matrix:
      variant:
        - name: lite
          features: ""
          max_size_mb: 500
        - name: export
          features: "export"
          max_size_mb: 550
  
  steps:
    - uses: actions/checkout@v4
    
    - name: Build Docker image (${{ matrix.variant.name }})
      run: |
        docker build \
          --build-arg FEATURES="${{ matrix.variant.features }}" \
          -f Dockerfile.backend \
          -t EasySale-${{ matrix.variant.name }}:test \
          .
    
    - name: Verify image size
      run: |
        SIZE=$(docker images EasySale-${{ matrix.variant.name }}:test --format "{{.Size}}")
        echo "Image size: $SIZE"
        # Parse size and verify < max
```

---

## 4. Summary of Changes

### 4.1 Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `build-prod.bat` | Add `--lite`/`--export`/`--full` args | High |
| `build-prod.sh` | Add variant selection | High |
| `.github/workflows/ci.yml` | Add build matrix | High |
| `.github/workflows/cd.yml` | Add `--features export` | High |
| `ci/build.ps1` | Add `-Variant` parameter | Medium |
| `docker-compose.prod.yml` | Add documentation comments | Low |

### 4.2 Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `docker-compose.build.yml` | Explicit build variant targets | Medium |

### 4.3 Verification Commands

After implementing changes, verify with:

```bash
# Verify lite build
cargo build --release --no-default-features
nm target/release/EasySale-server | grep -i csv_export  # Should be empty

# Verify export build
cargo build --release --no-default-features --features export
nm target/release/EasySale-server | grep -i csv_export  # Should have symbols

# Verify Docker lite
docker build --build-arg FEATURES="" -f Dockerfile.backend -t test-lite .
docker run --rm test-lite ./EasySale-server --version

# Verify Docker export
docker build --build-arg FEATURES="export" -f Dockerfile.backend -t test-export .
docker run --rm test-export ./EasySale-server --version
```

---

## 5. Migration Path

### Phase 1: Update Build Scripts (Immediate)

1. Modify `build-prod.bat` to accept variant argument
2. Modify `build-prod.sh` to accept variant argument
3. Default to `export` variant for backward compatibility

### Phase 2: Update CI/CD (Next Sprint)

1. Add build matrix to CI workflow
2. Add feature flag to CD workflow
3. Add Docker build verification

### Phase 3: Documentation (Ongoing)

1. Update README with variant selection
2. Update deployment docs
3. Add troubleshooting guide

---

## 6. Backward Compatibility

**Current behavior**: All builds produce export-equivalent binary (no explicit features).

**Proposed default**: `export` variant (maintains current behavior).

**Breaking changes**: None - existing scripts will continue to work.

**New capability**: Users can now explicitly build lite variant for smaller binary.

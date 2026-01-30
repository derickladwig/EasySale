# CI/CD Scripts

This directory contains scripts for building and packaging EasySale releases.

## Scripts

### `build.ps1` - Release Build Script

Builds both backend and frontend for production release.

**Usage:**
```powershell
# Build both backend and frontend
.\ci\build.ps1

# Build with verbose output
.\ci\build.ps1 -Verbose

# Build only backend
.\ci\build.ps1 -SkipFrontend

# Build only frontend
.\ci\build.ps1 -SkipBackend

# Custom paths
.\ci\build.ps1 -BackendPath "path/to/backend" -FrontendPath "path/to/frontend"
```

**Features:**
- Validates paths and checks for stale `backend/rust` references
- Builds backend with `SQLX_OFFLINE=true` for CI/CD compatibility
- Builds frontend with production optimizations
- Verifies build outputs exist
- Reports build sizes and durations
- Deterministic output for reproducible builds

**Requirements:**
- Rust toolchain (cargo)
- Node.js and npm
- SQLx metadata (`.sqlx/` directory) for offline builds

**Validates Requirements:** 1.1, 1.2, 1.5, 7.1

---

### `package.ps1` - Release Packaging Script

Creates ZIP artifacts for Windows distribution.

**Usage:**
```powershell
# Package both server and client
.\ci\package.ps1 -Version "1.0.0"

# Package with custom output directory
.\ci\package.ps1 -Version "1.0.0" -OutputPath "releases"

# Package only server
.\ci\package.ps1 -Version "1.0.0" -ClientOnly

# Package only client
.\ci\package.ps1 -Version "1.0.0" -ServerOnly

# Verbose output
.\ci\package.ps1 -Version "1.0.0" -Verbose
```

**Features:**
- Creates deterministic ZIP archives
- Validates version format (X.Y.Z or X.Y.Z-suffix)
- Includes installer scripts and configuration templates
- Generates README files for each package
- Verifies package contents (no forbidden paths)
- Generates manifest.json with SHA256 checksums
- Reports package sizes

**Output Files:**
- `EasySale-windows-server-vX.Y.Z.zip` - Backend server package
- `EasySale-windows-client-vX.Y.Z.zip` - Frontend client package
- `manifest.json` - Package metadata and checksums

**Package Contents:**

**Server Package:**
```
EasySale-windows-server-vX.Y.Z.zip
├── server/
│   ├── EasySale-server.exe
│   └── migrations/
├── installer/
│   ├── install.ps1
│   ├── uninstall.ps1
│   ├── upgrade.ps1
│   └── templates/
├── config-templates/
│   ├── dev.toml
│   ├── demo.toml
│   └── prod.toml
└── README.txt
```

**Client Package:**
```
EasySale-windows-client-vX.Y.Z.zip
├── client/
│   ├── index.html
│   ├── assets/
│   └── ...
└── README.txt
```

**Validates Requirements:** 1.1, 1.2, 1.5, 7.1

---

## Complete Build and Package Workflow

```powershell
# 1. Build both backend and frontend
.\ci\build.ps1

# 2. Package the builds
.\ci\package.ps1 -Version "1.0.0"

# 3. Verify outputs
Get-ChildItem dist\
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Release Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-package:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Build
        run: .\ci\build.ps1
        
      - name: Package
        run: |
          $version = $env:GITHUB_REF -replace 'refs/tags/v', ''
          .\ci\package.ps1 -Version $version
          
      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: EasySale-windows-release
          path: dist/*.zip
```

---

## Validation and Quality Checks

Both scripts include built-in validation:

### Build Script Validation
- ✓ Checks for stale `backend/rust` path references
- ✓ Verifies Cargo.toml and package.json exist
- ✓ Confirms binaries are created after build
- ✓ Reports build sizes

### Package Script Validation
- ✓ Validates version format
- ✓ Verifies build outputs exist before packaging
- ✓ Scans for forbidden paths (archive/, tests/, .git/, etc.)
- ✓ Generates SHA256 checksums
- ✓ Creates deterministic ZIP archives

---

## Deterministic Builds

Both scripts are designed to produce deterministic output:

1. **Build Script:**
   - Uses `SQLX_OFFLINE=true` to avoid database dependencies
   - Consistent cargo and npm build flags
   - No timestamp-dependent operations

2. **Package Script:**
   - Uses .NET `System.IO.Compression.ZipFile` for consistent ZIP creation
   - Excludes non-deterministic metadata
   - Consistent file ordering

This ensures that building the same source code twice produces identical artifacts, which is important for:
- Reproducible builds
- Security auditing
- Build verification

---

## Troubleshooting

### Build Script Issues

**Error: "Stale backend/rust directory detected"**
- The legacy `backend/rust` path should not exist
- See `audit/PATH_TRUTH.md` for correct paths
- Run task 2.1 to remove stale references

**Error: "Binary not found after build"**
- Ensure SQLx metadata is up to date: `cd backend && cargo sqlx prepare`
- Check that `backend/Cargo.toml` defines the `EasySale-server` binary
- Verify `SQLX_OFFLINE=true` is set

**Error: "Frontend build failed"**
- Run `npm ci` in the frontend directory
- Check for TypeScript errors: `npm run type-check`
- Check for linting errors: `npm run lint`

### Package Script Issues

**Error: "Server binary not found"**
- Run `.\ci\build.ps1` first to build the backend

**Error: "Frontend dist not found"**
- Run `.\ci\build.ps1` first to build the frontend

**Error: "Invalid version format"**
- Use format: `X.Y.Z` or `X.Y.Z-suffix`
- Examples: `1.0.0`, `1.0.0-beta`, `2.1.3-rc1`

**Error: "Package validation failed: Found forbidden path pattern"**
- The build output contains paths that should not be in production packages
- Check for `archive/`, `tests/`, `.git/`, `node_modules/`, etc.
- Ensure build excludes these directories

---

## Related Documentation

- `audit/PATH_TRUTH.md` - Canonical backend paths and binary names
- `.kiro/specs/production-readiness-windows-installer/requirements.md` - Requirements
- `.kiro/specs/production-readiness-windows-installer/design.md` - Design details
- `installer/windows/README.md` - Installation scripts documentation

---

## Version History

- **2026-01-25**: Initial release (Task 2.5)
  - Created `build.ps1` for building backend and frontend
  - Created `package.ps1` for creating ZIP artifacts
  - Implemented deterministic output
  - Added validation and quality checks

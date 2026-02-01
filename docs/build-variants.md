# Build Variants Guide

## Overview

EasySale supports three build variants to optimize for different deployment scenarios. Each variant includes different features and has different binary sizes and dependencies.

## Build Variants

### Lite Build

**Purpose**: Minimal POS system for basic retail operations

**Features**:
- ✅ Core POS (sales, returns, exchanges)
- ✅ Product lookup and search
- ✅ Inventory management
- ✅ Customer management
- ✅ Basic reporting (in-app only)
- ❌ CSV export
- ❌ OCR/document processing
- ❌ Vendor bill receiving
- ❌ Advanced admin features
- ❌ Integration management

**Use Cases**:
- Small retail stores with simple needs
- Kiosks or limited-function terminals
- Environments with storage constraints
- Deployments where accounting is handled separately

**Binary Size**: ~50MB (smallest)

**Build Command**:
```bash
# Backend
cd backend
cargo build --release --no-default-features --features lite

# Frontend
cd frontend
VITE_BUILD_VARIANT=lite npm run build
```

---

### Export Build (Default)

**Purpose**: Standard POS with CSV export for QuickBooks/Xero integration

**Features**:
- ✅ All Lite features
- ✅ CSV export for accounting
- ✅ Report generation and export
- ✅ Admin panel
- ✅ Advanced reporting
- ✅ Data management
- ❌ OCR/document processing
- ❌ Vendor bill receiving
- ❌ Real-time sync

**Use Cases**:
- Most retail deployments
- Businesses using QuickBooks Desktop or Xero
- Stores that need periodic accounting exports
- Standard production deployments

**Binary Size**: ~75MB

**Build Command**:
```bash
# Backend (default features)
cd backend
cargo build --release

# Frontend (default)
cd frontend
npm run build
```

---

### Full Build

**Purpose**: Complete feature set including OCR and document processing

**Features**:
- ✅ All Export features
- ✅ OCR and image enhancement
- ✅ PDF/image document processing
- ✅ Vendor bill receiving and review
- ✅ Document cleanup engine
- ✅ Integration management
- ✅ Payment processing
- ✅ Email notifications
- ⚠️ Real-time sync (requires separate sidecar service)

**Use Cases**:
- Businesses with vendor bill processing needs
- Stores requiring OCR for receipts/invoices
- Advanced deployments with full automation
- Development and testing environments

**Binary Size**: ~150MB (largest)

**Build Command**:
```bash
# Backend
cd backend
cargo build --release --features full

# Frontend
cd frontend
VITE_BUILD_VARIANT=full npm run build
```

---

## Feature Matrix

| Feature | Lite | Export | Full |
|---------|------|--------|------|
| Core POS | ✅ | ✅ | ✅ |
| Product Lookup | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ |
| Basic Reporting | ✅ | ✅ | ✅ |
| Admin Panel | ❌ | ✅ | ✅ |
| CSV Export | ❌ | ✅ | ✅ |
| Report Export | ❌ | ✅ | ✅ |
| Data Management | ❌ | ✅ | ✅ |
| OCR | ❌ | ❌ | ✅ |
| Document Processing | ❌ | ❌ | ✅ |
| Vendor Bills | ❌ | ❌ | ✅ |
| Review Cases | ❌ | ❌ | ✅ |
| Integrations | ❌ | ❌ | ✅ |
| Payments | ❌ | ❌ | ✅ |
| Notifications | ❌ | ❌ | ✅ |
| Real-time Sync | ❌ | ❌ | ⚠️* |

*Requires separate sync sidecar service (Phase 8)

---

## How Build Variants Work

### Compile-Time Feature Flags

Build variants use Cargo feature flags to conditionally compile code:

```toml
# backend/Cargo.toml
[features]
default = ["export"]  # Export is the default

# Build variants
lite = []
export = ["csv_export_pack"]
full = [
  "export",
  "document-processing",
  "ocr",
  "document-cleanup",
  "integrations",
  "payments",
  "notifications"
]

# Individual features
document-processing = ["image", "lopdf", "pdfium-render"]
ocr = ["imageproc", "document-processing"]
# ... more features
```

### Backend Feature Gating

Endpoints are conditionally compiled based on features:

```rust
// Only compiled in Export and Full builds
#[cfg(feature = "export")]
pub async fn export_report(/* ... */) -> Result<HttpResponse> {
    // CSV export implementation
}

// Only compiled in Full build
#[cfg(feature = "ocr")]
pub async fn process_vendor_bill(/* ... */) -> Result<HttpResponse> {
    // OCR implementation
}
```

### Frontend Build Variants

Frontend uses environment variables to conditionally include features:

```typescript
// frontend/src/common/utils/buildVariant.ts
export const BUILD_VARIANT = import.meta.env.VITE_BUILD_VARIANT || 'export';
export const ENABLE_EXPORTS = BUILD_VARIANT !== 'lite';
export const ENABLE_VENDOR_BILLS = BUILD_VARIANT === 'full';

// Conditional rendering
{ENABLE_EXPORTS && (
  <Route path="admin/exports" element={<ExportsPage />} />
)}
```

### Runtime Capabilities Detection

Frontend queries backend capabilities on startup:

```typescript
// GET /api/capabilities
{
  "accounting_mode": "export_only",
  "features": {
    "export": true,
    "sync": false
  }
}

// Frontend adapts UI based on backend capabilities
const { data: capabilities } = useCapabilities();
if (capabilities?.features.export) {
  // Show export buttons
}
```

---

## Choosing a Build Variant

### Use Lite if:
- You only need basic POS functionality
- Storage space is limited
- You handle accounting separately
- You want the smallest possible binary

### Use Export if (Recommended):
- You need CSV export for QuickBooks/Xero
- You want standard POS with reporting
- You need admin features
- This is a production deployment

### Use Full if:
- You process vendor bills with OCR
- You need document processing
- You want all features available
- This is a development environment

---

## Building for Production

### Backend

```bash
cd backend

# Lite build
cargo build --release --no-default-features --features lite

# Export build (default)
cargo build --release

# Full build
cargo build --release --features full

# Binary location
ls -lh target/release/server
```

### Frontend

```bash
cd frontend

# Lite build
VITE_BUILD_VARIANT=lite npm run build

# Export build (default)
npm run build

# Full build
VITE_BUILD_VARIANT=full npm run build

# Output location
ls -lh dist/
```

### Docker Builds

```bash
# Lite build
docker build --build-arg BUILD_VARIANT=lite -t easysale:lite .

# Export build (default)
docker build -t easysale:export .

# Full build
docker build --build-arg BUILD_VARIANT=full -t easysale:full .
```

---

## Testing Build Variants

### Verify Backend Capabilities

```bash
# Start backend
cd backend
cargo run --release --features full

# Check capabilities
curl http://localhost:7945/api/capabilities | jq

# Expected for Full build:
# {
#   "accounting_mode": "export_only",
#   "features": {
#     "export": true,
#     "sync": false
#   },
#   "version": "0.1.0"
# }
```

### Test Feature-Gated Endpoints

```bash
# Test export endpoint (should fail in Lite, work in Export/Full)
curl -X POST http://localhost:7945/api/reports/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "sales",
    "start_date": "2026-01-01",
    "end_date": "2026-01-31"
  }'

# Expected in Lite: 404 Not Found
# Expected in Export/Full: 200 OK with CSV data
```

### Verify Frontend Build

```bash
# Check bundle size
cd frontend/dist
du -sh .

# Lite: ~2-3 MB
# Export: ~3-4 MB
# Full: ~4-5 MB

# Check for feature-specific code
grep -r "vendor-bills" assets/
# Should only appear in Full build
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build All Variants

on: [push, pull_request]

jobs:
  build-lite:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Backend Lite
        run: |
          cd backend
          cargo build --release --no-default-features --features lite
      - name: Build Frontend Lite
        run: |
          cd frontend
          VITE_BUILD_VARIANT=lite npm run build

  build-export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Backend Export
        run: |
          cd backend
          cargo build --release
      - name: Build Frontend Export
        run: |
          cd frontend
          npm run build

  build-full:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Backend Full
        run: |
          cd backend
          cargo build --release --features full
      - name: Build Frontend Full
        run: |
          cd frontend
          VITE_BUILD_VARIANT=full npm run build
```

---

## Troubleshooting

### Backend Build Fails

**Issue**: Missing dependencies for Full build

**Solution**: Install required system libraries
```bash
# Ubuntu/Debian
sudo apt-get install libssl-dev pkg-config

# macOS
brew install openssl pkg-config
```

### Frontend Shows Wrong Features

**Issue**: Frontend shows features not available in backend

**Solution**: Ensure frontend queries `/api/capabilities` and adapts UI
```typescript
// Check implementation in:
// frontend/src/hooks/useCapabilities.ts
// frontend/src/AppLayout.tsx
```

### Endpoint Returns 404

**Issue**: Feature-gated endpoint not available in current build

**Solution**: Rebuild backend with required features
```bash
# If you need export functionality
cargo build --release --features export

# If you need OCR functionality
cargo build --release --features full
```

---

## Migration Between Variants

### Upgrading from Lite to Export

1. Rebuild backend with export feature
2. Rebuild frontend with export variant
3. No database migration needed
4. Export features become available immediately

### Upgrading from Export to Full

1. Install additional system dependencies (image processing libraries)
2. Rebuild backend with full features
3. Rebuild frontend with full variant
4. Run database migrations for new tables (vendor_bills, review_cases, etc.)
5. OCR and document features become available

### Downgrading

**Warning**: Downgrading may result in data loss for features not available in lower variants.

1. Export data from features you're removing
2. Rebuild with lower variant
3. Feature-specific data remains in database but is inaccessible
4. Consider archiving data before downgrading

---

## Performance Considerations

### Binary Size

| Variant | Backend | Frontend | Total |
|---------|---------|----------|-------|
| Lite | ~50 MB | ~2 MB | ~52 MB |
| Export | ~75 MB | ~3 MB | ~78 MB |
| Full | ~150 MB | ~4 MB | ~154 MB |

### Memory Usage

| Variant | Idle | Under Load |
|---------|------|------------|
| Lite | ~50 MB | ~200 MB |
| Export | ~75 MB | ~300 MB |
| Full | ~150 MB | ~500 MB |

### Startup Time

| Variant | Cold Start | Warm Start |
|---------|------------|------------|
| Lite | ~1s | ~0.5s |
| Export | ~1.5s | ~0.7s |
| Full | ~2s | ~1s |

---

## Related Documentation

- [API Documentation](./api/README.md) - API endpoints and capabilities
- [Deployment Guide](./deployment.md) - Production deployment instructions
- [Feature Flags](../FEATURE_FLAGS_DEEP_AUDIT_2026-01-31.md) - Detailed feature flag audit
- [Capabilities Integration](../CAPABILITIES_INTEGRATION_COMPLETE_2026-01-31.md) - Frontend capabilities implementation

---

*Last updated: 2026-01-31*

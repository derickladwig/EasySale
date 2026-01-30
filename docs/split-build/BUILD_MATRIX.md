# EasySale Build Matrix — Quick Reference

**Version**: 1.0  
**Date**: 2026-01-29

---

## Build Variants

| Variant | Cargo Features | Docker FEATURES | Binary Size | Use Case |
|---------|----------------|-----------------|-------------|----------|
| **Lite** | `--no-default-features` | `""` | ~25 MB | Basic POS |
| **Export** | `--features export` | `"export"` | ~28 MB | + CSV export |
| **Full** | `--features full` | `"full"` | ~32 MB | All features |

---

## Quick Commands

### Backend (Cargo)

```bash
# Lite
cargo build --release -p EasySale-server --no-default-features

# Export
cargo build --release -p EasySale-server --no-default-features --features export

# Full
cargo build --release -p EasySale-server --no-default-features --features full
```

### Docker

```bash
# Lite
docker build --build-arg FEATURES="" -f Dockerfile.backend -t EasySale-backend:lite .

# Export
docker build --build-arg FEATURES="export" -f Dockerfile.backend -t EasySale-backend:export .

# Full
docker build --build-arg FEATURES="full" -f Dockerfile.backend -t EasySale-backend:full .
```

### Build Scripts

```bash
# Windows
build-prod.bat --lite
build-prod.bat --export
build-prod.bat --full

# Linux/Mac
./build-prod.sh --lite
./build-prod.sh --export
./build-prod.sh --full
```

### Frontend

```bash
# Full (default)
npm run build

# Lite
VITE_BUILD_VARIANT=lite npm run build
```

---

## Feature Flag Matrix

| Feature | Lite | Export | Full | Dependencies |
|---------|------|--------|------|--------------|
| Core POS | ✅ | ✅ | ✅ | - |
| Products/Customers | ✅ | ✅ | ✅ | - |
| Basic Inventory | ✅ | ✅ | ✅ | - |
| Sales Transactions | ✅ | ✅ | ✅ | - |
| CSV Export | ❌ | ✅ | ✅ | csv_export_pack |
| Document Processing | ❌ | ❌ | ✅ | image, lopdf |
| OCR | ❌ | ❌ | ✅ | imageproc |
| Document Cleanup | ❌ | ❌ | ✅ | image |
| Vendor Bills | ❌ | ❌ | ✅ | - |
| Review Cases | ❌ | ❌ | ✅ | - |

---

## Capabilities API Response

### Lite Build
```json
{
  "accounting_mode": "disabled",
  "features": {
    "export": false,
    "sync": false,
    "document_processing": false,
    "ocr": false,
    "document_cleanup": false
  }
}
```

### Export Build
```json
{
  "accounting_mode": "export_only",
  "features": {
    "export": true,
    "sync": false,
    "document_processing": false,
    "ocr": false,
    "document_cleanup": false
  }
}
```

### Full Build
```json
{
  "accounting_mode": "export_only",
  "features": {
    "export": true,
    "sync": false,
    "document_processing": true,
    "ocr": true,
    "document_cleanup": true
  }
}
```

---

## CI Matrix

```yaml
strategy:
  matrix:
    variant:
      - { name: lite, features: "" }
      - { name: export, features: "export" }
      - { name: full, features: "full" }
```

---

## Verification Commands

```bash
# Check binary size
ls -lh target/release/EasySale-server

# Check for heavy deps in lite build (should be empty)
nm target/release/EasySale-server | grep -iE "image::|imageproc::|lopdf::"

# Check capabilities endpoint
curl http://localhost:8923/api/capabilities | jq '.features'
```

---

## Frontend Routes by Variant

| Route | Lite | Full |
|-------|------|------|
| `/` (Home) | ✅ | ✅ |
| `/login` | ✅ | ✅ |
| `/sell` | ✅ | ✅ |
| `/lookup` | ✅ | ✅ |
| `/customers` | ✅ | ✅ |
| `/warehouse` | ✅ | ✅ |
| `/preferences` | ✅ | ✅ |
| `/admin/*` | ❌ | ✅ |
| `/reporting` | ❌ | ✅ |
| `/sales` | ❌ | ✅ |
| `/documents` | ❌ | ✅ |
| `/vendor-bills/*` | ❌ | ✅ |
| `/review/*` | ❌ | ✅ |

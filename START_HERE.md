# EasySale - Start Here

**Last Updated**: January 30, 2026

## Quick Status

**System Status**: Production Ready

The core POS system is complete and functional:
- **Core POS**: Checkout, products, inventory, customers
- **Multi-Store Sync**: Automatic replication with conflict resolution
- **Build System**: Three variants (Lite, Export, Full)
- **Code Quality**: Clean build, 0 compiler errors
- **Test Coverage**: 130+ tests passing

---

## Getting Started

### 1. Clone and Configure

```bash
git clone https://github.com/derickladwig/EasySale.git
cd EasySale
cp .env.example .env
```

### 2. Choose Your Build Variant

| Variant | Command | Features | Setup Required |
|---------|---------|----------|----------------|
| **Lite** | `build-prod.bat --lite` | Core POS only | None |
| **Export** | `build-prod.bat --export` | + Admin, Reporting, CSV | None (default) |
| **Full** | `build-prod.bat --full` | + OCR, Documents, Vendor Bills | Developer customization |

> **Note**: Export is the recommended default. Full build requires developer customization for document processing.

### 3. Start Development

```bash
# Backend
cd backend && cargo run --bin easysale-server

# Frontend
cd frontend && npm install && npm run dev
```

### 4. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:7945 |
| Backend | http://localhost:8923 |
| Health | http://localhost:8923/health |

**Default Login**: `admin` / `admin123`

---

## Essential Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview |
| [docs/INSTALL.md](docs/INSTALL.md) | Installation guide |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Operations guide |
| [spec/design.md](spec/design.md) | Architecture specification |
| [configs/README.md](configs/README.md) | Configuration guide |

---

## Build Variants Explained

EasySale uses feature flags to create different builds:

### Lite Build
- Core POS checkout
- Product catalog
- Inventory management
- Customer management
- Multi-store sync

**Use when**: You need basic retail operations without admin overhead.  
**Developer setup**: None required. Works out of the box.

### Export Build (Default, Recommended)
- Everything in Lite
- Admin panel
- Reporting dashboard
- CSV export

**Use when**: You need reports and administrative features. This is the recommended build for most businesses.  
**Developer setup**: None required. Works out of the box.

### Full Build (Advanced)
- Everything in Export
- OCR document processing
- Vendor bill workflow
- Review queue

**Use when**: You need enterprise document processing features.  
**Developer setup**: **Customization required.** The document processing features need to be configured for your specific:
- Vendor invoice formats and layouts
- OCR field extraction templates
- Approval workflow rules
- Field mappings to your inventory/accounting system

See [docs/deployment/ocr_deployment.md](docs/deployment/ocr_deployment.md) for customization guidance.

---

## Optional Integrations

These require your own credentials and configuration:

### QuickBooks Online
```bash
# Add to .env
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/callback
```

### WooCommerce
Configure via Admin → Integrations → WooCommerce using your store's API keys.

### Payment Terminals
Stripe and Square terminal integration requires provider-specific setup. See [docs/integrations/](docs/integrations/).

---

## Quick Commands

### Development
```bash
cargo run --bin easysale-server    # Start backend
npm run dev                        # Start frontend
cargo test                         # Run backend tests
npm run test:run                   # Run frontend tests
```

### Production
```bash
build-prod.bat --export            # Build production (Windows)
./build-prod.sh export             # Build production (Linux/Mac)
start-prod.bat                     # Start production
```

### Code Quality
```bash
cargo clippy                       # Rust linting
npm run lint                       # TypeScript linting
cargo fmt --check                  # Format check
```

---

## Project Structure

```
EasySale/
├── backend/           # Rust API server
│   ├── crates/        # 8 workspace crates
│   └── migrations/    # Database migrations
├── frontend/          # React + TypeScript
├── configs/           # JSON configuration
├── docs/              # Documentation
├── spec/              # Specifications
├── ci/                # CI/CD scripts
└── audit/             # Quality reports
```

---

## Need Help?

- **Build Issues**: [docs/INSTALL.md](docs/INSTALL.md)
- **Operations**: [docs/RUNBOOK.md](docs/RUNBOOK.md)
- **Architecture**: [spec/design.md](spec/design.md)
- **Issues**: [GitHub Issues](https://github.com/derickladwig/EasySale/issues)

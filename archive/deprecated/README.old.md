# CAPS POS System (Deprecated README)

**⚠️ DEPRECATED**: This is an old version of the README. See [README.md](README.md) for current documentation.

**Current Ports (as of 2026-01-09):**
- Frontend: **7945** (http://localhost:7945)
- Backend: **8923** (http://localhost:8923)
- Storybook: **7946** (http://localhost:7946)

---

## Historical Content (Outdated)

A comprehensive point-of-sale system designed for automotive retail businesses selling caps, auto parts, paint, and autobody supplies. Built with offline-first architecture to ensure continuous operation even during network outages.

## 🏗️ Project Structure

```
caps-pos/
├── frontend/              # React + TypeScript + Vite application
│   ├── src/
│   │   ├── features/     # Feature-based organization (sell, lookup, warehouse, etc.)
│   │   ├── common/       # Shared components, layouts, contexts
│   │   ├── domains/      # Business logic modules (cart, pricing, stock, auth)
│   │   └── assets/       # Static assets (images, icons, styles)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   └── rust/             # Rust API server with Actix Web
│       ├── src/
│       │   ├── handlers/ # HTTP request handlers
│       │   ├── models/   # Data models
│       │   ├── db/       # Database access layer
│       │   └── config/   # Configuration management
│       └── Cargo.toml
│
├── sync/                 # Python cross-store synchronization service
│   ├── venv/            # Python virtual environment
│   ├── requirements.txt
│   └── sync_service.py  # (to be created)
│
├── backup/              # Python automated backup service
│   ├── venv/           # Python virtual environment
│   ├── requirements.txt
│   └── backup_service.py # (to be created)
│
├── installer/           # Installation scripts for Windows/Linux
│   ├── windows/        # Windows installer scripts
│   └── linux/          # Linux installer scripts
│
├── docs/               # Documentation
│   ├── architecture/   # System architecture documentation
│   ├── api/           # API documentation
│   └── user-guides/   # User manuals and guides
│
├── .env.example       # Environment configuration template
├── docker-compose.yml # Development environment (to be created)
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following tools installed:

- **Node.js**: v18+ (LTS recommended)
- **Rust**: v1.74+ with Cargo
- **Python**: v3.10+
- **Git**: Latest version
- **Docker** (recommended): For containerized development

### Option 1: Docker Development Environment (Recommended)

The easiest way to get started is using Docker, which provides a complete development environment with hot reload.

**Prerequisites:**
- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Minimum 4GB RAM allocated to Docker

**Quick Start:**
```bash
# Windows
docker-start.bat

# Linux/Mac
./docker-start.sh
```

This will:
- Build all Docker images
- Install dependencies
- Start frontend (http://localhost:5173)
- Start backend API (http://localhost:3000)
- Start Storybook (http://localhost:6006)
- Enable hot reload for all services

**See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker documentation.**

### Option 2: Local Development (Manual Setup)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd caps-pos
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Build Rust backend**
   ```bash
   cd backend/rust
   cargo build
   ```

5. **Set up Python services**
   ```bash
   # Sync service
   cd sync
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Backup service
   cd ../backup
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

### Development

**Start the frontend development server:**
```bash
cd frontend
npm run dev
```

**Start the Rust backend:**
```bash
cd backend/rust
cargo run
```

**Start the sync service:**
```bash
cd sync
source venv/bin/activate  # On Windows: venv\Scripts\activate
python sync_service.py
```

**Start the backup service:**
```bash
cd backup
source venv/bin/activate  # On Windows: venv\Scripts\activate
python backup_service.py
```

## 📁 Directory Navigation Guide

### Frontend (`frontend/`)
The React-based user interface built with TypeScript and Vite.

- **`src/features/`**: Feature modules organized by domain
  - `sell/`: Point-of-sale checkout interface
  - `lookup/`: Product search and catalog
  - `warehouse/`: Inventory receiving and management
  - `customers/`: Customer relationship management
  - `reporting/`: Reports and analytics
  - `admin/`: System administration and settings

- **`src/common/`**: Shared code across features
  - `components/`: Reusable UI components (Button, Input, Table, etc.)
  - `layouts/`: Layout primitives (AppShell, PageHeader, SplitPane)
  - `contexts/`: React contexts (Auth, Permissions, Theme)
  - `utils/`: Utility functions and helpers

- **`src/domains/`**: Business logic modules
  - `cart/`: Shopping cart calculations and operations
  - `pricing/`: Pricing tiers, discounts, and rules
  - `stock/`: Inventory reservations and transfers
  - `auth/`: Authentication and authorization
  - `documents/`: Invoice, quote, and receipt generation

### Backend (`backend/rust/`)
The Rust API server providing local-first data access.

- **`src/handlers/`**: HTTP request handlers for API endpoints
- **`src/models/`**: Data models and business entities
- **`src/db/`**: Database access layer with SQLite integration
- **`src/config/`**: Configuration management and environment loading

### Services

- **`sync/`**: Cross-store synchronization service (Python)
  - Replicates data changes between store locations
  - Handles conflict resolution
  - Manages sync queue and retry logic

- **`backup/`**: Automated backup service (Python)
  - Performs scheduled database backups
  - Uploads to network storage and cloud
  - Manages backup retention policies

### Documentation (`docs/`)

- **`architecture/`**: System design and architecture documents
- **`api/`**: API endpoint documentation and specifications
- **`user-guides/`**: End-user manuals and training materials

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following key settings:

**Store Configuration:**
- `STORE_ID`: Unique identifier for this store location
- `STORE_NAME`: Human-readable store name
- `STORE_TIMEZONE`: Store timezone

**Database:**
- `DATABASE_PATH`: Path to local SQLite database

**Synchronization:**
- `SYNC_ENABLED`: Enable/disable cross-store sync
- `SYNC_INTERVAL_MS`: Sync frequency in milliseconds
- `REMOTE_STORES`: Comma-separated list of remote stores

**Security:**
- `JWT_SECRET`: Secret key for JWT token generation (generate with `openssl rand -base64 32`)
- `JWT_EXPIRATION_HOURS`: Token expiration time

**Hardware:**
- `RECEIPT_PRINTER_TYPE`: Receipt printer type (ESC_POS, etc.)
- `LABEL_PRINTER_TYPE`: Label printer type (ZEBRA_ZPL, etc.)
- `BARCODE_SCANNER_TYPE`: Barcode scanner type

See `.env.example` for complete configuration options.

## 🏛️ Architecture Overview

### Offline-First Design

The system is built with an offline-first architecture:

1. **Local Database**: All data stored in SQLite on the store server
2. **Local API**: Rust backend serves data from local database
3. **Background Sync**: Python service replicates changes between stores
4. **Conflict Resolution**: Timestamp-based conflict resolution
5. **Queue Persistence**: Failed syncs retry with exponential backoff

### Technology Stack

- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS
- **Backend**: Rust with Actix Web, SQLite with sqlx
- **Sync Service**: Python with SQLAlchemy
- **Backup Service**: Python with schedule library
- **State Management**: Zustand (lightweight alternative to Redux)
- **Data Fetching**: React Query for caching and synchronization

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test              # Run unit tests
npm run test:e2e      # Run end-to-end tests
npm run test:coverage # Generate coverage report
```

### Backend Tests
```bash
cd backend/rust
cargo test           # Run all tests
cargo test --release # Run optimized tests
```

### Python Service Tests
```bash
cd sync  # or backup
source venv/bin/activate
pytest
```

## 🎨 Code Quality

### Linting and Formatting

The project uses automated linting and formatting tools for all languages:

**Run all checks:**
```bash
# Linux/Mac
./lint-all.sh

# Windows
lint-all.bat
```

**Auto-fix formatting:**
```bash
# Linux/Mac
./format-all.sh

# Windows
format-all.bat
```

**Frontend (TypeScript):**
```bash
cd frontend
npm run lint          # Check for linting errors
npm run lint:fix      # Auto-fix linting errors
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without changes
```

**Backend (Rust):**
```bash
cd backend/rust
cargo fmt             # Format code
cargo fmt -- --check  # Check formatting
cargo clippy          # Run linter
cargo clippy -- -D warnings  # Fail on warnings
```

**Python Services:**
```bash
cd backup  # or sync
source venv/bin/activate  # Windows: venv\Scripts\activate
python -m black .          # Format code
python -m black --check .  # Check formatting
python -m flake8 .         # Run linter
python -m mypy .           # Type checking
```

### Pre-commit Hooks

Git pre-commit hooks automatically run linting and formatting checks before each commit:

- Frontend: ESLint + Prettier
- Backend: rustfmt + clippy
- Python: black + flake8

If checks fail, the commit is blocked until issues are fixed.

### Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types allowed
- **Rust**: No unsafe code, clippy warnings treated as errors
- **Python**: Type hints required, PEP 8 compliance
- **Test Coverage**: 80% for business logic, 60% for UI components

## 📦 Building for Production

### Frontend
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Backend
```bash
cd backend/rust
cargo build --release
# Output: backend/rust/target/release/caps-pos-api
```

### Docker Build
```bash
docker-compose build
```

## 🚢 Deployment

Detailed deployment instructions are available in `docs/deployment.md` (to be created).

### Quick Deployment Steps

1. Build production artifacts
2. Configure environment variables for production
3. Set up database and run migrations
4. Configure hardware (printers, scanners)
5. Test offline operation
6. Enable synchronization with other stores

## 🔒 Security

- **Encryption at Rest**: SQLite database encrypted with SQLCipher
- **Encryption in Transit**: TLS 1.3 for all network communication
- **Authentication**: JWT-based authentication with httpOnly cookies
- **Authorization**: Role-based access control (RBAC)
- **Password Hashing**: Argon2 for secure password storage
- **PCI DSS Compliance**: Certified payment terminals, no card storage

## 📚 Additional Resources

- **Development Guide**: `docs/architecture/overview.md` (to be created)
- **API Documentation**: `docs/api/` (to be created)
- **User Manuals**: `docs/user-guides/` (to be created)
- **Architecture Decisions**: See ADRs in `memory-bank/adr/`

## 🤝 Contributing

This is a private project for CAPS automotive retail. For development guidelines:

1. Follow the code organization structure
2. Write tests for new features
3. Update documentation
4. Follow naming conventions (see `structure.md`)
5. Use feature branches and pull requests

## 📝 License

Proprietary - All rights reserved by CAPS

## 🆘 Support

For technical support or questions:
- Check documentation in `docs/`
- Review architecture decisions in `memory-bank/adr/`
- Contact the development team

---

**Version**: 0.1.0  
**Last Updated**: 2026-01-08  
**Status**: Foundation Infrastructure Phase

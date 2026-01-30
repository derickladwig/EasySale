# Deployment Procedures

## Overview

This guide covers deploying EasySale to production environments. EasySale supports multiple deployment configurations depending on your needs.

## Deployment Options

### Option 1: Single Store (Standalone)

A single installation serving one store location.

```
┌─────────────────────────────────────────────────┐
│ Store Server / Workstation                      │
│  ┌─────────────────────────────────────────┐   │
│  │ EasySale Application                    │   │
│  │  - Frontend (React)                     │   │
│  │  - Backend (Rust)                       │   │
│  │  - SQLite Database                      │   │
│  └─────────────────────────────────────────┘   │
│                    ↓                            │
│  ┌─────────────────────────────────────────┐   │
│  │ POS Workstations (clients)              │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Option 2: Multi-Store (Distributed)

Multiple stores with peer-to-peer synchronization.

```
┌───────────────────┐     ┌───────────────────┐
│ Store A           │ ←→  │ Store B           │
│ (Main Location)   │     │ (Branch)          │
└───────────────────┘     └───────────────────┘
         ↕                         ↕
         └─────────┬───────────────┘
                   ↓
         ┌───────────────────┐
         │ Cloud Backup      │
         │ (Google Drive)    │
         └───────────────────┘
```

### Option 3: Docker Deployment

Containerized deployment for easier management.

```
┌─────────────────────────────────────────────────┐
│ Docker Host                                     │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ frontend        │  │ backend         │      │
│  │ (nginx)         │  │ (rust binary)   │      │
│  └─────────────────┘  └─────────────────┘      │
│           ↓                    ↓                │
│  ┌─────────────────────────────────────────┐   │
│  │ volume: /data (SQLite + backups)        │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB SSD | 100+ GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| Windows | 10/11 or Server 2019+ | Operating system |
| Docker | 20.10+ (optional) | Containerization |
| Node.js | 18+ (build only) | Frontend build |
| Rust | 1.70+ (build only) | Backend build |

## Installation Methods

### Method 1: Windows Installer (Recommended)

The simplest deployment method for Windows environments.

1. **Download the installer** from releases:
   ```
   EasySale-Setup-v1.0.0.exe
   ```

2. **Run the installer** as Administrator:
   - Accept license agreement
   - Choose installation directory
   - Select components (Full, Export, or Lite)
   - Configure initial settings

3. **Complete setup wizard**:
   - Create admin account
   - Configure store information
   - Set up backup location
   - Test hardware connections

4. **Start the application**:
   ```powershell
   # Start EasySale service
   Start-Service EasySale
   
   # Or run manually
   & "C:\Program Files\EasySale\easysale.exe"
   ```

### Method 2: Docker Deployment

For containerized environments.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/derickladwig/EasySale.git
   cd EasySale
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Build and start containers**:
   ```bash
   # Development
   docker-compose up -d
   
   # Production
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify deployment**:
   ```bash
   # Check container status
   docker-compose ps
   
   # Check logs
   docker-compose logs -f
   
   # Test health endpoint
   curl http://localhost:3000/health
   ```

### Method 3: Manual Installation

For custom deployments or development.

1. **Build the backend**:
   ```bash
   cd backend
   cargo build --release
   ```

2. **Build the frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. **Configure the database**:
   ```bash
   # Create data directory
   mkdir -p /var/easysale/data
   
   # Run migrations
   ./backend/target/release/easysale migrate
   ```

4. **Start the services**:
   ```bash
   # Start backend
   ./backend/target/release/easysale serve
   
   # Serve frontend (via nginx or similar)
   ```

## Configuration

### Environment Variables

```bash
# Core settings
EASYSALE_ENV=production
EASYSALE_PORT=3000
EASYSALE_HOST=0.0.0.0

# Database
DATABASE_URL=sqlite:///var/easysale/data/pos.db

# Security
JWT_SECRET=your-secure-secret-key-here
JWT_EXPIRY_HOURS=8

# Logging
LOG_LEVEL=info
LOG_DIR=/var/easysale/logs

# Backup
BACKUP_DIR=/var/easysale/backups
BACKUP_RETENTION_DAYS=30

# Optional integrations
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
WOOCOMMERCE_URL=
STRIPE_SECRET_KEY=
```

### Configuration File

`config/production.toml`:

```toml
[server]
host = "0.0.0.0"
port = 3000
workers = 4

[database]
path = "/var/easysale/data/pos.db"
max_connections = 10
journal_mode = "wal"

[auth]
jwt_secret = "${JWT_SECRET}"
jwt_expiry_hours = 8
password_min_length = 8

[backup]
enabled = true
directory = "/var/easysale/backups"
retention_days = 30
schedule = "0 2 * * *"  # 2 AM daily

[sync]
enabled = true
interval_seconds = 60
batch_size = 1000

[logging]
level = "info"
directory = "/var/easysale/logs"
rotation = "daily"
retention_days = 30
```

## Post-Installation Setup

### 1. Initial Configuration

Access the admin panel at `http://localhost:3000/admin`:

1. **Create admin account** (if not done during install)
2. **Configure store information**:
   - Store name
   - Address
   - Tax rates
   - Currency
3. **Set up user accounts** for staff
4. **Configure integrations** (optional)

### 2. Import Initial Data

```bash
# Import products from CSV
curl -X POST http://localhost:3000/api/setup/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@products.csv" \
  -F "type=products"

# Import customers from CSV
curl -X POST http://localhost:3000/api/setup/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@customers.csv" \
  -F "type=customers"
```

### 3. Hardware Setup

Configure POS hardware in Admin > Settings > Hardware:

1. **Barcode scanner**: USB HID (plug and play)
2. **Receipt printer**: Configure ESC/POS settings
3. **Label printer**: Configure ZPL settings
4. **Cash drawer**: Connected via printer

### 4. Backup Configuration

Verify backup configuration:

```bash
# Test backup creation
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer <token>"

# Verify backup exists
ls -la /var/easysale/backups/
```

## Production Checklist

Before going live, verify:

### Security
- [ ] Changed default admin password
- [ ] JWT secret is unique and secure
- [ ] HTTPS configured (if accessible from network)
- [ ] Firewall rules configured
- [ ] Database file permissions restricted

### Performance
- [ ] Database on SSD storage
- [ ] Adequate RAM allocated
- [ ] Logging configured and working
- [ ] Health check responding

### Backup
- [ ] Backup directory configured
- [ ] Backup schedule set
- [ ] Test backup created
- [ ] Test restore verified

### Hardware
- [ ] Barcode scanner tested
- [ ] Receipt printer tested
- [ ] Label printer tested (if used)
- [ ] Cash drawer tested

### Data
- [ ] Products imported
- [ ] Tax rates configured
- [ ] User accounts created
- [ ] Store information set

## Upgrade Procedures

### Windows Installer Upgrade

1. **Backup current data**:
   ```powershell
   & "C:\Program Files\EasySale\backup.ps1"
   ```

2. **Download new installer**

3. **Stop the service**:
   ```powershell
   Stop-Service EasySale
   ```

4. **Run installer** (overwrites previous version)

5. **Start the service**:
   ```powershell
   Start-Service EasySale
   ```

6. **Verify upgrade**:
   ```powershell
   curl http://localhost:3000/health
   ```

### Docker Upgrade

1. **Backup current data**:
   ```bash
   docker-compose exec backend /app/backup.sh
   ```

2. **Pull new images**:
   ```bash
   docker-compose pull
   ```

3. **Restart with new images**:
   ```bash
   docker-compose up -d
   ```

4. **Verify upgrade**:
   ```bash
   docker-compose ps
   curl http://localhost:3000/health
   ```

### Database Migrations

Migrations run automatically on startup. To run manually:

```bash
# Check migration status
./easysale migrate status

# Run pending migrations
./easysale migrate up

# Rollback last migration (if needed)
./easysale migrate down
```

## Rollback Procedures

If an upgrade fails:

### Windows

1. **Stop service**:
   ```powershell
   Stop-Service EasySale
   ```

2. **Restore from backup**:
   ```powershell
   & "C:\Program Files\EasySale\restore.ps1" -BackupPath "C:\backups\pre-upgrade.zip"
   ```

3. **Reinstall previous version**

4. **Start service**:
   ```powershell
   Start-Service EasySale
   ```

### Docker

1. **Stop containers**:
   ```bash
   docker-compose down
   ```

2. **Restore database from backup**:
   ```bash
   cp /backups/pre-upgrade.db /var/easysale/data/pos.db
   ```

3. **Restart with previous image**:
   ```bash
   docker-compose up -d --force-recreate
   ```

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed
```

### Log Locations

| Log Type | Location |
|----------|----------|
| Application | `/var/easysale/logs/app.log` |
| Access | `/var/easysale/logs/access.log` |
| Error | `/var/easysale/logs/error.log` |
| Sync | `/var/easysale/logs/sync.log` |

### Key Metrics

Monitor these metrics:

- **Response time**: < 500ms for 95th percentile
- **Error rate**: < 1% of requests
- **Sync queue depth**: < 1000 pending events
- **Disk usage**: < 80% capacity
- **Memory usage**: < 80% of allocated

## Troubleshooting

### Service Won't Start

1. Check logs: `/var/easysale/logs/error.log`
2. Verify database permissions
3. Check port availability: `netstat -tlnp | grep 3000`
4. Verify environment variables

### Database Errors

1. Check disk space: `df -h`
2. Verify file permissions
3. Check for corruption: `sqlite3 pos.db "PRAGMA integrity_check;"`
4. Restore from backup if needed

### Sync Issues

1. Check network connectivity
2. Review sync logs: `/var/easysale/logs/sync.log`
3. Check queue status: `GET /api/sync/status`
4. Force sync: `POST /api/sync/force`

### Performance Issues

1. Check system resources: CPU, RAM, disk
2. Review slow query logs
3. Verify indexes: `PRAGMA index_list(tablename);`
4. Consider increasing worker count

## Security Hardening

For production deployments:

1. **Use HTTPS** for all external access
2. **Configure firewall** to restrict access
3. **Enable audit logging** for compliance
4. **Regular security updates**
5. **Strong password policy**
6. **Encrypt backups**

## Support

For deployment assistance:

- **Documentation**: https://github.com/derickladwig/EasySale/docs
- **Issues**: https://github.com/derickladwig/EasySale/issues
- **Discussions**: https://github.com/derickladwig/EasySale/discussions

## References

- [Installation Guide](./INSTALL.md)
- [Windows Deployment](./deployment/WINDOWS_DEPLOYMENT_QUICK_START.md)
- [Docker Guide](./deployment/DOCKER_BUILD_INSTRUCTIONS.md)
- [Runbook](./RUNBOOK.md)

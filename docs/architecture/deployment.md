# Deployment Guide

## Overview

This guide covers deploying the CAPS POS system to production environments. The system is designed for on-premise deployment at each store location.

## Prerequisites

### Hardware Requirements

**Minimum**:
- CPU: 2 cores (x86_64)
- RAM: 4GB
- Storage: 50GB SSD
- Network: 10 Mbps internet (for sync)

**Recommended**:
- CPU: 4 cores (x86_64)
- RAM: 8GB
- Storage: 100GB SSD
- Network: 50 Mbps internet

### Software Requirements

- **Operating System**: Ubuntu 20.04+ or Windows Server 2019+
- **Docker**: 20.10+ with Docker Compose
- **Backup Storage**: Network drive or cloud storage access

### Network Requirements

- **Ports**:
  - 80 (HTTP) - Frontend
  - 443 (HTTPS) - Frontend (with SSL)
  - 3000 (Internal) - Backend API
- **Firewall**: Allow outbound HTTPS for sync and backups
- **DNS**: Optional custom domain

## Deployment Methods

### Method 1: Docker Compose (Recommended)

**Advantages**:
- Easy to deploy and update
- Consistent across environments
- Isolated from host system
- Built-in health checks

**Steps**:

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd caps-pos
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   nano .env  # Edit configuration
   ```

3. **Build images**:
   ```bash
   # Linux/Mac
   ./build-prod.sh
   
   # Windows
   build-prod.bat
   ```

4. **Start services**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Verify deployment**:
   ```bash
   # Check service status
   docker-compose -f docker-compose.prod.yml ps
   
   # Check logs
   docker-compose -f docker-compose.prod.yml logs -f
   
   # Test health endpoints
   curl http://localhost/health
   curl http://localhost:3000/health
   ```

### Method 2: Manual Installation

**Advantages**:
- More control over configuration
- No Docker dependency
- Direct access to logs and data

**Steps**:

1. **Install Node.js 18+**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install Rust**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

3. **Build frontend**:
   ```bash
   cd frontend
   npm ci
   npm run build
   ```

4. **Build backend**:
   ```bash
   cd backend/rust
   cargo build --release
   ```

5. **Install Nginx**:
   ```bash
   sudo apt-get install nginx
   sudo cp frontend/nginx.conf /etc/nginx/sites-available/caps-pos
   sudo ln -s /etc/nginx/sites-available/caps-pos /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Create systemd service**:
   ```bash
   sudo nano /etc/systemd/system/caps-pos-api.service
   ```
   
   ```ini
   [Unit]
   Description=CAPS POS API
   After=network.target
   
   [Service]
   Type=simple
   User=caps
   WorkingDirectory=/opt/caps-pos
   ExecStart=/opt/caps-pos/backend/rust/target/release/caps-pos-api
   Restart=always
   Environment="DATABASE_PATH=/var/lib/caps-pos/pos.db"
   Environment="RUST_LOG=info"
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable caps-pos-api
   sudo systemctl start caps-pos-api
   ```

## Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# Store Configuration
STORE_ID=store-001
STORE_NAME="CAPS Edmonton"

# Database
DATABASE_PATH=/data/pos.db

# Security
JWT_SECRET=<generate-random-secret>  # Use: openssl rand -base64 32

# Sync Configuration
SYNC_ENABLED=true
SYNC_INTERVAL_MS=300000  # 5 minutes
REMOTE_STORES=store-002:192.168.1.10:3000,store-003:192.168.1.11:3000

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_LOCAL_PATH=/mnt/backup
BACKUP_CLOUD_ENABLED=true
GOOGLE_DRIVE_CREDENTIALS_PATH=/secrets/gdrive-service-account.json

# Logging
RUST_LOG=info
LOG_LEVEL=info

# Production Settings
NODE_ENV=production
```

### Generating Secrets

**JWT Secret**:
```bash
openssl rand -base64 32
```

**Store ID**:
- Use format: `store-XXX` where XXX is a unique number
- Example: `store-001`, `store-002`, etc.

### SSL/TLS Configuration

**Using Let's Encrypt** (recommended):

1. **Install Certbot**:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain certificate**:
   ```bash
   sudo certbot --nginx -d pos.yourdomain.com
   ```

3. **Auto-renewal**:
   ```bash
   sudo certbot renew --dry-run
   ```

**Using self-signed certificate** (development only):

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/caps-pos.key \
  -out /etc/ssl/certs/caps-pos.crt
```

## Database Management

### Initial Setup

Database is created automatically on first run with:
- Schema from migrations
- Seed data (default users)

### Migrations

Migrations run automatically on application startup. To run manually:

```bash
# Using Docker
docker-compose -f docker-compose.prod.yml exec backend ./caps-pos-api migrate

# Manual installation
cd backend/rust
cargo run -- migrate
```

### Backup

**Automated backups** (configured in `.env`):
- Daily local backups to network drive
- Weekly cloud backups to Google Drive
- 30-day local retention, 1-year cloud retention

**Manual backup**:
```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend

# Copy database
cp /data/pos.db /backup/pos-$(date +%Y%m%d).db

# Start application
docker-compose -f docker-compose.prod.yml start backend
```

### Restore

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
cp /backup/pos-20260109.db /data/pos.db

# Start application
docker-compose -f docker-compose.prod.yml start backend
```

## Updates and Maintenance

### Updating Application

**Docker Compose method**:

```bash
# Pull latest code
git pull origin main

# Rebuild images
./build-prod.sh

# Restart services (zero-downtime)
docker-compose -f docker-compose.prod.yml up -d
```

**Manual method**:

```bash
# Pull latest code
git pull origin main

# Rebuild frontend
cd frontend
npm ci
npm run build

# Rebuild backend
cd ../backend/rust
cargo build --release

# Restart services
sudo systemctl restart caps-pos-api
sudo systemctl restart nginx
```

### Database Migrations

Migrations run automatically on startup. To check migration status:

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs backend | grep migration
```

### Rollback

If an update causes issues:

```bash
# Rollback to previous version
git checkout <previous-commit>

# Rebuild and restart
./build-prod.sh
docker-compose -f docker-compose.prod.yml up -d

# Restore database if needed
cp /backup/pos-<date>.db /data/pos.db
```

## Monitoring

### Health Checks

**Frontend**:
```bash
curl http://localhost/health
# Expected: "healthy"
```

**Backend**:
```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"...","version":"0.1.0"}
```

### Logs

**Docker Compose**:
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

**Manual installation**:
```bash
# Backend logs
sudo journalctl -u caps-pos-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Metrics

**Key metrics to monitor**:
- Transaction processing time (< 30 seconds)
- Database query time (< 100ms p95)
- Sync queue depth (< 1000 pending)
- Disk usage (< 80%)
- Memory usage (< 80%)
- CPU usage (< 80%)

**Monitoring tools** (optional):
- Prometheus + Grafana
- Datadog
- New Relic

## Troubleshooting

### Application Won't Start

**Check logs**:
```bash
docker-compose -f docker-compose.prod.yml logs backend
```

**Common issues**:
- Database file permissions
- Missing environment variables
- Port already in use
- Insufficient disk space

### Database Errors

**Check database file**:
```bash
sqlite3 /data/pos.db "PRAGMA integrity_check;"
```

**Repair database**:
```bash
sqlite3 /data/pos.db ".recover" | sqlite3 /data/pos-recovered.db
```

### Sync Not Working

**Check network connectivity**:
```bash
ping <remote-store-ip>
curl http://<remote-store-ip>:3000/health
```

**Check sync logs**:
```bash
docker-compose -f docker-compose.prod.yml logs backend | grep sync
```

**Reset sync queue**:
```bash
sqlite3 /data/pos.db "UPDATE sync_events SET synced = 0;"
```

### Performance Issues

**Check resource usage**:
```bash
docker stats
```

**Optimize database**:
```bash
sqlite3 /data/pos.db "VACUUM; ANALYZE;"
```

**Clear old data**:
```bash
# Archive transactions older than 1 year
sqlite3 /data/pos.db "DELETE FROM transactions WHERE created_at < date('now', '-1 year');"
```

## Security

### Firewall Configuration

**Ubuntu (ufw)**:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Windows Firewall**:
```powershell
New-NetFirewallRule -DisplayName "CAPS POS HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "CAPS POS HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

### User Permissions

**Create dedicated user**:
```bash
sudo useradd -r -s /bin/false caps
sudo chown -R caps:caps /opt/caps-pos
sudo chown -R caps:caps /data
```

### Regular Security Updates

**Ubuntu**:
```bash
sudo apt-get update
sudo apt-get upgrade
```

**Docker images**:
```bash
docker pull node:18-alpine
docker pull rust:1.75-alpine
docker pull nginx:alpine
./build-prod.sh
```

## Backup and Disaster Recovery

### Backup Strategy

**Daily backups**:
- Database file
- Configuration files
- User uploads (if any)

**Weekly backups**:
- Full system backup
- Cloud backup

**Retention**:
- Local: 30 days
- Cloud: 1 year

### Disaster Recovery

**Recovery Time Objective (RTO)**: < 1 hour  
**Recovery Point Objective (RPO)**: < 24 hours

**Recovery steps**:

1. **Install fresh system** (if hardware failure)
2. **Install Docker** and dependencies
3. **Clone repository**
4. **Restore database** from backup
5. **Configure environment** variables
6. **Start services**
7. **Verify functionality**

## Multi-Store Deployment

### Store Network Topology

```
Store A (192.168.1.10) ←→ Store B (192.168.1.11)
         ↓                          ↓
         └──────────────────────────┘
                    ↓
            Cloud Backup (Google Drive)
```

### Sync Configuration

**Store A** (`.env`):
```bash
STORE_ID=store-001
REMOTE_STORES=store-002:192.168.1.11:3000
```

**Store B** (`.env`):
```bash
STORE_ID=store-002
REMOTE_STORES=store-001:192.168.1.10:3000
```

### VPN Setup (Optional)

For secure store-to-store communication:

1. **Install WireGuard**:
   ```bash
   sudo apt-get install wireguard
   ```

2. **Configure VPN** between stores
3. **Update REMOTE_STORES** to use VPN IPs

## Performance Tuning

### Database Optimization

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Increase cache size (in KB)
PRAGMA cache_size = -64000;  -- 64MB

-- Optimize for performance
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
```

### Nginx Optimization

```nginx
# Increase worker processes
worker_processes auto;

# Increase worker connections
events {
    worker_connections 1024;
}

# Enable caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;
```

### Docker Optimization

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## References

- [System Architecture](./overview.md)
- [Database Schema](./database.md)
- [Security Documentation](./security.md)
- [API Documentation](../api/README.md)

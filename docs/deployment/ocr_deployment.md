# OCR System Deployment Guide

## Overview

This guide covers deploying the Invoice OCR v3.0 system to production.

---

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD
- OS: Ubuntu 20.04+ or Windows Server 2019+

**Recommended:**
- CPU: 8+ cores
- RAM: 16GB+
- Storage: 100GB+ SSD
- OS: Ubuntu 22.04 LTS

### Software Dependencies

**Required:**
- Rust 1.75+
- SQLite 3.35+ with JSON support
- Tesseract OCR 5.0+
- Node.js 18+ (for frontend)
- Nginx or Apache (for reverse proxy)

**Optional:**
- Docker 24+ (for containerized deployment)
- Redis (for caching)
- PostgreSQL (for production database)

---

## Installation

### 1. Install Tesseract OCR

**Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng
sudo apt-get install -y libtesseract-dev libleptonica-dev

# Verify installation
tesseract --version
```

**Windows:**
```powershell
# Download installer from https://github.com/UB-Mannheim/tesseract/wiki
# Install to C:\Program Files\Tesseract-OCR
# Add to PATH

# Verify installation
tesseract --version
```

**Additional Languages:**
```bash
# Install additional language packs
sudo apt-get install tesseract-ocr-spa  # Spanish
sudo apt-get install tesseract-ocr-fra  # French
sudo apt-get install tesseract-ocr-deu  # German
```

### 2. Clone Repository

```bash
git clone https://github.com/derickladwig/EasySale.git
cd EasySale
```

### 3. Build Backend

```bash
cd backend
cargo build --release

# Binary will be at: target/release/EasySale-server
```

### 4. Build Frontend

```bash
cd frontend
npm ci
npm run build

# Build output in: dist/
```

### 5. Database Setup

**Initialize Database:**
```bash
# Create database directory
mkdir -p data

# Run migrations
cd backend
cargo sqlx database create
cargo sqlx migrate run
```

**Database Schema:**
The system requires these tables:
- `artifacts` - Artifact storage
- `review_cases` - Review cases
- `validation_results` - Validation reports
- `vendor_bills` - AP integration
- `vendors` - Vendor records
- `products` - Inventory items
- `journal_entries` - Accounting entries
- `chart_of_accounts` - Account mapping

---

## Configuration

### 1. Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_URL=sqlite:./data/pos.db

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=7945
STORE_ID=store-001
TENANT_ID=tenant-001

# OCR
TESSERACT_PATH=/usr/bin/tesseract
OCR_CACHE_DIR=./cache/ocr
OCR_CACHE_TTL_HOURS=24

# Processing
MAX_CONCURRENT_OCR=5
PROCESSING_TIMEOUT_SECONDS=30
EARLY_STOP_ENABLED=true

# Review
REVIEW_POLICY_MODE=balanced
AUTO_APPROVE_ENABLED=true
CONFIDENCE_THRESHOLD=95

# Integration
AUTO_INTEGRATE=true
INTEGRATION_SYSTEMS=inventory,ap,accounting

# Logging
RUST_LOG=info
LOG_FILE=./logs/server.log
```

### 2. OCR Profiles

Edit `config/ocr_profiles.yml`:

```yaml
profiles:
  fast:
    psm: 6
    oem: 3
    timeout_ms: 3000
    
  balanced:
    psm: 6
    oem: 3
    timeout_ms: 5000
    
  high_accuracy:
    psm: 6
    oem: 1
    timeout_ms: 10000

zone_defaults:
  HeaderFields: balanced
  TotalsBox: high_accuracy
  LineItemsTable: balanced
  FooterNotes: fast
```

### 3. Validation Rules

Edit `config/validation_rules.yml`:

```yaml
rules:
  - rule_id: total_math
    rule_type: TotalMath
    severity: Hard
    message: "Total must equal Subtotal + Tax (±$0.02)"
    penalty: 50
    enabled: true
    
  - rule_id: date_not_future
    rule_type: DateRange
    severity: Hard
    message: "Invoice date cannot be in the future"
    penalty: 30
    enabled: true
    
  - rule_id: required_fields
    rule_type: RequiredField
    severity: Hard
    message: "Required fields missing"
    penalty: 100
    enabled: true
```

### 4. Review Policy

Edit `config/review_policy.yml`:

```yaml
default_mode: balanced

modes:
  fast:
    document_confidence: 90
    critical_field_confidence: 85
    auto_approve_threshold: 90
    allow_soft_flags: true
    
  balanced:
    document_confidence: 95
    critical_field_confidence: 92
    auto_approve_threshold: 95
    allow_soft_flags: true
    
  strict:
    document_confidence: 98
    critical_field_confidence: 95
    auto_approve_threshold: 98
    allow_soft_flags: false

critical_fields:
  - invoice_number
  - invoice_date
  - vendor_name
  - total
```

### 5. Lexicon

Edit `config/lexicon.yml`:

```yaml
global:
  invoice_number:
    - "Invoice #"
    - "Invoice No"
    - "Inv #"
    - "Bill #"
    
  invoice_date:
    - "Date"
    - "Invoice Date"
    - "Bill Date"
    
  vendor_name:
    - "From"
    - "Vendor"
    - "Supplier"
    
  total:
    - "Total"
    - "Amount Due"
    - "Balance Due"

vendor_overrides:
  vendor-acme:
    invoice_number:
      - "ACME Invoice"
      - "Order #"
```

---

## Deployment Options

### Option 1: Systemd Service (Linux)

Create `/etc/systemd/system/ocr-server.service`:

```ini
[Unit]
Description=Invoice OCR Server
After=network.target

[Service]
Type=simple
User=ocr
WorkingDirectory=/opt/invoice-ocr
Environment="DATABASE_URL=sqlite:/opt/invoice-ocr/data/pos.db"
ExecStart=/opt/invoice-ocr/backend/target/release/EasySale-server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Start Service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable ocr-server
sudo systemctl start ocr-server
sudo systemctl status ocr-server
```

### Option 2: Docker Deployment

**Dockerfile:**
```dockerfile
FROM rust:1.75 as backend-builder
WORKDIR /app
COPY backend/ .
RUN cargo build --release

FROM node:18 as frontend-builder
WORKDIR /app
COPY frontend/ .
RUN npm ci && npm run build

FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/target/release/EasySale-server /usr/local/bin/
COPY --from=frontend-builder /app/dist /var/www/html
COPY config/ /etc/ocr/config/

EXPOSE 7945
CMD ["EasySale-server"]
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  ocr-server:
    build: .
    ports:
      - "7945:7945"
    volumes:
      - ./data:/data
      - ./cache:/cache
      - ./logs:/logs
    environment:
      - DATABASE_URL=sqlite:/data/pos.db
      - RUST_LOG=info
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html
    depends_on:
      - ocr-server
    restart: unless-stopped
```

**Deploy:**
```bash
docker-compose up -d
docker-compose logs -f
```

### Option 3: Windows Service

Use NSSM (Non-Sucking Service Manager):

```powershell
# Download NSSM from https://nssm.cc/download
nssm install OCRServer "C:\OCR\backend\target\release\EasySale-server.exe"
nssm set OCRServer AppDirectory "C:\OCR"
nssm set OCRServer AppEnvironmentExtra "DATABASE_URL=sqlite:C:\OCR\data\pos.db"
nssm start OCRServer
```

---

## Reverse Proxy Setup

### Nginx Configuration

```nginx
upstream ocr_backend {
    server localhost:7945;
}

server {
    listen 80;
    server_name ocr.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ocr.example.com;
    
    ssl_certificate /etc/ssl/certs/ocr.example.com.crt;
    ssl_certificate_key /etc/ssl/private/ocr.example.com.key;
    
    # Frontend
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api/ {
        proxy_pass http://ocr_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for OCR processing
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        
        # Increase body size for file uploads
        client_max_body_size 10M;
    }
}
```

---

## Database Migrations

### Running Migrations

```bash
cd backend
cargo sqlx migrate run
```

### Creating New Migration

```bash
cargo sqlx migrate add <migration_name>
```

### Migration Files

Located in `backend/migrations/`:
- `001_initial_schema.sql`
- `002_add_artifacts.sql`
- `003_add_review_cases.sql`
- etc.

---

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:7945/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "uptime_seconds": 3600,
  "database": "connected",
  "tesseract": "available"
}
```

### Metrics

**Prometheus Metrics:**
```
# Processing metrics
ocr_processing_duration_seconds
ocr_processing_total
ocr_processing_errors_total

# Review metrics
review_cases_total
review_approval_rate
review_avg_confidence

# Integration metrics
integration_success_total
integration_failure_total
```

### Logging

**Log Levels:**
- `ERROR`: Critical errors
- `WARN`: Warnings
- `INFO`: General information
- `DEBUG`: Detailed debugging

**Log Rotation:**
```bash
# Install logrotate
sudo apt-get install logrotate

# Create /etc/logrotate.d/ocr-server
/opt/invoice-ocr/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 ocr ocr
    sharedscripts
    postrotate
        systemctl reload ocr-server
    endscript
}
```

---

## Backup & Recovery

### Database Backup

```bash
# Daily backup
sqlite3 /opt/invoice-ocr/data/pos.db ".backup '/backup/pos-$(date +%Y%m%d).db'"

# Automated backup script
#!/bin/bash
BACKUP_DIR=/backup
DB_PATH=/opt/invoice-ocr/data/pos.db
DATE=$(date +%Y%m%d)

sqlite3 $DB_PATH ".backup '$BACKUP_DIR/pos-$DATE.db'"
gzip $BACKUP_DIR/pos-$DATE.db

# Keep last 30 days
find $BACKUP_DIR -name "pos-*.db.gz" -mtime +30 -delete
```

### Artifact Backup

```bash
# Backup cache directory
tar -czf /backup/ocr-cache-$(date +%Y%m%d).tar.gz /opt/invoice-ocr/cache

# Keep last 7 days
find /backup -name "ocr-cache-*.tar.gz" -mtime +7 -delete
```

### Recovery

```bash
# Restore database
gunzip /backup/pos-20260125.db.gz
cp /backup/pos-20260125.db /opt/invoice-ocr/data/pos.db

# Restore cache
tar -xzf /backup/ocr-cache-20260125.tar.gz -C /
```

---

## Security

### SSL/TLS

Use Let's Encrypt for free SSL certificates:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d ocr.example.com
```

### Authentication

Configure JWT authentication:

```bash
# Generate secret key
openssl rand -base64 32

# Add to .env
JWT_SECRET=<generated_secret>
JWT_EXPIRY_HOURS=24
```

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Performance Tuning

### Database Optimization

```sql
-- Enable WAL mode
PRAGMA journal_mode=WAL;

-- Increase cache size
PRAGMA cache_size=-64000;  -- 64MB

-- Optimize queries
CREATE INDEX idx_cases_state ON review_cases(state);
CREATE INDEX idx_cases_confidence ON review_cases(confidence);
CREATE INDEX idx_artifacts_parent ON artifacts(parent_id);
```

### Concurrent Processing

Adjust in `.env`:
```bash
MAX_CONCURRENT_OCR=8  # Increase for more CPU cores
WORKER_THREADS=8      # Match CPU cores
```

### Caching

Enable Redis for caching:
```bash
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true
CACHE_TTL_SECONDS=3600
```

---

## Troubleshooting

### Tesseract Not Found

```bash
# Check Tesseract installation
which tesseract
tesseract --version

# Set path in .env
TESSERACT_PATH=/usr/bin/tesseract
```

### Database Locked

```bash
# Check for long-running queries
sqlite3 pos.db "PRAGMA busy_timeout=30000;"

# Enable WAL mode
sqlite3 pos.db "PRAGMA journal_mode=WAL;"
```

### High Memory Usage

```bash
# Reduce concurrent processing
MAX_CONCURRENT_OCR=3

# Reduce cache size
OCR_CACHE_TTL_HOURS=12
```

### Slow Processing

```bash
# Use Fast OCR profile
DEFAULT_OCR_PROFILE=fast

# Enable early stopping
EARLY_STOP_ENABLED=true
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Check logs for errors
- Monitor disk space
- Verify backups

**Weekly:**
- Review performance metrics
- Check confidence calibration
- Update vendor lexicons

**Monthly:**
- Update dependencies
- Review security patches
- Optimize database

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild backend
cd backend
cargo build --release

# Rebuild frontend
cd frontend
npm ci
npm run build

# Restart service
sudo systemctl restart ocr-server
```

---

## Support

- **Documentation**: https://github.com/derickladwig/EasySale/docs
- **Issues**: https://github.com/derickladwig/EasySale/issues
- **Email**: support@example.com
- **Slack**: #ocr-support

---

**Version:** 3.0  
**Last Updated:** January 25, 2026

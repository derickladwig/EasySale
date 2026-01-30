# EasySale Installer Framework

This directory contains the installation framework for deploying the EasySale system to store servers and client devices.

## Overview

The EasySale system requires a two-phase installation:
1. **Server Installation**: Sets up the store server with the backend API, database, and sync service
2. **Client Registration**: Registers POS terminals and workstations to connect to the store server

## Directory Structure

```
installer/
├── server/           # Server installation scripts
│   ├── windows/      # Windows Server installation
│   ├── linux/        # Linux server installation
│   └── common/       # Shared installation logic
├── client/           # Client device registration
│   ├── windows/      # Windows client setup
│   ├── linux/        # Linux client setup
│   └── common/       # Shared client logic
├── config/           # Configuration templates
├── scripts/          # Utility scripts
└── docs/             # Installation documentation
```

## Installation Workflow

### Phase 1: Server Setup

The server installation process:

1. **System Requirements Check**
   - Verify OS version (Windows Server 2019+ or Ubuntu 20.04+)
   - Check available disk space (minimum 50GB)
   - Verify RAM (minimum 8GB)
   - Check network connectivity

2. **Dependency Installation**
   - Install SQLite 3.35+
   - Install Rust runtime (for backend API)
   - Install Python 3.10+ (for sync/backup services)
   - Install Node.js 18+ (for admin dashboard)

3. **Database Initialization**
   - Create SQLite database file
   - Run all migrations (001_initial_schema.sql, 002_sales_customer_management.sql, etc.)
   - Seed default data (admin user, roles, permissions)
   - Set up database backup schedule

4. **Service Configuration**
   - Configure backend API (port, JWT secret, database path)
   - Configure sync service (sync interval, conflict resolution)
   - Configure backup service (backup path, retention policy)
   - Set up systemd services (Linux) or Windows Services

5. **Network Configuration**
   - Configure firewall rules (allow API port, sync port)
   - Set up static IP or DHCP reservation
   - Configure SSL certificates (optional, for HTTPS)

6. **Store Registration**
   - Generate unique store ID
   - Configure store metadata (name, address, timezone)
   - Set up multi-store sync (if applicable)

### Phase 2: Client Device Registration

The client registration process:

1. **Device Requirements Check**
   - Verify OS version (Windows 10+ or Ubuntu 20.04+)
   - Check network connectivity to server
   - Verify hardware (touch screen, barcode scanner, printer)

2. **Application Installation**
   - Install Electron desktop application
   - Configure server connection (IP address, port)
   - Test API connectivity

3. **Device Registration**
   - Register device with server (device name, type, location)
   - Assign device to store
   - Configure device-specific settings (default printer, scanner port)

4. **Hardware Configuration**
   - Configure barcode scanner (USB/Serial)
   - Configure receipt printer (ESC/POS)
   - Configure label printer (Zebra ZPL)
   - Configure cash drawer (via printer)
   - Configure payment terminal (optional)

5. **User Assignment**
   - Create or assign user accounts
   - Configure role-based permissions
   - Set up PIN or password authentication

## Installation Scripts

### Server Installation (Windows)

```powershell
# Run as Administrator
.\installer\server\windows\install.ps1
```

### Server Installation (Linux)

```bash
# Run with sudo
sudo ./installer/server/linux/install.sh
```

### Client Registration (Windows)

```powershell
# Run as Administrator
.\installer\client\windows\register.ps1 -ServerIP "192.168.1.100" -DeviceName "POS-Terminal-1"
```

### Client Registration (Linux)

```bash
# Run with sudo
sudo ./installer/client/linux/register.sh --server-ip "192.168.1.100" --device-name "POS-Terminal-1"
```

## Configuration Files

### Server Configuration Template

Location: `installer/config/server.env.template`

```env
# Database Configuration
DATABASE_PATH=/var/lib/EasySale/pos.db
DATABASE_BACKUP_PATH=/var/backups/EasySale

# API Configuration
API_PORT=8080
API_HOST=0.0.0.0
JWT_SECRET=<generated-secret>
JWT_EXPIRATION_HOURS=8

# Store Configuration
STORE_ID=<generated-uuid>
STORE_NAME=Main Store
STORE_TIMEZONE=America/New_York

# Sync Configuration
SYNC_ENABLED=true
SYNC_INTERVAL_SECONDS=300
SYNC_MASTER_URL=https://sync.example.com

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION_DAYS=30
```

### Client Configuration Template

Location: `installer/config/client.env.template`

```env
# Server Connection
SERVER_URL=http://192.168.1.100:8080
SERVER_TIMEOUT_SECONDS=30

# Device Configuration
DEVICE_ID=<generated-uuid>
DEVICE_NAME=POS-Terminal-1
DEVICE_TYPE=POS_TERMINAL

# Hardware Configuration
BARCODE_SCANNER_PORT=COM3
RECEIPT_PRINTER_NAME=EPSON-TM-T88V
LABEL_PRINTER_NAME=Zebra-ZD420
CASH_DRAWER_ENABLED=true

# UI Configuration
TOUCH_MODE=true
SCREEN_TIMEOUT_MINUTES=15
AUTO_LOGOUT_MINUTES=30
```

## Unattended Installation

For automated deployments, use the unattended installation mode:

### Server (Windows)

```powershell
.\installer\server\windows\install.ps1 -Unattended -ConfigFile ".\config\server.env"
```

### Server (Linux)

```bash
sudo ./installer/server/linux/install.sh --unattended --config-file "./config/server.env"
```

## Troubleshooting

### Common Issues

1. **Database initialization fails**
   - Check disk space
   - Verify SQLite is installed
   - Check file permissions

2. **Service won't start**
   - Check logs in `/var/log/EasySale/` (Linux) or `C:\ProgramData\EasySale\logs\` (Windows)
   - Verify all dependencies are installed
   - Check port availability

3. **Client can't connect to server**
   - Verify server IP address
   - Check firewall rules
   - Test network connectivity with `ping` or `telnet`

4. **Hardware not detected**
   - Check USB connections
   - Verify device drivers are installed
   - Check device manager (Windows) or `lsusb` (Linux)

## Security Considerations

1. **Database Encryption**
   - Use SQLCipher for database encryption at rest
   - Store encryption key securely (not in config files)

2. **Network Security**
   - Use HTTPS for API communication (recommended)
   - Configure firewall to restrict access to API port
   - Use VPN for multi-store sync (recommended)

3. **Access Control**
   - Change default admin password immediately
   - Use strong passwords (minimum 12 characters)
   - Enable two-factor authentication (optional)

4. **Backup Security**
   - Encrypt backup files
   - Store backups on separate physical device
   - Test backup restoration regularly

## Support

For installation support, contact:
- Email: support@EasySale.example.com
- Phone: 1-800-EasySale
- Documentation: https://docs.EasySale.example.com

## License

Copyright © 2026 EasySale System. All rights reserved.

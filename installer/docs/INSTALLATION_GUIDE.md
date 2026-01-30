# EasySale Installation Guide

This guide provides step-by-step instructions for installing and configuring the EasySale system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Installation](#server-installation)
3. [Client Registration](#client-registration)
4. [Hardware Configuration](#hardware-configuration)
5. [Multi-Store Setup](#multi-store-setup)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Server Requirements

**Hardware:**
- CPU: 4+ cores (Intel i5 or equivalent)
- RAM: 8GB minimum, 16GB recommended
- Storage: 50GB minimum, 100GB recommended (SSD preferred)
- Network: Gigabit Ethernet

**Software:**
- **Windows:** Windows Server 2019 or later, Windows 10 Pro or later
- **Linux:** Ubuntu 20.04 LTS or later, Debian 11 or later
- SQLite 3.35+
- Rust 1.74+ (for backend)
- Python 3.10+ (for sync/backup services)
- Node.js 18+ (for admin dashboard)

### Client Requirements

**Hardware:**
- CPU: 2+ cores
- RAM: 4GB minimum, 8GB recommended
- Storage: 20GB minimum
- Display: 1920x1080 minimum (touch screen recommended)
- Network: Gigabit Ethernet or WiFi

**Software:**
- **Windows:** Windows 10 or later
- **Linux:** Ubuntu 20.04 LTS or later

**Peripherals:**
- Barcode scanner (USB or Serial)
- Receipt printer (ESC/POS compatible)
- Label printer (optional, Zebra ZPL recommended)
- Cash drawer (optional, connects via printer)
- Payment terminal (optional)

## Server Installation

### Windows Server Installation

1. **Download the installer package**

2. **Extract the package**

3. **Run the installation script as Administrator**
   ```powershell
   cd installer\server\windows
   .\install.ps1
   ```

4. **Follow the interactive prompts**

5. **Configure Windows Service**
   ```powershell
   New-Service -Name "EasySale" -BinaryPathName "C:\Program Files\EasySale\easysale-backend.exe" -DisplayName "EasySale Backend" -StartupType Automatic
   Start-Service -Name "EasySale"
   ```

6. **Configure firewall**
   ```powershell
   New-NetFirewallRule -DisplayName "EasySale API" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
   ```

7. **Verify installation**
   - Open browser: http://localhost:8080
   - Log in with default credentials (admin/admin)
   - **Change the default password immediately**

### Linux Server Installation

1. **Run the installation script**
   ```bash
   sudo ./installer/server/linux/install.sh
   ```

2. **Start the service**
   ```bash
   sudo systemctl start EasySale
   sudo systemctl enable EasySale
   ```

3. **Verify installation**
   ```bash
   curl http://localhost:8080/health
   ```

## Client Registration

### Windows Client Registration

```powershell
.\register.ps1 -ServerIP "192.168.1.100" -DeviceName "POS-Terminal-1"
```

### Linux Client Registration

```bash
sudo ./register.sh --server-ip "192.168.1.100" --device-name "POS-Terminal-1"
```

## Hardware Configuration

### Barcode Scanner
Connect via USB - works as keyboard wedge.

### Receipt Printer
Configure printer name in client.env:
```
RECEIPT_PRINTER_NAME=EPSON-TM-T88V
```

### Cash Drawer
Enable in client.env:
```
CASH_DRAWER_ENABLED=true
```

## Multi-Store Setup

Enable sync in server.env:
```
SYNC_ENABLED=true
SYNC_INTERVAL_SECONDS=300
SYNC_MASTER_URL=https://sync.example.com
```

## Troubleshooting

### Server Issues
```bash
sudo journalctl -u EasySale -n 50
```

### Client Issues
1. Verify server IP address
2. Check network connectivity
3. Check firewall rules

## Support

- Documentation: https://docs.EasySale.example.com
- Email: support@EasySale.example.com

## File Locations

**Linux:**
- Installation: `/opt/EasySale`
- Data: `/var/lib/EasySale`
- Config: `/etc/EasySale`

**Windows:**
- Installation: `C:\Program Files\EasySale`
- Data: `C:\ProgramData\EasySale`

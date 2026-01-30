#!/bin/bash
# EasySale Server Installation Script for Linux
# Run with sudo

set -e

# Script configuration
INSTALL_DIR="/opt/easysale"
DATA_DIR="/var/lib/easysale"
LOG_DIR="/var/log/easysale"
BACKUP_DIR="/var/backups/easysale"
CONFIG_DIR="/etc/easysale"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
UNATTENDED=false
CONFIG_FILE=""
SKIP_DEPENDENCIES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unattended)
            UNATTENDED=true
            shift
            ;;
        --config-file)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --skip-dependencies)
            SKIP_DEPENDENCIES=true
            shift
            ;;
        --help)
            echo "EasySale Server Installation Script for Linux"
            echo ""
            echo "Usage:"
            echo "    sudo ./install.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "    --unattended         Run installation without prompts"
            echo "    --config-file PATH   Use configuration file for unattended install"
            echo "    --skip-dependencies  Skip dependency installation"
            echo "    --help               Display this help message"
            echo ""
            echo "Examples:"
            echo "    # Interactive installation"
            echo "    sudo ./install.sh"
            echo ""
            echo "    # Unattended installation"
            echo "    sudo ./install.sh --unattended --config-file /path/to/server.env"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
   exit 1
fi

echo -e "${CYAN}========================================"
echo "EasySale Server Installation for Linux"
echo -e "========================================${NC}"
echo ""

# Step 1: System Requirements Check
echo -e "${YELLOW}[1/7] Checking system requirements...${NC}"

# Check OS version
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo -e "${GREEN}  ✓ OS: $NAME $VERSION${NC}"
else
    echo -e "${RED}  ✗ Cannot determine OS version${NC}"
    exit 1
fi

# Check disk space (minimum 50GB)
AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE_SPACE / 1024 / 1024))
if [ $AVAILABLE_GB -lt 50 ]; then
    echo -e "${YELLOW}  ⚠ Low disk space: ${AVAILABLE_GB}GB available. Minimum 50GB recommended.${NC}"
    if [ "$UNATTENDED" = false ]; then
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${GREEN}  ✓ Disk space: ${AVAILABLE_GB}GB available${NC}"
fi

# Check RAM (minimum 8GB)
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
if [ $TOTAL_RAM -lt 8 ]; then
    echo -e "${YELLOW}  ⚠ Low RAM: ${TOTAL_RAM}GB available. Minimum 8GB recommended.${NC}"
fi
echo -e "${GREEN}  ✓ RAM: ${TOTAL_RAM}GB${NC}"

# Step 2: Dependency Installation
if [ "$SKIP_DEPENDENCIES" = false ]; then
    echo ""
    echo -e "${YELLOW}[2/7] Installing dependencies...${NC}"
    
    # Update package list
    apt-get update -qq
    
    # Install SQLite
    if ! command -v sqlite3 &> /dev/null; then
        echo "  Installing SQLite..."
        apt-get install -y sqlite3 libsqlite3-dev
        echo -e "${GREEN}  ✓ SQLite installed${NC}"
    else
        echo -e "${GREEN}  ✓ SQLite already installed${NC}"
    fi
    
    # Install Rust (if not present)
    if ! command -v cargo &> /dev/null; then
        echo "  Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        echo -e "${GREEN}  ✓ Rust installed${NC}"
    else
        echo -e "${GREEN}  ✓ Rust already installed${NC}"
    fi
    
    # Install Python 3.10+
    if ! command -v python3 &> /dev/null; then
        echo "  Installing Python..."
        apt-get install -y python3 python3-pip python3-venv
        echo -e "${GREEN}  ✓ Python installed${NC}"
    else
        echo -e "${GREEN}  ✓ Python already installed${NC}"
    fi
    
    # Install Node.js 18+
    if ! command -v node &> /dev/null; then
        echo "  Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
        echo -e "${GREEN}  ✓ Node.js installed${NC}"
    else
        echo -e "${GREEN}  ✓ Node.js already installed${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}[2/7] Skipping dependency installation...${NC}"
fi

# Step 3: Create directories
echo ""
echo -e "${YELLOW}[3/7] Creating directories...${NC}"

for dir in "$INSTALL_DIR" "$DATA_DIR" "$LOG_DIR" "$DATA_DIR/database" "$BACKUP_DIR" "$CONFIG_DIR"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "${GREEN}  ✓ Created: $dir${NC}"
    else
        echo -e "${GREEN}  ✓ Exists: $dir${NC}"
    fi
done

# Set permissions
chown -R root:root "$INSTALL_DIR"
chown -R root:root "$DATA_DIR"
chown -R root:root "$LOG_DIR"
chown -R root:root "$BACKUP_DIR"
chown -R root:root "$CONFIG_DIR"
chmod 755 "$INSTALL_DIR"
chmod 755 "$DATA_DIR"
chmod 755 "$LOG_DIR"
chmod 755 "$BACKUP_DIR"
chmod 755 "$CONFIG_DIR"

# Step 4: Database Initialization
echo ""
echo -e "${YELLOW}[4/7] Initializing database...${NC}"
echo -e "${CYAN}  Note: Database initialization will be performed on first application start.${NC}"
echo -e "${GREEN}  ✓ Database path configured: $DATA_DIR/database/pos.db${NC}"

# Step 5: Service Configuration
echo ""
echo -e "${YELLOW}[5/7] Configuring services...${NC}"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Generate Store ID
STORE_ID=$(uuidgen)

# Create configuration file
cat > "$CONFIG_DIR/server.env" << EOF
# EasySale Server Configuration
# Generated: $(date '+%Y-%m-%d %H:%M:%S')

# Database Configuration
DATABASE_PATH=$DATA_DIR/database/pos.db
DATABASE_BACKUP_PATH=$BACKUP_DIR

# API Configuration
API_PORT=8080
API_HOST=0.0.0.0
JWT_SECRET=$JWT_SECRET
JWT_EXPIRATION_HOURS=8

# Store Configuration
STORE_ID=$STORE_ID
STORE_NAME=Main Store
STORE_TIMEZONE=America/New_York

# Sync Configuration
SYNC_ENABLED=false
SYNC_INTERVAL_SECONDS=300
SYNC_MASTER_URL=

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION_DAYS=30

# Logging Configuration
LOG_LEVEL=info
LOG_PATH=$LOG_DIR
EOF

chmod 600 "$CONFIG_DIR/server.env"
echo -e "${GREEN}  ✓ Configuration file created: $CONFIG_DIR/server.env${NC}"
echo -e "${GREEN}  ✓ Store ID: $STORE_ID${NC}"

# Create systemd service file
cat > /etc/systemd/system/EasySale.service << EOF
[Unit]
Description=EasySale Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$CONFIG_DIR/server.env
ExecStart=$INSTALL_DIR/easysale-backend
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo -e "${GREEN}  ✓ Systemd service created${NC}"

# Step 6: Network Configuration
echo ""
echo -e "${YELLOW}[6/7] Configuring network...${NC}"

# Configure firewall (if ufw is installed)
if command -v ufw &> /dev/null; then
    ufw allow 8080/tcp
    echo -e "${GREEN}  ✓ Firewall rule added: Allow TCP port 8080${NC}"
else
    echo -e "${CYAN}  Note: ufw not installed. Please configure firewall manually.${NC}"
    echo -e "${CYAN}  Required: Allow inbound TCP port 8080 for API access${NC}"
fi

# Step 7: Installation Complete
echo ""
echo -e "${GREEN}[7/7] Installation complete!${NC}"
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Next Steps:${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "1. Copy the backend binaries to: $INSTALL_DIR"
echo -e "2. Start the service: ${YELLOW}sudo systemctl start EasySale${NC}"
echo -e "3. Enable auto-start: ${YELLOW}sudo systemctl enable EasySale${NC}"
echo -e "4. Check status: ${YELLOW}sudo systemctl status EasySale${NC}"
echo -e "5. View logs: ${YELLOW}sudo journalctl -u EasySale -f${NC}"
echo -e "6. Access the admin dashboard at: ${YELLOW}http://localhost:8080${NC}"
echo -e "7. Change the default admin password"
echo ""
echo -e "${YELLOW}Configuration file: $CONFIG_DIR/server.env${NC}"
echo -e "${YELLOW}Store ID: $STORE_ID${NC}"
echo ""
echo -e "${CYAN}For support, visit: https://docs.EasySale.example.com${NC}"
echo ""

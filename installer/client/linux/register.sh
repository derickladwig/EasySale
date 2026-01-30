#!/bin/bash
# EasySale Client Registration Script for Linux
# Run with sudo

set -e

# Script configuration
INSTALL_DIR="/opt/easysale-client"
DATA_DIR="/var/lib/easysale-client"
LOG_DIR="/var/log/easysale-client"
CONFIG_DIR="/etc/easysale-client"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
SERVER_IP=""
DEVICE_NAME=""
DEVICE_TYPE="POS_TERMINAL"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --server-ip)
            SERVER_IP="$2"
            shift 2
            ;;
        --device-name)
            DEVICE_NAME="$2"
            shift 2
            ;;
        --device-type)
            DEVICE_TYPE="$2"
            shift 2
            ;;
        --help)
            echo "EasySale Client Registration Script for Linux"
            echo ""
            echo "Usage:"
            echo "    sudo ./register.sh --server-ip <IP> --device-name <NAME> [OPTIONS]"
            echo ""
            echo "Options:"
            echo "    --server-ip STRING    Server IP address (required)"
            echo "    --device-name STRING  Device name (required)"
            echo "    --device-type STRING  Device type (default: POS_TERMINAL)"
            echo "                          Options: POS_TERMINAL, WORKSTATION, KIOSK"
            echo "    --help                Display this help message"
            echo ""
            echo "Examples:"
            echo "    # Register POS terminal"
            echo "    sudo ./register.sh --server-ip \"192.168.1.100\" --device-name \"POS-Terminal-1\""
            echo ""
            echo "    # Register workstation"
            echo "    sudo ./register.sh --server-ip \"192.168.1.100\" --device-name \"Office-PC-1\" --device-type \"WORKSTATION\""
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
echo "EasySale Client Registration for Linux"
echo -e "========================================${NC}"
echo ""

# Prompt for required parameters if not provided
if [ -z "$SERVER_IP" ]; then
    read -p "Enter server IP address: " SERVER_IP
fi

if [ -z "$DEVICE_NAME" ]; then
    read -p "Enter device name: " DEVICE_NAME
fi

# Step 1: System Requirements Check
echo -e "${YELLOW}[1/5] Checking system requirements...${NC}"

# Check OS version
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo -e "${GREEN}  ✓ OS: $NAME $VERSION${NC}"
else
    echo -e "${RED}  ✗ Cannot determine OS version${NC}"
    exit 1
fi

# Step 2: Test Server Connectivity
echo ""
echo -e "${YELLOW}[2/5] Testing server connectivity...${NC}"

SERVER_URL="http://${SERVER_IP}:8080"
if curl -s -f -m 5 "$SERVER_URL/health" > /dev/null; then
    echo -e "${GREEN}  ✓ Server is reachable at $SERVER_URL${NC}"
else
    echo -e "${RED}  ✗ Cannot connect to server at $SERVER_URL${NC}"
    echo -e "${RED}  Please check the IP address and ensure the server is running.${NC}"
    exit 1
fi

# Step 3: Create Directories
echo ""
echo -e "${YELLOW}[3/5] Creating directories...${NC}"

for dir in "$INSTALL_DIR" "$DATA_DIR" "$LOG_DIR" "$CONFIG_DIR"; do
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
chown -R root:root "$CONFIG_DIR"
chmod 755 "$INSTALL_DIR"
chmod 755 "$DATA_DIR"
chmod 755 "$LOG_DIR"
chmod 755 "$CONFIG_DIR"

# Step 4: Device Registration
echo ""
echo -e "${YELLOW}[4/5] Registering device...${NC}"

# Generate Device ID
DEVICE_ID=$(uuidgen)

# Create configuration file
cat > "$CONFIG_DIR/client.env" << EOF
# EasySale Client Configuration
# Generated: $(date '+%Y-%m-%d %H:%M:%S')

# Server Connection
SERVER_URL=$SERVER_URL
SERVER_TIMEOUT_SECONDS=30

# Device Configuration
DEVICE_ID=$DEVICE_ID
DEVICE_NAME=$DEVICE_NAME
DEVICE_TYPE=$DEVICE_TYPE

# Hardware Configuration
BARCODE_SCANNER_PORT=/dev/ttyUSB0
RECEIPT_PRINTER_NAME=
LABEL_PRINTER_NAME=
CASH_DRAWER_ENABLED=true

# UI Configuration
TOUCH_MODE=true
SCREEN_TIMEOUT_MINUTES=15
AUTO_LOGOUT_MINUTES=30

# Logging Configuration
LOG_LEVEL=info
LOG_PATH=$LOG_DIR
EOF

chmod 600 "$CONFIG_DIR/client.env"
echo -e "${GREEN}  ✓ Configuration file created: $CONFIG_DIR/client.env${NC}"
echo -e "${GREEN}  ✓ Device ID: $DEVICE_ID${NC}"
echo -e "${GREEN}  ✓ Device Name: $DEVICE_NAME${NC}"

# Step 5: Hardware Configuration
echo ""
echo -e "${YELLOW}[5/5] Hardware configuration...${NC}"
echo -e "${CYAN}  Note: Hardware must be configured manually after installation.${NC}"
echo -e "${CYAN}  Supported hardware:${NC}"
echo -e "${CYAN}    - Barcode scanners (USB/Serial)${NC}"
echo -e "${CYAN}    - Receipt printers (ESC/POS)${NC}"
echo -e "${CYAN}    - Label printers (Zebra ZPL)${NC}"
echo -e "${CYAN}    - Cash drawers (via printer)${NC}"
echo -e "${CYAN}    - Payment terminals (optional)${NC}"

# Installation Complete
echo ""
echo -e "${GREEN}Registration complete!${NC}"
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Next Steps:${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "1. Install the EasySale desktop application"
echo -e "2. Configure hardware devices (printers, scanners)"
echo -e "3. Launch the application"
echo -e "4. Log in with your credentials"
echo ""
echo -e "${YELLOW}Configuration file: $CONFIG_DIR/client.env${NC}"
echo -e "${YELLOW}Device ID: $DEVICE_ID${NC}"
echo -e "${YELLOW}Server URL: $SERVER_URL${NC}"
echo ""
echo -e "${CYAN}For support, visit: https://docs.EasySale.example.com${NC}"
echo ""

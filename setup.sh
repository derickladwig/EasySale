#!/bin/bash
# ============================================
# EasySale - Fresh Install Setup (Linux/Mac)
# ============================================

echo ""
echo "============================================"
echo "  EasySale - Fresh Install Setup"
echo "============================================"
echo ""

# Check if we're in the project root
if [ ! -d "backend" ]; then
    echo "[ERROR] Must run from project root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Step 1: Create .env from template
echo "[1/4] Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[OK] Created .env from template"
    else
        echo "[ERROR] .env.example not found!"
        exit 1
    fi
else
    echo "[OK] .env already exists"
fi

# Step 2: Ensure TENANT_ID is set correctly
echo "[2/4] Configuring tenant..."
if ! grep -q "TENANT_ID=default" .env; then
    echo "[WARNING] TENANT_ID not set to default in .env"
    echo "[INFO] Please ensure TENANT_ID=default in your .env file"
fi
echo "[OK] Tenant configuration checked"

# Step 3: Install frontend dependencies
echo "[3/4] Installing frontend dependencies..."
if [ -d "frontend/node_modules" ]; then
    echo "[OK] Frontend dependencies already installed"
else
    echo "[INFO] Installing npm packages (this may take a few minutes)..."
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install frontend dependencies"
        exit 1
    fi
    cd ..
    echo "[OK] Frontend dependencies installed"
fi

# Step 4: Check Rust installation
echo "[4/4] Checking Rust installation..."
if ! command -v cargo &> /dev/null; then
    echo "[WARNING] Rust/Cargo not found!"
    echo ""
    echo "Please install Rust from: https://rustup.rs/"
    echo "After installation, restart this script."
    exit 1
else
    echo "[OK] Rust/Cargo found"
fi

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Review .env file and update if needed"
echo "  2. Run: ./start-backend.sh"
echo "  3. Run: ./start-frontend.sh (in a new terminal)"
echo "  4. Open: http://localhost:7945"
echo ""
echo "Default credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""

# Make scripts executable
chmod +x start-backend.sh start-frontend.sh 2>/dev/null

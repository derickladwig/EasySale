#!/bin/bash
echo "Starting EasySale Backend..."
echo ""

# Ensure we're in the project root
if [ ! -d "backend/rust" ]; then
    echo "[ERROR] Must run from project root directory"
    exit 1
fi

# Load environment from root .env file
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set defaults if not defined
export TENANT_ID=${TENANT_ID:-default-tenant}
export API_PORT=${API_PORT:-8923}

echo "Using TENANT_ID: $TENANT_ID"
echo "Using API_PORT: $API_PORT"
echo ""

cd backend/rust
cargo run

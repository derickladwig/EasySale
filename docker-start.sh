#!/bin/bash
# ============================================
# EasySale - Development Start (Linux/Mac)
# ============================================
# Network: easysale-network | Containers: easysale-*-dev

echo ""
echo "============================================"
echo "  EasySale - Development Environment"
echo "============================================"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running!"
    exit 1
fi
echo "[OK] Docker is running"

# Clean up legacy resources
echo "[INFO] Cleaning up legacy resources..."
docker volume rm dynamous-kiro-hackathon_pos-data 2>/dev/null || true
docker network rm dynamous-kiro-hackathon_caps-network 2>/dev/null || true

# Create .env files if needed
[ ! -f ".env" ] && [ -f ".env.example" ] && cp .env.example .env

echo ""
echo "Network: easysale-network"
echo "Containers: easysale-frontend-dev, easysale-backend-dev"
echo ""
echo "Press Ctrl+C to stop"
echo ""

docker-compose -p EasySale up --build

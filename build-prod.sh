#!/bin/bash
# ============================================
# EasySale - Production Build Script (Linux/Mac)
# ============================================
# Network: easysale-network | Volume: easysale-data
#
# Usage: ./build-prod.sh [variant]
# Variants:
#   lite    - Core POS only (smallest binary)
#   export  - + CSV export for QuickBooks (default)
#   full    - + OCR, document processing, cleanup

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Parse variant argument (default: export)
BUILD_VARIANT="${1:-export}"

# Map variant to Cargo features
case "$BUILD_VARIANT" in
  --lite|lite)
    BUILD_VARIANT="lite"
    FEATURES=""
    ;;
  --export|export)
    BUILD_VARIANT="export"
    FEATURES="export"
    ;;
  --full|full)
    BUILD_VARIANT="full"
    FEATURES="full"
    ;;
  --help|-h)
    echo "Usage: $0 [variant]"
    echo ""
    echo "Variants:"
    echo "  lite    - Core POS only (~20MB binary)"
    echo "  export  - + CSV export for QuickBooks (~25MB, default)"
    echo "  full    - + OCR, document processing, cleanup (~35MB)"
    echo ""
    exit 0
    ;;
  *)
    echo -e "${YELLOW}[WARN]${NC} Unknown variant '$BUILD_VARIANT', using 'export'"
    BUILD_VARIANT="export"
    FEATURES="export"
    ;;
esac

echo ""
echo "============================================"
echo "  EasySale - Production Build"
echo "  Variant: $BUILD_VARIANT"
echo "============================================"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[ERROR] Docker is not running!${NC}"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Docker is running"

# Sync frontend dependencies (ensures package-lock.json is up to date)
echo -e "${BLUE}[INFO]${NC} Syncing frontend dependencies..."
pushd frontend > /dev/null
npm install --legacy-peer-deps > /dev/null 2>&1 || echo -e "${YELLOW}[WARN]${NC} npm install had issues, continuing..."
popd > /dev/null
echo -e "${GREEN}[OK]${NC} Frontend dependencies synced"

# Clean up legacy resources
echo -e "${BLUE}[INFO]${NC} Cleaning up legacy resources..."
docker rm -f easysale-frontend easysale-backend 2>/dev/null || true
docker rm -f caps-pos-frontend-prod caps-pos-backend-prod 2>/dev/null || true
docker volume rm dynamous-kiro-hackathon_pos-data 2>/dev/null || true
docker network rm dynamous-kiro-hackathon_caps-network 2>/dev/null || true

# Build frontend
echo -e "${BLUE}[INFO]${NC} Building frontend..."
docker build -t easysale-frontend:latest ./frontend
echo -e "${GREEN}[OK]${NC} Frontend built"

# Build backend
echo -e "${BLUE}[INFO]${NC} Building backend (variant: $BUILD_VARIANT)..."
if [ -n "$FEATURES" ]; then
    echo -e "${BLUE}[INFO]${NC} Features: $FEATURES"
    docker build --build-arg FEATURES="$FEATURES" -f Dockerfile.backend -t easysale-backend:latest .
else
    echo -e "${BLUE}[INFO]${NC} Building lite variant (no optional features)"
    docker build --build-arg FEATURES="" -f Dockerfile.backend -t easysale-backend:latest .
fi
echo -e "${GREEN}[OK]${NC} Backend built (variant: $BUILD_VARIANT)"

# Show images
echo ""
docker images | grep EasySale

# Stop existing and start new
echo ""
echo -e "${BLUE}[INFO]${NC} Starting production environment..."
docker-compose -p easysale -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -p easysale -f docker-compose.prod.yml up -d

# Wait for health
echo "Waiting for services..."
sleep 5

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Production Environment Started!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Frontend:  http://localhost:7945"
echo "  Backend:   http://localhost:8923"
echo "  Network:   easysale-network"
echo ""

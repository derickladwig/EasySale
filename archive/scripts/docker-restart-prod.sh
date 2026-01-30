#!/bin/bash
# ============================================
# EasySale - Restart Production (Linux/Mac)
# ============================================
# Network: EasySale-network | Volume: EasySale-data

echo ""
echo "============================================"
echo "  EasySale - Restart Production"
echo "============================================"
echo ""

echo "Stopping and removing containers..."
docker-compose -p EasySale -f docker-compose.prod.yml down

echo "Removing old network if exists..."
docker network rm EasySale-network 2>/dev/null || true

echo "Starting production environment..."
docker-compose -p EasySale -f docker-compose.prod.yml up -d

echo ""
echo "============================================"
echo "  Production Environment Restarted!"
echo "============================================"
echo ""
echo "Access the application:"
echo "  Frontend:  http://localhost:7945"
echo "  Backend:   http://localhost:8923"
echo "  Health:    http://localhost:8923/health"
echo ""
echo "Network: EasySale-network"
echo "Volume:  EasySale-data"
echo ""
echo "Check logs with: docker-compose -p EasySale -f docker-compose.prod.yml logs -f"
echo ""

#!/bin/bash
# ============================================
# EasySale - Docker Stop (Linux/Mac)
# ============================================

echo ""
echo "============================================"
echo "  EasySale - Stopping Services"
echo "============================================"
echo ""

docker-compose -p easysale down --remove-orphans 2>/dev/null || true
docker-compose -p easysale -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

echo ""
echo "[OK] All EasySale services stopped"
echo ""

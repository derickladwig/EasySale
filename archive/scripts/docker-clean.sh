#!/bin/bash
# ============================================
# EasySale - Docker Clean (Linux/Mac)
# ============================================

echo ""
echo "============================================"
echo "  EasySale - Docker Clean"
echo "============================================"
echo ""
echo "[WARNING] This will remove all EasySale Docker resources!"
echo ""
read -p "Type 'yes' to continue: " confirm
if [ "$confirm" != "yes" ]; then
    echo "Clean cancelled."
    exit 0
fi

echo ""
echo "[1/5] Stopping containers..."
docker-compose -p EasySale down --remove-orphans 2>/dev/null || true
docker-compose -p EasySale -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker rm -f EasySale-frontend EasySale-backend EasySale-storybook 2>/dev/null || true
docker rm -f EasySale-frontend-dev EasySale-backend-dev EasySale-storybook-dev 2>/dev/null || true
# Also clean up old caps-pos containers
docker rm -f caps-pos-frontend caps-pos-backend caps-pos-storybook 2>/dev/null || true
docker rm -f caps-pos-frontend-dev caps-pos-backend-dev caps-pos-storybook-dev 2>/dev/null || true
# Clean up any auto-generated project containers
docker rm -f dynamous-kiro-hackathon-frontend dynamous-kiro-hackathon-backend 2>/dev/null || true

echo "[2/5] Removing EasySale volumes..."
docker volume rm EasySale-data EasySale-data-dev 2>/dev/null || true
docker volume rm EasySale-frontend-modules EasySale-cargo-registry 2>/dev/null || true
docker volume rm EasySale-cargo-git EasySale-target 2>/dev/null || true
# Also clean up old caps-pos volumes
docker volume rm caps-pos-data caps-pos-data-dev 2>/dev/null || true
docker volume rm caps-pos-frontend-modules caps-pos-cargo-registry 2>/dev/null || true
docker volume rm caps-pos-cargo-git caps-pos-target 2>/dev/null || true

echo "[3/5] Removing legacy hackathon resources..."
docker volume rm dynamous-kiro-hackathon_pos-data 2>/dev/null || true
docker volume rm dynamous-kiro-hackathon_backend_cargo_git 2>/dev/null || true
docker volume rm dynamous-kiro-hackathon_backend_cargo_registry 2>/dev/null || true
docker volume rm dynamous-kiro-hackathon_backend_target 2>/dev/null || true
docker volume rm dynamous-kiro-hackathon_frontend_node_modules 2>/dev/null || true
docker network rm dynamous-kiro-hackathon_caps-network 2>/dev/null || true

echo "[4/5] Removing images..."
docker rmi EasySale-backend:latest EasySale-frontend:latest 2>/dev/null || true
docker rmi caps-pos-backend:latest caps-pos-frontend:latest 2>/dev/null || true
docker rmi dynamous-kiro-hackathon-backend:latest dynamous-kiro-hackathon-frontend:latest 2>/dev/null || true

echo "[5/5] Pruning build cache..."
docker builder prune -f 2>/dev/null || true
docker network rm EasySale-network 2>/dev/null || true
docker network rm caps-pos-network 2>/dev/null || true

echo ""
echo "============================================"
echo "  Clean Complete!"
echo "============================================"
echo ""

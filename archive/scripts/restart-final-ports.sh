#!/bin/bash

# CAPS POS - Restart with Final Port Configuration
# Frontend: 7945 | Backend: 8923 | Storybook: 7946

echo ""
echo "========================================"
echo "  CAPS POS - Final Port Configuration"
echo "========================================"
echo ""
echo "New ports:"
echo "  Frontend:  http://localhost:7945"
echo "  Backend:   http://localhost:8923"
echo "  Storybook: http://localhost:7946"
echo ""
echo "========================================"
echo ""

# Stop all running containers
echo "[1/4] Stopping containers..."
docker-compose down

# Remove any orphaned containers
echo "[2/4] Cleaning up..."
docker-compose down --remove-orphans

# Start containers
echo "[3/4] Starting containers..."
docker-compose up -d

# Wait for services to be ready
echo "[4/4] Waiting for services to start..."
sleep 8

# Check health
echo ""
echo "========================================"
echo "  Health Check"
echo "========================================"
curl -s http://localhost:8923/health | jq . || echo "Backend starting..."
echo ""

echo ""
echo "========================================"
echo "  Ready!"
echo "========================================"
echo ""
echo "Access the application:"
echo "  Frontend:  http://localhost:7945"
echo "  Backend:   http://localhost:8923/health"
echo "  Storybook: http://localhost:7946"
echo ""
echo "Default login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "View logs: docker-compose logs -f"
echo ""
echo "========================================"

#!/bin/bash
# Auto-fix formatting for all components

set -e

echo "=== Auto-formatting all code ==="

# Frontend
echo ""
echo "Formatting frontend (TypeScript)..."
cd frontend
npm run format
cd ..

# Backend
echo ""
echo "Formatting backend (Rust)..."
cd backend/rust
cargo fmt
cd ../..

# Backup service
echo ""
echo "Formatting backup service (Python)..."
cd backup
if [ -d "venv" ]; then
    source venv/bin/activate || . venv/Scripts/activate
fi
python -m black .
cd ..

echo ""
echo "=== All code formatted! ==="

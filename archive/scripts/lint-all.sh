#!/bin/bash
# Run linting and formatting checks for all components

set -e

echo "=== Running linting and formatting checks ==="

# Frontend
echo ""
echo "Checking frontend (TypeScript)..."
cd frontend
npm run lint
npm run format:check
cd ..

# Backend
echo ""
echo "Checking backend (Rust)..."
cd backend/rust
cargo fmt -- --check
cargo clippy -- -D warnings
cd ../..

# Backup service
echo ""
echo "Checking backup service (Python)..."
cd backup
if [ -d "venv" ]; then
    source venv/bin/activate || . venv/Scripts/activate
fi
python -m black --check .
python -m flake8 .
cd ..

echo ""
echo "=== All checks passed! ==="

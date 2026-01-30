#!/bin/sh
set -e

echo "==================================="
echo "EasySale Backend - Starting..."
echo "==================================="

# Set default values if not provided
DATABASE_PATH=${DATABASE_PATH:-/data/EasySale.db}
DATABASE_URL="sqlite:${DATABASE_PATH}"

echo "Database path: ${DATABASE_PATH}"
echo "Database URL: ${DATABASE_URL}"

# Ensure data directory exists
mkdir -p "$(dirname "${DATABASE_PATH}")"

# Create backup directory
mkdir -p /data/backups
chmod 777 /data/backups
echo "Backup directory created at /data/backups"

# Check if database exists
if [ ! -f "${DATABASE_PATH}" ]; then
    echo "Database does not exist. Creating new database..."
    touch "${DATABASE_PATH}"
    chmod 666 "${DATABASE_PATH}"
else
    echo "Database found at ${DATABASE_PATH}"
fi

# Check if migrations directory exists
if [ ! -d "./migrations" ]; then
    echo "ERROR: Migrations directory not found!"
    echo "Expected: ./migrations"
    ls -la
    exit 1
fi

echo "Migrations directory found:"
ls -la ./migrations | head -n 10

echo "Skipping manual migrations - application will handle them"
echo ""

# Start the application
echo "==================================="
echo "Starting EasySale API Server..."
echo "==================================="
echo "Listening on ${API_HOST:-0.0.0.0}:${API_PORT:-8923}"
echo "Health check endpoint: http://127.0.0.1:8923/health"
echo ""

exec ./EasySale-api

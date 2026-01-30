#!/bin/bash

# Generate production secrets for EasySale
echo "Generating production secrets..."

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET"

# Generate unique store ID
STORE_ID="store-$(openssl rand -hex 8)"
echo "STORE_ID=$STORE_ID"

# Generate unique tenant ID  
TENANT_ID="tenant-$(openssl rand -hex 8)"
echo "TENANT_ID=$TENANT_ID"

# Generate database encryption key
DB_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "DB_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY"

echo ""
echo "Add these to your .env file for production deployment:"
echo "JWT_SECRET=$JWT_SECRET"
echo "STORE_ID=$STORE_ID"
echo "TENANT_ID=$TENANT_ID"
echo "DB_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY"
echo "RUST_LOG=info"
echo "LOG_LEVEL=info"
echo "PERFORMANCE_MONITORING=true"

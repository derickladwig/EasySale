#!/bin/bash
# Security audit script for Rust backend dependencies

echo "========================================="
echo "CAPS POS - Rust Security Audit"
echo "========================================="
echo ""

# Check if cargo-audit is installed
if ! command -v cargo-audit &> /dev/null; then
    echo "cargo-audit not found. Installing..."
    cargo install cargo-audit
fi

# Run cargo audit to check for vulnerabilities
echo "Running cargo audit..."
cargo audit

echo ""
echo "========================================="
echo "Checking for outdated crates..."
echo "========================================="

# Check if cargo-outdated is installed
if ! command -v cargo-outdated &> /dev/null; then
    echo "cargo-outdated not found. Installing..."
    cargo install cargo-outdated
fi

cargo outdated

echo ""
echo "========================================="
echo "To update dependencies:"
echo "  cargo update"
echo ""
echo "To fix specific vulnerabilities:"
echo "  cargo audit fix"
echo "========================================="

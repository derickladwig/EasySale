#!/bin/bash

# Example usage of the brand asset conversion script
# This demonstrates how to convert brand assets for different tenants

echo "Brand Asset Conversion - Example Usage"
echo "======================================="
echo ""

# Example 1: Convert SVG logo for default tenant
echo "Example 1: Converting SVG logo for default tenant"
echo "Command: node convert-brand-assets.js --input logo.svg --tenant default"
echo ""

# Example 2: Convert PNG logo for a specific tenant
echo "Example 2: Converting PNG logo for 'acme' tenant"
echo "Command: node convert-brand-assets.js --input acme-logo.png --tenant acme"
echo ""

# Example 3: Convert with custom output directory
echo "Example 3: Converting with custom output directory"
echo "Command: node convert-brand-assets.js --input logo.jpg --tenant store1 --output /custom/path"
echo ""

# Example 4: Show help
echo "Example 4: Show help message"
echo "Command: node convert-brand-assets.js --help"
echo ""

echo "To run these examples, replace the input file paths with actual files."
echo ""
echo "Quick start:"
echo "1. cd scripts"
echo "2. npm install"
echo "3. node convert-brand-assets.js --input /path/to/your/logo.svg --tenant your-tenant"

# Demo Product Images

This folder contains placeholder images for demo products. The images are simple SVG placeholders that can be replaced with actual product photos.

## Image Naming Convention

Images are named to match product SKUs:
- `headphones-black.png` → DEMO-ELEC-001
- `charger-white.png` → DEMO-ELEC-002
- etc.

## Placeholder System

The `placeholder.svg` file is used as a fallback for any missing product images. The backend will:
1. Check for a specific product image by name
2. Fall back to `placeholder.svg` if not found
3. Generate a colored placeholder with the product category if needed

## Adding Real Images

To replace placeholders with real product images:
1. Add images to this folder with matching names
2. Supported formats: PNG, JPG, WEBP
3. Recommended size: 400x400 pixels minimum
4. The import process will copy images to the uploads folder

## Categories and Colors

Placeholder colors by category:
- Electronics: Blue (#3b82f6)
- Apparel: Purple (#8b5cf6)
- Home & Kitchen: Green (#22c55e)
- Tools: Yellow (#eab308)
- Grocery: Orange (#f97316)

#!/usr/bin/env node

/**
 * Brand Asset Conversion Script
 * 
 * Converts brand assets (SVG, ICO, PNG, JPG) to standardized formats
 * for use in the EasySale application.
 * 
 * Usage:
 *   node scripts/convert-brand-assets.js --input <path> --tenant <tenant-id>
 *   node scripts/convert-brand-assets.js --input logo.svg --tenant acme
 * 
 * Output:
 *   - frontend/public/brand/<tenant>/logo.png (main logo)
 *   - frontend/public/brand/<tenant>/logo-light.png (light theme variant)
 *   - frontend/public/brand/<tenant>/logo-dark.png (dark theme variant)
 *   - frontend/public/brand/<tenant>/favicon.ico
 *   - frontend/public/brand/<tenant>/favicon-16x16.png
 *   - frontend/public/brand/<tenant>/favicon-32x32.png
 *   - frontend/public/brand/<tenant>/apple-touch-icon.png (180x180)
 *   - frontend/public/brand/<tenant>/android-chrome-192x192.png
 *   - frontend/public/brand/<tenant>/android-chrome-512x512.png
 * 
 * Requirements:
 *   - Validates: Requirements 6.2, 6.3
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOGO_SIZES = {
  main: { width: 200, height: 60 },
  favicon16: { width: 16, height: 16 },
  favicon32: { width: 32, height: 32 },
  appleTouchIcon: { width: 180, height: 180 },
  androidChrome192: { width: 192, height: 192 },
  androidChrome512: { width: 512, height: 512 },
};

const SUPPORTED_INPUT_FORMATS = ['.svg', '.png', '.jpg', '.jpeg', '.ico', '.webp'];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    tenant: 'default',
    outputDir: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--input' || arg === '-i') {
      options.input = args[++i];
    } else if (arg === '--tenant' || arg === '-t') {
      options.tenant = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.outputDir = args[++i];
    }
  }

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
Brand Asset Conversion Script

Usage:
  node scripts/convert-brand-assets.js --input <path> --tenant <tenant-id>

Options:
  --input, -i <path>      Path to input image file (required)
  --tenant, -t <id>       Tenant ID (default: "default")
  --output, -o <dir>      Custom output directory (optional)
  --help, -h              Show this help message

Supported Input Formats:
  ${SUPPORTED_INPUT_FORMATS.join(', ')}

Output:
  frontend/public/brand/<tenant>/
    ├── logo.png                    (200x60 main logo)
    ├── logo-light.png              (200x60 light theme)
    ├── logo-dark.png               (200x60 dark theme)
    ├── favicon.ico                 (multi-size ICO)
    ├── favicon-16x16.png           (16x16 favicon)
    ├── favicon-32x32.png           (32x32 favicon)
    ├── apple-touch-icon.png        (180x180 iOS)
    ├── android-chrome-192x192.png  (192x192 Android)
    └── android-chrome-512x512.png  (512x512 Android)

Examples:
  node scripts/convert-brand-assets.js --input logo.svg --tenant acme
  node scripts/convert-brand-assets.js --input brand.png --tenant store1
  `);
}

/**
 * Validate input file
 */
async function validateInput(inputPath) {
  try {
    await fs.access(inputPath);
  } catch (error) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  if (!SUPPORTED_INPUT_FORMATS.includes(ext)) {
    throw new Error(
      `Unsupported input format: ${ext}. Supported formats: ${SUPPORTED_INPUT_FORMATS.join(', ')}`
    );
  }

  return ext;
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDir(outputDir) {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`✓ Created output directory: ${outputDir}`);
  } catch (error) {
    throw new Error(`Failed to create output directory: ${error.message}`);
  }
}

/**
 * Check if sharp is available
 */
async function checkSharpAvailable() {
  try {
    await import('sharp');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert image using sharp library
 */
async function convertWithSharp(inputPath, outputDir, inputFormat) {
  const sharp = (await import('sharp')).default;
  
  console.log('\nConverting assets with sharp...');
  
  // Read input image
  const inputBuffer = await fs.readFile(inputPath);
  let image = sharp(inputBuffer);
  
  // Get image metadata
  const metadata = await image.metadata();
  console.log(`Input image: ${metadata.width}x${metadata.height} ${metadata.format}`);
  
  // Convert main logo (200x60, maintain aspect ratio)
  await image
    .clone()
    .resize(LOGO_SIZES.main.width, LOGO_SIZES.main.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(outputDir, 'logo.png'));
  console.log('✓ Generated logo.png (200x60)');
  
  // Create light and dark variants (same as main for now)
  await image
    .clone()
    .resize(LOGO_SIZES.main.width, LOGO_SIZES.main.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(outputDir, 'logo-light.png'));
  console.log('✓ Generated logo-light.png (200x60)');
  
  await image
    .clone()
    .resize(LOGO_SIZES.main.width, LOGO_SIZES.main.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(outputDir, 'logo-dark.png'));
  console.log('✓ Generated logo-dark.png (200x60)');
  
  // Generate favicon sizes
  await image
    .clone()
    .resize(LOGO_SIZES.favicon16.width, LOGO_SIZES.favicon16.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(outputDir, 'favicon-16x16.png'));
  console.log('✓ Generated favicon-16x16.png');
  
  await image
    .clone()
    .resize(LOGO_SIZES.favicon32.width, LOGO_SIZES.favicon32.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32.png'));
  console.log('✓ Generated favicon-32x32.png');
  
  // Generate Apple touch icon
  await image
    .clone()
    .resize(LOGO_SIZES.appleTouchIcon.width, LOGO_SIZES.appleTouchIcon.height, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png (180x180)');
  
  // Generate Android Chrome icons
  await image
    .clone()
    .resize(LOGO_SIZES.androidChrome192.width, LOGO_SIZES.androidChrome192.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(outputDir, 'android-chrome-192x192.png'));
  console.log('✓ Generated android-chrome-192x192.png');
  
  await image
    .clone()
    .resize(LOGO_SIZES.androidChrome512.width, LOGO_SIZES.androidChrome512.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(outputDir, 'android-chrome-512x512.png'));
  console.log('✓ Generated android-chrome-512x512.png');
  
  // Generate favicon.ico (using 32x32 as base)
  await image
    .clone()
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFormat('png')
    .toFile(path.join(outputDir, 'favicon.ico'));
  console.log('✓ Generated favicon.ico');
}

/**
 * Fallback: Copy original file if sharp is not available
 */
async function fallbackCopy(inputPath, outputDir) {
  console.log('\n⚠ Sharp library not available. Using fallback mode.');
  console.log('Install sharp for full conversion support: npm install sharp');
  
  const inputBuffer = await fs.readFile(inputPath);
  const ext = path.extname(inputPath);
  
  // Copy original as logo
  await fs.writeFile(path.join(outputDir, `logo${ext}`), inputBuffer);
  console.log(`✓ Copied original as logo${ext}`);
  
  // Create symbolic copies for variants
  await fs.writeFile(path.join(outputDir, `logo-light${ext}`), inputBuffer);
  await fs.writeFile(path.join(outputDir, `logo-dark${ext}`), inputBuffer);
  console.log(`✓ Created variant copies`);
  
  console.log('\n⚠ Note: Favicon and PWA icons were not generated.');
  console.log('For production use, install sharp: npm install sharp');
}

/**
 * Generate manifest.json for PWA
 */
async function generateManifest(outputDir, tenantId) {
  const manifest = {
    name: 'EasySale',
    short_name: 'EasySale',
    description: 'Flexible Point of Sale System',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#3b82f6',
    icons: [
      {
        src: `/brand/${tenantId}/android-chrome-192x192.png`,
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: `/brand/${tenantId}/android-chrome-512x512.png`,
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
  
  await fs.writeFile(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('✓ Generated manifest.json');
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (!options.input) {
    console.error('Error: --input is required\n');
    showHelp();
    process.exit(1);
  }
  
  try {
    console.log('Brand Asset Conversion Script');
    console.log('==============================\n');
    
    // Validate input
    console.log(`Input file: ${options.input}`);
    console.log(`Tenant ID: ${options.tenant}`);
    const inputFormat = await validateInput(options.input);
    console.log(`✓ Input file validated (${inputFormat})`);
    
    // Determine output directory
    const outputDir = options.outputDir || 
      path.join(__dirname, '..', 'frontend', 'public', 'brand', options.tenant);
    console.log(`Output directory: ${outputDir}`);
    
    // Create output directory
    await ensureOutputDir(outputDir);
    
    // Check if sharp is available
    const hasSharp = await checkSharpAvailable();
    
    // Convert assets
    if (hasSharp) {
      await convertWithSharp(options.input, outputDir, inputFormat);
      await generateManifest(outputDir, options.tenant);
    } else {
      await fallbackCopy(options.input, outputDir);
    }
    
    console.log('\n✓ Brand asset conversion complete!');
    console.log(`\nAssets saved to: ${outputDir}`);
    console.log('\nNext steps:');
    console.log('1. Update your tenant config to reference these assets');
    console.log(`2. Set logo path: /brand/${options.tenant}/logo.png`);
    console.log(`3. Set favicon path: /brand/${options.tenant}/favicon.ico`);
    
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = process.argv[1] && 
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  main();
}

export { validateInput, ensureOutputDir };

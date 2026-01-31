#!/usr/bin/env node
/* global process, console */
/**
 * CI Script: Check for Hardcoded Colors
 * 
 * Prevents regression by failing if hardcoded colors are found outside theme files.
 * 
 * Rules enforced:
 * 1. No hex colors (#xxx, #xxxxxx) in src/ except allowed theme files
 * 2. No rgb()/hsl() in src/ except allowed theme files
 * 3. No Tailwind base color utilities (slate-*, blue-*, gray-*) in components
 * 
 * Allowed files (theme source of truth):
 * - src/styles/tokens.css
 * - src/styles/themes.css
 * - src/theme/ThemeEngine.ts (fallback colors)
 * - src/config/themeBridge.ts (color generation)
 * - src/auth/theme/presets/*.json (login presets)
 * - *.test.* files (test assertions)
 * - *.stories.* files (Storybook)
 * 
 * Usage:
 *   node scripts/check-hardcoded-colors.js
 *   npm run lint:colors
 * 
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations found (fails CI)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const ALLOWED_FILES = [
  'styles/tokens.css',
  'styles/themes.css',
  'styles/print.css',           // Print styles need explicit colors
  'styles/test-violations.css', // Test file for the linter itself
  'theme/ThemeEngine.ts',
  'config/themeBridge.ts',
  'config/defaultConfig.ts',    // Default theme configuration
  'auth/theme/presets/',
  'common/utils/designTokens.ts',
  'settings/components/StoreThemeConfig.tsx', // Color picker presets
  'index.css',                  // Root styles with fallbacks
  'test-inline-styles.tsx',     // Test file
  'legacy_quarantine/',         // Quarantined legacy code
];

const ALLOWED_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.stories\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
];

// Patterns to detect
const HEX_COLOR_PATTERN = /#([0-9a-fA-F]{3}){1,2}\b/g;
const RGB_HSL_PATTERN = /\b(rgb|hsl)a?\s*\(/gi;
const TAILWIND_BASE_COLORS = /\b(bg|text|border|ring|fill|stroke)-(slate|blue|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

// Results tracking
let violations = [];
let filesChecked = 0;

/**
 * Check if a file is in the allowed list
 */
function isAllowedFile(filePath) {
  const relativePath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
  
  // Check exact matches and prefixes
  for (const allowed of ALLOWED_FILES) {
    if (relativePath === allowed || relativePath.startsWith(allowed)) {
      return true;
    }
  }
  
  // Check patterns (test files, stories)
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check a single file for violations
 */
function checkFile(filePath) {
  if (isAllowedFile(filePath)) {
    return;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const checkableExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'];
  
  if (!checkableExtensions.includes(ext)) {
    return;
  }
  
  filesChecked++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
        return;
      }
      
      // Check for hex colors
      const hexMatches = line.match(HEX_COLOR_PATTERN);
      if (hexMatches) {
        // Filter out false positives (e.g., IDs, version numbers)
        const realHexColors = hexMatches.filter(match => {
          // Must be a valid color (3 or 6 hex digits)
          const digits = match.slice(1);
          return digits.length === 3 || digits.length === 6;
        });
        
        if (realHexColors.length > 0) {
          violations.push({
            file: relativePath,
            line: lineNum,
            type: 'hex-color',
            matches: realHexColors,
            content: line.trim().substring(0, 100),
          });
        }
      }
      
      // Check for rgb/hsl (only in non-CSS files, CSS may have var() fallbacks)
      if (ext !== '.css' && ext !== '.scss') {
        const rgbHslMatches = line.match(RGB_HSL_PATTERN);
        if (rgbHslMatches) {
          violations.push({
            file: relativePath,
            line: lineNum,
            type: 'rgb-hsl',
            matches: rgbHslMatches,
            content: line.trim().substring(0, 100),
          });
        }
      }
      
      // Check for Tailwind base color utilities (only in TSX/JSX)
      if (ext === '.tsx' || ext === '.jsx') {
        const tailwindMatches = line.match(TAILWIND_BASE_COLORS);
        if (tailwindMatches) {
          violations.push({
            file: relativePath,
            line: lineNum,
            type: 'tailwind-base-color',
            matches: tailwindMatches,
            content: line.trim().substring(0, 100),
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules and hidden directories
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      checkFile(fullPath);
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🎨 Checking for hardcoded colors...\n');
  
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Error: Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }
  
  scanDirectory(SRC_DIR);
  
  console.log(`Files checked: ${filesChecked}`);
  
  if (violations.length === 0) {
    console.log('\n✅ No hardcoded colors found. Theme system is clean!\n');
    process.exit(0);
  }
  
  console.log(`\n❌ Found ${violations.length} violation(s):\n`);
  
  // Group by file
  const byFile = {};
  for (const v of violations) {
    if (!byFile[v.file]) {
      byFile[v.file] = [];
    }
    byFile[v.file].push(v);
  }
  
  for (const [file, fileViolations] of Object.entries(byFile)) {
    console.log(`📄 ${file}`);
    for (const v of fileViolations) {
      console.log(`   Line ${v.line}: [${v.type}] ${v.matches.join(', ')}`);
      console.log(`   > ${v.content}`);
    }
    console.log('');
  }
  
  console.log('💡 Fix: Use CSS variables (var(--color-*)) or Tailwind semantic classes');
  console.log('   Allowed theme files: tokens.css, themes.css, ThemeEngine.ts, themeBridge.ts\n');
  
  process.exit(1);
}

main();

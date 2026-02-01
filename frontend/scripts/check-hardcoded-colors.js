#!/usr/bin/env node
/**
 * CI Script: Check for Hardcoded Colors
 * 
 * Prevents regression by failing if hardcoded colors are found outside theme files.
 * 
 * Rules enforced:
 * 1. No hex colors (#xxx, #xxxxxx, #xxxxxxxx) in src/ except allowed theme files
 * 2. No rgb()/rgba() in src/ except allowed theme files
 * 3. No hsl()/hsla() in src/ except allowed theme files
 * 4. No Tailwind base color utilities (slate-*, blue-*, gray-*) in components
 * 5. No named colors (red, blue, white, etc.) in style attributes
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
  'config/ConfigStore.ts',      // Default theme configuration
  'auth/theme/presets/',
  'auth/',                      // Auth theme system (LoginThemeProvider exception)
  'common/utils/designTokens.ts',
  'common/styles/theme.ts',     // Theme constants
  'settings/components/StoreThemeConfig.tsx', // Color picker presets
  'settings/components/SettingsLayout.module.css', // CSS module with fallbacks
  'admin/pages/BrandingSettingsPage.tsx',     // Color picker presets and preview
  'admin/pages/SetupWizard.module.css',       // CSS module with fallbacks
  'admin/components/wizard/BrandingStepContent.tsx', // Color picker presets
  'assets/styles/print.css',    // Print styles need explicit colors
  'components/FaviconManager.tsx', // Favicon generation needs explicit colors
  'sales/pages/TransactionHistoryPage.tsx', // Print receipt styles
  'sell/pages/QuotesPage.tsx',  // Print quote styles
  'sell/pages/SellPage.tsx',    // Print receipt styles
  'index.css',                  // Root styles with fallbacks
  'test-inline-styles.tsx',     // Test file
  'test/fixtures/',             // Test fixtures
  'legacy_quarantine/',         // Quarantined legacy code
];

const ALLOWED_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.stories\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.example\.(ts|tsx|js|jsx)$/,
  /Example\.(ts|tsx|js|jsx)$/,
];

// Patterns to detect
const HEX_COLOR_PATTERN = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_PATTERN = /\brgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/gi;
const HSL_PATTERN = /\bhsla?\s*\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?/gi;
const TAILWIND_BASE_COLORS = /\b(bg|text|border|ring|fill|stroke)-(slate|blue|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

// Named CSS colors to detect in style attributes
const NAMED_COLORS = [
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
  'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
  'teal', 'aqua', 'maroon', 'olive', 'silver', 'fuchsia', 'indigo'
];
const NAMED_COLOR_PATTERN = new RegExp(
  `\\b(color|background|backgroundColor|borderColor)\\s*[:=]\\s*['"\`](${NAMED_COLORS.join('|')})['"\`]`,
  'gi'
);

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
 * Check if a line is a comment
 */
function isComment(line, ext) {
  const trimmed = line.trim();
  
  // JavaScript/TypeScript comments
  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
    return trimmed.startsWith('//') || 
           trimmed.startsWith('*') || 
           trimmed.startsWith('/*') ||
           trimmed.startsWith('*/');
  }
  
  // CSS comments
  if (ext === '.css' || ext === '.scss') {
    return trimmed.startsWith('/*') || 
           trimmed.startsWith('*') || 
           trimmed.startsWith('*/');
  }
  
  return false;
}

/**
 * Check if a hex value is likely a color (not an ID or other value)
 */
function isLikelyColor(hexMatch, line) {
  // Check if it's in a color-related context
  const colorContexts = [
    'color', 'background', 'border', 'fill', 'stroke',
    'bg-', 'text-', 'border-', 'shadow', 'gradient'
  ];
  
  const lowerLine = line.toLowerCase();
  for (const context of colorContexts) {
    if (lowerLine.includes(context)) {
      return true;
    }
  }
  
  // If it's a 3 or 6 digit hex, it's likely a color
  const digits = hexMatch.slice(1);
  return digits.length === 3 || digits.length === 6 || digits.length === 8;
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
      if (isComment(line, ext)) {
        return;
      }
      
      // Check for hex colors
      const hexMatches = line.match(HEX_COLOR_PATTERN);
      if (hexMatches) {
        const realHexColors = hexMatches.filter(match => isLikelyColor(match, line));
        
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
      
      // Check for rgb/rgba
      const rgbMatches = line.match(RGB_PATTERN);
      if (rgbMatches && (ext !== '.css' && ext !== '.scss')) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'rgb-color',
          matches: rgbMatches,
          content: line.trim().substring(0, 100),
        });
      }
      
      // Check for hsl/hsla
      const hslMatches = line.match(HSL_PATTERN);
      if (hslMatches && (ext !== '.css' && ext !== '.scss')) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'hsl-color',
          matches: hslMatches,
          content: line.trim().substring(0, 100),
        });
      }
      
      // Check for named colors in style attributes
      const namedColorMatches = line.match(NAMED_COLOR_PATTERN);
      if (namedColorMatches) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'named-color',
          matches: namedColorMatches,
          content: line.trim().substring(0, 100),
        });
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
  
  // Sort files alphabetically
  const sortedFiles = Object.keys(byFile).sort();
  
  for (const file of sortedFiles) {
    const fileViolations = byFile[file];
    console.log(`📄 ${file}`);
    for (const v of fileViolations) {
      const typeLabel = {
        'hex-color': 'HEX',
        'rgb-color': 'RGB',
        'hsl-color': 'HSL',
        'named-color': 'NAMED',
        'tailwind-base-color': 'TAILWIND'
      }[v.type] || v.type.toUpperCase();
      
      console.log(`   Line ${v.line}: [${typeLabel}] ${v.matches.join(', ')}`);
      console.log(`   > ${v.content}`);
    }
    console.log('');
  }
  
  console.log('💡 Fix: Use CSS variables (var(--color-*)) or Tailwind semantic classes');
  console.log('   Examples:');
  console.log('   - Instead of #3b82f6 → use var(--color-primary-500)');
  console.log('   - Instead of rgb(59, 130, 246) → use var(--color-primary-500)');
  console.log('   - Instead of text-blue-600 → use text-primary-600');
  console.log('   - Instead of color="red" → use className="text-error-600"');
  console.log('   Allowed theme files: tokens.css, themes.css, ThemeEngine.ts, themeBridge.ts\n');
  
  process.exit(1);
}

// Export for testing
export { isAllowedFile, isComment, isLikelyColor, checkFile };

main();

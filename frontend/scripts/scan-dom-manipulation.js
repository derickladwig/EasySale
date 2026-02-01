#!/usr/bin/env node
/**
 * CI Script: Check for Direct DOM Manipulation
 * 
 * Prevents regression by failing if direct DOM manipulation for theme changes
 * is found outside ThemeEngine.
 * 
 * Rules enforced:
 * 1. No document.documentElement.style.setProperty() outside ThemeEngine
 * 2. No document.body.style.setProperty() for theme properties
 * 3. No root.style.setProperty() (where root is document.documentElement)
 * 4. No element.style.setProperty() for theme-related CSS variables
 * 5. All theme changes must route through ThemeEngine.saveThemePreference()
 * 
 * Allowed files (legitimate DOM manipulation):
 * - src/theme/ThemeEngine.ts (ONLY file that should manipulate theme DOM)
 * - src/auth/theme/LoginThemeProvider.tsx (separate pre-auth theme system)
 * - *.test.* files (test setup)
 * - *.stories.* files (Storybook)
 * 
 * Usage:
 *   node scripts/scan-dom-manipulation.js
 *   npm run lint:dom
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
  'theme/ThemeEngine.ts',           // ONLY file that should manipulate theme DOM
  'auth/theme/LoginThemeProvider.tsx', // Separate pre-auth theme system
  'auth/theme/LoginThemeEngine.ts', // Login theme engine
  'config/themeBridge.ts',          // JSON to CSS variable conversion (part of theme system)
  'common/components/atoms/ThemeToggle.tsx', // Pre-auth theme toggle
  'common/hooks/useDisplaySettings.ts', // Display settings (layout, not theme colors)
  'components/FaviconManager.tsx',  // Favicon manipulation (not theme)
  'test/fixtures/',                 // Test fixtures
  'legacy_quarantine/',             // Quarantined legacy code
];

const ALLOWED_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.stories\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.example\.(ts|tsx|js|jsx)$/,
  /Example\.(ts|tsx|js|jsx)$/,
];

// Patterns to detect direct DOM manipulation
const DOM_MANIPULATION_PATTERNS = [
  // document.documentElement.style.setProperty
  {
    pattern: /document\.documentElement\.style\.setProperty\s*\(/g,
    type: 'documentElement.style.setProperty',
    description: 'Direct manipulation of document.documentElement.style',
  },
  // document.body.style.setProperty
  {
    pattern: /document\.body\.style\.setProperty\s*\(/g,
    type: 'document.body.style.setProperty',
    description: 'Direct manipulation of document.body.style',
  },
  // root.style.setProperty (where root is likely document.documentElement)
  {
    pattern: /\broot\.style\.setProperty\s*\(/g,
    type: 'root.style.setProperty',
    description: 'Direct manipulation via root variable (likely document.documentElement)',
  },
  // element.style.setProperty for CSS variables (--color-*, --theme-*)
  {
    pattern: /\.style\.setProperty\s*\(\s*['"`](--color-|--theme-)/g,
    type: 'element.style.setProperty (theme vars)',
    description: 'Direct manipulation of theme CSS variables',
  },
  // document.documentElement.setAttribute('data-theme')
  {
    pattern: /document\.documentElement\.setAttribute\s*\(\s*['"`]data-theme['"`]/g,
    type: 'documentElement.setAttribute (data-theme)',
    description: 'Direct manipulation of data-theme attribute',
  },
  // document.body.setAttribute('data-theme')
  {
    pattern: /document\.body\.setAttribute\s*\(\s*['"`]data-theme['"`]/g,
    type: 'document.body.setAttribute (data-theme)',
    description: 'Direct manipulation of data-theme attribute on body',
  },
  // root.setAttribute('data-theme')
  {
    pattern: /\broot\.setAttribute\s*\(\s*['"`]data-theme['"`]/g,
    type: 'root.setAttribute (data-theme)',
    description: 'Direct manipulation of data-theme attribute via root',
  },
  // document.documentElement.classList manipulation for theme classes
  {
    pattern: /document\.documentElement\.classList\.(add|remove|toggle)\s*\(\s*['"`](dark|light|theme-)/g,
    type: 'documentElement.classList (theme)',
    description: 'Direct manipulation of theme classes on documentElement',
  },
];

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
function isComment(line) {
  const trimmed = line.trim();
  
  // JavaScript/TypeScript comments
  return trimmed.startsWith('//') || 
         trimmed.startsWith('*') || 
         trimmed.startsWith('/*') ||
         trimmed.startsWith('*/');
}

/**
 * Check if a line is in a multi-line comment block
 */
function isInCommentBlock(lines, lineIndex) {
  // Look backwards for comment start
  for (let i = lineIndex; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.includes('*/')) {
      return false; // Found end of previous comment block
    }
    if (line.includes('/*')) {
      return true; // Found start of comment block
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
  const checkableExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  
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
      if (isComment(line) || isInCommentBlock(lines, index)) {
        return;
      }
      
      // Track if we've already reported this line to avoid duplicates
      let lineReported = false;
      
      // Check each pattern (in order of specificity - most specific first)
      for (const { pattern, type, description } of DOM_MANIPULATION_PATTERNS) {
        // Skip if we've already reported a more specific pattern for this line
        if (lineReported) {
          break;
        }
        
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;
        
        const matches = line.match(pattern);
        if (matches) {
          violations.push({
            file: relativePath,
            line: lineNum,
            type,
            description,
            matches,
            content: line.trim().substring(0, 120),
          });
          
          // Mark line as reported to avoid duplicate reports
          // (e.g., document.documentElement.style.setProperty matches both
          // documentElement pattern AND theme vars pattern)
          lineReported = true;
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
  console.log('🔍 Checking for direct DOM manipulation...\n');
  
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Error: Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }
  
  scanDirectory(SRC_DIR);
  
  console.log(`Files checked: ${filesChecked}`);
  
  if (violations.length === 0) {
    console.log('\n✅ No direct DOM manipulation found. Theme system is clean!\n');
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
      console.log(`   Line ${v.line}: [${v.type}]`);
      console.log(`   Description: ${v.description}`);
      console.log(`   > ${v.content}`);
    }
    console.log('');
  }
  
  console.log('💡 Fix: Route all theme changes through ThemeEngine');
  console.log('   Examples:');
  console.log('   ');
  console.log('   ❌ WRONG:');
  console.log('   const root = document.documentElement;');
  console.log('   root.style.setProperty("--color-primary-500", "#3b82f6");');
  console.log('   ');
  console.log('   ✅ CORRECT:');
  console.log('   import { ThemeEngine } from "@/theme/ThemeEngine";');
  console.log('   const themeEngine = ThemeEngine.getInstance();');
  console.log('   themeEngine.saveThemePreference("store", {');
  console.log('     colors: { primary: { 500: "#3b82f6" } }');
  console.log('   });');
  console.log('   ');
  console.log('   Only ThemeEngine.ts should manipulate theme DOM directly.');
  console.log('   All other components must use ThemeEngine API.\n');
  
  process.exit(1);
}

// Export for testing
export { isAllowedFile, isComment, isInCommentBlock, checkFile };

main();

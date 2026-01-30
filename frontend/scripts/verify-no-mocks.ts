#!/usr/bin/env node
/**
 * Mock Data Verification Script
 * 
 * This script verifies that no mock data remains in the affected frontend components.
 * It checks for:
 * 1. Identifiers matching the pattern mock[A-Z].* (e.g., mockInventory, mockProducts)
 * 2. Large inline array literals (>10 lines with objects)
 * 
 * Exit codes:
 * - 0: Success (no violations found)
 * - 1: Violations found
 * 
 * Usage: npm run verify:no-mocks
 */

import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

// List of files to check (relative to frontend/src)
const AFFECTED_FILES = [
  'inventory/pages/InventoryPage.tsx',
  'sell/pages/SellPage.tsx',
  'lookup/pages/LookupPage.tsx',
  'customers/pages/CustomersPage.tsx',
  'admin/pages/AdminPage.tsx',
  'settings/pages/TaxRulesPage.tsx',
  'settings/pages/IntegrationsPage.tsx',
  'settings/pages/NetworkPage.tsx',
  'settings/pages/PerformancePage.tsx',
];

interface Violation {
  file: string;
  line: number;
  type: 'mock-identifier' | 'large-array';
  content: string;
}

/**
 * Check if a file contains mock identifiers matching the pattern mock[A-Z].*
 */
function checkMockIdentifiers(filePath: string, content: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');
  
  // Pattern to match mock identifiers: mock followed by uppercase letter
  const mockPattern = /\bmock[A-Z][a-zA-Z0-9_]*\b/g;
  
  lines.forEach((line, index) => {
    const matches = line.match(mockPattern);
    if (matches) {
      matches.forEach((match) => {
        violations.push({
          file: filePath,
          line: index + 1,
          type: 'mock-identifier',
          content: match,
        });
      });
    }
  });
  
  return violations;
}

/**
 * Check if a file contains large inline array literals (>10 lines with objects)
 * Only flags arrays with "mock" in the variable name
 */
function checkLargeArrayLiterals(filePath: string, content: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');
  
  let inArray = false;
  let arrayStartLine = 0;
  let arrayDepth = 0;
  let objectCount = 0;
  let arrayContent: string[] = [];
  let arrayVarName = '';
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Detect array start: const/let/var identifier = [
    // Capture the variable name to check if it contains "mock"
    const arrayStartMatch = trimmedLine.match(/(?:const|let|var)\s+(\w+)\s*(?::\s*\w+\[\])?\s*=\s*\[/);
    if (!inArray && arrayStartMatch) {
      inArray = true;
      arrayStartLine = index + 1;
      arrayDepth = 1;
      objectCount = 0;
      arrayContent = [line];
      arrayVarName = arrayStartMatch[1];
      
      // Check if array closes on the same line
      const openBrackets = (trimmedLine.match(/\[/g) || []).length;
      const closeBrackets = (trimmedLine.match(/\]/g) || []).length;
      arrayDepth = openBrackets - closeBrackets;
      
      if (arrayDepth === 0) {
        inArray = false;
      }
    } else if (inArray) {
      arrayContent.push(line);
      
      // Track array depth
      const openBrackets = (trimmedLine.match(/\[/g) || []).length;
      const closeBrackets = (trimmedLine.match(/\]/g) || []).length;
      arrayDepth += openBrackets - closeBrackets;
      
      // Count objects in the array (lines starting with { or containing {)
      if (trimmedLine.includes('{')) {
        objectCount++;
      }
      
      // Check if array is closed
      if (arrayDepth === 0) {
        const arrayLineCount = arrayContent.length;
        
        // Only flag if:
        // 1. Array spans >10 lines
        // 2. Contains objects
        // 3. Variable name contains "mock" (case-insensitive)
        if (arrayLineCount > 10 && objectCount > 0 && /mock/i.test(arrayVarName)) {
          violations.push({
            file: filePath,
            line: arrayStartLine,
            type: 'large-array',
            content: `Array literal '${arrayVarName}' spanning ${arrayLineCount} lines with ${objectCount} objects`,
          });
        }
        
        inArray = false;
        arrayContent = [];
        arrayVarName = '';
      }
    }
  });
  
  return violations;
}

/**
 * Check a single file for violations
 */
function checkFile(filePath: string): Violation[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const mockViolations = checkMockIdentifiers(filePath, content);
    const arrayViolations = checkLargeArrayLiterals(filePath, content);
    
    return [...mockViolations, ...arrayViolations];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`${colors.yellow}Warning: File not found: ${filePath}${colors.reset}`);
      return [];
    }
    throw error;
  }
}

/**
 * Format and display violations
 */
function displayViolations(violations: Violation[]): void {
  if (violations.length === 0) {
    console.log(`${colors.green}${colors.bold}✓ No mock data violations found!${colors.reset}`);
    console.log(`${colors.green}All ${AFFECTED_FILES.length} files are clean.${colors.reset}\n`);
    return;
  }
  
  console.log(`${colors.red}${colors.bold}✗ Found ${violations.length} violation(s):${colors.reset}\n`);
  
  // Group violations by file
  const violationsByFile = violations.reduce((acc, violation) => {
    if (!acc[violation.file]) {
      acc[violation.file] = [];
    }
    acc[violation.file].push(violation);
    return acc;
  }, {} as Record<string, Violation[]>);
  
  // Display violations grouped by file
  Object.entries(violationsByFile).forEach(([file, fileViolations]) => {
    console.log(`${colors.blue}${colors.bold}${file}${colors.reset}`);
    
    fileViolations.forEach((violation) => {
      const typeLabel = violation.type === 'mock-identifier' 
        ? 'Mock identifier' 
        : 'Large array literal';
      
      console.log(`  ${colors.red}Line ${violation.line}:${colors.reset} ${typeLabel}`);
      console.log(`    ${colors.yellow}${violation.content}${colors.reset}`);
    });
    
    console.log('');
  });
  
  console.log(`${colors.red}${colors.bold}Please remove all mock data before proceeding.${colors.reset}\n`);
}

/**
 * Main execution
 */
function main(): void {
  console.log(`${colors.bold}Mock Data Verification Script${colors.reset}`);
  console.log(`Checking ${AFFECTED_FILES.length} files for mock data violations...\n`);
  
  const srcDir = path.join(process.cwd(), 'src');
  const allViolations: Violation[] = [];
  
  AFFECTED_FILES.forEach((file) => {
    const filePath = path.join(srcDir, file);
    const violations = checkFile(filePath);
    allViolations.push(...violations);
  });
  
  displayViolations(allViolations);
  
  // Exit with appropriate code
  process.exit(allViolations.length > 0 ? 1 : 0);
}

// Run the script
main();

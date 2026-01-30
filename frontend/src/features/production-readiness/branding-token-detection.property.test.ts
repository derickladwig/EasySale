/**
 * Property Test: Core Runtime Paths Free of Branding Tokens
 * 
 * **Validates: Requirements 3.2**
 * 
 * Property: For any file in Core_Runtime_Paths, scanning for forbidden branding tokens
 * (CAPS, caps-pos, vehicle-specific terms) should find zero matches.
 * 
 * This test ensures that all hardcoded branding has been removed from core runtime code
 * and replaced with configuration-driven branding.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

// Core runtime paths to scan (excluding tests, fixtures, archive, presets)
const CORE_RUNTIME_PATHS = [
  'src/features',
  'src/common/components',
  'src/common/contexts',
  'src/common/hooks',
  'src/config',
];

// Paths to exclude from scanning
const EXCLUDED_PATTERNS = [
  /\/test\//,
  /\/tests\//,
  /\.test\./,
  /\.spec\./,
  /\/fixtures\//,
  /\/archive\//,
  /\/presets\//,
  /\/examples\//,
  /\/node_modules\//,
  /\/target\//,
  /\/dist\//,
  /\/build\//,
];

// Forbidden branding tokens
const FORBIDDEN_TOKENS = {
  // CAPS branding
  caps: [
    /\bCAPS\b/g,  // Word boundary to avoid matching "capabilities"
    /caps-pos/gi,
    /caps-pos\.local/gi,
    /security@caps-pos\.local/gi,
  ],
  
  // Vehicle-specific terms (should be in optional automotive pack only)
  vehicle: [
    /\bVIN\b/g,
    /vehicle_fitment/gi,
    /\/api\/vin/gi,
    /automotive-specific/gi,
  ],
};

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    
    // Skip excluded patterns
    if (EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath))) {
      return;
    }
    
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      // Only include source files
      if (/\.(ts|tsx|rs|js|jsx)$/.test(filePath)) {
        arrayOfFiles.push(filePath);
      }
    }
  });
  
  return arrayOfFiles;
}

/**
 * Get all core runtime files
 */
function getCoreRuntimeFiles(): string[] {
  const allFiles: string[] = [];
  
  CORE_RUNTIME_PATHS.forEach((basePath) => {
    const fullPath = path.join(process.cwd(), basePath);
    const files = getAllFiles(fullPath);
    allFiles.push(...files);
  });
  
  return allFiles;
}

/**
 * Scan file for forbidden tokens
 */
function scanFileForTokens(filePath: string, patterns: RegExp[]): Array<{ line: number; match: string; pattern: string }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: Array<{ line: number; match: string; pattern: string }> = [];
  
  patterns.forEach((pattern) => {
    lines.forEach((line, index) => {
      const lineMatches = line.match(pattern);
      if (lineMatches) {
        lineMatches.forEach((match) => {
          matches.push({
            line: index + 1,
            match,
            pattern: pattern.source,
          });
        });
      }
    });
  });
  
  return matches;
}

describe('Property 5: Core Runtime Paths Free of Branding Tokens', () => {
  const coreFiles = getCoreRuntimeFiles();
  
  it('should have core runtime files to test', () => {
    expect(coreFiles.length).toBeGreaterThan(0);
  });
  
  describe('CAPS branding tokens', () => {
    it('should not contain CAPS branding in any core runtime file', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...coreFiles),
          (filePath) => {
            const matches = scanFileForTokens(filePath, FORBIDDEN_TOKENS.caps);
            
            if (matches.length > 0) {
              const errorMessage = `Found CAPS branding tokens in ${filePath}:\n` +
                matches.map(m => `  Line ${m.line}: "${m.match}" (pattern: ${m.pattern})`).join('\n');
              
              // Fail with detailed error message
              expect(matches.length, errorMessage).toBe(0);
            }
            
            // Property: No CAPS branding tokens should exist in core runtime paths
            expect(matches.length).toBe(0);
          }
        ),
        { numRuns: Math.min(100, coreFiles.length) }
      );
    });
  });
  
  describe('Vehicle-specific terms', () => {
    it('should not contain vehicle-specific terms in core runtime files (should be in optional automotive pack)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...coreFiles),
          (filePath) => {
            const matches = scanFileForTokens(filePath, FORBIDDEN_TOKENS.vehicle);
            
            if (matches.length > 0) {
              const errorMessage = `Found vehicle-specific terms in ${filePath}:\n` +
                matches.map(m => `  Line ${m.line}: "${m.match}" (pattern: ${m.pattern})`).join('\n') +
                '\n\nVehicle-specific terms should only exist in optional automotive pack modules.';
              
              // Fail with detailed error message
              expect(matches.length, errorMessage).toBe(0);
            }
            
            // Property: No vehicle-specific terms should exist in core runtime paths
            expect(matches.length).toBe(0);
          }
        ),
        { numRuns: Math.min(100, coreFiles.length) }
      );
    });
  });
  
  describe('Combined token scan', () => {
    it('should not contain any forbidden branding tokens in core runtime', () => {
      const allPatterns = [
        ...FORBIDDEN_TOKENS.caps,
        ...FORBIDDEN_TOKENS.vehicle,
      ];
      
      const violations: Array<{ file: string; matches: Array<{ line: number; match: string; pattern: string }> }> = [];
      
      coreFiles.forEach((filePath) => {
        const matches = scanFileForTokens(filePath, allPatterns);
        if (matches.length > 0) {
          violations.push({ file: filePath, matches });
        }
      });
      
      if (violations.length > 0) {
        const errorMessage = 'Found forbidden branding tokens in core runtime paths:\n\n' +
          violations.map(v => 
            `${v.file}:\n` +
            v.matches.map(m => `  Line ${m.line}: "${m.match}" (pattern: ${m.pattern})`).join('\n')
          ).join('\n\n');
        
        console.error(errorMessage);
      }
      
      // Property: Zero violations across all core runtime files
      expect(violations.length).toBe(0);
    });
  });
});

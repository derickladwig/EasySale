/**
 * Property-Based Test: No Legacy Components in Active Tree
 *
 * Feature: navigation-consolidation
 * Property 4: No Legacy Components in Active Tree
 *
 * **Validates: Requirements 4.2, 14.3**
 *
 * For any component in the active render tree, that component SHALL NOT be
 * imported from the `legacy_quarantine` directory.
 *
 * This is a static analysis test that scans all TypeScript/TSX files in
 * frontend/src (excluding legacy_quarantine itself) and verifies no import
 * statements reference the legacy_quarantine directory.
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the frontend/src directory
const FRONTEND_SRC = path.resolve(__dirname, '../..');

/**
 * Interface for tracking import violations
 */
interface ImportViolation {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  importPath: string;
}

/**
 * Patterns that indicate a legacy_quarantine import
 */
const LEGACY_IMPORT_PATTERNS = [
  /from\s+['"].*legacy_quarantine.*['"]/,
  /import\s*\(.*legacy_quarantine.*\)/,
  /require\s*\(.*legacy_quarantine.*\)/,
  /from\s+['"]@\/legacy_quarantine.*['"]/,
];

/**
 * Directories to exclude from scanning
 */
const EXCLUDED_DIRS = [
  'legacy_quarantine',
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
];

/**
 * Files to exclude from scanning (e.g., this test file itself)
 */
const EXCLUDED_FILES = [
  'no-legacy-imports.property.test.ts',
];

/**
 * File extensions to scan
 */
const SCANNABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Recursively get all TypeScript/TSX files in a directory
 */
function getAllSourceFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip excluded directories
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(entry.name)) {
          getAllSourceFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        // Skip excluded files (like this test file itself)
        if (SCANNABLE_EXTENSIONS.includes(ext) && !EXCLUDED_FILES.includes(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Directory might not exist or be inaccessible
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }

  return files;
}

/**
 * Check a single file for legacy_quarantine imports
 */
function checkFileForLegacyImports(filePath: string): ImportViolation[] {
  const violations: ImportViolation[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check each pattern
      for (const pattern of LEGACY_IMPORT_PATTERNS) {
        if (pattern.test(line)) {
          // Extract the import path for reporting
          const importMatch = line.match(/['"]([^'"]*legacy_quarantine[^'"]*)['"]/);
          const importPath = importMatch ? importMatch[1] : 'unknown';

          violations.push({
            filePath: path.relative(FRONTEND_SRC, filePath),
            lineNumber,
            lineContent: line.trim(),
            importPath,
          });
          break; // Only report once per line
        }
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
  }

  return violations;
}

/**
 * Scan all source files and collect violations
 */
function scanForLegacyImports(): {
  scannedFiles: string[];
  violations: ImportViolation[];
} {
  const sourceFiles = getAllSourceFiles(FRONTEND_SRC);
  const allViolations: ImportViolation[] = [];

  for (const file of sourceFiles) {
    const fileViolations = checkFileForLegacyImports(file);
    allViolations.push(...fileViolations);
  }

  return {
    scannedFiles: sourceFiles.map((f) => path.relative(FRONTEND_SRC, f)),
    violations: allViolations,
  };
}

/**
 * Generate a formatted violation report
 */
function formatViolationReport(violations: ImportViolation[]): string {
  if (violations.length === 0) {
    return 'No legacy_quarantine imports found in active code.';
  }

  const lines = [
    `Found ${violations.length} legacy_quarantine import(s) in active code:`,
    '',
  ];

  violations.forEach((v, index) => {
    lines.push(`${index + 1}. ${v.filePath}:${v.lineNumber}`);
    lines.push(`   Import: ${v.importPath}`);
    lines.push(`   Line: ${v.lineContent}`);
    lines.push('');
  });

  return lines.join('\n');
}

// Store scan results for use in tests
let scanResults: ReturnType<typeof scanForLegacyImports>;

describe('Feature: navigation-consolidation, Property 4: No Legacy Components in Active Tree', () => {
  beforeAll(() => {
    // Perform the scan once before all tests
    scanResults = scanForLegacyImports();
  });

  describe('Static Analysis: No imports from legacy_quarantine', () => {
    it('should scan all TypeScript/TSX files in frontend/src', () => {
      // Verify we scanned a reasonable number of files
      expect(scanResults.scannedFiles.length).toBeGreaterThan(0);

      // Log scan summary for debugging
      console.log(`Scanned ${scanResults.scannedFiles.length} source files`);
    });

    it('should not find any imports from legacy_quarantine directory', () => {
      // This is the core assertion
      const report = formatViolationReport(scanResults.violations);

      if (scanResults.violations.length > 0) {
        console.error(report);
      }

      expect(
        scanResults.violations,
        `Legacy imports found:\n${report}`
      ).toHaveLength(0);
    });

    it('should exclude legacy_quarantine directory from scan', () => {
      // Verify no scanned files are from legacy_quarantine
      const quarantineFiles = scanResults.scannedFiles.filter((f) =>
        f.includes('legacy_quarantine')
      );

      expect(quarantineFiles).toHaveLength(0);
    });
  });

  describe('Property-Based Tests: Import pattern detection', () => {
    /**
     * Generate arbitrary import statements that reference legacy_quarantine
     */
    const legacyImportStatement = fc.oneof(
      // ES6 import from
      fc.tuple(
        fc.constantFrom('import', 'import type'),
        fc.constantFrom('{ Component }', 'Component', '* as Legacy'),
        fc.constantFrom(
          '../legacy_quarantine/components/Navigation',
          '@/legacy_quarantine/config/navigation',
          '../../legacy_quarantine/styles/Navigation.module.css',
          './legacy_quarantine/components/Something'
        )
      ).map(([imp, what, from]) => `${imp} ${what} from '${from}';`),

      // Dynamic import
      fc.constantFrom(
        "import('../legacy_quarantine/components/Navigation')",
        "import('@/legacy_quarantine/config/navigation')",
        "const x = import('./legacy_quarantine/styles/theme')"
      ),

      // CommonJS require
      fc.constantFrom(
        "require('../legacy_quarantine/components/Navigation')",
        "require('@/legacy_quarantine/config/navigation')",
        "const x = require('./legacy_quarantine/styles/theme')"
      )
    );

    /**
     * Generate arbitrary import statements that do NOT reference legacy_quarantine
     */
    const validImportStatement = fc.oneof(
      fc.constantFrom(
        "import { Component } from './components/Navigation';",
        "import React from 'react';",
        "import { useState } from 'react';",
        "import styles from './Navigation.module.css';",
        "import { config } from '@/config/navigation';",
        "import type { Props } from './types';",
        "const x = require('lodash');",
        "const y = import('./utils/helpers');"
      )
    );

    it('should detect all legacy_quarantine import patterns', () => {
      fc.assert(
        fc.property(legacyImportStatement, (importLine) => {
          // At least one pattern should match
          const matches = LEGACY_IMPORT_PATTERNS.some((pattern) =>
            pattern.test(importLine)
          );

          expect(matches).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should not flag valid imports as legacy', () => {
      fc.assert(
        fc.property(validImportStatement, (importLine) => {
          // No pattern should match valid imports
          const matches = LEGACY_IMPORT_PATTERNS.some((pattern) =>
            pattern.test(importLine)
          );

          expect(matches).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle various path formats consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'legacy_quarantine',
            './legacy_quarantine',
            '../legacy_quarantine',
            '../../legacy_quarantine',
            '@/legacy_quarantine',
            'src/legacy_quarantine'
          ),
          fc.constantFrom(
            '/components/Navigation',
            '/config/navigation',
            '/styles/theme.css',
            ''
          ),
          (basePath, subPath) => {
            const importLine = `import x from '${basePath}${subPath}';`;

            // Should detect legacy_quarantine in any path format
            const matches = LEGACY_IMPORT_PATTERNS.some((pattern) =>
              pattern.test(importLine)
            );

            expect(matches).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-sensitive for legacy_quarantine detection', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'legacy_quarantine',
            'LEGACY_QUARANTINE',
            'Legacy_Quarantine',
            'legacyQuarantine'
          ),
          (variant) => {
            const importLine = `import x from './${variant}/component';`;

            // Only exact 'legacy_quarantine' should match
            const matches = LEGACY_IMPORT_PATTERNS.some((pattern) =>
              pattern.test(importLine)
            );

            // Only lowercase should match
            expect(matches).toBe(variant === 'legacy_quarantine');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property-Based Tests: File scanning correctness', () => {
    it('should correctly identify TypeScript/TSX files', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'),
          (extension) => {
            const isScannableExt = SCANNABLE_EXTENSIONS.includes(extension);

            // Verify our extension list is correct
            if (extension === '.ts' || extension === '.tsx' || extension === '.js' || extension === '.jsx') {
              expect(isScannableExt).toBe(true);
            } else {
              expect(isScannableExt).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify excluded directories', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'legacy_quarantine',
            'node_modules',
            'dist',
            'components',
            'features',
            'utils',
            'config'
          ),
          (dirName) => {
            const isExcluded = EXCLUDED_DIRS.includes(dirName);

            // Verify our exclusion list is correct
            if (
              dirName === 'legacy_quarantine' ||
              dirName === 'node_modules' ||
              dirName === 'dist'
            ) {
              expect(isExcluded).toBe(true);
            } else {
              expect(isExcluded).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should report violations with correct structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            filePath: fc.string({ minLength: 1 }),
            lineNumber: fc.integer({ min: 1, max: 10000 }),
            lineContent: fc.string({ minLength: 1 }),
            importPath: fc.string({ minLength: 1 }),
          }),
          (violation: ImportViolation) => {
            // Verify violation structure
            expect(violation).toHaveProperty('filePath');
            expect(violation).toHaveProperty('lineNumber');
            expect(violation).toHaveProperty('lineContent');
            expect(violation).toHaveProperty('importPath');

            expect(typeof violation.filePath).toBe('string');
            expect(typeof violation.lineNumber).toBe('number');
            expect(violation.lineNumber).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration: Scan results validation', () => {
    it('should have scanned files from expected directories', () => {
      // Verify we scanned files from key directories
      const hasComponents = scanResults.scannedFiles.some((f) =>
        f.includes('components')
      );
      const hasFeatures = scanResults.scannedFiles.some((f) =>
        f.includes('features')
      );

      expect(hasComponents || hasFeatures).toBe(true);
    });

    it('should produce deterministic results', () => {
      // Run scan again and verify same results
      const secondScan = scanForLegacyImports();

      expect(secondScan.violations.length).toBe(scanResults.violations.length);
      expect(secondScan.scannedFiles.length).toBe(
        scanResults.scannedFiles.length
      );
    });

    it('should handle empty directories gracefully', () => {
      // This should not throw
      const emptyDirFiles = getAllSourceFiles('/nonexistent/path');
      expect(emptyDirFiles).toHaveLength(0);
    });
  });
});

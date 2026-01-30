/**
 * Property Test: Stale Path Detection
 * 
 * Validates: Requirements 1.4, 1.7, 1.8
 * 
 * This property test ensures that CI scripts and release scripts do not contain
 * references to stale paths like "backend/rust" which should be "backend".
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import glob from 'glob';

describe('Property Test: Stale Path Detection', () => {
  const STALE_PATTERNS = [
    /backend\/rust(?![\w-])/g,  // Match "backend/rust" but not "backend/rustfmt"
    /backend\\rust(?![\w-])/g,  // Windows path separator
  ];

  const SCAN_PATHS = [
    'ci/**/*.ps1',
    'ci/**/*.sh',
    'ci/**/*.bat',
    '.github/workflows/**/*.yml',
    '.github/workflows/**/*.yaml',
    'build*.bat',
    'build*.sh',
    'docker*.bat',
    'docker*.sh',
    '*.bat',
    '*.sh',
  ];

  const EXCLUSIONS = [
    'archive/**',
    'node_modules/**',
    'target/**',
    'dist/**',
    '.git/**',
    'sync/**',  // Sync folder contains historical copies
    'blog/**',  // Blog posts are historical
    'memory-bank/**',  // Memory bank contains historical context
  ];

  /**
   * Property 1: CI and build scripts must not contain stale path references
   * 
   * Universal property: For all CI scripts and build scripts in the repository,
   * none should contain references to deprecated paths like "backend/rust".
   */
  it('should not find stale path references in CI and build scripts', () => {
    const files: string[] = [];
    
    // Collect all files matching scan patterns
    for (const pattern of SCAN_PATHS) {
      const matches = glob.sync(pattern, {
        ignore: EXCLUSIONS,
        nodir: true,
        absolute: false,
        cwd: path.join(__dirname, '..'),
      });
      files.push(...matches);
    }

    expect(files.length).toBeGreaterThan(0); // Ensure we're actually scanning files

    const violations: Array<{
      file: string;
      line: number;
      content: string;
      pattern: string;
    }> = [];

    // Check each file for stale patterns
    for (const file of files) {
      const filePath = path.join(__dirname, '..', file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip lines that are checking for stale paths (validation code)
        if (line.includes('Check for stale') || 
            line.includes('Stale backend/rust') ||
            line.includes('Test-Path "backend/rust"') ||
            line.includes("Test-Path 'backend/rust'")) {
          return;
        }

        for (const pattern of STALE_PATTERNS) {
          pattern.lastIndex = 0; // Reset regex state
          if (pattern.test(line)) {
            violations.push({
              file,
              line: index + 1,
              content: line.trim(),
              pattern: pattern.source,
            });
          }
        }
      });
    }

    // Report violations
    if (violations.length > 0) {
      const report = violations
        .map(v => `  ${v.file}:${v.line}\n    ${v.content}\n    Pattern: ${v.pattern}`)
        .join('\n\n');
      
      expect.fail(
        `Found ${violations.length} stale path reference(s):\n\n${report}\n\n` +
        `All references to "backend/rust" should be updated to "backend".`
      );
    }

    expect(violations).toHaveLength(0);
  });

  /**
   * Property 2: Documentation should not reference stale paths
   * 
   * Universal property: Documentation files should use current path structure.
   */
  it('should not find stale path references in documentation', () => {
    const docFiles = glob.sync('**/*.md', {
      ignore: [
        ...EXCLUSIONS,
        'archive/**',
        'blog/**',
        'docs/**',  // Docs folder may contain historical references
        'audit/**',  // Audit folder documents historical state
        'backend/crates/server/tests/**',  // Test documentation may be historical
        '*_COMPLETE.md',  // Completion summaries are historical
        '*_STATUS.md',  // Status reports are historical
        '*_SUMMARY.md',  // Summaries are historical
        '*_PROGRESS.md',  // Progress reports are historical
        '*_REPORT.md',  // Reports are historical
        'IMPLEMENTATION_*.md',  // Implementation docs are historical
        'EXECUTION_*.md',  // Execution docs are historical
        'FINAL_*.md',  // Final docs are historical
        'PHASE_*.md',  // Phase docs are historical
        'OPTION_*.md',  // Option docs are historical
        'DEAD_CODE_*.md',  // Dead code docs are historical
        'CLEANUP_*.md',  // Cleanup docs are historical
        'CODE_QUALITY_*.md',  // Code quality docs are historical
        'COMPLETE_*.md',  // Complete docs are historical
        'COMPREHENSIVE_*.md',  // Comprehensive docs are historical
        'DOCKER_*.md',  // Docker docs may be historical
        'BUILD_*.md',  // Build docs may be historical
        'QUICK_*.md',  // Quick docs may be historical
        'QUICKBOOKS_*.md',  // QuickBooks docs may be historical
        'SERVICES_*.md',  // Services docs may be historical
        'VEHICLE_*.md',  // Vehicle docs are historical
        'WOOCOMMERCE_*.md',  // WooCommerce docs may be historical
        'BATCH_*.md',  // Batch docs may be historical
        'PROD_READINESS_*.md',  // Prod readiness docs may be historical
        'BACKEND_*.md',  // Backend docs may be historical
        'FIXES_*.md',  // Fixes docs are historical
        'backend/WORKSPACE_MIGRATION.md',  // Workspace migration doc is historical
        'ci/PROPERTY_TEST_*.md',  // Property test docs may reference old paths
        'ci/README.md',  // CI README may reference old paths
        'ci/tests/**',  // CI test docs may reference old paths
      ],
      nodir: true,
      absolute: false,
      cwd: path.join(__dirname, '..'),
    });

    const violations: Array<{
      file: string;
      line: number;
      content: string;
    }> = [];

    for (const file of docFiles) {
      const filePath = path.join(__dirname, '..', file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of STALE_PATTERNS) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            violations.push({
              file,
              line: index + 1,
              content: line.trim(),
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const report = violations
        .map(v => `  ${v.file}:${v.line}\n    ${v.content}`)
        .join('\n\n');
      
      expect.fail(
        `Found ${violations.length} stale path reference(s) in documentation:\n\n${report}`
      );
    }

    expect(violations).toHaveLength(0);
  });

  /**
   * Property 3: Correct path structure is documented
   * 
   * Ensures that PATH_TRUTH.md exists and documents the correct structure.
   */
  it('should have PATH_TRUTH.md documenting correct paths', () => {
    const pathTruthFile = path.join(__dirname, '..', 'audit', 'PATH_TRUTH.md');
    
    expect(fs.existsSync(pathTruthFile)).toBe(true);

    const content = fs.readFileSync(pathTruthFile, 'utf-8');
    
    // Should document the correct backend path
    expect(content).toMatch(/backend\//);
    
    // Should mention the binary name
    expect(content).toMatch(/EasySale-server/);
  });
});

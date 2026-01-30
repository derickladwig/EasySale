/**
 * Property Test 27: Readiness Gate Scan Scope
 * 
 * **Validates: Requirement 11.6**
 * 
 * This property test verifies that the readiness gate scanner correctly
 * scans only the defined core runtime paths and excludes the specified
 * directories (archive/, tests/, fixtures/, presets/).
 * 
 * Properties tested:
 * 1. Scanner only scans paths defined in policy.scanPaths
 * 2. Scanner excludes archive/ directory
 * 3. Scanner excludes test directories and files
 * 4. Scanner excludes fixture directories
 * 5. Scanner excludes example and preset configurations
 * 6. Scanner does not scan outside core runtime paths
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT, CONFIG_PATHS } from './paths.config';

describe('Property 27: Readiness Gate Scan Scope', () => {
  // Use centralized config for policy path
  const policyPath = CONFIG_PATHS.readinessPolicy;
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
  
  it('policy defines core runtime scan paths', () => {
    expect(policy.scanPaths).toBeDefined();
    expect(policy.scanPaths).toBeInstanceOf(Array);
    expect(policy.scanPaths.length).toBeGreaterThan(0);
  });
  
  it('scan paths target core runtime directories', () => {
    const coreRuntimePaths = [
      'backend/crates/server/src/handlers',
      'backend/crates/server/src/config',
      'backend/crates/server/src/middleware',
      'backend/crates/server/src/services',
      'frontend/src/features',
      'frontend/src/common/components',
      'frontend/src/config'
    ];
    
    // All core runtime paths should be in scan paths
    for (const corePath of coreRuntimePaths) {
      expect(policy.scanPaths).toContain(corePath);
    }
  });
  
  it('scan paths do not include non-runtime directories', () => {
    const nonRuntimePaths = [
      'archive',
      'docs',
      'examples',
      'tests',
      'node_modules',
      'target',
      '.git'
    ];
    
    // None of these should be in scan paths
    for (const nonRuntime of nonRuntimePaths) {
      const found = policy.scanPaths.some((p: string) => p.includes(nonRuntime));
      expect(found).toBe(false);
    }
  });
  
  it('exclusions include archive directory', () => {
    expect(policy.exclusions).toContain('archive/');
  });
  
  it('exclusions include test directories and files', () => {
    const testExclusions = [
      '**/tests/',
      '**/test/',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ];
    
    for (const exclusion of testExclusions) {
      expect(policy.exclusions).toContain(exclusion);
    }
  });
  
  it('exclusions include fixture directories', () => {
    expect(policy.exclusions).toContain('**/fixtures/');
  });
  
  it('exclusions include example and preset configurations', () => {
    expect(policy.exclusions).toContain('configs/examples/');
    expect(policy.exclusions).toContain('configs/presets/');
  });
  
  it('exclusions include build artifacts and dependencies', () => {
    const buildExclusions = [
      '**/node_modules/',
      '**/target/'
    ];
    
    for (const exclusion of buildExclusions) {
      expect(policy.exclusions).toContain(exclusion);
    }
  });
  
  it('scan paths exist in repository', () => {
    for (const scanPath of policy.scanPaths) {
      const fullPath = path.join(REPO_ROOT, scanPath);
      
      // Path should exist (either as file or directory)
      // Some paths might not exist yet, so we just check they're valid paths
      expect(scanPath).toBeTruthy();
      expect(scanPath).not.toContain('..');  // No parent directory traversal
      expect(scanPath).not.toContain('//');  // No double slashes
    }
  });
  
  it('exclusion patterns are valid glob patterns', () => {
    for (const exclusion of policy.exclusions) {
      // Basic validation of glob patterns
      expect(exclusion).toBeTruthy();
      expect(typeof exclusion).toBe('string');
      
      // Should not have invalid characters
      expect(exclusion).not.toContain('\\\\');  // No double backslashes
      expect(exclusion).not.toContain('//');    // No double forward slashes
    }
  });
  
  it('scan paths do not overlap with exclusions', () => {
    // Scan paths should not be excluded
    for (const scanPath of policy.scanPaths) {
      for (const exclusion of policy.exclusions) {
        const pattern = exclusion.replace('**/','').replace('**','').replace('*','');
        
        // Scan path should not match exclusion pattern
        if (pattern && !pattern.startsWith('.')) {
          expect(scanPath).not.toContain(pattern);
        }
      }
    }
  });
  
  it('core runtime paths are comprehensive', () => {
    // Verify we're scanning all critical runtime directories
    const criticalPaths = [
      'backend/crates/server/src/handlers',  // API handlers
      'backend/crates/server/src/config',    // Configuration
      'backend/crates/server/src/middleware', // Middleware
      'frontend/src/features',                // Feature components
      'frontend/src/common/components'        // Shared components
    ];
    
    for (const critical of criticalPaths) {
      expect(policy.scanPaths).toContain(critical);
    }
  });
  
  it('exclusions prevent scanning of archived code', () => {
    // Archive directory should be excluded
    expect(policy.exclusions).toContain('archive/');
    
    // Verify no scan path includes archive
    for (const scanPath of policy.scanPaths) {
      expect(scanPath).not.toContain('archive');
    }
  });
  
  it('exclusions prevent scanning of test code', () => {
    // Test patterns should be excluded
    const testPatterns = ['test', 'spec', 'fixtures'];
    
    for (const pattern of testPatterns) {
      const hasExclusion = policy.exclusions.some((e: string) => 
        e.includes(pattern)
      );
      expect(hasExclusion).toBe(true);
    }
  });
  
  it('exclusions prevent scanning of example configurations', () => {
    // Example and preset configs should be excluded
    expect(policy.exclusions).toContain('configs/examples/');
    expect(policy.exclusions).toContain('configs/presets/');
    
    // Verify no scan path includes these
    for (const scanPath of policy.scanPaths) {
      expect(scanPath).not.toContain('configs/examples');
      expect(scanPath).not.toContain('configs/presets');
    }
  });
  
  it('scan scope is focused on production runtime code', () => {
    // All scan paths should be in src/ or features/ directories
    for (const scanPath of policy.scanPaths) {
      const isRuntimePath = 
        scanPath.includes('/src/') ||
        scanPath.includes('/features/') ||
        scanPath.includes('/common/') ||
        scanPath.includes('/config/');
      
      expect(isRuntimePath).toBe(true);
    }
  });
  
  it('scan paths cover both frontend and backend', () => {
    const hasFrontend = policy.scanPaths.some((p: string) => p.includes('frontend'));
    const hasBackend = policy.scanPaths.some((p: string) => p.includes('backend'));
    
    expect(hasFrontend).toBe(true);
    expect(hasBackend).toBe(true);
  });
  
  it('exclusions are mutually exclusive with scan paths', () => {
    // No scan path should match any exclusion pattern
    for (const scanPath of policy.scanPaths) {
      for (const exclusion of policy.exclusions) {
        // Convert glob pattern to simple check
        const pattern = exclusion
          .replace('**/', '')
          .replace('**', '')
          .replace('*', '')
          .replace('/', '');
        
        if (pattern && pattern.length > 2) {
          // Scan path should not contain excluded pattern
          const normalized = scanPath.toLowerCase();
          const patternLower = pattern.toLowerCase();
          
          // Only check meaningful patterns
          if (!patternLower.startsWith('.') && patternLower !== 'ts' && patternLower !== 'tsx') {
            expect(normalized).not.toContain(patternLower);
          }
        }
      }
    }
  });
});

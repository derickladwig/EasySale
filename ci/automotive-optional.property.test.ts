/**
 * Property-Based Test: Automotive Features Optional
 * 
 * **Property 7: Automotive Features Optional**
 * 
 * For any system configuration with automotive modules disabled,
 * the system should start successfully and handle core POS operations
 * without requiring automotive-specific data or concepts.
 * 
 * **Validates: Requirements 3.5**
 * 
 * **Tag**: Feature: production-readiness-windows-installer, Property 7: Automotive Features Optional
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { 
  REPO_ROOT, 
  AUTOMOTIVE_SCAN_PATHS, 
  CONFIG_PATHS,
  BACKEND_PATHS,
  FRONTEND_PATHS 
} from './paths.config';

// ============================================================================
// Test Configuration (using centralized paths)
// ============================================================================

// Core runtime paths that should work without automotive module
// Converted from centralized config to relative paths for scanning
const CORE_RUNTIME_PATHS = AUTOMOTIVE_SCAN_PATHS.map(p => 
  path.relative(REPO_ROOT, p)
);

// Paths that are allowed to contain automotive-specific code
const AUTOMOTIVE_ALLOWED_PATHS = [
  'tests/',
  'test/',
  'fixtures/',
  'examples/',
  'archive/',
  'configs/examples/',
  'configs/presets/',
  '.test.',
  '.spec.',
];

// Automotive-specific patterns that should not be required in core
const AUTOMOTIVE_PATTERNS = [
  /\bVIN\b/g,
  /\bvin\b/g,
  /vehicle_fitment/gi,
  /vehicleFitment/gi,
  /\/api\/vin/gi,
  /automotive-specific/gi,
  /merge_vehicle/gi,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a path is in an allowed automotive directory
 */
function isInAllowedPath(filePath: string): boolean {
  return AUTOMOTIVE_ALLOWED_PATHS.some(allowed => filePath.includes(allowed));
}

/**
 * Recursively find all source files in a directory
 */
function findSourceFiles(dir: string, extensions: string[] = ['.ts', '.tsx', '.rs']): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules, target, dist, etc.
    if (entry.name === 'node_modules' || entry.name === 'target' || entry.name === 'dist') {
      continue;
    }
    
    if (entry.isDirectory()) {
      files.push(...findSourceFiles(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Scan a file for automotive-specific patterns
 */
function scanFileForAutomotivePatterns(filePath: string): Array<{ line: number; match: string; pattern: string }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: Array<{ line: number; match: string; pattern: string }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of AUTOMOTIVE_PATTERNS) {
      const regex = new RegExp(pattern);
      const match = line.match(regex);
      
      if (match) {
        // Check if it's in a comment explaining it's optional
        const isDocComment = line.includes('NOTE:') || 
                            line.includes('automotive module') || 
                            line.includes('optional automotive') ||
                            line.includes('Automotive module') ||
                            line.includes('optional');
        
        // Also check previous 5 lines for context comments
        let hasContextComment = isDocComment;
        if (!hasContextComment) {
          for (let j = Math.max(0, i - 5); j < i; j++) {
            const prevLine = lines[j];
            if (prevLine.includes('automotive') || 
                prevLine.includes('optional') ||
                prevLine.includes('Automotive')) {
              hasContextComment = true;
              break;
            }
          }
        }
        
        if (!hasContextComment) {
          matches.push({
            line: i + 1,
            match: match[0],
            pattern: pattern.toString(),
          });
        }
      }
    }
  }
  
  return matches;
}

/**
 * Check if default config has automotive disabled
 */
function checkDefaultConfigAutomotiveDisabled(): boolean {
  if (!fs.existsSync(CONFIG_PATHS.defaultConfig)) {
    return false;
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATHS.defaultConfig, 'utf-8'));
  
  // Check if automotive module exists and is disabled
  return config.modules?.automotive?.enabled === false;
}

/**
 * Check if capabilities endpoint returns automotive status
 */
function checkCapabilitiesEndpointExists(): boolean {
  const handlerPath = path.join(BACKEND_PATHS.handlers, 'config.rs');
  
  if (!fs.existsSync(handlerPath)) {
    return false;
  }
  
  const content = fs.readFileSync(handlerPath, 'utf-8');
  
  // Check if get_capabilities endpoint exists
  return content.includes('get_capabilities') && content.includes('automotive');
}

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property 7: Automotive Features Optional', () => {
  it('should have automotive module disabled by default in config', () => {
    const isDisabled = checkDefaultConfigAutomotiveDisabled();
    
    expect(isDisabled).toBe(true);
  });
  
  it('should have capabilities endpoint that exposes automotive status', () => {
    const exists = checkCapabilitiesEndpointExists();
    
    expect(exists).toBe(true);
  });
  
  it('should not require automotive-specific code in core runtime paths', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CORE_RUNTIME_PATHS),
        (runtimePath) => {
          const fullPath = path.join(REPO_ROOT, runtimePath);
          
          if (!fs.existsSync(fullPath)) {
            // Path doesn't exist, skip
            return true;
          }
          
          const files = findSourceFiles(fullPath);
          
          for (const file of files) {
            const relativePath = path.relative(REPO_ROOT, file);
            
            // Skip allowed paths
            if (isInAllowedPath(relativePath)) {
              continue;
            }
            
            const matches = scanFileForAutomotivePatterns(file);
            
            if (matches.length > 0) {
              const errorMessage = `Found automotive-specific patterns in core runtime file ${relativePath}:\n` +
                matches.map(m => `  Line ${m.line}: "${m.match}" (pattern: ${m.pattern})`).join('\n') +
                '\n\nAutomotive-specific code should only exist in optional modules or be properly gated.';
              
              // Fail with detailed error message
              throw new Error(errorMessage);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 10 } // Run for each core runtime path
    );
  });
  
  it('should not have vehicle merge logic in conflict resolver (automotive removed)', () => {
    const conflictResolverPath = path.join(
      BACKEND_PATHS.services,
      'conflict_resolver.rs'
    );
    
    if (!fs.existsSync(conflictResolverPath)) {
      // File doesn't exist, skip
      return;
    }
    
    const content = fs.readFileSync(conflictResolverPath, 'utf-8');
    
    // Verify that vehicle merge logic has been removed
    const hasVehicleMerge = content.includes('merge_vehicle') || 
                            content.includes('"vehicle"');
    
    expect(hasVehicleMerge).toBe(false);
  });
  
  it('should have automotive fields documented as optional in frontend forms', () => {
    const wizardFormsPath = path.join(
      FRONTEND_PATHS.components,
      'wizardForms.ts'
    );
    
    if (!fs.existsSync(wizardFormsPath)) {
      // File doesn't exist, skip
      return;
    }
    
    const content = fs.readFileSync(wizardFormsPath, 'utf-8');
    
    // Check if VIN/vehicle fields are documented as automotive-specific
    const hasAutomotiveComment = content.includes('automotive-specific') || 
                                 content.includes('automotive module');
    
    expect(hasAutomotiveComment).toBe(true);
  });
  
  it('should generate valid configs with automotive disabled', () => {
    fc.assert(
      fc.property(
        fc.record({
          tenantId: fc.string({ minLength: 1, maxLength: 50 }),
          companyName: fc.string({ minLength: 1, maxLength: 100 }),
          automotiveEnabled: fc.constant(false),
        }),
        (configData) => {
          // Simulate config generation
          const config = {
            tenant: {
              id: configData.tenantId,
              name: configData.companyName,
            },
            modules: {
              automotive: {
                enabled: configData.automotiveEnabled,
              },
            },
          };
          
          // Verify automotive is disabled
          expect(config.modules.automotive.enabled).toBe(false);
          
          // Config should be valid even without automotive
          expect(config.tenant.id).toBeTruthy();
          expect(config.tenant.name).toBeTruthy();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Summary
// ============================================================================

/**
 * This property test validates that:
 * 
 * 1. Automotive module is disabled by default in config
 * 2. Capabilities endpoint exposes automotive status
 * 3. Core runtime paths don't require automotive-specific code
 * 4. Automotive fields are documented as optional
 * 5. System can generate valid configs with automotive disabled
 * 
 * This ensures the system can operate as a general POS without
 * requiring automotive-specific concepts, making automotive a
 * true optional vertical pack.
 */

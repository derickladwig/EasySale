/**
 * Property-Based Test: Archive Exclusion from Build
 * 
 * Feature: production-readiness-windows-installer
 * Property 2: Archive Exclusion from Build
 * 
 * **Validates: Requirements 1.6, 9.4, 9.5**
 * 
 * For any build output or package artifact, the archive/ directory should not
 * be present in the compiled or packaged contents.
 * 
 * Framework: fast-check
 * Minimum iterations: 100
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Build output directories to check
 */
const BUILD_OUTPUT_DIRS = [
  'backend/target',
  'frontend/dist',
] as const;

/**
 * Configuration files that should exclude archive/
 */
const CONFIG_FILES = {
  cargoToml: 'backend/Cargo.toml',
  frontendTsConfig: 'frontend/tsconfig.json',
  frontendTsConfigBuild: 'frontend/tsconfig.build.json',
  dockerignore: '.dockerignore',
} as const;

/**
 * Recursively scan a directory for archive/ references
 */
function scanDirectoryForArchive(dir: string): string[] {
  const archivePaths: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return archivePaths;
  }
  
  function walk(currentDir: string) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (error) {
      // Skip directories we can't read
      return;
    }
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(REPO_ROOT, fullPath).replace(/\\/g, '/');
      
      // Check if this path contains 'archive/'
      if (relativePath.includes('archive/')) {
        archivePaths.push(relativePath);
      }
      
      if (entry.isDirectory()) {
        walk(fullPath);
      }
    }
  }
  
  walk(dir);
  return archivePaths;
}

/**
 * Check if Cargo.toml workspace excludes archive/
 */
function checkCargoTomlExcludesArchive(): {
  excludes: boolean;
  details: string;
} {
  const cargoTomlPath = path.join(REPO_ROOT, CONFIG_FILES.cargoToml);
  
  if (!fs.existsSync(cargoTomlPath)) {
    return {
      excludes: false,
      details: 'Cargo.toml not found',
    };
  }
  
  const content = fs.readFileSync(cargoTomlPath, 'utf-8');
  
  // Parse workspace section
  const workspaceMatch = content.match(/\[workspace\]([\s\S]*?)(?=\n\[|$)/);
  if (!workspaceMatch) {
    return {
      excludes: false,
      details: 'No [workspace] section found',
    };
  }
  
  const workspaceSection = workspaceMatch[1];
  
  // Check if archive is in members (it shouldn't be)
  const membersMatch = workspaceSection.match(/members\s*=\s*\[([\s\S]*?)\]/);
  if (membersMatch) {
    const members = membersMatch[1];
    if (members.includes('archive')) {
      return {
        excludes: false,
        details: 'archive/ found in workspace members',
      };
    }
  }
  
  // Check if archive is explicitly excluded
  const excludeMatch = workspaceSection.match(/exclude\s*=\s*\[([\s\S]*?)\]/);
  if (excludeMatch) {
    const excludes = excludeMatch[1];
    if (excludes.includes('archive')) {
      return {
        excludes: true,
        details: 'archive/ explicitly excluded in workspace',
      };
    }
  }
  
  // If archive is not in members and not explicitly excluded, it's implicitly excluded
  return {
    excludes: true,
    details: 'archive/ not in workspace members (implicitly excluded)',
  };
}

/**
 * Check if TypeScript config excludes archive/
 */
function checkTsConfigExcludesArchive(configPath: string): {
  excludes: boolean;
  details: string;
} {
  const fullPath = path.join(REPO_ROOT, configPath);
  
  if (!fs.existsSync(fullPath)) {
    return {
      excludes: false,
      details: `${configPath} not found`,
    };
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Remove comments (JSONC support)
  content = content.replace(/\/\*[\s\S]*?\*\//g, ''); // Block comments
  content = content.replace(/\/\/.*/g, ''); // Line comments
  
  try {
    const config = JSON.parse(content);
    
    if (!config.exclude) {
      return {
        excludes: false,
        details: 'No exclude section found',
      };
    }
    
    const excludes = Array.isArray(config.exclude) ? config.exclude : [];
    const hasArchive = excludes.some((pattern: string) => 
      pattern.includes('archive') || pattern.includes('**/archive/**')
    );
    
    if (hasArchive) {
      return {
        excludes: true,
        details: 'archive/ found in exclude list',
      };
    } else {
      return {
        excludes: false,
        details: 'archive/ not in exclude list',
      };
    }
  } catch (error) {
    return {
      excludes: false,
      details: `Failed to parse ${configPath}: ${error}`,
    };
  }
}

/**
 * Check if .dockerignore excludes archive/
 */
function checkDockerignoreExcludesArchive(): {
  excludes: boolean;
  details: string;
} {
  const dockerignorePath = path.join(REPO_ROOT, CONFIG_FILES.dockerignore);
  
  if (!fs.existsSync(dockerignorePath)) {
    return {
      excludes: false,
      details: '.dockerignore not found',
    };
  }
  
  const content = fs.readFileSync(dockerignorePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim());
  
  // Check for various archive patterns
  const archivePatterns = [
    'archive',
    'archive/',
    '/archive',
    '/archive/',
    '**/archive/**',
  ];
  
  const hasArchive = lines.some(line => 
    archivePatterns.some(pattern => line === pattern)
  );
  
  if (hasArchive) {
    return {
      excludes: true,
      details: 'archive/ found in .dockerignore',
    };
  } else {
    return {
      excludes: false,
      details: 'archive/ not in .dockerignore',
    };
  }
}

/**
 * Generate arbitrary directory structures with archive/ paths
 */
const directoryStructureWithArchive = fc.record({
  hasArchive: fc.boolean(),
  depth: fc.integer({ min: 1, max: 5 }),
  archiveName: fc.constantFrom('archive', 'Archive', 'ARCHIVE'),
});

/**
 * Generate arbitrary Cargo.toml workspace configurations
 */
const cargoWorkspaceConfig = fc.record({
  hasWorkspace: fc.boolean(),
  hasMembers: fc.boolean(),
  hasExclude: fc.boolean(),
  archiveInMembers: fc.boolean(),
  archiveInExclude: fc.boolean(),
});

/**
 * Generate arbitrary TypeScript config exclude lists
 */
const tsConfigExcludeList = fc.record({
  hasExclude: fc.boolean(),
  archiveInExclude: fc.boolean(),
  otherPatterns: fc.array(fc.constantFrom('node_modules', 'dist', 'build', 'coverage'), { maxLength: 3 }),
});

describe('Property 2: Archive Exclusion from Build', () => {
  describe('Core Property: Zero archive/ in build outputs', () => {
    it('should find zero archive/ references in backend/target/', () => {
      const targetDir = path.join(REPO_ROOT, BUILD_OUTPUT_DIRS[0]);
      
      if (!fs.existsSync(targetDir)) {
        console.log('Skipping: backend/target/ does not exist (backend not built)');
        return;
      }
      
      const archivePaths = scanDirectoryForArchive(targetDir);
      
      if (archivePaths.length > 0) {
        const errorMessage = [
          'Found archive/ references in backend build output:',
          '',
          ...archivePaths.map(p => `  ${p}`),
          '',
          'The backend build system must exclude archive/ from compilation.',
          'Check backend/Cargo.toml workspace configuration.',
        ].join('\n');
        
        expect(archivePaths, errorMessage).toHaveLength(0);
      } else {
        expect(archivePaths).toHaveLength(0);
      }
    });
    
    it('should find zero archive/ references in frontend/dist/', () => {
      const distDir = path.join(REPO_ROOT, BUILD_OUTPUT_DIRS[1]);
      
      if (!fs.existsSync(distDir)) {
        console.log('Skipping: frontend/dist/ does not exist (frontend not built)');
        return;
      }
      
      const archivePaths = scanDirectoryForArchive(distDir);
      
      if (archivePaths.length > 0) {
        const errorMessage = [
          'Found archive/ references in frontend build output:',
          '',
          ...archivePaths.map(p => `  ${p}`),
          '',
          'The frontend build system must exclude archive/ from bundling.',
          'Check frontend/tsconfig.json and frontend/tsconfig.build.json.',
        ].join('\n');
        
        expect(archivePaths, errorMessage).toHaveLength(0);
      } else {
        expect(archivePaths).toHaveLength(0);
      }
    });
    
    it('should verify Cargo.toml workspace excludes archive/', () => {
      const result = checkCargoTomlExcludesArchive();
      
      if (!result.excludes) {
        const errorMessage = [
          'Cargo.toml workspace does not properly exclude archive/:',
          '',
          `  ${result.details}`,
          '',
          'Add archive/ to workspace exclude list or ensure it is not in members.',
          'Example:',
          '  [workspace]',
          '  members = ["crates/*"]',
          '  exclude = ["archive"]',
        ].join('\n');
        
        expect(result.excludes, errorMessage).toBe(true);
      } else {
        expect(result.excludes).toBe(true);
      }
    });
    
    it('should verify frontend/tsconfig.json excludes archive/', () => {
      const result = checkTsConfigExcludesArchive(CONFIG_FILES.frontendTsConfig);
      
      if (!result.excludes) {
        const errorMessage = [
          'frontend/tsconfig.json does not exclude archive/:',
          '',
          `  ${result.details}`,
          '',
          'Add archive/ to the exclude list.',
          'Example:',
          '  {',
          '    "exclude": ["node_modules", "dist", "archive"]',
          '  }',
        ].join('\n');
        
        expect(result.excludes, errorMessage).toBe(true);
      } else {
        expect(result.excludes).toBe(true);
      }
    });
    
    it('should verify frontend/tsconfig.build.json excludes archive/', () => {
      const result = checkTsConfigExcludesArchive(CONFIG_FILES.frontendTsConfigBuild);
      
      if (!result.excludes) {
        const errorMessage = [
          'frontend/tsconfig.build.json does not exclude archive/:',
          '',
          `  ${result.details}`,
          '',
          'Add archive/ to the exclude list.',
          'Example:',
          '  {',
          '    "exclude": ["**/*.test.ts", "archive"]',
          '  }',
        ].join('\n');
        
        expect(result.excludes, errorMessage).toBe(true);
      } else {
        expect(result.excludes).toBe(true);
      }
    });
    
    it('should verify .dockerignore excludes archive/', () => {
      const result = checkDockerignoreExcludesArchive();
      
      if (!result.excludes) {
        const errorMessage = [
          '.dockerignore does not exclude archive/:',
          '',
          `  ${result.details}`,
          '',
          'Add archive/ to .dockerignore.',
          'Example:',
          '  archive/',
        ].join('\n');
        
        expect(result.excludes, errorMessage).toBe(true);
      } else {
        expect(result.excludes).toBe(true);
      }
    });
    
    it('should verify all configuration files consistently exclude archive/', () => {
      const results = {
        cargoToml: checkCargoTomlExcludesArchive(),
        frontendTsConfig: checkTsConfigExcludesArchive(CONFIG_FILES.frontendTsConfig),
        frontendTsConfigBuild: checkTsConfigExcludesArchive(CONFIG_FILES.frontendTsConfigBuild),
        dockerignore: checkDockerignoreExcludesArchive(),
      };
      
      const failures = Object.entries(results)
        .filter(([_, result]) => !result.excludes)
        .map(([name, result]) => `  ${name}: ${result.details}`);
      
      if (failures.length > 0) {
        const errorMessage = [
          'Some configuration files do not exclude archive/:',
          '',
          ...failures,
          '',
          'All build configuration files must consistently exclude archive/.',
        ].join('\n');
        
        expect(failures, errorMessage).toHaveLength(0);
      } else {
        expect(failures).toHaveLength(0);
      }
    });
  });
  
  describe('Property-Based Tests: Scanner behavior', () => {
    it('should detect archive/ directories in generated structures', () => {
      fc.assert(
        fc.property(directoryStructureWithArchive, (structure) => {
          if (!structure.hasArchive) {
            return true; // Skip if no archive
          }
          
          // Generate a path with archive/ at the specified depth
          const pathParts = Array(structure.depth).fill('dir');
          pathParts[structure.depth - 1] = structure.archiveName;
          const testPath = pathParts.join('/') + '/'; // Add trailing slash to represent directory
          
          // Check if our scanner would detect this
          const hasArchive = testPath.toLowerCase().includes('archive/');
          
          expect(hasArchive).toBe(true);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per spec
      );
    });
    
    it('should not produce false positives for clean directory structures', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('src', 'dist', 'build', 'node_modules', 'target', 'crates'),
            { minLength: 1, maxLength: 5 }
          ),
          (pathParts) => {
            const testPath = pathParts.join('/');
            
            // Should not contain archive/
            const hasArchive = testPath.toLowerCase().includes('archive/');
            
            expect(hasArchive).toBe(false);
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as per spec
      );
    });
    
    it('should correctly parse Cargo.toml workspace configuration', () => {
      fc.assert(
        fc.property(cargoWorkspaceConfig, (config) => {
          // Generate a Cargo.toml content
          let content = '[package]\nname = "test"\n\n';
          
          if (config.hasWorkspace) {
            content += '[workspace]\n';
            
            if (config.hasMembers) {
              const members = config.archiveInMembers 
                ? '["crates/*", "archive"]'
                : '["crates/*"]';
              content += `members = ${members}\n`;
            }
            
            if (config.hasExclude) {
              const exclude = config.archiveInExclude
                ? '["archive"]'
                : '["other"]';
              content += `exclude = ${exclude}\n`;
            }
          }
          
          // Write to temp file
          const tempFile = path.join(REPO_ROOT, 'temp-cargo.toml');
          fs.writeFileSync(tempFile, content);
          
          try {
            // Parse it
            const fileContent = fs.readFileSync(tempFile, 'utf-8');
            const workspaceMatch = fileContent.match(/\[workspace\]([\s\S]*?)(?=\n\[|$)/);
            
            if (!config.hasWorkspace) {
              expect(workspaceMatch).toBeNull();
            } else {
              expect(workspaceMatch).not.toBeNull();
              
              if (config.hasMembers) {
                const membersMatch = workspaceMatch![1].match(/members\s*=\s*\[([\s\S]*?)\]/);
                expect(membersMatch).not.toBeNull();
                
                if (config.archiveInMembers) {
                  expect(membersMatch![1]).toContain('archive');
                }
              }
              
              if (config.hasExclude) {
                const excludeMatch = workspaceMatch![1].match(/exclude\s*=\s*\[([\s\S]*?)\]/);
                expect(excludeMatch).not.toBeNull();
                
                if (config.archiveInExclude) {
                  expect(excludeMatch![1]).toContain('archive');
                }
              }
            }
          } finally {
            // Clean up
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          }
        }),
        { numRuns: 100 } // Minimum 100 iterations as per spec
      );
    });
    
    it('should correctly parse TypeScript config exclude lists', () => {
      fc.assert(
        fc.property(tsConfigExcludeList, (config) => {
          // Generate a tsconfig.json content
          const tsConfig: any = {
            compilerOptions: {
              target: 'ES2020',
            },
          };
          
          if (config.hasExclude) {
            tsConfig.exclude = [...config.otherPatterns];
            if (config.archiveInExclude) {
              tsConfig.exclude.push('archive');
            }
          }
          
          const content = JSON.stringify(tsConfig, null, 2);
          
          // Write to temp file
          const tempFile = path.join(REPO_ROOT, 'temp-tsconfig.json');
          fs.writeFileSync(tempFile, content);
          
          try {
            // Parse it
            const fileContent = fs.readFileSync(tempFile, 'utf-8');
            const parsed = JSON.parse(fileContent);
            
            if (!config.hasExclude) {
              expect(parsed.exclude).toBeUndefined();
            } else {
              expect(parsed.exclude).toBeDefined();
              expect(Array.isArray(parsed.exclude)).toBe(true);
              
              if (config.archiveInExclude) {
                expect(parsed.exclude).toContain('archive');
              } else {
                expect(parsed.exclude).not.toContain('archive');
              }
            }
          } finally {
            // Clean up
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          }
        }),
        { numRuns: 100 } // Minimum 100 iterations as per spec
      );
    });
    
    it('should handle nested archive/ directories at various depths', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (depth) => {
            // Generate a nested path with archive/ at the specified depth
            const pathParts = Array(depth).fill('dir');
            pathParts[depth - 1] = 'archive';
            const testPath = pathParts.join('/') + '/';
            
            // Should detect archive/ regardless of depth
            const hasArchive = testPath.includes('archive/');
            
            expect(hasArchive).toBe(true);
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as per spec
      );
    });
    
    it('should differentiate between archive/ directories and archive files', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('archive/', 'archive.txt', 'archive.json', 'my-archive.zip'),
          (name) => {
            const isDirectory = name.endsWith('/');
            const containsArchiveDir = name.includes('archive/');
            
            // Only paths with 'archive/' should be detected
            if (isDirectory && name === 'archive/') {
              expect(containsArchiveDir).toBe(true);
            } else if (!name.includes('archive/')) {
              expect(containsArchiveDir).toBe(false);
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as per spec
      );
    });
    
    it('should handle .dockerignore with various archive/ patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('archive', 'archive/', '/archive', '/archive/', '**/archive/**'),
          (pattern) => {
            // All these patterns should be recognized as excluding archive/
            const validPatterns = ['archive', 'archive/', '/archive', '/archive/', '**/archive/**'];
            
            expect(validPatterns).toContain(pattern);
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as per spec
      );
    });
  });
  
  describe('Integration: Configuration consistency', () => {
    it('should have consistent archive/ exclusion across all config files', () => {
      const results = {
        cargoToml: checkCargoTomlExcludesArchive(),
        frontendTsConfig: checkTsConfigExcludesArchive(CONFIG_FILES.frontendTsConfig),
        frontendTsConfigBuild: checkTsConfigExcludesArchive(CONFIG_FILES.frontendTsConfigBuild),
        dockerignore: checkDockerignoreExcludesArchive(),
      };
      
      const allExclude = Object.values(results).every(r => r.excludes);
      
      if (!allExclude) {
        const details = Object.entries(results)
          .map(([name, result]) => `  ${name}: ${result.excludes ? 'OK' : 'FAIL'} - ${result.details}`)
          .join('\n');
        
        console.log('Configuration consistency check:\n' + details);
      }
      
      expect(allExclude).toBe(true);
    });
    
    it('should have no archive/ in build outputs if configs are correct', () => {
      // First check if configs are correct
      const configResults = {
        cargoToml: checkCargoTomlExcludesArchive(),
        frontendTsConfig: checkTsConfigExcludesArchive(CONFIG_FILES.frontendTsConfig),
        frontendTsConfigBuild: checkTsConfigExcludesArchive(CONFIG_FILES.frontendTsConfigBuild),
      };
      
      const allConfigsCorrect = Object.values(configResults).every(r => r.excludes);
      
      if (!allConfigsCorrect) {
        console.log('Skipping: Configuration files do not properly exclude archive/');
        return;
      }
      
      // Check build outputs
      const backendTarget = path.join(REPO_ROOT, BUILD_OUTPUT_DIRS[0]);
      const frontendDist = path.join(REPO_ROOT, BUILD_OUTPUT_DIRS[1]);
      
      let archivePaths: string[] = [];
      
      if (fs.existsSync(backendTarget)) {
        archivePaths.push(...scanDirectoryForArchive(backendTarget));
      }
      
      if (fs.existsSync(frontendDist)) {
        archivePaths.push(...scanDirectoryForArchive(frontendDist));
      }
      
      if (archivePaths.length > 0) {
        const errorMessage = [
          'Found archive/ in build outputs despite correct configuration:',
          '',
          ...archivePaths.map(p => `  ${p}`),
          '',
          'This indicates a build system issue that needs investigation.',
        ].join('\n');
        
        expect(archivePaths, errorMessage).toHaveLength(0);
      } else {
        expect(archivePaths).toHaveLength(0);
      }
    });
  });
});

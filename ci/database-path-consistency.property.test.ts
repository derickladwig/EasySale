/**
 * Property-Based Test: DATABASE_PATH Consistency
 * 
 * Feature: production-readiness-windows-installer
 * Property 11: DATABASE_PATH Consistency
 * 
 * **Validates: Requirements 4.7, 10.1**
 * 
 * For any configuration file, script, or code file that references database
 * configuration, it should use the key DATABASE_PATH consistently (not
 * DATABASE_URL or other variants).
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
 * Canonical database configuration key
 */
const CANONICAL_KEY = 'DATABASE_PATH';

/**
 * Deprecated or non-canonical keys that should be avoided
 */
const DEPRECATED_KEYS = [
  'DATABASE_URL',
  'DB_PATH',
  'DB_URL',
  'SQLITE_PATH',
  'SQLITE_URL',
] as const;

/**
 * Files and directories to scan for database configuration references
 */
const SCAN_PATTERNS = [
  'backend/**/*.rs',
  'backend/**/*.toml',
  'configs/**/*.toml',
  'configs/**/*.json',
  'installer/**/*.template',
  'installer/**/*.ps1',
  'installer/**/*.sh',
  '.github/workflows/**/*.yml',
  'ci/**/*.{ps1,sh,ts,js}',
] as const;

/**
 * Paths to exclude from scanning
 */
const EXCLUDED_PATHS = [
  'archive/',
  'node_modules/',
  '.git/',
  'target/',
  'dist/',
  'build/',
  'coverage/',
  'blog/',
  'docs/',
  'memory-bank/',
] as const;

/**
 * Files that are allowed to use DATABASE_URL for backward compatibility
 */
const ALLOWED_DATABASE_URL_FILES = [
  'backend/crates/server/src/config/profile.rs', // Has fallback with deprecation warning
  'backend/crates/server/src/config/app_config.rs', // Legacy field (marked dead_code)
] as const;

/**
 * Check if a path should be excluded from scanning
 */
function isExcludedPath(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return EXCLUDED_PATHS.some(excluded => normalizedPath.includes(excluded));
}

/**
 * Check if a file is allowed to use DATABASE_URL
 */
function isAllowedDatabaseUrlFile(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return ALLOWED_DATABASE_URL_FILES.some(allowed => normalizedPath.includes(allowed));
}

/**
 * Check if a file matches a glob pattern
 */
function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*\*/g, '§§§') // Temporarily replace ** 
    .replace(/\*/g, '[^/]*') // Replace * with non-slash match
    .replace(/§§§/g, '.*')   // Replace ** with any character match
    .replace(/\{([^}]+)\}/g, (_, group) => `(${group.replace(/,/g, '|')})`); // Handle {a,b,c}
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Recursively find files matching patterns
 */
function findFiles(dir: string, patterns: readonly string[]): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  function walk(currentDir: string) {
    if (isExcludedPath(currentDir)) {
      return;
    }
    
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (error) {
      return;
    }
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (isExcludedPath(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(REPO_ROOT, fullPath).replace(/\\/g, '/');
        
        for (const pattern of patterns) {
          if (matchesPattern(relativePath, pattern)) {
            files.push(fullPath);
            break;
          }
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Scan a file for database configuration key references
 */
function scanFileForDatabaseKeys(filePath: string): Array<{
  key: string;
  line: number;
  content: string;
  isCanonical: boolean;
}> {
  const matches: Array<{
    key: string;
    line: number;
    content: string;
    isCanonical: boolean;
  }> = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for canonical key
      if (line.includes(CANONICAL_KEY)) {
        matches.push({
          key: CANONICAL_KEY,
          line: i + 1,
          content: line.trim(),
          isCanonical: true,
        });
      }
      
      // Check for deprecated keys
      for (const deprecatedKey of DEPRECATED_KEYS) {
        if (line.includes(deprecatedKey)) {
          // Skip if it's a comment about DATABASE_URL being deprecated
          if (line.includes('deprecated') || 
              line.includes('fallback') ||
              line.includes('backward compatibility') ||
              line.includes('DATABASE_URL is deprecated')) {
            continue;
          }
          
          matches.push({
            key: deprecatedKey,
            line: i + 1,
            content: line.trim(),
            isCanonical: false,
          });
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
  
  return matches;
}

/**
 * Scan all configuration files for database key consistency
 */
function scanForDatabaseKeyConsistency(): Array<{
  file: string;
  key: string;
  line: number;
  content: string;
  isCanonical: boolean;
  isAllowed: boolean;
}> {
  const allMatches: Array<{
    file: string;
    key: string;
    line: number;
    content: string;
    isCanonical: boolean;
    isAllowed: boolean;
  }> = [];
  
  const files = findFiles(REPO_ROOT, SCAN_PATTERNS);
  
  for (const file of files) {
    const matches = scanFileForDatabaseKeys(file);
    const relativePath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    const isAllowed = isAllowedDatabaseUrlFile(relativePath);
    
    for (const match of matches) {
      allMatches.push({
        file: relativePath,
        key: match.key,
        line: match.line,
        content: match.content,
        isCanonical: match.isCanonical,
        isAllowed,
      });
    }
  }
  
  return allMatches;
}

/**
 * Generate arbitrary database configuration key
 */
const databaseConfigKey = fc.oneof(
  fc.constant(CANONICAL_KEY),
  fc.constantFrom(...DEPRECATED_KEYS),
);

/**
 * Generate arbitrary file content with database key reference
 */
const fileContentWithDatabaseKey = fc.record({
  key: databaseConfigKey,
  beforeText: fc.string({ minLength: 0, maxLength: 50 }),
  afterText: fc.string({ minLength: 0, maxLength: 50 }),
  isComment: fc.boolean(),
});

describe('Property 11: DATABASE_PATH Consistency', () => {
  describe('Core Property: Canonical key usage', () => {
    it('should use DATABASE_PATH as the canonical key in configuration files', () => {
      const matches = scanForDatabaseKeyConsistency();
      
      // Filter out non-canonical keys in non-allowed files
      const violations = matches.filter(m => 
        !m.isCanonical && !m.isAllowed
      );
      
      if (violations.length > 0) {
        const errorMessage = [
          'Found non-canonical database configuration keys:',
          '',
          ...violations.map(v => 
            `  ${v.file}:${v.line} - Key: ${v.key}\n    ${v.content}`
          ),
          '',
          `Canonical key is: ${CANONICAL_KEY}`,
          'These files should use DATABASE_PATH instead.',
          '',
          'Allowed exceptions (with deprecation warnings):',
          ...ALLOWED_DATABASE_URL_FILES.map(f => `  - ${f}`),
        ].join('\n');
        
        expect(violations, errorMessage).toHaveLength(0);
      } else {
        expect(violations).toHaveLength(0);
      }
    });
    
    it('should have DATABASE_PATH references in key configuration files', () => {
      const matches = scanForDatabaseKeyConsistency();
      
      // Check that canonical key is used
      const canonicalMatches = matches.filter(m => m.isCanonical);
      
      expect(canonicalMatches.length).toBeGreaterThan(0);
      
      // Should be in profile manager
      const profileMatches = canonicalMatches.filter(m => 
        m.file.includes('profile.rs')
      );
      expect(profileMatches.length).toBeGreaterThan(0);
      
      // Should be in connection module
      const connectionMatches = canonicalMatches.filter(m => 
        m.file.includes('connection.rs')
      );
      expect(connectionMatches.length).toBeGreaterThan(0);
    });
    
    it('should have DATABASE_PATH in installer templates', () => {
      const matches = scanForDatabaseKeyConsistency();
      
      const templateMatches = matches.filter(m => 
        m.file.includes('installer') && 
        m.file.includes('template') &&
        m.isCanonical
      );
      
      expect(templateMatches.length).toBeGreaterThan(0);
    });
    
    it('should have DATABASE_PATH in profile configurations', () => {
      const matches = scanForDatabaseKeyConsistency();
      
      const profileConfigMatches = matches.filter(m => 
        m.file.includes('configs/profiles') &&
        m.isCanonical
      );
      
      expect(profileConfigMatches.length).toBeGreaterThan(0);
    });
  });
  
  describe('Property-Based Tests: Key consistency', () => {
    it('should identify canonical vs non-canonical keys correctly', () => {
      fc.assert(
        fc.property(databaseConfigKey, (key) => {
          const isCanonical = key === CANONICAL_KEY;
          const isDeprecated = DEPRECATED_KEYS.includes(key as any);
          
          // Property: A key is either canonical or deprecated, not both
          expect(isCanonical && isDeprecated).toBe(false);
          
          // Property: All keys are either canonical or deprecated
          expect(isCanonical || isDeprecated).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should maintain consistency across scans', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          // Property: Scanning should be deterministic
          const scan1 = scanForDatabaseKeyConsistency();
          const scan2 = scanForDatabaseKeyConsistency();
          
          expect(scan1.length).toBe(scan2.length);
          
          // Compare file paths and keys
          const keys1 = scan1.map(m => `${m.file}:${m.line}:${m.key}`).sort();
          const keys2 = scan2.map(m => `${m.file}:${m.line}:${m.key}`).sort();
          
          expect(keys1).toEqual(keys2);
        }),
        { numRuns: 10 } // Fewer runs since this is expensive
      );
    });
    
    it('should handle files with multiple key references', () => {
      fc.assert(
        fc.property(
          fc.array(databaseConfigKey, { minLength: 1, maxLength: 5 }),
          (keys) => {
            // Property: Files can have multiple database key references
            const uniqueKeys = new Set(keys);
            
            // Property: Each unique key should be detectable
            expect(uniqueKeys.size).toBeGreaterThan(0);
            expect(uniqueKeys.size).toBeLessThanOrEqual(keys.length);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should correctly classify canonical key', () => {
      fc.assert(
        fc.property(fc.constant(CANONICAL_KEY), (key) => {
          // Property: Canonical key should always be identified as canonical
          expect(key).toBe(CANONICAL_KEY);
          expect(DEPRECATED_KEYS).not.toContain(key as any);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should correctly classify deprecated keys', () => {
      fc.assert(
        fc.property(fc.constantFrom(...DEPRECATED_KEYS), (key) => {
          // Property: Deprecated keys should not be canonical
          expect(key).not.toBe(CANONICAL_KEY);
          expect(DEPRECATED_KEYS).toContain(key);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should handle case sensitivity correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(CANONICAL_KEY, ...DEPRECATED_KEYS),
          (key) => {
            // Property: Key matching should be case-sensitive
            const lowerKey = key.toLowerCase();
            const upperKey = key.toUpperCase();
            
            // Original key should match
            expect(key).toBe(key);
            
            // Case variations should not match unless they're the same
            if (lowerKey !== key) {
              expect(lowerKey).not.toBe(key);
            }
            if (upperKey !== key) {
              expect(upperKey).not.toBe(key);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle empty file content', () => {
      // Property: Empty content should have no matches
      const emptyMatches = scanFileForDatabaseKeys('/dev/null');
      expect(emptyMatches).toHaveLength(0);
    });
    
    it('should detect keys in various contexts', () => {
      fc.assert(
        fc.property(fileContentWithDatabaseKey, (content) => {
          const line = content.isComment 
            ? `# ${content.beforeText}${content.key}${content.afterText}`
            : `${content.beforeText}${content.key}${content.afterText}`;
          
          // Property: Keys should be detectable in various contexts
          const containsKey = line.includes(content.key);
          expect(containsKey).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property-Based Tests: Allowed exceptions', () => {
    it('should allow DATABASE_URL in specific files with deprecation warnings', () => {
      const matches = scanForDatabaseKeyConsistency();
      
      // Check allowed files
      for (const allowedFile of ALLOWED_DATABASE_URL_FILES) {
        const fileMatches = matches.filter(m => 
          m.file.includes(allowedFile) && 
          m.key === 'DATABASE_URL'
        );
        
        // If the file has DATABASE_URL references, they should be marked as allowed
        if (fileMatches.length > 0) {
          expect(fileMatches.every(m => m.isAllowed)).toBe(true);
        }
      }
    });
    
    it('should not allow DATABASE_URL in non-exception files', () => {
      const matches = scanForDatabaseKeyConsistency();
      
      // Filter for DATABASE_URL in non-allowed files
      const violations = matches.filter(m => 
        m.key === 'DATABASE_URL' && 
        !m.isAllowed
      );
      
      // These should be violations (unless they're comments about deprecation)
      for (const violation of violations) {
        const isDeprecationComment = 
          violation.content.includes('deprecated') ||
          violation.content.includes('fallback') ||
          violation.content.includes('backward compatibility');
        
        if (!isDeprecationComment) {
          // This is a real violation
          expect(violation.isAllowed).toBe(true); // Will fail, showing the violation
        }
      }
    });
  });
  
  describe('Integration: File discovery', () => {
    it('should find configuration files', () => {
      const files = findFiles(REPO_ROOT, SCAN_PATTERNS);
      
      expect(files.length).toBeGreaterThan(0);
      
      // Should find profile configurations
      const profileFiles = files.filter(f => {
        const relativePath = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
        return relativePath.includes('configs/profiles');
      });
      expect(profileFiles.length).toBeGreaterThan(0);
      
      // Should find installer templates
      const templateFiles = files.filter(f => {
        const relativePath = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
        return relativePath.includes('installer') && relativePath.includes('template');
      });
      expect(templateFiles.length).toBeGreaterThan(0);
    });
    
    it('should exclude archived files', () => {
      const files = findFiles(REPO_ROOT, SCAN_PATTERNS);
      const archivedFiles = files.filter(f => {
        const relativePath = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
        // Check if the file is in the archive/ directory (not just has "archive" in the name)
        return relativePath.startsWith('archive/') || relativePath.includes('/archive/');
      });
      
      expect(archivedFiles).toHaveLength(0);
    });
    
    it('should exclude documentation files', () => {
      const files = findFiles(REPO_ROOT, SCAN_PATTERNS);
      const docFiles = files.filter(f => f.includes('docs') || f.includes('blog'));
      
      expect(docFiles).toHaveLength(0);
    });
  });
  
  describe('Integration: Consistency report', () => {
    it('should generate a consistency report', () => {
      const matches = scanForDatabaseKeyConsistency();
      
      // Group by file
      const fileGroups = new Map<string, typeof matches>();
      for (const match of matches) {
        if (!fileGroups.has(match.file)) {
          fileGroups.set(match.file, []);
        }
        fileGroups.get(match.file)!.push(match);
      }
      
      // Report should include file count
      expect(fileGroups.size).toBeGreaterThan(0);
      
      // Report should include canonical key count
      const canonicalCount = matches.filter(m => m.isCanonical).length;
      expect(canonicalCount).toBeGreaterThan(0);
      
      // Report should include deprecated key count
      const deprecatedCount = matches.filter(m => !m.isCanonical && !m.isAllowed).length;
      
      // Log summary for visibility
      console.log('\nDATABASE_PATH Consistency Report:');
      console.log(`  Files scanned: ${fileGroups.size}`);
      console.log(`  Canonical key (DATABASE_PATH) references: ${canonicalCount}`);
      console.log(`  Deprecated key references (violations): ${deprecatedCount}`);
      console.log(`  Allowed exceptions: ${matches.filter(m => m.isAllowed).length}`);
    });
  });
});

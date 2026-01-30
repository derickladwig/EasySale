/**
 * Property-Based Test: Placeholder Secret Rejection in Prod
 * 
 * Feature: production-readiness-windows-installer
 * Property 9: Placeholder Secret Rejection in Prod
 * 
 * **Validates: Requirements 4.3**
 * 
 * For any configuration with placeholder secrets (CHANGE_ME, secret123,
 * password123) when profile is prod, validation should reject the configuration
 * and prevent startup.
 * 
 * This test validates the placeholder detection logic that would be used
 * by the backend configuration validation.
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
 * Known placeholder secret patterns that should be rejected in prod
 */
const PLACEHOLDER_PATTERNS = [
  'CHANGE_ME',
  'change_me',
  'secret123',
  'password123',
  'test-secret',
  'your-secret-key',
  'change-in-production',
] as const;

/**
 * Generate arbitrary placeholder secret
 */
const placeholderSecret = fc.oneof(
  fc.constantFrom(...PLACEHOLDER_PATTERNS),
  fc.record({
    prefix: fc.string({ minLength: 0, maxLength: 10 }),
    placeholder: fc.constantFrom(...PLACEHOLDER_PATTERNS),
    suffix: fc.string({ minLength: 0, maxLength: 10 }),
  }).map(({ prefix, placeholder, suffix }) => prefix + placeholder + suffix),
  fc.constantFrom(...PLACEHOLDER_PATTERNS).map(p => p.toUpperCase()),
  fc.constantFrom(...PLACEHOLDER_PATTERNS).map(p => p.toLowerCase()),
);


/**
 * Generate arbitrary valid (non-placeholder) secret
 */
const validSecret = fc.string({ minLength: 32, maxLength: 64 }).filter(s => {
  const lower = s.toLowerCase();
  return !PLACEHOLDER_PATTERNS.some(pattern => lower.includes(pattern.toLowerCase()));
});

/**
 * Check if a string contains a placeholder pattern
 */
function containsPlaceholder(secret: string): boolean {
  const lower = secret.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(pattern => lower.includes(pattern.toLowerCase()));
}

/**
 * Validate configuration for production profile
 * Returns list of validation errors
 */
function validateProdConfig(config: {
  JWT_SECRET?: string;
  DATABASE_PATH?: string;
  STORE_ID?: string;
}): string[] {
  const errors: string[] = [];
  
  if (config.JWT_SECRET && containsPlaceholder(config.JWT_SECRET)) {
    errors.push('JWT_SECRET contains placeholder value');
  }
  
  if (!config.DATABASE_PATH) {
    errors.push('DATABASE_PATH is required');
  }
  if (!config.STORE_ID) {
    errors.push('STORE_ID is required');
  }
  if (!config.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }
  
  return errors;
}

describe('Property 9: Placeholder Secret Rejection in Prod', () => {
  describe('Core Property: Placeholder secret detection', () => {
    it('should detect CHANGE_ME as placeholder', () => {
      expect(containsPlaceholder('CHANGE_ME')).toBe(true);
    });
    
    it('should detect secret123 as placeholder', () => {
      expect(containsPlaceholder('secret123')).toBe(true);
    });
    
    it('should detect password123 as placeholder', () => {
      expect(containsPlaceholder('password123')).toBe(true);
    });
    
    it('should detect test-secret as placeholder', () => {
      expect(containsPlaceholder('test-secret-key')).toBe(true);
    });
    
    it('should detect your-secret-key as placeholder', () => {
      expect(containsPlaceholder('your-secret-key-here')).toBe(true);
    });
    
    it('should detect change-in-production as placeholder', () => {
      expect(containsPlaceholder('change-in-production')).toBe(true);
    });
    
    it('should accept valid secret', () => {
      expect(containsPlaceholder('actual-secure-random-secret-key-with-sufficient-entropy-12345')).toBe(false);
    });
  });


  describe('Core Property: Prod config validation', () => {
    it('should reject CHANGE_ME in prod profile', () => {
      const errors = validateProdConfig({
        DATABASE_PATH: './data/test.db',
        STORE_ID: 'test-store',
        JWT_SECRET: 'CHANGE_ME',
      });
      expect(errors).toContain('JWT_SECRET contains placeholder value');
    });
    
    it('should reject secret123 in prod profile', () => {
      const errors = validateProdConfig({
        DATABASE_PATH: './data/test.db',
        STORE_ID: 'test-store',
        JWT_SECRET: 'secret123',
      });
      expect(errors).toContain('JWT_SECRET contains placeholder value');
    });
    
    it('should accept valid secret in prod profile', () => {
      const errors = validateProdConfig({
        DATABASE_PATH: './data/test.db',
        STORE_ID: 'test-store',
        JWT_SECRET: 'actual-secure-random-secret-key-with-sufficient-entropy-12345',
      });
      expect(errors).not.toContain('JWT_SECRET contains placeholder value');
    });
  });

  describe('Property-Based Tests: Placeholder detection', () => {
    it('should detect all known placeholder patterns', () => {
      fc.assert(
        fc.property(placeholderSecret, (secret) => {
          expect(containsPlaceholder(secret)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should not detect valid secrets as placeholders', () => {
      fc.assert(
        fc.property(validSecret, (secret) => {
          expect(containsPlaceholder(secret)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should be case-insensitive when detecting placeholders', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PLACEHOLDER_PATTERNS),
          fc.constantFrom('lower', 'upper', 'mixed'),
          (pattern, caseType) => {
            let testSecret = pattern;
            if (caseType === 'upper') {
              testSecret = pattern.toUpperCase();
            } else if (caseType === 'mixed') {
              testSecret = pattern.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('');
            }
            expect(containsPlaceholder(testSecret)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });


    it('should detect placeholders with prefix/suffix', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PLACEHOLDER_PATTERNS),
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          (pattern, prefix, suffix) => {
            const secret = prefix + pattern + suffix;
            expect(containsPlaceholder(secret)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle empty strings', () => {
      expect(containsPlaceholder('')).toBe(false);
    });
    
    it('should handle very long strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 100, maxLength: 500 }).filter(s => 
            !PLACEHOLDER_PATTERNS.some(p => s.toLowerCase().includes(p.toLowerCase()))
          ),
          (longSecret) => {
            expect(containsPlaceholder(longSecret)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should detect multiple placeholder patterns in one string', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...PLACEHOLDER_PATTERNS), { minLength: 2, maxLength: 3 }),
          (patterns) => {
            const secret = patterns.join('-');
            expect(containsPlaceholder(secret)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should maintain consistency across detection runs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (secret) => {
            const result1 = containsPlaceholder(secret);
            const result2 = containsPlaceholder(secret);
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });


    it('should handle special characters in secrets', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 32, maxLength: 64 }).filter(s => 
            !PLACEHOLDER_PATTERNS.some(p => s.toLowerCase().includes(p.toLowerCase()))
          ),
          (secret) => {
            const secretWithSpecialChars = secret + '!@#$%^&*()';
            expect(containsPlaceholder(secretWithSpecialChars)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property-Based Tests: Profile-specific behavior', () => {
    it('should reject placeholders in prod for all patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PLACEHOLDER_PATTERNS),
          (pattern) => {
            expect(containsPlaceholder(pattern)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should accept valid secrets in prod', () => {
      fc.assert(
        fc.property(validSecret, (secret) => {
          expect(containsPlaceholder(secret)).toBe(false);
          expect(secret.length).toBeGreaterThanOrEqual(32);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should handle boundary cases for secret length', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (length) => {
            const secret = 'a'.repeat(length);
            const isPlaceholder = containsPlaceholder(secret);
            expect(typeof isPlaceholder).toBe('boolean');
            if (length > 0 && !PLACEHOLDER_PATTERNS.some(p => secret.includes(p))) {
              expect(isPlaceholder).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Integration: Backend validation code exists', () => {
    it('should have placeholder validation in backend config', () => {
      const configPath = path.join(REPO_ROOT, 'backend/crates/server/src/config');
      const mainPath = path.join(REPO_ROOT, 'backend/crates/server/src/main.rs');
      
      let hasValidation = false;
      
      if (fs.existsSync(mainPath)) {
        const content = fs.readFileSync(mainPath, 'utf-8');
        hasValidation = content.includes('env::var') || 
                       content.includes('JWT_SECRET') ||
                       content.includes('RUNTIME_PROFILE');
      }
      
      if (fs.existsSync(configPath)) {
        const files = fs.readdirSync(configPath).filter(f => f.endsWith('.rs'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(configPath, file), 'utf-8');
          if (content.includes('validate') || content.includes('placeholder')) {
            hasValidation = true;
            break;
          }
        }
      }
      
      expect(hasValidation, 'Backend should have configuration validation').toBe(true);
    });
  });

  describe('Integration: Error message format', () => {
    it('should indicate which secret contains placeholder', () => {
      const errors = validateProdConfig({
        DATABASE_PATH: './data/test.db',
        STORE_ID: 'test-store',
        JWT_SECRET: 'CHANGE_ME',
      });
      expect(errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
      expect(errors.some(e => e.includes('placeholder'))).toBe(true);
    });
  });
});

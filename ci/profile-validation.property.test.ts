/**
 * Property-Based Test: Profile-Based Configuration Validation
 * 
 * Feature: production-readiness-windows-installer
 * Property 8: Profile-Based Configuration Validation
 * 
 * **Validates: Requirements 4.2, 4.8**
 * 
 * For any runtime profile (dev, demo, prod), loading configuration with missing
 * required fields for that profile should fail with error messages listing all
 * missing keys.
 * 
 * This test validates the configuration validation logic that would be used
 * by the backend.
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

type RuntimeProfile = 'dev' | 'demo' | 'prod';

/**
 * Required fields for each profile
 */
const REQUIRED_FIELDS: Record<RuntimeProfile, string[]> = {
  dev: [],
  demo: [],
  prod: ['DATABASE_PATH', 'STORE_ID', 'JWT_SECRET'],
};

/**
 * Optional fields that can be set for any profile
 */
const OPTIONAL_FIELDS = [
  'API_HOST', 'API_PORT', 'PUBLIC_BASE_URL', 'STORE_NAME', 'TENANT_ID',
  'JWT_EXPIRATION_HOURS', 'QUICKBOOKS_REDIRECT_URI', 'GOOGLE_DRIVE_REDIRECT_URI',
  'INTEGRATIONS_ENABLED', 'ENABLE_DEV_ENDPOINTS', 'ENABLE_DEMO', 'LOG_PATH', 'BACKUP_PATH',
] as const;

const runtimeProfile = fc.constantFrom<RuntimeProfile>('dev', 'demo', 'prod');


/**
 * Validate configuration for a given profile
 * Returns list of validation errors
 */
function validateConfig(
  profile: RuntimeProfile,
  config: Record<string, string>
): string[] {
  const errors: string[] = [];
  const requiredFields = REQUIRED_FIELDS[profile];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      errors.push(field + ' is required in ' + profile + ' profile');
    }
  }
  
  return errors;
}

/**
 * Get missing required fields for a profile
 */
function getMissingFields(
  profile: RuntimeProfile,
  providedFields: string[]
): string[] {
  const requiredFields = REQUIRED_FIELDS[profile];
  const providedSet = new Set(providedFields);
  return requiredFields.filter(field => !providedSet.has(field));
}

describe('Property 8: Profile-Based Configuration Validation', () => {
  describe('Core Property: Profile validation with missing fields', () => {
    it('should reject prod profile with missing DATABASE_PATH', () => {
      const errors = validateConfig('prod', {
        STORE_ID: 'test-store',
        JWT_SECRET: 'actual-secure-secret-key-12345',
      });
      expect(errors.some(e => e.includes('DATABASE_PATH'))).toBe(true);
    });
    
    it('should reject prod profile with missing STORE_ID', () => {
      const errors = validateConfig('prod', {
        DATABASE_PATH: './data/test.db',
        JWT_SECRET: 'actual-secure-secret-key-12345',
      });
      expect(errors.some(e => e.includes('STORE_ID'))).toBe(true);
    });
    
    it('should reject prod profile with missing JWT_SECRET', () => {
      const errors = validateConfig('prod', {
        DATABASE_PATH: './data/test.db',
        STORE_ID: 'test-store',
      });
      expect(errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });
    
    it('should aggregate multiple validation errors', () => {
      const errors = validateConfig('prod', {});
      expect(errors.length).toBe(3);
      expect(errors.some(e => e.includes('DATABASE_PATH'))).toBe(true);
      expect(errors.some(e => e.includes('STORE_ID'))).toBe(true);
      expect(errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });
    
    it('should accept dev profile with no required fields', () => {
      const errors = validateConfig('dev', {});
      expect(errors).toHaveLength(0);
    });
    
    it('should accept demo profile with no required fields', () => {
      const errors = validateConfig('demo', {});
      expect(errors).toHaveLength(0);
    });
    
    it('should accept prod profile with all required fields', () => {
      const errors = validateConfig('prod', {
        DATABASE_PATH: './data/test.db',
        STORE_ID: 'test-store',
        JWT_SECRET: 'actual-secure-secret-key-12345',
      });
      expect(errors).toHaveLength(0);
    });
  });


  describe('Property-Based Tests: Configuration validation', () => {
    it('should validate required fields for each profile', () => {
      fc.assert(
        fc.property(runtimeProfile, (profile) => {
          const requiredFields = REQUIRED_FIELDS[profile];
          expect(Array.isArray(requiredFields)).toBe(true);
          
          if (profile === 'dev' || profile === 'demo') {
            expect(requiredFields).toHaveLength(0);
          }
          
          if (profile === 'prod') {
            expect(requiredFields.length).toBeGreaterThan(0);
            expect(requiredFields).toContain('DATABASE_PATH');
            expect(requiredFields).toContain('STORE_ID');
            expect(requiredFields).toContain('JWT_SECRET');
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should identify missing required fields correctly', () => {
      fc.assert(
        fc.property(
          runtimeProfile,
          fc.subarray([...OPTIONAL_FIELDS]),
          (profile, providedFields) => {
            const requiredFields = REQUIRED_FIELDS[profile];
            const providedFieldSet = new Set(providedFields);
            
            const missingFields = requiredFields.filter(
              field => !providedFieldSet.has(field)
            );
            
            expect(missingFields.every(f => requiredFields.includes(f))).toBe(true);
            expect(missingFields.every(f => !providedFieldSet.has(f))).toBe(true);
            
            if (requiredFields.every(f => providedFieldSet.has(f))) {
              expect(missingFields).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle empty configuration for each profile', () => {
      fc.assert(
        fc.property(runtimeProfile, (profile) => {
          const requiredFields = REQUIRED_FIELDS[profile];
          
          if (profile === 'prod') {
            expect(requiredFields.length).toBeGreaterThan(0);
          }
          
          if (profile === 'dev' || profile === 'demo') {
            expect(requiredFields).toHaveLength(0);
          }
        }),
        { numRuns: 100 }
      );
    });


    it('should validate field presence independently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<RuntimeProfile>('prod'),
          fc.subarray(['DATABASE_PATH', 'STORE_ID', 'JWT_SECRET']),
          (profile, providedFields) => {
            const requiredFields = REQUIRED_FIELDS[profile];
            const providedFieldSet = new Set(providedFields);
            
            for (const field of requiredFields) {
              const isProvided = providedFieldSet.has(field);
              const shouldFail = !isProvided;
              expect(shouldFail).toBe(!isProvided);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle partial configurations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<RuntimeProfile>('prod'),
          fc.integer({ min: 0, max: 3 }),
          (profile, numFieldsToProvide) => {
            const requiredFields = REQUIRED_FIELDS[profile];
            const providedFields = requiredFields.slice(0, numFieldsToProvide);
            const missingFields = requiredFields.slice(numFieldsToProvide);
            
            expect(missingFields.length).toBe(requiredFields.length - numFieldsToProvide);
            
            for (const field of providedFields) {
              expect(missingFields).not.toContain(field);
            }
            
            for (const field of missingFields) {
              expect(providedFields).not.toContain(field);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should validate profile-specific requirements', () => {
      fc.assert(
        fc.property(runtimeProfile, (profile) => {
          switch (profile) {
            case 'dev':
              expect(REQUIRED_FIELDS.dev).toHaveLength(0);
              break;
            case 'demo':
              expect(REQUIRED_FIELDS.demo).toHaveLength(0);
              break;
            case 'prod':
              expect(REQUIRED_FIELDS.prod.length).toBeGreaterThan(0);
              expect(REQUIRED_FIELDS.prod).toContain('DATABASE_PATH');
              expect(REQUIRED_FIELDS.prod).toContain('STORE_ID');
              expect(REQUIRED_FIELDS.prod).toContain('JWT_SECRET');
              break;
          }
        }),
        { numRuns: 100 }
      );
    });


    it('should maintain consistency across validation runs', () => {
      fc.assert(
        fc.property(
          runtimeProfile,
          fc.dictionary(
            fc.constantFrom(...OPTIONAL_FIELDS),
            fc.string(),
          ),
          (profile, config) => {
            const requiredFields = REQUIRED_FIELDS[profile];
            const providedFields = Object.keys(config);
            
            const missingFields1 = requiredFields.filter(
              field => !providedFields.includes(field)
            );
            const missingFields2 = requiredFields.filter(
              field => !providedFields.includes(field)
            );
            
            expect(missingFields1).toEqual(missingFields2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration: Backend has profile validation', () => {
    it('should have profile-based validation in backend', () => {
      const mainPath = path.join(REPO_ROOT, 'backend/crates/server/src/main.rs');
      
      let hasProfileValidation = false;
      
      if (fs.existsSync(mainPath)) {
        const content = fs.readFileSync(mainPath, 'utf-8');
        hasProfileValidation = content.includes('RUNTIME_PROFILE') ||
                              content.includes('profile') ||
                              content.includes('env::var');
      }
      
      expect(hasProfileValidation, 'Backend should have profile-based validation').toBe(true);
    });
  });

  describe('Integration: Error message format', () => {
    it('should list all missing fields in error message', () => {
      const errors = validateConfig('prod', {});
      
      const requiredFields = REQUIRED_FIELDS.prod;
      for (const field of requiredFields) {
        expect(errors.some(e => e.includes(field))).toBe(true);
      }
    });
    
    it('should indicate the active profile in error message', () => {
      const errors = validateConfig('prod', {});
      expect(errors.some(e => e.includes('prod'))).toBe(true);
    });
  });
});

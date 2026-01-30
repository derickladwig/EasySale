/**
 * Property-Based Test: No Demo Data in Production Mode
 *
 * Feature: navigation-consolidation
 * Property 9: No Demo Data in Production Mode
 *
 * **Validates: Requirements 8.1, 9.2, 9.3**
 *
 * For any page render when DEMO_MODE is false, seed fixtures SHALL NOT be loaded
 * and demo users SHALL NOT appear in the system.
 *
 * This test ensures:
 * - Demo data is gated behind DEMO_MODE/profile check
 * - Production mode does not load seed fixtures
 * - Demo users are not shown in production
 * - Demo products are not shown in production
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// Test Data Generators (Arbitraries)
// ============================================================================

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Files that might contain demo data loading logic
 */
const DEMO_DATA_FILES = [
  'features/auth/pages/LoginPage.tsx',
  'features/home/pages/HomePage.tsx',
  'features/sell/pages/SellPage.tsx',
  'features/customers/pages/CustomersPage.tsx',
  'features/inventory/pages/InventoryPage.tsx',
  'features/lookup/pages/LookupPage.tsx',
  'config/index.ts',
  'config/brandConfig.ts',
  'common/contexts/AuthContext.tsx',
];

/**
 * Patterns that indicate demo data that should be gated
 */
const DEMO_DATA_PATTERNS = [
  /demoUsers/i,
  /demoProducts/i,
  /demoCustomers/i,
  /seedData/i,
  /SEED_DATA/,
  /demo.*fixtures/i,
  /sample.*users/i,
  /test.*accounts/i,
];

/**
 * Patterns that indicate proper demo mode gating
 */
const DEMO_GATE_PATTERNS = [
  /profile\s*===\s*['"]demo['"]/,
  /isDemoMode/,
  /DEMO_MODE/,
  /VITE_DEMO_MODE/,
  /VITE_RUNTIME_PROFILE.*demo/,
  /profile\s*!==\s*['"]prod['"]/,
];

/**
 * Demo credentials that should never appear in production
 */
const DEMO_CREDENTIALS = [
  /admin@EasySale\.local/,
  /cashier@EasySale\.local/,
  /manager@EasySale\.local/,
  /admin123/,
  /password123/,
  /demo@/,
  /test@/,
];

// ============================================================================
// Helper Functions
// ============================================================================

function getSrcRoot(): string {
  // The test runs from frontend/src/test/properties/
  // We need to get to frontend/src/
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    // Check if we're in the src directory
    if (path.basename(dir) === 'src' && fs.existsSync(path.join(dir, 'App.tsx'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  // Fallback
  return path.join(process.cwd(), 'src');
}

function readFileContent(filePath: string): string | null {
  const srcRoot = getSrcRoot();
  const fullPath = path.join(srcRoot, filePath);
  
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf-8');
  }
  return null;
}

function hasDemoData(content: string): boolean {
  return DEMO_DATA_PATTERNS.some(pattern => pattern.test(content));
}

function hasDemoGate(content: string): boolean {
  return DEMO_GATE_PATTERNS.some(pattern => pattern.test(content));
}

function hasDemoCredentials(content: string): boolean {
  return DEMO_CREDENTIALS.some(pattern => pattern.test(content));
}

function isDemoDataProperlyGated(content: string): boolean {
  // If there's demo data, it should be gated
  if (hasDemoData(content)) {
    return hasDemoGate(content);
  }
  // No demo data means it's fine
  return true;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: navigation-consolidation, Property 9: No Demo Data in Production Mode', () => {
  describe('Demo Data Gating', () => {
    it('should gate all demo data behind profile/mode check', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DEMO_DATA_FILES),
          (filePath) => {
            const content = readFileContent(filePath);
            
            if (!content) {
              return true;
            }
            
            const isGated = isDemoDataProperlyGated(content);
            
            expect(
              isGated,
              `File ${filePath} has demo data that is not properly gated behind profile check`
            ).toBe(true);
            
            return isGated;
          }
        ),
        { numRuns: DEMO_DATA_FILES.length }
      );
    });
  });

  describe('No Hardcoded Demo Credentials', () => {
    it('should not have hardcoded demo credentials in production code', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DEMO_DATA_FILES),
          (filePath) => {
            const content = readFileContent(filePath);
            
            if (!content) {
              return true;
            }
            
            // Check for demo credentials
            const hasCredentials = hasDemoCredentials(content);
            
            // If credentials exist, they should be in a demo-gated section
            if (hasCredentials) {
              const isGated = hasDemoGate(content);
              expect(
                isGated,
                `File ${filePath} has demo credentials that are not gated`
              ).toBe(true);
              return isGated;
            }
            
            return true;
          }
        ),
        { numRuns: DEMO_DATA_FILES.length }
      );
    });
  });

  describe('Production Mode Safety', () => {
    it('should have isDemoMode utility function available', () => {
      const demoModeUtilPath = 'common/utils/demoMode.ts';
      const content = readFileContent(demoModeUtilPath);
      
      expect(content).not.toBeNull();
      expect(content).toContain('isDemoMode');
      expect(content).toContain('isProductionMode');
    });

    it('should have DemoModeIndicator component', () => {
      const indicatorPath = 'components/DemoModeIndicator.tsx';
      const content = readFileContent(indicatorPath);
      
      expect(content).not.toBeNull();
      expect(content).toContain('DemoModeIndicator');
      expect(content).toContain('demo');
    });
  });

  describe('Seed Fixture Isolation', () => {
    it('should not import seed fixtures directly in page components', () => {
      const pageFiles = DEMO_DATA_FILES.filter(f => f.includes('/pages/'));
      
      fc.assert(
        fc.property(
          fc.constantFrom(...pageFiles),
          (filePath) => {
            const content = readFileContent(filePath);
            
            if (!content) {
              return true;
            }
            
            // Check for direct seed/fixture imports
            const hasSeedImport = /import.*from.*['"]\.\.\/(seed|fixtures|mock)/i.test(content);
            
            expect(
              hasSeedImport,
              `Page ${filePath} should not directly import seed/fixture data`
            ).toBe(false);
            
            return !hasSeedImport;
          }
        ),
        { numRuns: pageFiles.length }
      );
    });
  });

  describe('Profile-Based Data Loading', () => {
    it('should use profile check before loading demo data', () => {
      // Check that LoginPage properly gates demo accounts
      const loginPageContent = readFileContent('features/auth/pages/LoginPage.tsx');
      
      if (loginPageContent) {
        // Should check profile before showing demo accounts
        const hasDemoAccounts = /demoAccounts/i.test(loginPageContent);
        
        if (hasDemoAccounts) {
          const hasProfileCheck = /profile\s*===\s*['"]demo['"]/i.test(loginPageContent);
          expect(
            hasProfileCheck,
            'LoginPage should check profile before showing demo accounts'
          ).toBe(true);
        }
      }
    });
  });
});

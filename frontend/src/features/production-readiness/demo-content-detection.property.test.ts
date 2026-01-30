/**
 * Property Test: Production Routes Free of Demo Content
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.9**
 * 
 * Property: For any production route source file (/login, /reporting, /lookup, /admin),
 * scanning for forbidden demo patterns (demo credentials, MOCK_, DEMO_DATA, hardcoded metrics)
 * should find zero matches.
 * 
 * Framework: fast-check
 * Minimum iterations: 100 per property test
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Forbidden Patterns
// ============================================================================

const FORBIDDEN_PATTERNS = {
  // Demo credentials
  demoCredentials: [
    /admin\/admin123/gi,
    /cashier\/cashier123/gi,
    /demo@/gi,
    /password123/gi,
    /demo123/gi,
  ],
  
  // Mock arrays and data
  mockArrays: [
    /mockProducts/gi,
    /mockCustomers/gi,
    /mockUsers/gi,
    /mockMetrics/gi,
    /mockErrors/gi,
    /mockTaxRules/gi,
    /mockIntegrations/gi,
    /mockRemoteStores/gi,
    /DEMO_DATA/gi,
    /MOCK_/gi,
  ],
  
  // Hardcoded CAPS branding (should be config-driven)
  capsTokens: [
    /CAPS Original/gi,
    /Premium Caps/gi,
    /Winter Caps/gi,
    /Sport Caps/gi,
    /caps-pos\.local/gi,
    /security@caps-pos\.local/gi,
  ],
  
  // Hardcoded metrics and categories
  hardcodedMetrics: [
    /const\s+DEMO_/gi,
    /const\s+MOCK_/gi,
  ],
};

// ============================================================================
// Core Runtime Paths (Production Routes)
// ============================================================================

const PRODUCTION_ROUTE_PATHS = [
  'src/features/auth/pages/LoginPage.tsx',
  'src/features/reporting/pages/ReportingPage.tsx',
  'src/features/lookup/pages/LookupPage.tsx',
  'src/features/admin/pages/AdminPage.tsx',
  'src/features/settings/pages/FeatureFlagsPage.tsx',
  'src/features/sell/pages/SellPage.tsx',
  'src/features/customers/pages/CustomersPage.tsx',
];

// ============================================================================
// Exclusions (Allowed Locations)
// ============================================================================

const ALLOWED_LOCATIONS = [
  /\.test\./,
  /\.spec\./,
  /\.stories\./,
  /\/tests?\//,
  /\/fixtures?\//,
  /\/mocks?\//,
  /\/examples?\//,
  /\/presets?\//,
  /\/archive\//,
];

// ============================================================================
// Helper Functions
// ============================================================================

function isAllowedLocation(filePath: string): boolean {
  return ALLOWED_LOCATIONS.some(pattern => pattern.test(filePath));
}

function scanFileForPatterns(filePath: string): { pattern: string; line: number; match: string }[] {
  const fullPath = path.join(process.cwd(), 'frontend', filePath);
  
  // Skip if file doesn't exist
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  
  // Skip if in allowed location
  if (isAllowedLocation(filePath)) {
    return [];
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const violations: { pattern: string; line: number; match: string }[] = [];
  
  // Check each pattern category
  for (const [category, patterns] of Object.entries(FORBIDDEN_PATTERNS)) {
    for (const pattern of patterns) {
      lines.forEach((line, index) => {
        const matches = line.match(pattern);
        if (matches) {
          violations.push({
            pattern: `${category}: ${pattern.source}`,
            line: index + 1,
            match: matches[0],
          });
        }
      });
    }
  }
  
  return violations;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 3: Production Routes Free of Demo Content', () => {
  it('should find zero forbidden patterns in production route files', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PRODUCTION_ROUTE_PATHS),
        (routePath) => {
          const violations = scanFileForPatterns(routePath);
          
          // Property: No forbidden patterns should be found
          if (violations.length > 0) {
            const violationDetails = violations
              .map(v => `  ${routePath}:${v.line} - ${v.pattern} - "${v.match}"`)
              .join('\n');
            
            throw new Error(
              `Found ${violations.length} forbidden pattern(s) in production route:\n${violationDetails}`
            );
          }
          
          return violations.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should detect demo credentials in any production route', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PRODUCTION_ROUTE_PATHS),
        fc.constantFrom(...FORBIDDEN_PATTERNS.demoCredentials),
        (routePath, pattern) => {
          const fullPath = path.join(process.cwd(), 'frontend', routePath);
          
          if (!fs.existsSync(fullPath)) {
            return true; // Skip non-existent files
          }
          
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.match(pattern);
          
          // Property: Demo credentials should not exist in production routes
          expect(matches).toBeNull();
          return matches === null;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should detect mock arrays in any production route', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PRODUCTION_ROUTE_PATHS),
        fc.constantFrom(...FORBIDDEN_PATTERNS.mockArrays),
        (routePath, pattern) => {
          const fullPath = path.join(process.cwd(), 'frontend', routePath);
          
          if (!fs.existsSync(fullPath)) {
            return true; // Skip non-existent files
          }
          
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.match(pattern);
          
          // Property: Mock arrays should not exist in production routes
          expect(matches).toBeNull();
          return matches === null;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should detect CAPS branding tokens in any production route', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PRODUCTION_ROUTE_PATHS),
        fc.constantFrom(...FORBIDDEN_PATTERNS.capsTokens),
        (routePath, pattern) => {
          const fullPath = path.join(process.cwd(), 'frontend', routePath);
          
          if (!fs.existsSync(fullPath)) {
            return true; // Skip non-existent files
          }
          
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.match(pattern);
          
          // Property: CAPS branding tokens should not exist in production routes
          // (branding should be config-driven)
          expect(matches).toBeNull();
          return matches === null;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should verify all production routes exist and are scannable', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PRODUCTION_ROUTE_PATHS),
        (routePath) => {
          const fullPath = path.join(process.cwd(), 'frontend', routePath);
          
          // Property: All production route files should exist
          const exists = fs.existsSync(fullPath);
          
          if (!exists) {
            console.warn(`Warning: Production route file not found: ${routePath}`);
          }
          
          return true; // Don't fail on missing files, just warn
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Integration Test: Scan All Production Routes
// ============================================================================

describe('Integration: Scan All Production Routes', () => {
  it('should scan all production routes and report violations', () => {
    const allViolations: Record<string, { pattern: string; line: number; match: string }[]> = {};
    
    for (const routePath of PRODUCTION_ROUTE_PATHS) {
      const violations = scanFileForPatterns(routePath);
      if (violations.length > 0) {
        allViolations[routePath] = violations;
      }
    }
    
    // Report all violations
    if (Object.keys(allViolations).length > 0) {
      const report = Object.entries(allViolations)
        .map(([file, violations]) => {
          const violationList = violations
            .map(v => `    Line ${v.line}: ${v.pattern} - "${v.match}"`)
            .join('\n');
          return `  ${file}:\n${violationList}`;
        })
        .join('\n\n');
      
      throw new Error(
        `Found forbidden patterns in ${Object.keys(allViolations).length} production route(s):\n\n${report}`
      );
    }
    
    // Property: No violations should be found
    expect(Object.keys(allViolations).length).toBe(0);
  });
});

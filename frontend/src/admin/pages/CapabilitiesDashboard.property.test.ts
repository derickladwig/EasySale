/**
 * Property-based tests for Capabilities Dashboard
 * 
 * Uses fast-check to generate random test data and verify properties
 * that should hold for all valid inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { categorizeCapability, calculateReachabilityScore, type Capability } from './CapabilitiesDashboardPage';

const backendStatusArb = fc.constantFrom('implemented', 'stubbed', 'not_implemented');
const uiStatusArb = fc.constantFrom('wired', 'exists_not_routed', 'missing');

const capabilityArb = fc.record({
  id: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1 }),
  description: fc.string(),
  backendStatus: backendStatusArb,
  uiStatus: uiStatusArb,
  endpoint: fc.option(fc.string(), { nil: undefined }),
  route: fc.option(fc.string(), { nil: undefined }),
  missingTasks: fc.option(fc.array(fc.string()), { nil: undefined }),
}) as fc.Arbitrary<Capability>;

describe('Capabilities Dashboard Properties', () => {
  /**
   * Property 20: Capability Categorization Logic
   * 
   * For any capability returned from the API, the Capabilities Dashboard SHALL categorize it as:
   * - "Enabled & Used" if backendStatus=implemented AND uiStatus=wired
   * - "Enabled but Unused" if backendStatus=implemented AND uiStatus!=wired
   * - "Stubbed" if backendStatus=stubbed
   * - "Backend Only" if backendStatus=not_implemented
   */
  describe('Property 20: Capability Categorization Logic', () => {
    it('should categorize as "enabledAndUsed" when backend is implemented and UI is wired', () => {
      fc.assert(
        fc.property(
          capabilityArb.map(cap => ({
            ...cap,
            backendStatus: 'implemented' as const,
            uiStatus: 'wired' as const,
          })),
          (capability) => {
            const category = categorizeCapability(capability);
            expect(category).toBe('enabledAndUsed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should categorize as "enabledButUnused" when backend is implemented but UI is not wired', () => {
      fc.assert(
        fc.property(
          capabilityArb,
          (capability) => {
            const modifiedCap = {
              ...capability,
              backendStatus: 'implemented' as const,
              uiStatus: 'exists_not_routed' as const,
            };
            const category = categorizeCapability(modifiedCap);
            expect(category).toBe('enabledButUnused');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 21: Reachability Score Calculation
   * 
   * The reachability score SHALL be calculated as:
   * (number of capabilities with uiStatus=wired / total capabilities) * 100
   */
  describe('Property 21: Reachability Score Calculation', () => {
    it('should return 100 when all capabilities are wired', () => {
      fc.assert(
        fc.property(
          fc.array(capabilityArb, { minLength: 1, maxLength: 20 }),
          (capabilities) => {
            const wiredCapabilities = capabilities.map(cap => ({
              ...cap,
              uiStatus: 'wired' as const,
            }));
            const score = calculateReachabilityScore(wiredCapabilities);
            expect(score).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when no capabilities are wired', () => {
      fc.assert(
        fc.property(
          fc.array(capabilityArb, { minLength: 1, maxLength: 20 }),
          (capabilities) => {
            const unwiredCapabilities = capabilities.map(cap => ({
              ...cap,
              uiStatus: 'missing' as const,
            }));
            const score = calculateReachabilityScore(unwiredCapabilities);
            expect(score).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

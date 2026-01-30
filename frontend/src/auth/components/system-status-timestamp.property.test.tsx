/**
 * Property-Based Tests: System Status Card Timestamp Formatting
 *
 * Feature: themeable-login-system
 * Property 16: Timestamp Formatting
 * Validates: Requirements 6.3
 *
 * Tests that timestamp formatting is consistent and correct across all possible inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatTimestamp } from './SystemStatusCard';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

// Generate dates from the past (up to 1 year ago)
const pastDateArb = fc.date({ max: new Date() });

// Generate recent dates (within last hour)
const recentDateArb = fc
  .integer({ min: 0, max: 3600 })
  .map((seconds) => new Date(Date.now() - seconds * 1000));

// Generate dates within last day
const todayDateArb = fc
  .integer({ min: 0, max: 86400 })
  .map((seconds) => new Date(Date.now() - seconds * 1000));

// Generate dates within last week
const weekDateArb = fc
  .integer({ min: 0, max: 604800 })
  .map((seconds) => new Date(Date.now() - seconds * 1000));

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 16: Timestamp Formatting', () => {
  it('always returns a non-empty string for valid dates', () => {
    fc.assert(
      fc.property(pastDateArb, (date) => {
        const result = formatTimestamp(date);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('returns "Never" for null or undefined', () => {
    expect(formatTimestamp(null)).toBe('Never');
    expect(formatTimestamp(undefined)).toBe('Never');
  });

  it('returns "Just now" for very recent timestamps (< 60 seconds)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 59 }), (seconds) => {
        const date = new Date(Date.now() - seconds * 1000);
        const result = formatTimestamp(date);
        expect(result).toBe('Just now');
      }),
      { numRuns: 20 }
    );
  });

  it('returns minutes format for timestamps within an hour', () => {
    fc.assert(
      fc.property(fc.integer({ min: 60, max: 3599 }), (seconds) => {
        const date = new Date(Date.now() - seconds * 1000);
        const result = formatTimestamp(date);
        expect(result).toMatch(/^\d+ minutes? ago$/);
      }),
      { numRuns: 20 }
    );
  });

  it('returns hours format for timestamps within a day', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3600, max: 86399 }), (seconds) => {
        const date = new Date(Date.now() - seconds * 1000);
        const result = formatTimestamp(date);
        expect(result).toMatch(/^\d+ hours? ago$/);
      }),
      { numRuns: 20 }
    );
  });

  it('returns days format for timestamps within a week', () => {
    fc.assert(
      fc.property(fc.integer({ min: 86400, max: 604799 }), (seconds) => {
        const date = new Date(Date.now() - seconds * 1000);
        const result = formatTimestamp(date);
        expect(result).toMatch(/^\d+ days? ago$/);
      }),
      { numRuns: 20 }
    );
  });

  it('returns formatted date for timestamps older than a week', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 604800, max: 31536000 }), // 1 week to 1 year
        (seconds) => {
          const date = new Date(Date.now() - seconds * 1000);
          const result = formatTimestamp(date);
          // Should not contain "ago" and should not be "Never" or "Just now"
          expect(result).not.toContain('ago');
          expect(result).not.toBe('Never');
          expect(result).not.toBe('Just now');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('uses singular form for 1 unit', () => {
    // 1 minute ago
    const oneMinute = new Date(Date.now() - 60 * 1000);
    expect(formatTimestamp(oneMinute)).toBe('1 minute ago');

    // 1 hour ago
    const oneHour = new Date(Date.now() - 3600 * 1000);
    expect(formatTimestamp(oneHour)).toBe('1 hour ago');

    // 1 day ago
    const oneDay = new Date(Date.now() - 86400 * 1000);
    expect(formatTimestamp(oneDay)).toBe('1 day ago');
  });

  it('uses plural form for multiple units', () => {
    // 2 minutes ago
    const twoMinutes = new Date(Date.now() - 120 * 1000);
    expect(formatTimestamp(twoMinutes)).toBe('2 minutes ago');

    // 2 hours ago
    const twoHours = new Date(Date.now() - 7200 * 1000);
    expect(formatTimestamp(twoHours)).toBe('2 hours ago');

    // 2 days ago
    const twoDays = new Date(Date.now() - 172800 * 1000);
    expect(formatTimestamp(twoDays)).toBe('2 days ago');
  });

  it('is deterministic for the same input', () => {
    fc.assert(
      fc.property(pastDateArb, (date) => {
        const result1 = formatTimestamp(date);
        const result2 = formatTimestamp(date);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 }
    );
  });
});

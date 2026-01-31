/**
 * Property-Based Tests for Credential Masking
 * 
 * **Property 12: Credential Masking**
 * For any saved credentials, sensitive fields (passwords, secrets, tokens)
 * SHALL never be re-displayed in full. The UI SHALL show masked placeholders
 * (e.g., "••••••••") for saved credential fields.
 * 
 * **Validates: Requirements 11.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  maskCredential,
  isMaskedValue,
  CREDENTIAL_PLACEHOLDER,
  getCredentialDisplayValue,
  shouldShowCredentialPlaceholder,
} from './credentialMasking';

describe('Credential Masking - Property 12', () => {
  /**
   * Property 12.1: Masked credentials never reveal full value
   * For any credential string, the masked output SHALL NOT equal the original
   * (unless the original is empty or very short)
   */
  it('masked credentials never reveal full value for strings > 4 chars', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5 }),
        (credential) => {
          const masked = maskCredential(credential);
          // Masked value should never equal the original
          return masked !== credential;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.2: Masked credentials contain masking characters
   * For any non-empty credential, the masked output SHALL contain the masking character
   */
  it('masked credentials contain masking characters for non-empty strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (credential) => {
          const masked = maskCredential(credential);
          // Should contain the masking character
          return masked.includes('•');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.3: Masked credentials have consistent length
   * For any credential longer than visibleChars, the masked output SHALL have
   * a predictable length (visibleChars + 8 masking chars)
   */
  it('masked credentials have consistent length for long strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (credential, visibleChars) => {
          const masked = maskCredential(credential, visibleChars);
          // For strings longer than visibleChars, length should be visibleChars + 8
          if (credential.length > visibleChars) {
            return masked.length === visibleChars + 8;
          }
          // For short strings, should be 8 masking chars
          return masked.length === 8;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.4: Empty credentials return empty string
   * For null, undefined, or empty string, maskCredential SHALL return empty string
   */
  it('empty credentials return empty string', () => {
    expect(maskCredential('')).toBe('');
    expect(maskCredential(null)).toBe('');
    expect(maskCredential(undefined)).toBe('');
  });

  /**
   * Property 12.5: isMaskedValue correctly identifies masked values
   * For any string containing the masking character, isMaskedValue SHALL return true
   */
  it('isMaskedValue correctly identifies masked values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (credential) => {
          const masked = maskCredential(credential);
          // Masked values should be identified as masked
          return isMaskedValue(masked);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.6: CREDENTIAL_PLACEHOLDER is a valid masked value
   */
  it('CREDENTIAL_PLACEHOLDER is identified as masked', () => {
    expect(isMaskedValue(CREDENTIAL_PLACEHOLDER)).toBe(true);
  });

  /**
   * Property 12.7: getCredentialDisplayValue shows placeholder when saved
   * When hasSavedValue is true and inputValue is empty, SHALL return placeholder
   */
  it('getCredentialDisplayValue shows placeholder when saved and empty', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (hasSavedValue) => {
          const displayValue = getCredentialDisplayValue('', hasSavedValue);
          if (hasSavedValue) {
            return displayValue === CREDENTIAL_PLACEHOLDER;
          }
          return displayValue === '';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.8: getCredentialDisplayValue shows input when typing
   * When inputValue is non-empty, SHALL return the input value regardless of saved state
   */
  it('getCredentialDisplayValue shows input when typing', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.boolean(),
        (inputValue, hasSavedValue) => {
          const displayValue = getCredentialDisplayValue(inputValue, hasSavedValue);
          return displayValue === inputValue;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.9: shouldShowCredentialPlaceholder logic
   * SHALL return true only when hasSavedValue is true AND inputValue is empty
   */
  it('shouldShowCredentialPlaceholder returns correct boolean', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.boolean(),
        (inputValue, hasSavedValue) => {
          const shouldShow = shouldShowCredentialPlaceholder(inputValue, hasSavedValue);
          const expected = hasSavedValue && inputValue === '';
          return shouldShow === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.10: Masked output preserves prefix for identification
   * For credentials with common prefixes (ck_, cs_, sk_), the prefix SHALL be visible
   */
  it('masked output preserves common credential prefixes', () => {
    const prefixes = ['ck_', 'cs_', 'sk_', 'pk_', 'rk_'];
    
    prefixes.forEach((prefix) => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5 }),
          (suffix) => {
            const credential = prefix + suffix;
            const masked = maskCredential(credential, 4);
            // Should start with the prefix (first 4 chars)
            return masked.startsWith(credential.substring(0, 4));
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  redactPII,
  maskEmail,
  maskPhone,
  containsPII,
  REDACTED_PLACEHOLDER,
} from './piiRedaction';

/**
 * Property Test: PII Redaction in Payloads
 * **Property 8: PII Redaction in Payloads**
 * **Validates: Requirements 12.4, 11.6, 17.1, 17.2, 17.3**
 * 
 * Tests that PII is correctly redacted from payloads:
 * - Sensitive fields are completely redacted
 * - Email addresses are masked (j***@example.com)
 * - Phone numbers are masked (***-***-1234)
 * - Nested objects are recursively processed
 * - Arrays are processed element by element
 */

// Arbitrary for generating email addresses
const emailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
  fc.constantFrom('example.com', 'test.org', 'mail.net', 'company.io')
).map(([local, domain]) => `${local}@${domain}`);

// Arbitrary for generating phone numbers
const phoneArb = fc.tuple(
  fc.integer({ min: 100, max: 999 }),
  fc.integer({ min: 100, max: 999 }),
  fc.integer({ min: 1000, max: 9999 })
).map(([area, prefix, line]) => `${area}-${prefix}-${line}`);

// Arbitrary for generating sensitive field names
const sensitiveFieldArb = fc.constantFrom(
  'password',
  'token',
  'api_key',
  'secret',
  'card_number',
  'cvv',
  'ssn',
  'access_token',
  'refresh_token',
  'private_key'
);

// Arbitrary for generating masked field names
const maskedFieldArb = fc.constantFrom(
  'email',
  'phone',
  'phone_number',
  'mobile'
);

// Arbitrary for generating non-sensitive field names
const safeFieldArb = fc.constantFrom(
  'name',
  'id',
  'status',
  'created_at',
  'description',
  'quantity',
  'price',
  'category'
);

describe('Property 8: PII Redaction in Payloads', () => {
  /**
   * Property 8.1: Sensitive fields are completely redacted
   * Validates: Requirements 17.1
   */
  it('should completely redact sensitive fields', () => {
    fc.assert(
      fc.property(
        sensitiveFieldArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (fieldName, value) => {
          const payload = { [fieldName]: value };
          const redacted = redactPII(payload) as Record<string, unknown>;
          
          expect(redacted[fieldName]).toBe(REDACTED_PLACEHOLDER);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: Email addresses are masked correctly
   * Validates: Requirements 17.2
   */
  it('should mask email addresses preserving first character and domain', () => {
    fc.assert(
      fc.property(emailArb, (email) => {
        const masked = maskEmail(email);
        
        // Should start with first character of local part
        expect(masked[0]).toBe(email[0]);
        
        // Should contain ***
        expect(masked).toContain('***');
        
        // Should preserve domain
        const domain = email.split('@')[1];
        expect(masked).toContain(`@${domain}`);
        
        // Should not contain full local part
        const localPart = email.split('@')[0];
        if (localPart.length > 1) {
          expect(masked).not.toContain(localPart);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: Phone numbers are masked correctly
   * Validates: Requirements 17.2
   */
  it('should mask phone numbers preserving last 4 digits', () => {
    fc.assert(
      fc.property(phoneArb, (phone) => {
        const masked = maskPhone(phone);
        
        // Should contain ***
        expect(masked).toContain('***');
        
        // Should preserve last 4 digits
        const digits = phone.replace(/\D/g, '');
        const lastFour = digits.slice(-4);
        expect(masked).toContain(lastFour);
        
        // Should not contain full number
        expect(masked).not.toBe(phone);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.4: Email fields in objects are masked
   * Validates: Requirements 17.1, 17.2
   */
  it('should mask email fields in objects', () => {
    fc.assert(
      fc.property(emailArb, (email) => {
        const payload = { email };
        const redacted = redactPII(payload) as Record<string, unknown>;
        
        // Should be masked, not original
        expect(redacted.email).not.toBe(email);
        
        // Should contain masking pattern
        expect(redacted.email as string).toContain('***');
        
        // Should preserve domain
        const domain = email.split('@')[1];
        expect(redacted.email as string).toContain(`@${domain}`);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.5: Phone fields in objects are masked
   * Validates: Requirements 17.1, 17.2
   */
  it('should mask phone fields in objects', () => {
    fc.assert(
      fc.property(phoneArb, (phone) => {
        const payload = { phone };
        const redacted = redactPII(payload) as Record<string, unknown>;
        
        // Should be masked, not original
        expect(redacted.phone).not.toBe(phone);
        
        // Should contain masking pattern
        expect(redacted.phone as string).toContain('***');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.6: Safe fields are not modified
   * Validates: Requirements 17.1
   */
  it('should not modify safe fields', () => {
    fc.assert(
      fc.property(
        safeFieldArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (fieldName, value) => {
          const payload = { [fieldName]: value };
          const redacted = redactPII(payload) as Record<string, unknown>;
          
          expect(redacted[fieldName]).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.7: Nested objects are recursively processed
   * Validates: Requirements 17.1
   */
  it('should recursively process nested objects', () => {
    fc.assert(
      fc.property(
        sensitiveFieldArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (fieldName, value) => {
          const payload = {
            level1: {
              level2: {
                [fieldName]: value,
              },
            },
          };
          const redacted = redactPII(payload) as {
            level1: { level2: Record<string, unknown> };
          };
          
          expect(redacted.level1.level2[fieldName]).toBe(REDACTED_PLACEHOLDER);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.8: Arrays are processed element by element
   * Validates: Requirements 17.1
   */
  it('should process arrays element by element', () => {
    fc.assert(
      fc.property(
        fc.array(emailArb, { minLength: 1, maxLength: 5 }),
        (emails) => {
          const payload = {
            users: emails.map((email) => ({ email })),
          };
          const redacted = redactPII(payload) as {
            users: Array<{ email: string }>;
          };
          
          // Each email should be masked
          redacted.users.forEach((user, index) => {
            expect(user.email).not.toBe(emails[index]);
            expect(user.email).toContain('***');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.9: containsPII correctly identifies PII
   * Validates: Requirements 17.1
   */
  it('should correctly identify payloads containing PII', () => {
    fc.assert(
      fc.property(sensitiveFieldArb, fc.string({ minLength: 1, maxLength: 50 }), (fieldName, value) => {
        const payloadWithPII = { [fieldName]: value };
        const payloadWithoutPII = { name: 'test', id: 123 };
        
        expect(containsPII(payloadWithPII)).toBe(true);
        expect(containsPII(payloadWithoutPII)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.10: Null and undefined values are preserved
   * Validates: Requirements 17.1
   */
  it('should preserve null and undefined values', () => {
    fc.assert(
      fc.property(safeFieldArb, (fieldName) => {
        const payloadWithNull = { [fieldName]: null };
        const payloadWithUndefined = { [fieldName]: undefined };
        
        const redactedNull = redactPII(payloadWithNull) as Record<string, unknown>;
        const redactedUndefined = redactPII(payloadWithUndefined) as Record<string, unknown>;
        
        expect(redactedNull[fieldName]).toBeNull();
        expect(redactedUndefined[fieldName]).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.11: Redaction is idempotent
   * Validates: Requirements 17.1
   */
  it('should be idempotent - redacting twice produces same result', () => {
    fc.assert(
      fc.property(
        sensitiveFieldArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (fieldName, value) => {
          const payload = { [fieldName]: value };
          const redactedOnce = redactPII(payload);
          const redactedTwice = redactPII(redactedOnce);
          
          expect(JSON.stringify(redactedOnce)).toBe(JSON.stringify(redactedTwice));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.12: Mixed payloads are correctly processed
   * Validates: Requirements 17.1, 17.2
   */
  it('should correctly process mixed payloads with sensitive and safe fields', () => {
    fc.assert(
      fc.property(
        emailArb,
        phoneArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (email, phone, password, name) => {
          const payload = {
            email,
            phone,
            password,
            name,
            nested: {
              api_key: 'secret123',
              description: 'test',
            },
          };
          
          const redacted = redactPII(payload) as {
            email: string;
            phone: string;
            password: string;
            name: string;
            nested: { api_key: string; description: string };
          };
          
          // Email should be masked
          expect(redacted.email).toContain('***');
          expect(redacted.email).not.toBe(email);
          
          // Phone should be masked
          expect(redacted.phone).toContain('***');
          expect(redacted.phone).not.toBe(phone);
          
          // Password should be redacted
          expect(redacted.password).toBe(REDACTED_PLACEHOLDER);
          
          // Name should be preserved
          expect(redacted.name).toBe(name);
          
          // Nested api_key should be redacted
          expect(redacted.nested.api_key).toBe(REDACTED_PLACEHOLDER);
          
          // Nested description should be preserved
          expect(redacted.nested.description).toBe('test');
        }
      ),
      { numRuns: 100 }
    );
  });
});

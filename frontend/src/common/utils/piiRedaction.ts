/**
 * PII Redaction Utility
 * 
 * Validates: Requirements 17.1, 17.2, 17.3
 * 
 * Redacts personally identifiable information from payloads:
 * - Completely redacts: password, token, api_key, secret, card_number, cvv, ssn
 * - Masks: email (j***@example.com), phone (***-***-1234)
 */

// Fields that should be completely redacted
const REDACTED_FIELDS = [
  'password',
  'token',
  'api_key',
  'apikey',
  'api-key',
  'secret',
  'secret_key',
  'secretkey',
  'card_number',
  'cardnumber',
  'card-number',
  'cvv',
  'cvc',
  'ssn',
  'social_security',
  'access_token',
  'refresh_token',
  'bearer',
  'authorization',
  'auth_token',
  'private_key',
  'privatekey',
];

// Fields that should be masked (partial redaction)
const MASKED_FIELDS = ['email', 'phone', 'phone_number', 'phonenumber', 'mobile'];

// Redaction placeholder
export const REDACTED_PLACEHOLDER = '[REDACTED]';

// Banner text for redacted content
export const REDACTION_BANNER_TEXT = 'Sensitive data redacted for security';

/**
 * Check if a field name should be completely redacted
 */
function shouldRedact(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return REDACTED_FIELDS.some(
    (field) => lowerName === field || lowerName.includes(field)
  );
}

/**
 * Check if a field name should be masked
 */
function shouldMask(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return MASKED_FIELDS.some(
    (field) => lowerName === field || lowerName.includes(field)
  );
}

/**
 * Mask an email address
 * Example: john.doe@example.com -> j***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return REDACTED_PLACEHOLDER;
  
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return REDACTED_PLACEHOLDER;
  
  const localPart = email.substring(0, atIndex);
  const domain = email.substring(atIndex);
  
  if (localPart.length <= 1) {
    return `${localPart}***${domain}`;
  }
  
  return `${localPart[0]}***${domain}`;
}

/**
 * Mask a phone number
 * Example: 555-123-4567 -> ***-***-4567
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return REDACTED_PLACEHOLDER;
  
  // Remove all non-digit characters to get the raw number
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 4) return REDACTED_PLACEHOLDER;
  
  // Keep last 4 digits visible
  const lastFour = digits.slice(-4);
  
  // Reconstruct with masking
  if (digits.length === 10) {
    return `***-***-${lastFour}`;
  } else if (digits.length === 11) {
    return `*-***-***-${lastFour}`;
  } else {
    return `***${lastFour}`;
  }
}

/**
 * Redact PII from a value based on field name
 */
function redactValue(fieldName: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  
  if (shouldRedact(fieldName)) {
    return REDACTED_PLACEHOLDER;
  }
  
  if (shouldMask(fieldName) && typeof value === 'string') {
    if (fieldName.toLowerCase().includes('email')) {
      return maskEmail(value);
    }
    if (fieldName.toLowerCase().includes('phone') || fieldName.toLowerCase().includes('mobile')) {
      return maskPhone(value);
    }
  }
  
  return value;
}

/**
 * Recursively redact PII from an object
 * 
 * Validates: Requirements 17.1, 17.2
 */
export function redactPII(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map((item) => redactPII(item));
  }
  
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[key] = redactPII(value);
      } else {
        // Apply redaction based on field name
        result[key] = redactValue(key, value);
      }
    }
    
    return result;
  }
  
  return data;
}

/**
 * Check if a payload contains any PII fields
 */
export function containsPII(data: unknown): boolean {
  if (data === null || data === undefined) {
    return false;
  }
  
  if (Array.isArray(data)) {
    return data.some((item) => containsPII(item));
  }
  
  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (shouldRedact(key) || shouldMask(key)) {
        return true;
      }
      if (typeof value === 'object' && value !== null && containsPII(value)) {
        return true;
      }
    }
  }
  
  return false;
}

export default {
  redactPII,
  maskEmail,
  maskPhone,
  containsPII,
  REDACTED_PLACEHOLDER,
  REDACTION_BANNER_TEXT,
};

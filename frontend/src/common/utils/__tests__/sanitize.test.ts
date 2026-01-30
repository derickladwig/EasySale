import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeUserInput,
  sanitizeSqlInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeNumber,
} from '../sanitize';

describe('sanitize utilities', () => {
  describe('sanitizeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('escapes ampersands', () => {
      expect(sanitizeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });
  });

  describe('sanitizeUserInput', () => {
    it('trims whitespace', () => {
      expect(sanitizeUserInput('  hello  ')).toBe('hello');
    });

    it('limits length', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeUserInput(longString, 100).length).toBe(100);
    });

    it('escapes HTML', () => {
      expect(sanitizeUserInput('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;&#x2F;b&gt;');
    });
  });

  describe('sanitizeSqlInput', () => {
    it('removes SQL injection attempts', () => {
      expect(sanitizeSqlInput("'; DROP TABLE users; --")).toBe('DROP TABLE users');
    });

    it('removes quotes', () => {
      expect(sanitizeSqlInput('test"value')).toBe('testvalue');
    });
  });

  describe('sanitizeEmail', () => {
    it('validates and lowercases email', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('returns empty string for invalid email', () => {
      expect(sanitizeEmail('not-an-email')).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('keeps valid phone characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    });

    it('removes invalid characters', () => {
      expect(sanitizePhone('555-1234 ext. 123')).toBe('555-1234  123');
    });
  });

  describe('sanitizeUrl', () => {
    it('allows http and https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('blocks javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('blocks data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('allows relative URLs', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    });
  });

  describe('sanitizeFilename', () => {
    it('removes path separators', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    });

    it('removes invalid characters', () => {
      expect(sanitizeFilename('file<name>:test.txt')).toBe('filenametest.txt');
    });
  });

  describe('sanitizeNumber', () => {
    it('parses valid numbers', () => {
      expect(sanitizeNumber('123.45')).toBe(123.45);
    });

    it('returns null for invalid numbers', () => {
      expect(sanitizeNumber('not-a-number')).toBeNull();
    });

    it('applies min constraint', () => {
      expect(sanitizeNumber(5, { min: 10 })).toBe(10);
    });

    it('applies max constraint', () => {
      expect(sanitizeNumber(100, { max: 50 })).toBe(50);
    });

    it('rounds to specified decimals', () => {
      expect(sanitizeNumber(123.456, { decimals: 2 })).toBe(123.46);
    });
  });
});

/**
 * Input sanitization utilities to prevent XSS attacks
 */

/**
 * Sanitize HTML by escaping special characters
 */
export function sanitizeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize plain text input (alias for sanitizeHtml)
 */
export function sanitizeInput(input: string): string {
  return sanitizeHtml(input);
}

/**
 * Sanitize user input for display
 * Removes potentially dangerous characters and limits length
 */
export function sanitizeUserInput(input: string, maxLength = 1000): string {
  if (!input) return '';

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML
  sanitized = sanitizeHtml(sanitized);

  return sanitized;
}

/**
 * Sanitize SQL-like input (for search queries)
 * Removes SQL injection attempts
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return '';

  // Remove SQL keywords and special characters
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .trim();
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Validate and sanitize phone number
 * Removes non-numeric characters except + and -
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  // Keep only digits, +, -, (, ), and spaces
  return phone.replace(/[^\d+\-() ]/g, '').trim();
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }

  // Only allow http, https, and relative URLs
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/')
  ) {
    return '';
  }

  return url.trim();
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  // Remove path separators and special characters
  return filename
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .trim();
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(
  input: string | number,
  options?: {
    min?: number;
    max?: number;
    decimals?: number;
  }
): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input;

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  let result = num;

  // Apply min/max constraints
  if (options?.min !== undefined && result < options.min) {
    result = options.min;
  }
  if (options?.max !== undefined && result > options.max) {
    result = options.max;
  }

  // Round to specified decimals
  if (options?.decimals !== undefined) {
    const factor = Math.pow(10, options.decimals);
    result = Math.round(result * factor) / factor;
  }

  return result;
}

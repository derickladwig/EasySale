/**
 * Credential Masking Utility
 * 
 * Provides functions for masking sensitive credential fields.
 * Never re-displays full credential values.
 * 
 * Validates: Requirements 11.1
 */

/**
 * Mask a credential value for display.
 * Shows only the first few characters followed by dots.
 * 
 * @param value - The credential value to mask
 * @param visibleChars - Number of characters to show at the start (default: 4)
 * @returns Masked string or empty string if no value
 */
export function maskCredential(value: string | undefined | null, visibleChars: number = 4): string {
  if (!value) return '';
  
  if (value.length <= visibleChars) {
    return '•'.repeat(8);
  }
  
  return value.substring(0, visibleChars) + '•'.repeat(8);
}

/**
 * Check if a value appears to be a masked placeholder.
 * Used to determine if we should show the masked value or allow editing.
 */
export function isMaskedValue(value: string): boolean {
  return value.includes('•') || value === '********';
}

/**
 * Placeholder text for saved credentials.
 * Shows that a credential is saved without revealing the value.
 */
export const CREDENTIAL_PLACEHOLDER = '••••••••';

/**
 * Get display value for a credential field.
 * If the credential is saved (hasSavedValue), show placeholder.
 * Otherwise, show the current input value.
 * 
 * @param inputValue - Current input value
 * @param hasSavedValue - Whether a credential is already saved
 * @returns Display value for the input field
 */
export function getCredentialDisplayValue(inputValue: string, hasSavedValue: boolean): string {
  if (hasSavedValue && !inputValue) {
    return CREDENTIAL_PLACEHOLDER;
  }
  return inputValue;
}

/**
 * Determine if the credential field should be editable.
 * When a credential is saved, the field shows a placeholder and
 * requires explicit action to change it.
 */
export function shouldShowCredentialPlaceholder(inputValue: string, hasSavedValue: boolean): boolean {
  return hasSavedValue && !inputValue;
}

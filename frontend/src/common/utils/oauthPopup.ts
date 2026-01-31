/**
 * OAuth Popup Utility
 * 
 * Handles OAuth popup flow with state validation for security.
 * Validates: Requirements 11.3, 11.4, 11.5
 */

/**
 * Generate a cryptographically secure random state string
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store OAuth state in sessionStorage
 */
export function storeOAuthState(platform: string, state: string): void {
  sessionStorage.setItem(`oauth_state_${platform}`, state);
}

/**
 * Retrieve and validate OAuth state from sessionStorage
 */
export function validateOAuthState(platform: string, receivedState: string): boolean {
  const storedState = sessionStorage.getItem(`oauth_state_${platform}`);
  if (!storedState || storedState !== receivedState) {
    return false;
  }
  // Clear state after validation (one-time use)
  sessionStorage.removeItem(`oauth_state_${platform}`);
  return true;
}

/**
 * Store OAuth result for parent window to read
 */
export function storeOAuthResult(platform: string, result: OAuthResult): void {
  sessionStorage.setItem(`oauth_result_${platform}`, JSON.stringify(result));
}

/**
 * Retrieve OAuth result from sessionStorage
 */
export function getOAuthResult(platform: string): OAuthResult | null {
  const result = sessionStorage.getItem(`oauth_result_${platform}`);
  if (!result) return null;
  sessionStorage.removeItem(`oauth_result_${platform}`);
  try {
    return JSON.parse(result) as OAuthResult;
  } catch {
    return null;
  }
}

export interface OAuthResult {
  success: boolean;
  platform: string;
  error?: string;
  message?: string;
}

export interface OAuthPopupOptions {
  width?: number;
  height?: number;
  onSuccess?: (result: OAuthResult) => void;
  onError?: (error: string) => void;
  onBlocked?: () => void;
  pollInterval?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<Omit<OAuthPopupOptions, 'onSuccess' | 'onError' | 'onBlocked'>> = {
  width: 600,
  height: 700,
  pollInterval: 500,
  timeout: 300000, // 5 minutes
};

/**
 * Open OAuth popup with state validation
 * 
 * Flow:
 * 1. Generate and store state in sessionStorage
 * 2. Open popup with auth URL containing state
 * 3. Poll for popup close or result in sessionStorage
 * 4. Validate state on callback before trusting result
 * 5. Call success/error callback
 * 
 * Validates: Requirements 11.3, 11.4, 11.5
 */
export function openOAuthPopup(
  platform: string,
  authUrl: string,
  state: string,
  options: OAuthPopupOptions = {}
): { cleanup: () => void } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Store state for validation
  storeOAuthState(platform, state);
  
  // Calculate popup position (centered)
  const left = Math.max(0, (window.screen.width - opts.width) / 2);
  const top = Math.max(0, (window.screen.height - opts.height) / 2);
  
  // Open popup
  const popup = window.open(
    authUrl,
    `oauth_${platform}`,
    `width=${opts.width},height=${opts.height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
  
  // Handle popup blocked
  if (!popup || popup.closed) {
    options.onBlocked?.();
    return { cleanup: () => {} };
  }
  
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  
  const cleanup = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };
  
  // Poll for result or popup close
  pollTimer = setInterval(() => {
    // Check if popup was closed
    if (popup.closed) {
      cleanup();
      
      // Check for result in sessionStorage
      const result = getOAuthResult(platform);
      if (result) {
        if (result.success) {
          options.onSuccess?.(result);
        } else {
          options.onError?.(result.error || 'Authorization failed');
        }
      } else {
        // Popup closed without result - user cancelled
        options.onError?.('Authorization was cancelled');
      }
      return;
    }
  }, opts.pollInterval);
  
  // Timeout after configured duration
  timeoutTimer = setTimeout(() => {
    cleanup();
    if (popup && !popup.closed) {
      popup.close();
    }
    options.onError?.('Authorization timed out');
  }, opts.timeout);
  
  return { cleanup };
}

/**
 * Build OAuth URL with state parameter
 */
export function buildOAuthUrl(baseUrl: string, state: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('state', state);
  return url.toString();
}

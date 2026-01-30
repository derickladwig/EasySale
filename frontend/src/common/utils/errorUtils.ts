/**
 * Utility functions for safe error handling
 */

/**
 * Safely extracts an error message from any error type.
 * Handles Error objects, strings, and unknown types.
 * 
 * @param error - The error to extract a message from
 * @param defaultMessage - Optional default message if extraction fails
 * @returns A string error message safe for rendering
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An unexpected error occurred'): string {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  
  if (typeof error === 'string') {
    return error || defaultMessage;
  }
  
  if (error && typeof error === 'object') {
    // Handle API error responses that might have a message property
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    if (typeof errorObj.error === 'string') {
      return errorObj.error;
    }
  }
  
  return defaultMessage;
}

/**
 * Checks if an error is a network error (no connection to server)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    );
  }
  return false;
}

/**
 * Checks if an error is an API error with a specific status code
 */
export function isApiError(error: unknown, statusCode?: number): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const apiError = error as { status: number };
    if (statusCode !== undefined) {
      return apiError.status === statusCode;
    }
    return true;
  }
  return false;
}

/**
 * Gets a user-friendly error message based on the error type
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  if (isApiError(error, 401)) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (isApiError(error, 403)) {
    return 'You do not have permission to perform this action.';
  }
  
  if (isApiError(error, 404)) {
    return 'The requested resource was not found.';
  }
  
  if (isApiError(error, 500)) {
    return 'A server error occurred. Please try again later.';
  }
  
  return getErrorMessage(error);
}

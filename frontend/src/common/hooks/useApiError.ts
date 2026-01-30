import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { ApiError } from '../utils/apiClient';

export const useApiError = () => {
  const { showToast } = useToast();

  const handleApiError = useCallback(
    (error: unknown, defaultMessage = 'An error occurred') => {
      if (error instanceof ApiError) {
        // Show user-friendly error message
        showToast({
          variant: 'error',
          title: 'Error',
          description: error.message,
        });
      } else if (error instanceof Error) {
        showToast({
          variant: 'error',
          title: 'Error',
          description: error.message,
        });
      } else {
        showToast({
          variant: 'error',
          title: 'Error',
          description: defaultMessage,
        });
      }
    },
    [showToast]
  );

  return { handleApiError };
};

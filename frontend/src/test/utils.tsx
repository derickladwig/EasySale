import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../config/ThemeProvider';

/**
 * Custom render function that wraps components with common providers
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    );
  };

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Mock API response helper
 */
export function mockApiResponse<T>(data: T, delay = 0): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

/**
 * Mock API error helper
 */
export function mockApiError(message: string, status = 500, delay = 0): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message) as any;
      error.status = status;
      reject(error);
    }, delay);
  });
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

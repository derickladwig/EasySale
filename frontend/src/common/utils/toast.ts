// Simple toast utility
// This is a placeholder - in production, integrate with a toast library like react-hot-toast or sonner

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    console.log('[Toast Success]', message, options);
    // Use browser notification API as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Success', { body: message, icon: '/success-icon.png' });
    }
  },
  error: (message: string, options?: ToastOptions) => {
    console.error('[Toast Error]', message, options);
    // Use browser notification API as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Error', { body: message, icon: '/error-icon.png' });
    }
  },
  warning: (message: string, options?: ToastOptions) => {
    console.warn('[Toast Warning]', message, options);
    // Use browser notification API as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Warning', { body: message, icon: '/warning-icon.png' });
    }
  },
  info: (message: string, options?: ToastOptions) => {
    console.info('[Toast Info]', message, options);
    // Use browser notification API as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Info', { body: message, icon: '/info-icon.png' });
    }
  },
};

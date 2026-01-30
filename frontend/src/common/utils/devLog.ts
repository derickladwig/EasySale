/**
 * Development logging utility
 * Only logs in development environment to prevent console pollution in production
 */

const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

export const devLog = {
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
  
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  }
};

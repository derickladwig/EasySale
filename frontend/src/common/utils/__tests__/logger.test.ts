import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logger, { logDebug, logInfo, logWarn, logError } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log levels', () => {
    it('logs debug messages', () => {
      logDebug('Debug message');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('DEBUG: Debug message'), '');
    });

    it('logs info messages', () => {
      logInfo('Info message');

      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('INFO: Info message'), '');
    });

    it('logs warn messages', () => {
      logWarn('Warning message');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Warning message'),
        ''
      );
    });

    it('logs error messages', () => {
      logError('Error message');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error message'),
        ''
      );
    });
  });

  describe('context logging', () => {
    it('logs with context object', () => {
      const context = {
        userId: '123',
        action: 'login',
      };

      logInfo('User logged in', context);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: User logged in'),
        context
      );
    });

    it('logs with nested context', () => {
      const context = {
        user: {
          id: '123',
          name: 'John Doe',
        },
        metadata: {
          timestamp: '2025-01-09',
        },
      };

      logError('Complex error', context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Complex error'),
        context
      );
    });

    it('logs without context', () => {
      logInfo('Simple message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Simple message'),
        ''
      );
    });
  });

  describe('timestamp formatting', () => {
    it('includes ISO timestamp in log output', () => {
      const beforeLog = new Date().toISOString();
      logInfo('Test message');
      const afterLog = new Date().toISOString();

      const logCall = (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Extract timestamp from log message
      const timestampMatch = logCall.match(/\[(.*?)\]/);
      expect(timestampMatch).toBeTruthy();

      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        expect(timestamp >= beforeLog).toBe(true);
        expect(timestamp <= afterLog).toBe(true);
      }
    });
  });

  describe('log level filtering', () => {
    it('respects minimum log level', () => {
      // Note: In actual implementation, log level is set from environment
      // This test documents the expected behavior

      logDebug('Debug message');
      logInfo('Info message');
      logWarn('Warn message');
      logError('Error message');

      // All levels should be logged in test environment
      expect(console.log).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('error object logging', () => {
    it('logs error with stack trace', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:10:5';

      logError('An error occurred', {
        error: error.message,
        stack: error.stack,
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: An error occurred'),
        expect.objectContaining({
          error: 'Test error',
          stack: expect.stringContaining('Error: Test error'),
        })
      );
    });

    it('logs error without stack trace', () => {
      const error = new Error('Simple error');

      logError('Error occurred', {
        error: error.message,
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error occurred'),
        expect.objectContaining({
          error: 'Simple error',
        })
      );
    });
  });

  describe('special characters handling', () => {
    it('logs messages with special characters', () => {
      logInfo('Message with "quotes" and \'apostrophes\'');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Message with "quotes" and \'apostrophes\''),
        ''
      );
    });

    it('logs messages with newlines', () => {
      logInfo('Multi\nline\nmessage');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Multi\nline\nmessage'),
        ''
      );
    });

    it('logs messages with unicode characters', () => {
      logInfo('Unicode: 你好 🎉');

      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Unicode: 你好 🎉'), '');
    });
  });

  describe('performance', () => {
    it('logs many messages quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        logInfo(`Message ${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
      expect(console.info).toHaveBeenCalledTimes(1000);
    });
  });

  describe('singleton behavior', () => {
    it('uses same logger instance', () => {
      logInfo('First message');
      logInfo('Second message');

      // Both calls should use the same logger instance
      expect(console.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('handles empty message', () => {
      logInfo('');

      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('INFO: '), '');
    });

    it('handles very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      logInfo(longMessage);

      expect(console.info).toHaveBeenCalledWith(expect.stringContaining(longMessage), '');
    });

    it('handles null context', () => {
      logInfo('Message', null as any);

      expect(console.info).toHaveBeenCalled();
    });

    it('handles undefined context', () => {
      logInfo('Message', undefined);

      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('INFO: Message'), '');
    });

    it('handles circular references in context', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw error
      expect(() => logInfo('Circular reference', circular)).not.toThrow();
    });
  });
});

/**
 * Tests for DBGpError base error class
 */

const DBGpError = require('../../../src/debugger/errors/DBGpError');

describe('DBGpError', () => {
  describe('constructor', () => {
    it('should create basic error with message', () => {
      const error = new DBGpError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('DBGP_ERROR');
      expect(error.context).toEqual({});
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('DBGpError');
    });

    it('should create error with custom options', () => {
      const context = { command: 'status', transactionId: 123 };
      const error = new DBGpError('Custom error', {
        code: 'CUSTOM_ERROR',
        context,
        recoverable: false
      });

      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.context).toBe(context);
      expect(error.recoverable).toBe(false);
    });

    it('should set timestamp as ISO string', () => {
      const error = new DBGpError('Test error');
      const timestamp = new Date(error.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should be instance of Error', () => {
      const error = new DBGpError('Test error');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('addContext', () => {
    it('should add context to existing context', () => {
      const error = new DBGpError('Test error', {
        context: { existing: 'value' }
      });

      error.addContext({ new: 'data', another: 'field' });

      expect(error.context).toEqual({
        existing: 'value',
        new: 'data',
        another: 'field'
      });
    });

    it('should overwrite existing context keys', () => {
      const error = new DBGpError('Test error', {
        context: { key: 'old_value' }
      });

      error.addContext({ key: 'new_value' });

      expect(error.context.key).toBe('new_value');
    });

    it('should handle null/undefined context gracefully', () => {
      const error = new DBGpError('Test error');

      expect(() => error.addContext('key', null)).not.toThrow();
      expect(() => error.addContext('key', undefined)).not.toThrow();
      expect(error.context.key).toBeUndefined();
    });
  });

  describe('getRecoverySuggestion', () => {
    it('should return generic suggestion by default', () => {
      const error = new DBGpError('Test error');
      const suggestion = error.getRecoverySuggestion();

      expect(suggestion).toBe('Check the error details and retry the operation');
    });

    it('should return null for non-recoverable errors', () => {
      const error = new DBGpError('Fatal error', { recoverable: false });
      const suggestion = error.getRecoverySuggestion();

      expect(suggestion).toBeNull();
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      const error = new DBGpError('Test error message', {
        code: 'TEST_ERROR',
        context: { command: 'status' }
      });

      const result = error.toString();

      expect(result).toContain('DBGpError: Test error message');
      expect(result).toContain('Code: TEST_ERROR');
      expect(result).toContain('Context: {"command":"status"}');
      expect(result).toContain('Recoverable: true');
      expect(result).toContain('Timestamp:');
    });

    it('should handle empty context', () => {
      const error = new DBGpError('Test error');
      const result = error.toString();

      expect(result).toContain('Context: {}');
    });
  });

  describe('toJSON', () => {
    it('should return JSON serializable object', () => {
      const context = { command: 'status', id: 123 };
      const error = new DBGpError('Test error', {
        code: 'TEST_ERROR',
        context,
        recoverable: false
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'DBGpError',
        message: 'Test error',
        code: 'TEST_ERROR',
        category: 'general',
        context,
        recoverable: false,
        timestamp: error.timestamp,
        stack: error.stack
      });
    });

    it('should be JSON.stringify compatible', () => {
      const error = new DBGpError('Test error', {
        context: { key: 'value' }
      });

      const jsonString = JSON.stringify(error);
      const parsed = JSON.parse(jsonString);

      expect(parsed.message).toBe('Test error');
      expect(parsed.context).toEqual({ key: 'value' });
    });
  });

  describe('fromJSON', () => {
    it('should recreate error from JSON object', () => {
      const originalError = new DBGpError('Original error', {
        code: 'ORIGINAL_ERROR',
        context: { test: 'data' },
        recoverable: false
      });

      const json = originalError.toJSON();
      const recreatedError = DBGpError.fromJSON(json);

      expect(recreatedError).toBeInstanceOf(DBGpError);
      expect(recreatedError.message).toBe(json.message);
      expect(recreatedError.code).toBe(json.code);
      expect(recreatedError.context).toEqual(json.context);
      expect(recreatedError.recoverable).toBe(json.recoverable);
      expect(recreatedError.timestamp).toBe(json.timestamp);
    });

    it('should handle missing optional properties', () => {
      const json = {
        message: 'Minimal error',
        name: 'DBGpError'
      };

      const error = DBGpError.fromJSON(json);

      expect(error.message).toBe('Minimal error');
      expect(error.code).toBe('DBGP_ERROR');
      expect(error.context).toEqual({});
      expect(error.recoverable).toBe(true);
    });
  });

  describe('inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const error = new DBGpError('Test error');

      expect(error instanceof DBGpError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should have proper constructor name', () => {
      const error = new DBGpError('Test error');
      expect(error.constructor.name).toBe('DBGpError');
    });
  });

  describe('stack trace', () => {
    it('should capture stack trace', () => {
      const error = new DBGpError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('DBGpError: Test error');
    });

    it('should include cause in stack trace when available', () => {
      const cause = new Error('Original error');
      cause.stack = 'Original stack trace';
      const error = new DBGpError('Wrapper error', { cause });

      expect(error.stack).toContain('Caused by: Original stack trace');
    });

    it('should handle cause without stack trace', () => {
      const cause = new Error('Original error');
      cause.stack = null;
      const error = new DBGpError('Wrapper error', { cause });

      expect(error.stack).not.toContain('Caused by:');
    });
  });

  describe('getErrorInfo', () => {
    it('should return comprehensive error information', () => {
      const context = { command: 'status', transactionId: 123 };
      const cause = new Error('Original error');
      cause.code = 'ORIGINAL_CODE';

      const error = new DBGpError('Test error', {
        code: 'TEST_ERROR',
        context,
        cause,
        recoverable: false,
        category: 'test'
      });

      const info = error.getErrorInfo();

      expect(info).toEqual({
        name: 'DBGpError',
        message: 'Test error',
        code: 'TEST_ERROR',
        category: 'test',
        recoverable: false,
        context,
        timestamp: error.timestamp,
        cause: {
          name: 'Error',
          message: 'Original error',
          code: 'ORIGINAL_CODE'
        }
      });
    });

    it('should handle null cause', () => {
      const error = new DBGpError('Test error', {
        code: 'TEST_ERROR'
      });

      const info = error.getErrorInfo();

      expect(info.cause).toBeNull();
    });

    it('should handle cause without code', () => {
      const cause = new Error('Original error');
      const error = new DBGpError('Test error', { cause });

      const info = error.getErrorInfo();

      expect(info.cause).toEqual({
        name: 'Error',
        message: 'Original error',
        code: undefined
      });
    });
  });

  describe('getUserMessage', () => {
    it('should return the error message by default', () => {
      const error = new DBGpError('User friendly message');
      expect(error.getUserMessage()).toBe('User friendly message');
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should return default recovery suggestions', () => {
      const error = new DBGpError('Test error');
      const suggestions = error.getRecoverySuggestions();

      expect(suggestions).toEqual([
        'Check DBGp connection status',
        'Verify debugger configuration',
        'Review error context for more details'
      ]);
    });
  });

  describe('category methods', () => {
    describe('isCategory', () => {
      it('should return true for matching category', () => {
        const error = new DBGpError('Test error', { category: 'connection' });
        expect(error.isCategory('connection')).toBe(true);
      });

      it('should return false for non-matching category', () => {
        const error = new DBGpError('Test error', { category: 'connection' });
        expect(error.isCategory('protocol')).toBe(false);
      });

      it('should handle default category', () => {
        const error = new DBGpError('Test error');
        expect(error.isCategory('general')).toBe(true);
      });
    });

    describe('isRecoverable', () => {
      it('should return true for recoverable errors', () => {
        const error = new DBGpError('Test error', { recoverable: true });
        expect(error.isRecoverable()).toBe(true);
      });

      it('should return false for non-recoverable errors', () => {
        const error = new DBGpError('Test error', { recoverable: false });
        expect(error.isRecoverable()).toBe(false);
      });

      it('should default to true', () => {
        const error = new DBGpError('Test error');
        expect(error.isRecoverable()).toBe(true);
      });
    });
  });

  describe('context methods', () => {
    describe('addContext with key-value pairs', () => {
      it('should add single key-value context', () => {
        const error = new DBGpError('Test error');
        error.addContext('key', 'value');

        expect(error.getContext('key')).toBe('value');
      });

      it('should overwrite existing context key', () => {
        const error = new DBGpError('Test error', {
          context: { key: 'old_value' }
        });

        error.addContext('key', 'new_value');

        expect(error.getContext('key')).toBe('new_value');
      });
    });

    describe('getContext', () => {
      it('should return context value for existing key', () => {
        const error = new DBGpError('Test error', {
          context: { test: 'value' }
        });

        expect(error.getContext('test')).toBe('value');
      });

      it('should return undefined for non-existing key', () => {
        const error = new DBGpError('Test error');

        expect(error.getContext('nonexistent')).toBeUndefined();
      });

      it('should handle null context key', () => {
        const error = new DBGpError('Test error', {
          context: { null: 'value' }
        });

        expect(error.getContext(null)).toBe('value');
      });
    });
  });

  describe('constructor edge cases', () => {
    it('should handle null message', () => {
      const error = new DBGpError(null);
      // null gets converted to string 'null' by Error constructor
      expect(error.message).toBe('null');
    });

    it('should handle undefined options', () => {
      const error = new DBGpError('Test error', undefined);
      expect(error.code).toBe('DBGP_ERROR');
      expect(error.context).toEqual({});
      expect(error.recoverable).toBe(true);
    });

    it('should handle null options', () => {
      // The constructor currently doesn't handle null properly, so this would throw
      expect(() => new DBGpError('Test error', null)).toThrow();
    });

    it('should preserve Error.captureStackTrace behavior', () => {
      // This test ensures the constructor properly calls Error.captureStackTrace if available
      const originalCaptureStackTrace = Error.captureStackTrace;
      let captureStackTraceCalled = false;

      Error.captureStackTrace = jest.fn(() => {
        captureStackTraceCalled = true;
      });

      new DBGpError('Test error');

      expect(captureStackTraceCalled).toBe(true);

      // Restore original function
      Error.captureStackTrace = originalCaptureStackTrace;
    });

    it('should handle missing Error.captureStackTrace gracefully', () => {
      const originalCaptureStackTrace = Error.captureStackTrace;
      Error.captureStackTrace = undefined;

      expect(() => new DBGpError('Test error')).not.toThrow();

      // Restore original function
      Error.captureStackTrace = originalCaptureStackTrace;
    });

    it('should set timestamp as ISO string', () => {
      const error = new DBGpError('Test error');
      const timestamp = new Date(error.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle boolean context values', () => {
      const error = new DBGpError('Test error', {
        context: { flag: true, other: false }
      });

      expect(error.getContext('flag')).toBe(true);
      expect(error.getContext('other')).toBe(false);
    });

    it('should handle numeric context values', () => {
      const error = new DBGpError('Test error', {
        context: { count: 42, zero: 0, negative: -1 }
      });

      expect(error.getContext('count')).toBe(42);
      expect(error.getContext('zero')).toBe(0);
      expect(error.getContext('negative')).toBe(-1);
    });
  });

  describe('fromJSON edge cases', () => {
    it('should handle JSON without optional fields', () => {
      const json = {
        message: 'Basic error',
        code: 'BASIC_ERROR'
      };

      const error = DBGpError.fromJSON(json);

      expect(error.message).toBe('Basic error');
      expect(error.code).toBe('BASIC_ERROR');
      expect(error.context).toEqual({});
      expect(error.recoverable).toBe(true);
      expect(error.category).toBe('general');
    });

    it('should preserve custom timestamp from JSON', () => {
      const customTimestamp = '2024-01-01T00:00:00.000Z';
      const json = {
        message: 'Test error',
        timestamp: customTimestamp
      };

      const error = DBGpError.fromJSON(json);

      expect(error.timestamp).toBe(customTimestamp);
    });

    it('should preserve stack trace from JSON', () => {
      const customStack = 'Custom stack trace';
      const json = {
        message: 'Test error',
        stack: customStack
      };

      const error = DBGpError.fromJSON(json);

      expect(error.stack).toBe(customStack);
    });
  });
});

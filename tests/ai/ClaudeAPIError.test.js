/**
 * ClaudeAPIError Tests
 * Test suite for the Claude API error class
 *
 * Copyright (C) 2024 YDebug Contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const { ClaudeAPIError } = require('../../src/ai/ClaudeClient');

describe('ClaudeAPIError', () => {
  describe('Basic Error Creation', () => {
    it('should create error with message only', () => {
      const error = new ClaudeAPIError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ClaudeAPIError);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('ClaudeAPIError');
    });

    it('should create error with default properties', () => {
      const error = new ClaudeAPIError('Test error');

      expect(error.code).toBe('CLAUDE_API_ERROR');
      expect(error.status).toBeUndefined();
      expect(error.retryable).toBe(false);
      expect(error.timestamp).toBeDefined();
      expect(new Date(error.timestamp)).toBeInstanceOf(Date);
    });

    it('should set timestamp to current time', () => {
      const beforeCreate = Date.now();
      const error = new ClaudeAPIError('Test error');
      const afterCreate = Date.now();
      
      const errorTime = new Date(error.timestamp).getTime();

      expect(errorTime).toBeGreaterThanOrEqual(beforeCreate);
      expect(errorTime).toBeLessThanOrEqual(afterCreate);
    });
  });

  describe('Error Creation with Options', () => {
    it('should create error with custom code', () => {
      const error = new ClaudeAPIError('Test error', { code: 'CUSTOM_ERROR' });

      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ClaudeAPIError');
    });

    it('should create error with status code', () => {
      const error = new ClaudeAPIError('API error', { status: 401 });

      expect(error.status).toBe(401);
      expect(error.code).toBe('CLAUDE_API_ERROR');
    });

    it('should create retryable error', () => {
      const error = new ClaudeAPIError('Temporary error', { retryable: true });

      expect(error.retryable).toBe(true);
    });

    it('should create error with all options', () => {
      const options = {
        code: 'RATE_LIMITED',
        status: 429,
        retryable: true
      };
      const error = new ClaudeAPIError('Rate limit exceeded', options);

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.status).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should handle empty options object', () => {
      const error = new ClaudeAPIError('Test error', {});

      expect(error.code).toBe('CLAUDE_API_ERROR');
      expect(error.status).toBeUndefined();
      expect(error.retryable).toBe(false);
    });

    it('should handle undefined options', () => {
      const error = new ClaudeAPIError('Test error', undefined);

      expect(error.code).toBe('CLAUDE_API_ERROR');
      expect(error.status).toBeUndefined();
      expect(error.retryable).toBe(false);
    });
  });

  describe('Common Error Scenarios', () => {
    it('should create unauthorized error', () => {
      const error = new ClaudeAPIError('Unauthorized access', {
        code: 'UNAUTHORIZED',
        status: 401,
        retryable: false
      });

      expect(error.message).toBe('Unauthorized access');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.status).toBe(401);
      expect(error.retryable).toBe(false);
    });

    it('should create rate limit error', () => {
      const error = new ClaudeAPIError('Rate limit exceeded', {
        code: 'RATE_LIMITED',
        status: 429,
        retryable: true
      });

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.status).toBe(429);
      expect(error.retryable).toBe(true);
    });

    it('should create server error', () => {
      const error = new ClaudeAPIError('Internal server error', {
        code: 'SERVER_ERROR',
        status: 500,
        retryable: true
      });

      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.status).toBe(500);
      expect(error.retryable).toBe(true);
    });

    it('should create missing API key error', () => {
      const error = new ClaudeAPIError('API key is required', {
        code: 'MISSING_API_KEY',
        retryable: false
      });

      expect(error.message).toBe('API key is required');
      expect(error.code).toBe('MISSING_API_KEY');
      expect(error.retryable).toBe(false);
      expect(error.status).toBeUndefined();
    });

    it('should create connection failed error', () => {
      const error = new ClaudeAPIError('Connection test failed', {
        code: 'CONNECTION_FAILED',
        retryable: true
      });

      expect(error.message).toBe('Connection test failed');
      expect(error.code).toBe('CONNECTION_FAILED');
      expect(error.retryable).toBe(true);
    });
  });

  describe('Error Properties and Methods', () => {
    it('should maintain error stack trace', () => {
      const error = new ClaudeAPIError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ClaudeAPIError');
      expect(error.stack).toContain('Test error');
    });

    it('should be instance of Error', () => {
      const error = new ClaudeAPIError('Test error');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ClaudeAPIError).toBe(true);
    });

    it('should have correct toString behavior', () => {
      const error = new ClaudeAPIError('Test error message');

      expect(error.toString()).toBe('ClaudeAPIError: Test error message');
    });

    it('should preserve custom properties when thrown and caught', () => {
      let caughtError;
      
      try {
        throw new ClaudeAPIError('Test error', {
          code: 'TEST_ERROR',
          status: 400,
          retryable: true
        });
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(ClaudeAPIError);
      expect(caughtError.code).toBe('TEST_ERROR');
      expect(caughtError.status).toBe(400);
      expect(caughtError.retryable).toBe(true);
      expect(caughtError.timestamp).toBeDefined();
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON with custom properties', () => {
      const error = new ClaudeAPIError('Serialization test', {
        code: 'SERIALIZATION_ERROR',
        status: 422,
        retryable: false
      });

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      // Note: JSON.stringify on Error objects only includes enumerable properties
      expect(parsed.name).toBe('ClaudeAPIError');
      expect(parsed.code).toBe('SERIALIZATION_ERROR');
      expect(parsed.status).toBe(422);
      expect(parsed.retryable).toBe(false);
      expect(parsed.timestamp).toBeDefined();
    });

    it('should handle serialization of error with additional properties', () => {
      const originalError = new Error('Original error');
      const error = new ClaudeAPIError('Wrapped error', {
        code: 'WRAPPER_ERROR',
        originalError: originalError
      });

      // Add non-enumerable property to test serialization behavior
      Object.defineProperty(error, 'originalError', {
        value: originalError,
        enumerable: true,
        configurable: true
      });

      const serialized = JSON.stringify(error);
      expect(serialized).toBeDefined();
      expect(serialized).toContain('WRAPPER_ERROR');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null message', () => {
      const error = new ClaudeAPIError(null);

      expect(error.message).toBe('null');
      expect(error.name).toBe('ClaudeAPIError');
    });

    it('should handle undefined message', () => {
      const error = new ClaudeAPIError(undefined);

      expect(error.message).toBe('undefined');
      expect(error.name).toBe('ClaudeAPIError');
    });

    it('should handle empty string message', () => {
      const error = new ClaudeAPIError('');

      expect(error.message).toBe('');
      expect(error.name).toBe('ClaudeAPIError');
    });

    it('should handle very long message', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new ClaudeAPIError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
    });

    it('should handle null options gracefully', () => {
      const error = new ClaudeAPIError('Test error', null);

      expect(error.code).toBe('CLAUDE_API_ERROR');
      expect(error.status).toBeUndefined();
      expect(error.retryable).toBe(false);
    });

    it('should handle options with null values', () => {
      const error = new ClaudeAPIError('Test error', {
        code: null,
        status: null,
        retryable: null
      });

      expect(error.code).toBe('CLAUDE_API_ERROR'); // Falls back to default
      expect(error.status).toBe(null);
      expect(error.retryable).toBe(false); // Falls back to default
    });

    it('should handle options with undefined values', () => {
      const error = new ClaudeAPIError('Test error', {
        code: undefined,
        status: undefined,
        retryable: undefined
      });

      expect(error.code).toBe('CLAUDE_API_ERROR');
      expect(error.status).toBeUndefined();
      expect(error.retryable).toBe(false);
    });
  });
});
/**
 * JsonRpcHandler Unit Tests
 * Tests JSON-RPC 2.0 protocol implementation
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const JsonRpcHandler = require('../../../src/mcp/protocol/JsonRpcHandler');

describe('JsonRpcHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new JsonRpcHandler();
  });

  describe('Message Creation', () => {
    describe('Request Creation', () => {
      test('should create valid JSON-RPC request with ID', () => {
        const request = handler.createRequest('test_method', { param: 'value' }, 123);

        expect(request).toEqual({
          jsonrpc: '2.0',
          method: 'test_method',
          params: { param: 'value' },
          id: 123
        });
      });

      test('should create request without params when null', () => {
        const request = handler.createRequest('test_method', null, 123);

        expect(request).toEqual({
          jsonrpc: '2.0',
          method: 'test_method',
          id: 123
        });
        expect(Object.prototype.hasOwnProperty.call(request, 'params')).toBe(false);
      });

      test('should create request without ID when null', () => {
        const request = handler.createRequest('test_method', { param: 'value' }, null);

        expect(request).toEqual({
          jsonrpc: '2.0',
          method: 'test_method',
          params: { param: 'value' }
        });
        expect(Object.prototype.hasOwnProperty.call(request, 'id')).toBe(false);
      });

      test('should handle various parameter types', () => {
        const arrayParams = handler.createRequest('method', ['param1', 'param2'], 1);
        const stringParams = handler.createRequest('method', 'string_param', 2);
        const numberParams = handler.createRequest('method', 42, 3);

        expect(arrayParams.params).toEqual(['param1', 'param2']);
        expect(stringParams.params).toBe('string_param');
        expect(numberParams.params).toBe(42);
      });
    });

    describe('Notification Creation', () => {
      test('should create valid JSON-RPC notification', () => {
        const notification = handler.createNotification('notify_method', { data: 'test' });

        expect(notification).toEqual({
          jsonrpc: '2.0',
          method: 'notify_method',
          params: { data: 'test' }
        });
        expect(Object.prototype.hasOwnProperty.call(notification, 'id')).toBe(false);
      });

      test('should create notification without params', () => {
        const notification = handler.createNotification('notify_method');

        expect(notification).toEqual({
          jsonrpc: '2.0',
          method: 'notify_method'
        });
        expect(Object.prototype.hasOwnProperty.call(notification, 'params')).toBe(false);
      });
    });

    describe('Response Creation', () => {
      test('should create success response', () => {
        const response = handler.createSuccessResponse({ result: 'success' }, 123);

        expect(response).toEqual({
          jsonrpc: '2.0',
          result: { result: 'success' },
          id: 123
        });
      });

      test('should create success response with null result', () => {
        const response = handler.createSuccessResponse(null, 456);

        expect(response).toEqual({
          jsonrpc: '2.0',
          result: null,
          id: 456
        });
      });

      test('should create error response', () => {
        const response = handler.createErrorResponse(
          JsonRpcHandler.ErrorCodes.METHOD_NOT_FOUND,
          'Method not found',
          { method: 'unknown' },
          789
        );

        expect(response).toEqual({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: 'Method not found',
            data: { method: 'unknown' }
          },
          id: 789
        });
      });

      test('should create error response without data', () => {
        const response = handler.createErrorResponse(
          JsonRpcHandler.ErrorCodes.INTERNAL_ERROR,
          'Internal error',
          null,
          999
        );

        expect(response).toEqual({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error'
          },
          id: 999
        });
        expect(Object.prototype.hasOwnProperty.call(response.error, 'data')).toBe(false);
      });
    });
  });

  describe('Message Type Detection', () => {
    test('should identify request messages', () => {
      const request = { jsonrpc: '2.0', method: 'test', id: 1 };
      const notification = { jsonrpc: '2.0', method: 'test' };
      const response = { jsonrpc: '2.0', result: 'ok', id: 1 };

      expect(handler.isRequest(request)).toBe(true);
      expect(handler.isRequest(notification)).toBe(false);
      expect(handler.isRequest(response)).toBe(false);
    });

    test('should identify notification messages', () => {
      const request = { jsonrpc: '2.0', method: 'test', id: 1 };
      const notification = { jsonrpc: '2.0', method: 'test' };
      const response = { jsonrpc: '2.0', result: 'ok', id: 1 };

      expect(handler.isNotification(notification)).toBe(true);
      expect(handler.isNotification(request)).toBe(false);
      expect(handler.isNotification(response)).toBe(false);
    });

    test('should identify response messages', () => {
      const request = { jsonrpc: '2.0', method: 'test', id: 1 };
      const successResponse = { jsonrpc: '2.0', result: 'ok', id: 1 };
      const errorResponse = { jsonrpc: '2.0', error: { code: -1, message: 'error' }, id: 1 };

      expect(handler.isResponse(successResponse)).toBe(true);
      expect(handler.isResponse(errorResponse)).toBe(true);
      expect(handler.isResponse(request)).toBe(false);
    });

    test('should identify error responses', () => {
      const successResponse = { jsonrpc: '2.0', result: 'ok', id: 1 };
      const errorResponse = { jsonrpc: '2.0', error: { code: -1, message: 'error' }, id: 1 };

      expect(handler.isErrorResponse(errorResponse)).toBe(true);
      expect(handler.isErrorResponse(successResponse)).toBe(false);
    });
  });

  describe('Message Validation', () => {
    test('should validate correct JSON-RPC messages', () => {
      const request = { jsonrpc: '2.0', method: 'test', id: 1 };
      const notification = { jsonrpc: '2.0', method: 'test' };
      const response = { jsonrpc: '2.0', result: 'ok', id: 1 };

      expect(handler.validateMessage(request)).toEqual({ valid: true });
      expect(handler.validateMessage(notification)).toEqual({ valid: true });
      expect(handler.validateMessage(response)).toEqual({ valid: true });
    });

    test('should reject messages without jsonrpc field', () => {
      const invalid = { method: 'test', id: 1 };

      const result = handler.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing jsonrpc field');
    });

    test('should reject messages with wrong jsonrpc version', () => {
      const invalid = { jsonrpc: '1.0', method: 'test', id: 1 };

      const result = handler.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid jsonrpc version');
    });

    test('should reject requests without method', () => {
      const invalid = { jsonrpc: '2.0' }; // No method, no result/error, no ID - ambiguous case

      const result = handler.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Request must have method field');
    });

    test('should reject responses without result or error', () => {
      const invalid = { jsonrpc: '2.0', id: 1 };

      const result = handler.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Response must have result or error field');
    });

    test('should reject responses with both result and error', () => {
      const invalid = { jsonrpc: '2.0', result: 'ok', error: { code: -1, message: 'error' }, id: 1 };

      const result = handler.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Response cannot have both result and error fields');
    });

    test('should reject error objects without required fields', () => {
      const missingCode = { jsonrpc: '2.0', error: { message: 'error' }, id: 1 };
      const missingMessage = { jsonrpc: '2.0', error: { code: -1 }, id: 1 };

      expect(handler.validateMessage(missingCode).valid).toBe(false);
      expect(handler.validateMessage(missingMessage).valid).toBe(false);
    });
  });

  describe('Message Parsing', () => {
    test('should parse valid JSON-RPC messages', () => {
      const request = '{"jsonrpc":"2.0","method":"test","id":1}';

      const result = handler.parseMessage(request);

      expect(result.success).toBe(true);
      expect(result.message).toEqual({
        jsonrpc: '2.0',
        method: 'test',
        id: 1
      });
    });

    test('should handle invalid JSON', () => {
      const invalid = '{"jsonrpc":"2.0","method":}';

      const result = handler.parseMessage(invalid);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    test('should handle invalid JSON-RPC structure', () => {
      const invalid = '{"jsonrpc":"1.0","method":"test"}';

      const result = handler.parseMessage(invalid);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid jsonrpc version');
    });

    test('should handle empty strings', () => {
      const result = handler.parseMessage('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty message');
    });

    test('should handle non-string input', () => {
      const result1 = handler.parseMessage(null);
      const result2 = handler.parseMessage(undefined);
      const result3 = handler.parseMessage(123);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });
  });

  describe('Message Serialization', () => {
    test('should serialize messages to JSON', () => {
      const message = { jsonrpc: '2.0', method: 'test', id: 1 };

      const serialized = handler.serializeMessage(message);

      expect(serialized).toBe('{"jsonrpc":"2.0","method":"test","id":1}');
    });

    test('should handle serialization errors gracefully', () => {
      const circular = {};
      circular.self = circular;

      expect(() => {
        handler.serializeMessage(circular);
      }).toThrow();
    });

    test('should preserve message structure during round-trip', () => {
      const original = {
        jsonrpc: '2.0',
        method: 'complex_method',
        params: {
          array: [1, 2, 3],
          nested: { deep: { value: 'test' } },
          null_value: null,
          boolean: true
        },
        id: 'unique-id'
      };

      const serialized = handler.serializeMessage(original);
      const parsed = handler.parseMessage(serialized);

      expect(parsed.success).toBe(true);
      expect(parsed.message).toEqual(original);
    });
  });

  describe('Error Codes', () => {
    test('should have correct standard error codes', () => {
      expect(JsonRpcHandler.ErrorCodes.PARSE_ERROR).toBe(-32700);
      expect(JsonRpcHandler.ErrorCodes.INVALID_REQUEST).toBe(-32600);
      expect(JsonRpcHandler.ErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
      expect(JsonRpcHandler.ErrorCodes.INVALID_PARAMS).toBe(-32602);
      expect(JsonRpcHandler.ErrorCodes.INTERNAL_ERROR).toBe(-32603);
    });

    test('should create error responses with correct codes', () => {
      const parseError = handler.createErrorResponse(
        JsonRpcHandler.ErrorCodes.PARSE_ERROR,
        'Parse error',
        null,
        null
      );

      expect(parseError.error.code).toBe(-32700);
    });
  });

  describe('Edge Cases', () => {
    test('should handle messages with extra fields', () => {
      const message = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
        extraField: 'should be ignored'
      };

      const result = handler.validateMessage(message);
      expect(result.valid).toBe(true);
    });

    test('should handle numeric string IDs', () => {
      const message = { jsonrpc: '2.0', method: 'test', id: '123' };

      const result = handler.validateMessage(message);
      expect(result.valid).toBe(true);
    });

    test('should handle null IDs in requests', () => {
      const message = { jsonrpc: '2.0', method: 'test', id: null };

      const result = handler.validateMessage(message);
      expect(result.valid).toBe(true);
    });

    test('should handle complex parameter structures', () => {
      const complexParams = {
        string: 'test',
        number: 42,
        boolean: true,
        null_value: null,
        array: [1, 'two', { three: 3 }],
        object: {
          nested: {
            deeply: {
              value: 'found'
            }
          }
        }
      };

      const request = handler.createRequest('complex_test', complexParams, 1);
      const serialized = handler.serializeMessage(request);
      const parsed = handler.parseMessage(serialized);

      expect(parsed.success).toBe(true);
      expect(parsed.message.params).toEqual(complexParams);
    });
  });
});

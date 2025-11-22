/**
 * JsonRpcHandler Enhanced Unit Tests
 * Additional edge cases and error scenarios for maximum coverage
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const JsonRpcHandler = require('../../../src/mcp/protocol/JsonRpcHandler');

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../../src/utils/Logger', () => ({ logger: mockLogger }));

describe('JsonRpcHandler Enhanced Tests', () => {
  let handler;

  beforeEach(() => {
    handler = new JsonRpcHandler();
    jest.clearAllMocks();
  });

  describe('Additional Message Validation Edge Cases', () => {
    test('should reject non-object messages', () => {
      const tests = [
        { input: null, expected: 'Message must be an object' },
        { input: undefined, expected: 'Message must be an object' },
        { input: 'string', expected: 'Message must be an object' },
        { input: 123, expected: 'Message must be an object' },
        { input: [], expected: 'Message must be an object' },
        { input: true, expected: 'Message must be an object' }
      ];

      tests.forEach(({ input, expected }) => {
        const result = handler.validateMessage(input);
        expect(result.valid).toBe(false);
        expect(result.error).toBe(expected);
      });
    });

    test('should reject messages with invalid method types', () => {
      const invalidMethods = [
        { jsonrpc: '2.0', method: 123, id: 1 },
        { jsonrpc: '2.0', method: null, id: 1 },
        { jsonrpc: '2.0', method: {}, id: 1 },
        { jsonrpc: '2.0', method: [], id: 1 },
        { jsonrpc: '2.0', method: true, id: 1 }
      ];

      invalidMethods.forEach(message => {
        const result = handler.validateMessage(message);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Method must be a string');
      });
    });

    test('should reject messages with invalid ID types', () => {
      const invalidIds = [
        { jsonrpc: '2.0', method: 'test', id: {} },
        { jsonrpc: '2.0', method: 'test', id: [] },
        { jsonrpc: '2.0', method: 'test', id: true },
        { jsonrpc: '2.0', method: 'test', id: false }
      ];

      invalidIds.forEach(message => {
        const result = handler.validateMessage(message);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('ID must be string, number, or null');
      });
    });

    test('should validate messages with valid ID types', () => {
      const validIds = [
        { jsonrpc: '2.0', method: 'test', id: 'string-id' },
        { jsonrpc: '2.0', method: 'test', id: 123 },
        { jsonrpc: '2.0', method: 'test', id: 0 },
        { jsonrpc: '2.0', method: 'test', id: -1 },
        { jsonrpc: '2.0', method: 'test', id: null }
      ];

      validIds.forEach(message => {
        const result = handler.validateMessage(message);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject error responses with invalid error object', () => {
      const invalidErrors = [
        { jsonrpc: '2.0', error: null, id: 1 },
        { jsonrpc: '2.0', error: 'string-error', id: 1 },
        { jsonrpc: '2.0', error: 123, id: 1 },
        { jsonrpc: '2.0', error: [], id: 1 }
      ];

      invalidErrors.forEach(message => {
        const result = handler.validateMessage(message);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Error must be an object');
      });
    });

    test('should reject error responses with invalid error code types', () => {
      const invalidCodes = [
        { jsonrpc: '2.0', error: { code: 'string', message: 'error' }, id: 1 },
        { jsonrpc: '2.0', error: { code: null, message: 'error' }, id: 1 },
        { jsonrpc: '2.0', error: { code: {}, message: 'error' }, id: 1 },
        { jsonrpc: '2.0', error: { code: [], message: 'error' }, id: 1 }
      ];

      invalidCodes.forEach(message => {
        const result = handler.validateMessage(message);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Error code must be a number');
      });
    });

    test('should reject error responses with invalid error message types', () => {
      const invalidMessages = [
        { jsonrpc: '2.0', error: { code: -1, message: 123 }, id: 1 },
        { jsonrpc: '2.0', error: { code: -1, message: null }, id: 1 },
        { jsonrpc: '2.0', error: { code: -1, message: {} }, id: 1 },
        { jsonrpc: '2.0', error: { code: -1, message: [] }, id: 1 }
      ];

      invalidMessages.forEach(message => {
        const result = handler.validateMessage(message);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Error message must be a string');
      });
    });

    test('should handle response messages without ID for error responses', () => {
      // Error responses to notifications don't need ID
      const errorResponse = {
        jsonrpc: '2.0',
        error: { code: -1, message: 'error' }
      };

      const result = handler.validateMessage(errorResponse);
      expect(result.valid).toBe(true);
    });

    test('should reject success responses without ID', () => {
      const responseWithoutId = {
        jsonrpc: '2.0',
        result: 'success'
      };

      const result = handler.validateMessage(responseWithoutId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Response must have an ID');
    });

    test('should handle messages with undefined jsonrpc field', () => {
      const messageWithUndefinedJsonRpc = {
        jsonrpc: undefined,
        method: 'test',
        id: 1
      };

      const result = handler.validateMessage(messageWithUndefinedJsonRpc);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing jsonrpc field');
    });
  });

  describe('Message Type Detection Edge Cases', () => {
    test('should handle null and undefined messages', () => {
      expect(handler.isRequest(null)).toBe(false);
      expect(handler.isRequest(undefined)).toBe(false);

      expect(handler.isNotification(null)).toBe(false);
      expect(handler.isNotification(undefined)).toBe(false);

      expect(handler.isResponse(null)).toBe(false);
      expect(handler.isResponse(undefined)).toBe(false);

      expect(handler.isErrorResponse(null)).toBe(false);
      expect(handler.isErrorResponse(undefined)).toBe(false);
    });

    test('should handle messages with undefined method', () => {
      const messageWithUndefinedMethod = { jsonrpc: '2.0', method: undefined, id: 1 };

      expect(handler.isRequest(messageWithUndefinedMethod)).toBe(false);
      expect(handler.isNotification(messageWithUndefinedMethod)).toBe(false);
    });

    test('should handle messages with undefined id', () => {
      const messageWithUndefinedId = { jsonrpc: '2.0', method: 'test', id: undefined };

      expect(handler.isRequest(messageWithUndefinedId)).toBe(true);
      expect(handler.isNotification(messageWithUndefinedId)).toBe(false);
    });

    test('should handle messages with undefined result and error', () => {
      const messageWithUndefinedResults = { jsonrpc: '2.0', result: undefined, error: undefined, id: 1 };

      expect(handler.isResponse(messageWithUndefinedResults)).toBe(false);
      expect(handler.isErrorResponse(messageWithUndefinedResults)).toBe(false);
    });

    test('should handle mixed type detection scenarios', () => {
      // Message that looks like both request and response (shouldn't happen but test edge case)
      const mixedMessage = {
        jsonrpc: '2.0',
        method: 'test',
        result: 'ok',
        id: 1
      };

      // Should be detected as request first (method takes precedence)
      expect(handler.isRequest(mixedMessage)).toBe(true);
      expect(handler.isResponse(mixedMessage)).toBe(true);
    });
  });

  describe('Parse Message Additional Edge Cases', () => {
    test('should handle various falsy inputs', () => {
      const falsyInputs = [null, undefined, false, 0, ''];

      falsyInputs.forEach(input => {
        const result = handler.parseMessage(input);
        expect(result.success).toBe(false);
        if (input === '') {
          expect(result.error).toBe('Empty message');
        } else {
          expect(result.error).toContain('Invalid JSON');
        }
      });
    });

    test('should handle whitespace-only strings', () => {
      const whitespaceInputs = [' ', '\n', '\t', '\r\n', '   \t   '];

      whitespaceInputs.forEach(input => {
        const result = handler.parseMessage(input);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid JSON');
      });
    });

    test('should handle very long JSON strings', () => {
      const largeObject = {
        jsonrpc: '2.0',
        method: 'test',
        params: {
          largeArray: Array(1000).fill().map((_, i) => ({ index: i, value: `item-${i}` })),
          largeString: 'x'.repeat(10000)
        },
        id: 1
      };

      const serialized = JSON.stringify(largeObject);
      const result = handler.parseMessage(serialized);

      expect(result.success).toBe(true);
      expect(result.message.params.largeArray).toHaveLength(1000);
      expect(result.message.params.largeString).toHaveLength(10000);
    });

    test('should handle JSON with special characters', () => {
      const messageWithSpecialChars = {
        jsonrpc: '2.0',
        method: 'test',
        params: {
          unicode: '🚀 Unicode test ñáéíóú',
          escaped: 'Line 1\nLine 2\tTabbed "Quoted"',
          backslash: 'Path\\to\\file'
        },
        id: 1
      };

      const serialized = JSON.stringify(messageWithSpecialChars);
      const result = handler.parseMessage(serialized);

      expect(result.success).toBe(true);
      expect(result.message.params.unicode).toBe('🚀 Unicode test ñáéíóú');
      expect(result.message.params.escaped).toBe('Line 1\nLine 2\tTabbed "Quoted"');
    });

    test('should handle malformed JSON with specific error types', () => {
      const malformedExamples = [
        { input: '{', expectedError: 'Invalid JSON' },
        { input: '{"jsonrpc":"2.0",}', expectedError: 'Invalid JSON' },
        { input: '{"jsonrpc":"2.0","method":}', expectedError: 'Invalid JSON' },
        { input: '{"jsonrpc":"2.0","method":"test","params":}', expectedError: 'Invalid JSON' },
        { input: 'not json at all', expectedError: 'Invalid JSON' },
        { input: '12345', expectedError: 'Message must be an object' } // Valid JSON but not object
      ];

      malformedExamples.forEach(({ input, expectedError }) => {
        const result = handler.parseMessage(input);
        expect(result.success).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });
  });

  describe('Message Creation Edge Cases', () => {
    test('should create requests with zero as valid id', () => {
      const request = handler.createRequest('test', null, 0);
      expect(request.id).toBe(0);
      expect(Object.prototype.hasOwnProperty.call(request, 'id')).toBe(true);
    });

    test('should create requests with empty string as valid id', () => {
      const request = handler.createRequest('test', null, '');
      expect(request.id).toBe('');
      expect(Object.prototype.hasOwnProperty.call(request, 'id')).toBe(true);
    });

    test('should handle all parameter types correctly', () => {
      const testCases = [
        { params: undefined, shouldHaveParams: false },
        { params: null, shouldHaveParams: false },
        { params: '', shouldHaveParams: true },
        { params: 0, shouldHaveParams: true },
        { params: false, shouldHaveParams: true },
        { params: [], shouldHaveParams: true },
        { params: {}, shouldHaveParams: true }
      ];

      testCases.forEach(({ params, shouldHaveParams }) => {
        const request = handler.createRequest('test', params, 1);

        if (shouldHaveParams) {
          expect(Object.prototype.hasOwnProperty.call(request, 'params')).toBe(true);
          expect(request.params).toBe(params);
        } else {
          expect(Object.prototype.hasOwnProperty.call(request, 'params')).toBe(false);
        }
      });
    });

    test('should create error responses with all error codes', () => {
      const errorCodes = [
        JsonRpcHandler.ErrorCodes.PARSE_ERROR,
        JsonRpcHandler.ErrorCodes.INVALID_REQUEST,
        JsonRpcHandler.ErrorCodes.METHOD_NOT_FOUND,
        JsonRpcHandler.ErrorCodes.INVALID_PARAMS,
        JsonRpcHandler.ErrorCodes.INTERNAL_ERROR,
        JsonRpcHandler.ErrorCodes.SERVER_ERROR_START,
        JsonRpcHandler.ErrorCodes.SERVER_ERROR_END
      ];

      errorCodes.forEach(code => {
        const response = handler.createErrorResponse(code, 'Test error', null, 1);
        expect(response.error.code).toBe(code);
        expect(response.error.message).toBe('Test error');
      });
    });

    test('should create error responses with complex data', () => {
      const complexData = {
        details: 'Complex error details',
        stack: ['frame1', 'frame2', 'frame3'],
        timestamp: new Date().toISOString(),
        nested: {
          level1: {
            level2: 'deep error data'
          }
        }
      };

      const response = handler.createErrorResponse(-32000, 'Complex error', complexData, 'test-id');

      expect(response.error.data).toEqual(complexData);
      expect(response.id).toBe('test-id');
    });

    test('should handle error response with null id', () => {
      const response = handler.createErrorResponse(-32700, 'Parse error', null, null);
      expect(response.id).toBeNull();
      expect(Object.prototype.hasOwnProperty.call(response, 'id')).toBe(true);
    });
  });

  describe('Serialization Edge Cases', () => {
    test('should handle serialization of various data types', () => {
      const testMessage = {
        jsonrpc: '2.0',
        method: 'test',
        params: {
          string: 'test',
          number: 42,
          float: 3.14,
          negative: -1,
          zero: 0,
          boolean_true: true,
          boolean_false: false,
          null_value: null,
          empty_string: '',
          empty_array: [],
          empty_object: {},
          date: new Date('2024-01-01T00:00:00Z').toISOString()
        },
        id: 'complex-test'
      };

      const serialized = handler.serializeMessage(testMessage);
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual(testMessage);
    });

    test('should preserve numeric precision in serialization', () => {
      const precisionTest = {
        jsonrpc: '2.0',
        method: 'precision_test',
        params: {
          integer: 9007199254740991, // Max safe integer
          float: 0.1 + 0.2, // Float precision test
          scientific: 1e-10,
          negative_scientific: -1e10
        },
        id: 1
      };

      const serialized = handler.serializeMessage(precisionTest);
      const parsed = JSON.parse(serialized);

      expect(parsed.params.integer).toBe(precisionTest.params.integer);
      expect(parsed.params.scientific).toBe(precisionTest.params.scientific);
    });

    test('should handle undefined values in serialization', () => {
      // Note: JSON.stringify removes undefined values from objects
      const messageWithUndefined = {
        jsonrpc: '2.0',
        method: 'test',
        params: {
          defined: 'value',
          undefined: undefined,
          null_value: null
        },
        id: 1
      };

      const serialized = handler.serializeMessage(messageWithUndefined);
      const parsed = JSON.parse(serialized);

      expect(parsed.params.defined).toBe('value');
      expect(parsed.params.null_value).toBeNull();
      expect(Object.prototype.hasOwnProperty.call(parsed.params, 'undefined')).toBe(false);
    });
  });

  describe('Complete Round-trip Edge Cases', () => {
    test('should handle complete round-trip with edge case values', () => {
      const edgeCaseMessage = {
        jsonrpc: '2.0',
        method: 'edge_case_test',
        params: {
          max_safe_integer: Number.MAX_SAFE_INTEGER,
          min_safe_integer: Number.MIN_SAFE_INTEGER,
          infinity: null, // Can't serialize Infinity, so test with null
          empty_nested: { level1: { level2: { level3: {} } } },
          array_of_nulls: [null, null, null],
          mixed_array: [1, 'two', null, { four: 4 }, [5, 6]],
          boolean_string: 'true', // String, not boolean
          number_string: '42',
          special_chars: '\u0000\u001f\u007f\u0080\u00ff'
        },
        id: 'edge-case-id'
      };

      const serialized = handler.serializeMessage(edgeCaseMessage);
      const parseResult = handler.parseMessage(serialized);
      const validation = handler.validateMessage(parseResult.message);

      expect(parseResult.success).toBe(true);
      expect(validation.valid).toBe(true);
      expect(parseResult.message).toEqual(edgeCaseMessage);
    });

    test('should maintain type information through round-trip', () => {
      const typeTestMessage = {
        jsonrpc: '2.0',
        method: 'type_test',
        params: {
          string: 'string',
          number: 42,
          boolean: true,
          null_value: null,
          array: [1, 2, 3],
          object: { nested: 'value' }
        },
        id: 1
      };

      const serialized = handler.serializeMessage(typeTestMessage);
      const parsed = handler.parseMessage(serialized);

      expect(typeof parsed.message.params.string).toBe('string');
      expect(typeof parsed.message.params.number).toBe('number');
      expect(typeof parsed.message.params.boolean).toBe('boolean');
      expect(parsed.message.params.null_value).toBeNull();
      expect(Array.isArray(parsed.message.params.array)).toBe(true);
      expect(typeof parsed.message.params.object).toBe('object');
    });
  });

  describe('Error Code Completeness', () => {
    test('should have all required error codes', () => {
      const errorCodes = JsonRpcHandler.ErrorCodes;

      // Standard JSON-RPC error codes
      expect(errorCodes.PARSE_ERROR).toBe(-32700);
      expect(errorCodes.INVALID_REQUEST).toBe(-32600);
      expect(errorCodes.METHOD_NOT_FOUND).toBe(-32601);
      expect(errorCodes.INVALID_PARAMS).toBe(-32602);
      expect(errorCodes.INTERNAL_ERROR).toBe(-32603);

      // Server error range
      expect(errorCodes.SERVER_ERROR_START).toBe(-32099);
      expect(errorCodes.SERVER_ERROR_END).toBe(-32000);

      // Verify the range makes sense
      expect(errorCodes.SERVER_ERROR_END).toBeGreaterThan(errorCodes.SERVER_ERROR_START);
    });

    test('should create responses for all error code types', () => {
      const allErrorCodes = Object.values(JsonRpcHandler.ErrorCodes);

      allErrorCodes.forEach(code => {
        const response = handler.createErrorResponse(code, `Error ${code}`, null, 1);

        expect(response.jsonrpc).toBe('2.0');
        expect(response.error.code).toBe(code);
        expect(response.error.message).toBe(`Error ${code}`);
        expect(response.id).toBe(1);
      });
    });
  });
});

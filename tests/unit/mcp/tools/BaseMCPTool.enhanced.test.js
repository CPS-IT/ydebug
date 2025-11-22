/**
 * BaseMCPTool Enhanced Unit Tests
 * Additional comprehensive tests for edge cases and error scenarios
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const BaseMCPTool = require('../../../../src/mcp/tools/BaseMCPTool');
const ServiceRegistry = require('../../../../src/mcp/ServiceRegistry');

// Mock Logger module
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../../../src/utils/Logger', () => ({ logger: mockLogger }));

// Extended test implementation with edge cases
class ExtendedTestTool extends BaseMCPTool {
  constructor(serviceRegistry, customConfig = {}) {
    super(serviceRegistry);
    this.config = customConfig;
  }

  getDefinition() {
    return {
      name: 'extended_test_tool',
      description: 'Extended test tool with comprehensive schema',
      inputSchema: {
        type: 'object',
        properties: {
          requiredString: { type: 'string' },
          optionalNumber: { type: 'number', minimum: 0, maximum: 100 },
          integerField: { type: 'integer' },
          booleanField: { type: 'boolean' },
          arrayField: { type: 'array', items: { type: 'string' } },
          enumField: { type: 'string', enum: ['option1', 'option2', 'option3'] },
          objectField: {
            type: 'object',
            properties: {
              nestedString: { type: 'string' },
              nestedNumber: { type: 'number' }
            }
          }
        },
        required: ['requiredString'],
        additionalProperties: false
      }
    };
  }

  async execute(params) {
    if (params.throwError) {
      throw new Error('Intentional test error');
    }
    return { executed: true, params };
  }
}

// Minimal implementation for testing abstract methods
class MinimalTool extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'minimal',
      description: 'Minimal tool',
      inputSchema: { type: 'object' }
    };
  }

  async execute() {
    return {};
  }
}

// Tool without schema for testing validation edge cases
class NoSchemaTool extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'no_schema',
      description: 'Tool without input schema'
      // No inputSchema property
    };
  }

  async execute() {
    return {};
  }
}

describe('BaseMCPTool Enhanced Tests', () => {
  let serviceRegistry;
  let tool;
  let mockService;

  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
    mockService = {
      name: 'mockService',
      data: { value: 'test' },
      method: jest.fn(() => 'mock result'),
      asyncMethod: jest.fn(() => Promise.resolve('async result'))
    };
    serviceRegistry.register('mockService', mockService);

    tool = new ExtendedTestTool(serviceRegistry);
    tool.logger = mockLogger;

    jest.clearAllMocks();
  });

  describe('Constructor Edge Cases', () => {
    test('should handle falsy service registry values', () => {
      expect(() => new ExtendedTestTool(null)).toThrow('ServiceRegistry is required for MCP tools');
      expect(() => new ExtendedTestTool(undefined)).toThrow('ServiceRegistry is required for MCP tools');
      expect(() => new ExtendedTestTool(false)).toThrow('ServiceRegistry is required for MCP tools');
      expect(() => new ExtendedTestTool(0)).toThrow('ServiceRegistry is required for MCP tools');
      expect(() => new ExtendedTestTool('')).toThrow('ServiceRegistry is required for MCP tools');
    });

    test('should accept empty service registry', () => {
      const emptyRegistry = new ServiceRegistry();
      expect(() => new ExtendedTestTool(emptyRegistry)).not.toThrow();
    });

    test('should store service registry reference correctly', () => {
      const testRegistry = new ServiceRegistry();
      const testTool = new ExtendedTestTool(testRegistry);

      expect(testTool.services).toBe(testRegistry);
      expect(testTool.services).toBeInstanceOf(ServiceRegistry);
    });

    test('should initialize with custom configuration', () => {
      const config = { timeout: 5000, retries: 3 };
      const customTool = new ExtendedTestTool(serviceRegistry, config);

      expect(customTool.config).toBe(config);
    });
  });

  describe('Advanced Parameter Validation', () => {
    test('should validate integer type correctly', () => {
      const schema = {
        type: 'object',
        properties: {
          intValue: { type: 'integer' },
          floatValue: { type: 'number' }
        }
      };

      // Valid integer
      expect(tool.validateParameters({ intValue: 42 }, schema)).toEqual({ valid: true });
      expect(tool.validateParameters({ intValue: -1 }, schema)).toEqual({ valid: true });
      expect(tool.validateParameters({ intValue: 0 }, schema)).toEqual({ valid: true });

      // Invalid integer (float)
      const floatResult = tool.validateParameters({ intValue: 3.14 }, schema);
      expect(floatResult.valid).toBe(false);
      expect(floatResult.errors).toContain('Parameter intValue must be of type integer, got number');

      // Valid float
      expect(tool.validateParameters({ floatValue: 3.14 }, schema)).toEqual({ valid: true });
    });

    test('should validate numeric ranges', () => {
      const schema = {
        type: 'object',
        properties: {
          rangedNumber: { type: 'number', minimum: 10, maximum: 100 }
        }
      };

      // Valid range
      expect(tool.validateParameters({ rangedNumber: 50 }, schema)).toEqual({ valid: true });
      expect(tool.validateParameters({ rangedNumber: 10 }, schema)).toEqual({ valid: true });
      expect(tool.validateParameters({ rangedNumber: 100 }, schema)).toEqual({ valid: true });

      // Below minimum
      const belowResult = tool.validateParameters({ rangedNumber: 5 }, schema);
      expect(belowResult.valid).toBe(false);
      expect(belowResult.errors).toContain('Parameter rangedNumber must be at least 10');

      // Above maximum
      const aboveResult = tool.validateParameters({ rangedNumber: 150 }, schema);
      expect(aboveResult.valid).toBe(false);
      expect(aboveResult.errors).toContain('Parameter rangedNumber must be at most 100');
    });

    test('should validate complex nested structures', () => {
      const schema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              timeout: { type: 'number', minimum: 0 },
              options: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['timeout']
          }
        },
        required: ['config']
      };

      // Valid nested structure
      const validParams = {
        config: {
          timeout: 5000,
          options: ['debug', 'verbose']
        }
      };
      expect(tool.validateParameters(validParams, schema)).toEqual({ valid: true });

      // Missing required nested property
      const missingNestedResult = tool.validateParameters({ config: {} }, schema);
      expect(missingNestedResult.valid).toBe(false);
      expect(missingNestedResult.errors).toContain('Missing required parameter: timeout');
    });

    test('should handle validation without schema', () => {
      const noSchemaTool = new NoSchemaTool(serviceRegistry);

      // Should use getDefinition().inputSchema which is undefined
      const result = noSchemaTool.validateParameters({ anyParam: 'anyValue' });
      expect(result).toEqual({ valid: true });
    });

    test('should handle validation with null schema', () => {
      const result = tool.validateParameters({ param: 'value' }, null);
      expect(result).toEqual({ valid: true });
    });

    test('should handle validation with empty schema', () => {
      const result = tool.validateParameters({ param: 'value' }, {});
      expect(result).toEqual({ valid: true });
    });

    test('should validate multiple parameter errors', () => {
      const schema = {
        type: 'object',
        properties: {
          stringParam: { type: 'string' },
          numberParam: { type: 'number', minimum: 0 },
          enumParam: { type: 'string', enum: ['a', 'b', 'c'] }
        },
        required: ['stringParam', 'numberParam']
      };

      const invalidParams = {
        stringParam: 123, // wrong type
        numberParam: -5,  // below minimum
        enumParam: 'invalid' // not in enum
      };

      const result = tool.validateParameters(invalidParams, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Parameter stringParam must be of type string, got number');
      expect(result.errors).toContain('Parameter numberParam must be at least 0');
      expect(result.errors).toContain('Parameter enumParam must be one of: a, b, c');
    });

    test('should handle edge case parameter values', () => {
      const schema = {
        type: 'object',
        properties: {
          nullValue: { type: 'string' },
          undefinedValue: { type: 'string' },
          emptyString: { type: 'string' },
          zero: { type: 'number' },
          false: { type: 'boolean' }
        }
      };

      const edgeParams = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        false: false
      };

      const result = tool.validateParameters(edgeParams, schema);
      // All should fail type validation except for the correctly typed ones
      expect(result.valid).toBe(false);

      // But zero and false should pass as they are correct types
      const validEdgeParams = {
        emptyString: '',
        zero: 0,
        false: false
      };
      expect(tool.validateParameters(validEdgeParams, schema)).toEqual({ valid: true });
    });
  });

  describe('Advanced Response Formatting', () => {
    test('should format response with all format types', () => {
      const data = { message: 'test', count: 42 };

      const defaultResponse = tool.formatResponse(data);
      expect(defaultResponse.content[0].text).toBe(JSON.stringify(data, null, 2));

      const jsonResponse = tool.formatResponse(data, 'json');
      expect(jsonResponse.content[0].text).toBe(JSON.stringify(data, null, 2));

      const textResponse = tool.formatResponse(data, 'text');
      expect(textResponse.content[0].text).toBe('[object Object]');
    });

    test('should handle circular references in response formatting', () => {
      const circularObj = { name: 'circular' };
      circularObj.self = circularObj;

      // JSON.stringify should throw, but we handle it gracefully
      expect(() => tool.formatResponse(circularObj)).not.toThrow();
    });

    test('should format various primitive types correctly', () => {
      expect(tool.formatResponse('string').content[0].text).toBe('string');
      expect(tool.formatResponse(42).content[0].text).toBe('42');
      expect(tool.formatResponse(true).content[0].text).toBe('true');
      expect(tool.formatResponse(false).content[0].text).toBe('false');
      expect(tool.formatResponse(0).content[0].text).toBe('0');
      expect(tool.formatResponse('').content[0].text).toBe('');
    });

    test('should format arrays and objects correctly', () => {
      const array = [1, 'two', { three: 3 }];
      const arrayResponse = tool.formatResponse(array);
      expect(arrayResponse.content[0].text).toBe(JSON.stringify(array, null, 2));

      const object = { nested: { deep: { value: 'found' } } };
      const objectResponse = tool.formatResponse(object);
      expect(objectResponse.content[0].text).toBe(JSON.stringify(object, null, 2));
    });

    test('should handle format parameter edge cases', () => {
      const data = 'test';

      expect(tool.formatResponse(data, 'unknown')).toEqual(tool.formatResponse(data, 'default'));
      expect(tool.formatResponse(data, null)).toEqual(tool.formatResponse(data, 'default'));
      expect(tool.formatResponse(data, undefined)).toEqual(tool.formatResponse(data, 'default'));
      expect(tool.formatResponse(data, '')).toEqual(tool.formatResponse(data, 'default'));
    });

    test('should maintain consistent response structure', () => {
      const responses = [
        tool.formatResponse('test'),
        tool.formatResponse(123),
        tool.formatResponse({ key: 'value' }),
        tool.formatResponse([1, 2, 3]),
        tool.formatResponse(null)
      ];

      responses.forEach(response => {
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('isError', false);
        expect(response).toHaveProperty('isSuccess', true);
        expect(Array.isArray(response.content)).toBe(true);
        expect(response.content[0]).toHaveProperty('type', 'text');
        expect(response.content[0]).toHaveProperty('text');
      });
    });
  });

  describe('Advanced Error Response Formatting', () => {
    test('should format various error types', () => {
      // Standard Error
      const standardError = new Error('Standard error');
      const standardResponse = tool.formatErrorResponse(standardError);
      expect(standardResponse._meta.error).toBe('Standard error');
      expect(standardResponse._meta.stack).toBe(standardError.stack);

      // TypeError
      const typeError = new TypeError('Type error');
      const typeResponse = tool.formatErrorResponse(typeError);
      expect(typeResponse._meta.error).toBe('Type error');

      // Custom Error
      class CustomError extends Error {
        constructor(message, code) {
          super(message);
          this.name = 'CustomError';
          this.code = code;
        }
      }
      const customError = new CustomError('Custom error', 'E001');
      const customResponse = tool.formatErrorResponse(customError);
      expect(customResponse._meta.error).toBe('Custom error');
    });

    test('should handle custom error messages', () => {
      const error = new Error('Original error');
      const customMessage = 'Custom display message';

      const response = tool.formatErrorResponse(error, customMessage);

      expect(response.content[0].text).toBe('Error: Custom display message');
      expect(response._meta.error).toBe('Original error'); // Original error preserved in meta
    });

    test('should handle non-error objects as errors', () => {
      const responses = [
        tool.formatErrorResponse('string error'),
        tool.formatErrorResponse(404),
        tool.formatErrorResponse({ error: 'object error' }),
        tool.formatErrorResponse(['array', 'error']),
        tool.formatErrorResponse(null),
        tool.formatErrorResponse(undefined)
      ];

      responses.forEach(response => {
        expect(response.isError).toBe(true);
        expect(response.isSuccess).toBe(false);
        expect(response.content[0].text).toMatch(/^Error: /);
        expect(response._meta.stack).toBeUndefined();
      });
    });

    test('should handle errors with complex custom messages', () => {
      const error = new Error('Base error');
      const complexMessage = 'Validation failed: missing required fields [name, email], invalid format for phone';

      const response = tool.formatErrorResponse(error, complexMessage);

      expect(response.content[0].text).toBe(`Error: ${complexMessage}`);
      expect(response._meta.error).toBe('Base error');
    });
  });

  describe('Service Access Edge Cases', () => {
    test('should handle service registry changes during execution', () => {
      const dynamicService = { data: 'dynamic' };

      // Service doesn't exist initially
      expect(() => tool.getService('dynamicService')).toThrow('Required service \'dynamicService\' not available');

      // Register service
      serviceRegistry.register('dynamicService', dynamicService);
      expect(tool.getService('dynamicService')).toBe(dynamicService);

      // Unregister service
      serviceRegistry.unregister('dynamicService');
      expect(() => tool.getService('dynamicService')).toThrow('Required service \'dynamicService\' not available');
    });

    test('should handle null/undefined services', () => {
      serviceRegistry.register('nullService', null);
      serviceRegistry.register('undefinedService', undefined);

      // These should throw because the service registry returns null for falsy values
      expect(() => tool.getService('nullService')).toThrow('Required service \'nullService\' not available');
      expect(() => tool.getService('undefinedService')).toThrow('Required service \'undefinedService\' not available');
    });

    test('should handle services with falsy but valid values', () => {
      serviceRegistry.register('zeroService', 0);
      serviceRegistry.register('emptyStringService', '');
      serviceRegistry.register('falseService', false);

      // These should all throw because service registry treats falsy values as not found
      expect(() => tool.getService('zeroService')).toThrow();
      expect(() => tool.getService('emptyStringService')).toThrow();
      expect(() => tool.getService('falseService')).toThrow();
    });

    test('should handle service names with special characters', () => {
      const specialService = { type: 'special' };
      const specialNames = [
        'service-with-dashes',
        'service_with_underscores',
        'service.with.dots',
        'service with spaces',
        'service@with#symbols$'
      ];

      specialNames.forEach(name => {
        serviceRegistry.register(name, specialService);
        expect(tool.getService(name)).toBe(specialService);
      });
    });

    test('should handle concurrent service access', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        const promise = Promise.resolve().then(() => {
          return tool.getService('mockService');
        });
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result).toBe(mockService);
      });
    });
  });

  describe('Execution Logging Edge Cases', () => {
    test('should handle logging with various context types', () => {
      expect(() => tool.logExecution('action1')).not.toThrow();
      expect(() => tool.logExecution('action2', {})).not.toThrow();
      expect(() => tool.logExecution('action3', { param: 'value' })).not.toThrow();
      expect(() => tool.logExecution('action4', { nested: { deep: 'value' } })).not.toThrow();
      expect(() => tool.logExecution('action5', null)).not.toThrow();
      expect(() => tool.logExecution('action6', undefined)).not.toThrow();

      // Verify logger was called
      expect(mockLogger.debug).toHaveBeenCalledTimes(6);
    });

    test('should include class name in log output', () => {
      tool.logExecution('test action', { param: 'value' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'MCP Tool ExtendedTestTool: test action',
        { param: 'value' }
      );
    });

    test('should handle logging with circular reference in context', () => {
      const circularContext = { name: 'test' };
      circularContext.self = circularContext;

      expect(() => tool.logExecution('circular test', circularContext)).not.toThrow();
    });
  });

  describe('Debug Parameter Validation Edge Cases', () => {
    test('should validate sessionId parameter types', () => {
      const validCases = [
        { sessionId: 'valid-session-123' },
        { sessionId: 'session_with_underscores' },
        { sessionId: 'session-with-dashes-and-123' },
        { sessionId: '' } // Empty string is still a string
      ];

      validCases.forEach(params => {
        expect(tool.validateDebugParameters(params)).toEqual({ valid: true });
      });

      const invalidCases = [
        { sessionId: 123 },
        { sessionId: null },
        { sessionId: undefined },
        { sessionId: {} },
        { sessionId: [] },
        { sessionId: true }
      ];

      invalidCases.forEach(params => {
        const result = tool.validateDebugParameters(params);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('sessionId must be a string');
      });
    });

    test('should handle missing sessionId parameter', () => {
      const result = tool.validateDebugParameters({});
      expect(result).toEqual({ valid: true });
    });

    test('should handle multiple debug parameters', () => {
      const result = tool.validateDebugParameters({
        sessionId: 'valid-session',
        otherParam: 'ignored' // Should be ignored in validation
      });
      expect(result).toEqual({ valid: true });
    });
  });

  describe('Schema Creation Edge Cases', () => {
    test('should handle empty properties', () => {
      const schema = BaseMCPTool.createSchema({});

      expect(schema).toEqual({
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      });
    });

    test('should handle complex nested schemas', () => {
      const properties = {
        config: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                host: { type: 'string' },
                port: { type: 'integer', minimum: 1, maximum: 65535 },
                credentials: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                  },
                  required: ['username', 'password']
                }
              },
              required: ['host', 'port', 'credentials']
            },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            }
          },
          required: ['database']
        }
      };

      const schema = BaseMCPTool.createSchema(properties, ['config']);

      expect(schema.properties).toBe(properties);
      expect(schema.required).toEqual(['config']);
      expect(schema.additionalProperties).toBe(false);
    });

    test('should handle schema with all validation types', () => {
      const properties = {
        stringField: { type: 'string', minLength: 1, maxLength: 100 },
        numberField: { type: 'number', minimum: 0, maximum: 1000 },
        integerField: { type: 'integer', minimum: 1 },
        booleanField: { type: 'boolean' },
        arrayField: { type: 'array', minItems: 1, maxItems: 10 },
        enumField: { type: 'string', enum: ['option1', 'option2', 'option3'] },
        nullableField: { type: ['string', 'null'] },
        multiTypeField: { type: ['string', 'number'] }
      };

      const schema = BaseMCPTool.createSchema(properties, ['stringField', 'numberField']);

      expect(schema.properties).toBe(properties);
      expect(schema.required).toEqual(['stringField', 'numberField']);
    });

    test('should handle null and undefined inputs', () => {
      expect(() => BaseMCPTool.createSchema(null)).not.toThrow();
      expect(() => BaseMCPTool.createSchema(undefined)).not.toThrow();
      expect(() => BaseMCPTool.createSchema({}, null)).not.toThrow();
      expect(() => BaseMCPTool.createSchema({}, undefined)).not.toThrow();

      const schema1 = BaseMCPTool.createSchema(null);
      expect(schema1.properties).toBeNull();
      expect(schema1.required).toEqual([]);

      const schema2 = BaseMCPTool.createSchema({}, null);
      expect(schema2.required).toBeNull();
    });
  });

  describe('Integration and End-to-End Tests', () => {
    test('should handle complete tool lifecycle with errors', async () => {
      const definition = tool.getDefinition();

      // Test with invalid parameters
      const invalidParams = { integerField: 3.14 }; // Missing required field, wrong type
      const validation = tool.validateParameters(invalidParams, definition.inputSchema);
      expect(validation.valid).toBe(false);

      // Test with valid parameters but execution error
      const errorParams = { requiredString: 'test', throwError: true };
      const validValidation = tool.validateParameters(errorParams, definition.inputSchema);
      expect(validValidation.valid).toBe(true);

      try {
        await tool.execute(errorParams);
        fail('Should have thrown an error');
      } catch (error) {
        const errorResponse = tool.formatErrorResponse(error);
        expect(errorResponse.isError).toBe(true);
        expect(errorResponse._meta.error).toBe('Intentional test error');
      }
    });

    test('should work with minimal tool implementation', async () => {
      const minimalTool = new MinimalTool(serviceRegistry);

      const definition = minimalTool.getDefinition();
      expect(definition.name).toBe('minimal');

      const validation = minimalTool.validateParameters({}, definition.inputSchema);
      expect(validation.valid).toBe(true);

      const result = await minimalTool.execute();
      expect(result).toEqual({});

      const response = minimalTool.formatResponse(result);
      expect(response.isSuccess).toBe(true);
    });

    test('should handle complex service interactions', async () => {
      class ServiceInteractionTool extends BaseMCPTool {
        getDefinition() {
          return {
            name: 'service_interaction',
            description: 'Tests service interaction',
            inputSchema: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['sync', 'async'] }
              },
              required: ['action']
            }
          };
        }

        async execute(params) {
          const service = this.getService('mockService');

          if (params.action === 'sync') {
            return { result: service.method() };
          } else if (params.action === 'async') {
            return { result: await service.asyncMethod() };
          }
        }
      }

      const serviceTool = new ServiceInteractionTool(serviceRegistry);

      // Test sync interaction
      const syncResult = await serviceTool.execute({ action: 'sync' });
      expect(syncResult.result).toBe('mock result');
      expect(mockService.method).toHaveBeenCalled();

      // Test async interaction
      const asyncResult = await serviceTool.execute({ action: 'async' });
      expect(asyncResult.result).toBe('async result');
      expect(mockService.asyncMethod).toHaveBeenCalled();
    });

    test('should handle tool with no schema requirements', () => {
      const noSchemaTool = new NoSchemaTool(serviceRegistry);

      // Should accept any parameters
      const validation1 = noSchemaTool.validateParameters({});
      const validation2 = noSchemaTool.validateParameters({ anyParam: 'anyValue' });
      const validation3 = noSchemaTool.validateParameters({ complex: { nested: { data: true } } });

      expect(validation1.valid).toBe(true);
      expect(validation2.valid).toBe(true);
      expect(validation3.valid).toBe(true);
    });

    test('should maintain consistent behavior across multiple instances', () => {
      const tool1 = new ExtendedTestTool(serviceRegistry, { instance: 1 });
      const tool2 = new ExtendedTestTool(serviceRegistry, { instance: 2 });

      // Both tools should have independent state
      expect(tool1.config.instance).toBe(1);
      expect(tool2.config.instance).toBe(2);

      // But share the same service registry
      expect(tool1.services).toBe(serviceRegistry);
      expect(tool2.services).toBe(serviceRegistry);
      expect(tool1.services).toBe(tool2.services);
    });
  });
});

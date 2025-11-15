/**
 * BaseMCPTool Unit Tests
 * Tests base functionality for all MCP tools
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const BaseMCPTool = require('../../../src/mcp/tools/BaseMCPTool');
const ServiceRegistry = require('../../../src/mcp/ServiceRegistry');

// Mock Logger module
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../../src/utils/Logger', () => ({ logger: mockLogger }));

// Test implementation of BaseMCPTool
class TestMCPTool extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          count: { type: 'number' }
        },
        required: ['message']
      }
    };
  }

  async execute(params) {
    return { success: true, message: params.message, count: params.count || 1 };
  }
}

describe('BaseMCPTool', () => {
  let serviceRegistry;
  let tool;
  let testService;

  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
    testService = { name: 'testService', getData: () => 'test data' };
    serviceRegistry.register('testService', testService);
    
    tool = new TestMCPTool(serviceRegistry);
    
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with service registry', () => {
      expect(tool.services).toBe(serviceRegistry);
      expect(tool.logger).toBeDefined();
      expect(typeof tool.logger.info).toBe('function');
      expect(typeof tool.logger.debug).toBe('function');
    });

    test('should throw error without service registry', () => {
      expect(() => {
        new TestMCPTool();
      }).toThrow('ServiceRegistry is required for MCP tools');
      
      expect(() => {
        new TestMCPTool(null);
      }).toThrow('ServiceRegistry is required for MCP tools');
    });
  });

  describe('Abstract Method Implementation', () => {
    test('should implement getDefinition method', () => {
      const definition = tool.getDefinition();
      
      expect(definition).toHaveProperty('name', 'test_tool');
      expect(definition).toHaveProperty('description', 'A test tool');
      expect(definition).toHaveProperty('inputSchema');
    });

    test('should implement execute method', async () => {
      const result = await tool.execute({ message: 'test', count: 5 });
      
      expect(result).toEqual({
        success: true,
        message: 'test',
        count: 5
      });
    });

    test('should throw error for unimplemented methods in base class', () => {
      const baseTool = new BaseMCPTool(serviceRegistry);
      
      expect(() => {
        baseTool.getDefinition();
      }).toThrow('getDefinition() must be implemented by subclass');
      
      expect(baseTool.execute()).rejects.toThrow('execute() must be implemented by subclass');
    });
  });

  describe('Parameter Validation', () => {
    test('should validate required parameters', () => {
      const schema = {
        type: 'object',
        properties: {
          message: { type: 'string' },
          count: { type: 'number' }
        },
        required: ['message']
      };
      
      const validParams = { message: 'test', count: 5 };
      const invalidParams = { count: 5 }; // missing required 'message'
      
      expect(tool.validateParameters(validParams, schema)).toEqual({ valid: true });
      
      const invalidResult = tool.validateParameters(invalidParams, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Missing required parameter: message');
    });

    test('should validate parameter types', () => {
      const schema = {
        type: 'object',
        properties: {
          message: { type: 'string' },
          count: { type: 'number' },
          active: { type: 'boolean' },
          items: { type: 'array' }
        }
      };
      
      const invalidParams = {
        message: 123,        // should be string
        count: 'invalid',    // should be number
        active: 'yes',       // should be boolean
        items: 'not array'   // should be array
      };
      
      const result = tool.validateParameters(invalidParams, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parameter message must be of type string, got number');
      expect(result.errors).toContain('Parameter count must be of type number, got string');
      expect(result.errors).toContain('Parameter active must be of type boolean, got string');
      expect(result.errors).toContain('Parameter items must be of type array, got string');
    });

    test('should validate enum parameters', () => {
      const schema = {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] }
        }
      };
      
      const validParams = { level: 'debug' };
      const invalidParams = { level: 'invalid' };
      
      expect(tool.validateParameters(validParams, schema)).toEqual({ valid: true });
      
      const result = tool.validateParameters(invalidParams, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parameter level must be one of: debug, info, warn, error');
    });

    test('should handle missing schema gracefully', () => {
      const result = tool.validateParameters({ test: 'value' }, {});
      expect(result.valid).toBe(true);
    });

    test('should handle complex parameter validation', () => {
      const schema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              timeout: { type: 'number' },
              retries: { type: 'number' }
            }
          },
          tags: { type: 'array' }
        },
        required: ['config']
      };
      
      const validParams = {
        config: { timeout: 5000, retries: 3 },
        tags: ['test', 'debug']
      };
      
      const result = tool.validateParameters(validParams, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Response Formatting', () => {
    test('should format simple text response', () => {
      const response = tool.formatResponse('Simple text message');
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: 'Simple text message'
        }],
        isError: false
      });
    });

    test('should format object as JSON', () => {
      const data = { result: 'success', count: 42 };
      const response = tool.formatResponse(data);
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }],
        isError: false
      });
    });

    test('should format response with specific format', () => {
      const data = { result: 'success' };
      
      const jsonResponse = tool.formatResponse(data, 'json');
      expect(jsonResponse.content[0].text).toBe(JSON.stringify(data, null, 2));
      
      const textResponse = tool.formatResponse(data, 'text');
      expect(textResponse.content[0].text).toBe('[object Object]');
    });

    test('should handle null/undefined data', () => {
      const nullResponse = tool.formatResponse(null);
      const undefinedResponse = tool.formatResponse(undefined);
      
      expect(nullResponse.content[0].text).toBe('No data available');
      expect(undefinedResponse.content[0].text).toBe('No data available');
    });

    test('should handle various data types', () => {
      expect(tool.formatResponse(42).content[0].text).toBe('42');
      expect(tool.formatResponse(true).content[0].text).toBe('true');
      expect(tool.formatResponse([1, 2, 3]).content[0].text).toBe(JSON.stringify([1, 2, 3], null, 2));
    });
  });

  describe('Error Response Formatting', () => {
    test('should format error with Error object', () => {
      const error = new Error('Test error');
      const response = tool.formatErrorResponse(error);
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: 'Error: Test error'
        }],
        isError: true,
        _meta: {
          error: 'Test error',
          stack: error.stack
        }
      });
    });

    test('should format error with string message', () => {
      const response = tool.formatErrorResponse('Simple error message');
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: 'Error: Simple error message'
        }],
        isError: true,
        _meta: {
          error: 'Simple error message',
          stack: undefined
        }
      });
    });

    test('should handle non-error objects', () => {
      const response = tool.formatErrorResponse(42);
      
      expect(response.content[0].text).toBe('Error: 42');
      expect(response.isError).toBe(true);
    });
  });

  describe('Service Access', () => {
    test('should get service from registry', () => {
      const service = tool.getService('testService');
      
      expect(service).toBe(testService);
    });

    test('should throw error for non-existent service', () => {
      expect(() => {
        tool.getService('nonExistentService');
      }).toThrow('Required service \'nonExistentService\' not available');
    });

    test('should handle service registry changes', () => {
      const newService = { name: 'newService' };
      serviceRegistry.register('newService', newService);
      
      expect(tool.getService('newService')).toBe(newService);
      
      serviceRegistry.unregister('newService');
      
      expect(() => {
        tool.getService('newService');
      }).toThrow('Required service \'newService\' not available');
    });
  });

  describe('Execution Logging', () => {
    test('should log execution with action', () => {
      // Test that logExecution method exists and can be called without errors
      expect(() => tool.logExecution('test action')).not.toThrow();
    });

    test('should log execution with context', () => {
      const context = { param1: 'value1', param2: 42 };
      // Test that logExecution method exists and can be called with context
      expect(() => tool.logExecution('complex action', context)).not.toThrow();
    });
  });

  describe('Debug Parameter Validation', () => {
    test('should validate session ID parameter', () => {
      const validParams = { sessionId: 'valid-session-123' };
      const invalidParams = { sessionId: 42 };
      
      expect(tool.validateDebugParameters(validParams)).toEqual({ valid: true });
      
      const result = tool.validateDebugParameters(invalidParams);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sessionId must be a string');
    });

    test('should allow missing optional parameters', () => {
      const result = tool.validateDebugParameters({});
      expect(result.valid).toBe(true);
    });
  });

  describe('Schema Creation Helper', () => {
    test('should create basic schema', () => {
      const properties = {
        name: { type: 'string' },
        age: { type: 'number' }
      };
      const required = ['name'];
      
      const schema = BaseMCPTool.createSchema(properties, required);
      
      expect(schema).toEqual({
        type: 'object',
        properties,
        required,
        additionalProperties: false
      });
    });

    test('should create schema without required fields', () => {
      const properties = {
        optional: { type: 'string' }
      };
      
      const schema = BaseMCPTool.createSchema(properties);
      
      expect(schema).toEqual({
        type: 'object',
        properties,
        required: [],
        additionalProperties: false
      });
    });

    test('should create schema with complex properties', () => {
      const properties = {
        config: {
          type: 'object',
          properties: {
            timeout: { type: 'number', minimum: 0 },
            retries: { type: 'number', minimum: 1, maximum: 10 }
          }
        },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      };
      
      const schema = BaseMCPTool.createSchema(properties, ['config']);
      
      expect(schema.properties).toBe(properties);
      expect(schema.required).toEqual(['config']);
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end with validation and execution', async () => {
      const definition = tool.getDefinition();
      const validParams = { message: 'Hello, World!', count: 3 };
      
      // Validate parameters
      const validation = tool.validateParameters(validParams, definition.inputSchema);
      expect(validation.valid).toBe(true);
      
      // Execute tool
      const result = await tool.execute(validParams);
      expect(result).toEqual({
        success: true,
        message: 'Hello, World!',
        count: 3
      });
      
      // Format response
      const response = tool.formatResponse(result);
      expect(response.isError).toBe(false);
      expect(response.content[0].type).toBe('text');
    });

    test('should handle validation errors properly', async () => {
      const definition = tool.getDefinition();
      const invalidParams = { count: 'not a number' }; // missing required 'message'
      
      const validation = tool.validateParameters(invalidParams, definition.inputSchema);
      expect(validation.valid).toBe(false);
      
      // Should not execute with invalid parameters
      const errorResponse = tool.formatErrorResponse('Validation failed: ' + validation.errors.join(', '));
      expect(errorResponse.isError).toBe(true);
    });

    test('should work with service dependencies', async () => {
      // Create a tool that uses services
      class ServiceDependentTool extends BaseMCPTool {
        getDefinition() {
          return {
            name: 'service_tool',
            description: 'Uses services',
            inputSchema: { type: 'object' }
          };
        }

        async execute(_params) {
          const service = this.getService('testService');
          return { data: service.getData() };
        }
      }
      
      const serviceTool = new ServiceDependentTool(serviceRegistry);
      const result = await serviceTool.execute({});
      
      expect(result).toEqual({ data: 'test data' });
    });
  });
});
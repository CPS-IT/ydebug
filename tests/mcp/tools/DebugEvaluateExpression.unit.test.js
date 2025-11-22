/**
 * Unit Tests for DebugEvaluateExpression MCP Tool
 * Tests individual methods and edge cases
 */

const DebugEvaluateExpression = require('../../../src/mcp/tools/DebugEvaluateExpression');
const ServiceRegistry = require('../../../src/mcp/ServiceRegistry');

describe('DebugEvaluateExpression Unit Tests', () => {
  let tool;
  let mockServices;
  let mockCommands;

  beforeEach(() => {
    mockServices = new ServiceRegistry();
    
    mockCommands = {
      execute: jest.fn()
    };

    mockServices.register('activeSession', {
      sessionId: 'test-session',
      commands: mockCommands
    });

    tool = new DebugEvaluateExpression(mockServices);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    test('should return complete tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition).toEqual({
        name: 'debug_evaluate_expression',
        description: 'Evaluate a PHP expression in the current debugging context',
        inputSchema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'PHP expression to evaluate (e.g., "$var + 1", "count($array)")',
              minLength: 1
            },
            contextId: {
              type: 'integer',
              description: 'Context ID for evaluation (0=local, 1=global, 2=class)',
              default: 0,
              minimum: 0,
              maximum: 10
            },
            stackDepth: {
              type: 'integer',
              description: 'Stack frame depth (0 = current frame)',
              default: 0,
              minimum: 0,
              maximum: 10
            },
            maxLength: {
              type: 'integer',
              description: 'Maximum length of result value',
              default: 1000,
              minimum: 10,
              maximum: 10000
            }
          },
          required: ['expression']
        }
      });
    });

    test('should have required expression parameter', () => {
      const definition = tool.getDefinition();
      expect(definition.inputSchema.required).toContain('expression');
      expect(definition.inputSchema.properties.expression.minLength).toBe(1);
    });

    test('should have proper parameter constraints', () => {
      const props = tool.getDefinition().inputSchema.properties;
      
      expect(props.contextId.minimum).toBe(0);
      expect(props.contextId.maximum).toBe(10);
      expect(props.stackDepth.minimum).toBe(0);
      expect(props.stackDepth.maximum).toBe(10);
      expect(props.maxLength.minimum).toBe(10);
      expect(props.maxLength.maximum).toBe(10000);
    });
  });

  describe('formatEvaluationResult', () => {
    test('should format basic result', () => {
      const mockResult = {
        type: 'string',
        value: 'test value',
        encoding: 'base64',
        size: '10'
      };

      const formatted = tool.formatEvaluationResult(mockResult, 1000);

      expect(formatted).toEqual({
        type: 'string',
        value: 'test value',
        hasError: false,
        errorMessage: null,
        encoding: 'base64',
        size: '10',
        truncated: false
      });
    });

    test('should handle error results', () => {
      const errorResult = {
        type: 'error',
        error: true,
        message: 'Syntax error',
        code: 'PARSE_ERROR'
      };

      const formatted = tool.formatEvaluationResult(errorResult, 1000);

      expect(formatted.hasError).toBe(true);
      expect(formatted.errorMessage).toBe('Syntax error');
      expect(formatted.value.__error).toBe(true);
      expect(formatted.value.__code).toBe('PARSE_ERROR');
    });

    test('should handle missing optional fields', () => {
      const basicResult = {
        type: 'int',
        value: '42'
      };

      const formatted = tool.formatEvaluationResult(basicResult, 1000);

      expect(formatted.encoding).toBeNull();
      expect(formatted.size).toBeNull();
      expect(formatted.hasError).toBe(false);
    });
  });

  describe('formatValue', () => {
    test('should format null values', () => {
      const result = { type: 'null', value: null };
      expect(tool.formatValue(result, 1000)).toBeNull();
    });

    test('should format boolean values', () => {
      expect(tool.formatValue({ type: 'bool', value: '1' }, 1000)).toBe(true);
      expect(tool.formatValue({ type: 'bool', value: 'true' }, 1000)).toBe(true);
      expect(tool.formatValue({ type: 'bool', value: '0' }, 1000)).toBe(false);
      expect(tool.formatValue({ type: 'bool', value: 'false' }, 1000)).toBe(false);
    });

    test('should format integer values', () => {
      expect(tool.formatValue({ type: 'int', value: '42' }, 1000)).toBe(42);
      expect(tool.formatValue({ type: 'int', value: '0' }, 1000)).toBe(0);
      expect(tool.formatValue({ type: 'int', value: '-123' }, 1000)).toBe(-123);
    });

    test('should format float values', () => {
      expect(tool.formatValue({ type: 'float', value: '3.14' }, 1000)).toBe(3.14);
      expect(tool.formatValue({ type: 'float', value: '0.0' }, 1000)).toBe(0.0);
      expect(tool.formatValue({ type: 'float', value: '-2.5' }, 1000)).toBe(-2.5);
    });

    test('should format string values', () => {
      const shortString = { type: 'string', value: 'short' };
      expect(tool.formatValue(shortString, 1000)).toBe('short');

      const emptyString = { type: 'string', value: '' };
      expect(tool.formatValue(emptyString, 1000)).toBe('');
    });

    test('should truncate long strings', () => {
      const longString = { 
        type: 'string', 
        value: 'a'.repeat(2000) 
      };

      const result = tool.formatValue(longString, 100);

      expect(result.__truncated).toBe(true);
      expect(result.__originalLength).toBe(2000);
      expect(result.__value).toBe('a'.repeat(100) + '...');
    });

    test('should format arrays with children', () => {
      const array = {
        type: 'array',
        hasChildren: true,
        size: '5',
        value: ''
      };

      const result = tool.formatValue(array, 1000);

      expect(result.__type).toBe('array');
      expect(result.__size).toBe('5');
      expect(result.__summary).toBe('[array] (5 items)');
      expect(result.__note).toBe('Use debug_inspect_object to explore contents');
    });

    test('should format empty arrays', () => {
      const emptyArray = {
        type: 'array',
        hasChildren: false,
        value: ''
      };

      const result = tool.formatValue(emptyArray, 1000);

      expect(result.__type).toBe('array');
      expect(result.__empty).toBe(true);
      expect(result.__summary).toBe('Empty array');
    });

    test('should format objects with class names', () => {
      const object = {
        type: 'object',
        hasChildren: true,
        size: '3',
        className: 'MyClass'
      };

      const result = tool.formatValue(object, 1000);

      expect(result.__type).toBe('object');
      expect(result.__className).toBe('MyClass');
      expect(result.__summary).toBe('[object] (3 items)');
    });

    test('should format resources', () => {
      const resource = {
        type: 'resource',
        value: 'Resource id #5',
        resourceType: 'stream'
      };

      const result = tool.formatValue(resource, 1000);

      expect(result.__type).toBe('resource');
      expect(result.__value).toBe('Resource id #5');
      expect(result.__resourceType).toBe('stream');
    });

    test('should handle error results in formatValue', () => {
      const errorResult = {
        error: true,
        message: 'Division by zero',
        code: 'MATH_ERROR'
      };

      const result = tool.formatValue(errorResult, 1000);

      expect(result.__error).toBe(true);
      expect(result.__message).toBe('Division by zero');
      expect(result.__code).toBe('MATH_ERROR');
    });

    test('should format unknown types', () => {
      const unknown = {
        type: 'unknown',
        value: 'some value'
      };

      expect(tool.formatValue(unknown, 1000)).toBe('some value');
    });

    test('should truncate unknown type values when too long', () => {
      const longUnknown = {
        type: 'custom',
        value: 'x'.repeat(2000)
      };

      const result = tool.formatValue(longUnknown, 50);

      expect(result.__truncated).toBe(true);
      expect(result.__originalLength).toBe(2000);
      expect(result.__value).toBe('x'.repeat(50) + '...');
    });

    test('should handle missing values gracefully', () => {
      expect(tool.formatValue({ type: 'string' }, 1000)).toBe('');
      expect(tool.formatValue({ type: 'int' }, 1000)).toBe(0);
      expect(tool.formatValue({ type: 'float' }, 1000)).toBe(0.0);
      expect(tool.formatValue({ type: 'unknown' }, 1000)).toBe('[unknown]');
    });

    test('should handle array/object without size', () => {
      const noSize = {
        type: 'array',
        hasChildren: true
      };

      const result = tool.formatValue(noSize, 1000);
      expect(result.__size).toBe('unknown');
      expect(result.__summary).toBe('[array] (unknown items)');
    });
  });

  describe('execute integration', () => {
    test('should handle complex evaluation scenarios', async () => {
      const complexResult = {
        property: {
          type: 'array',
          hasChildren: true,
          size: '10',
          value: ''
        }
      };

      mockCommands.execute.mockResolvedValue(complexResult);

      const result = await tool.execute({
        expression: 'range(1, 10)',
        contextId: 1,
        stackDepth: 2,
        maxLength: 500
      });

      expect(mockCommands.execute).toHaveBeenCalledWith('eval', {
        data: 'range(1, 10)',
        c: 1,
        d: 2
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      
      expect(data.expression).toBe('range(1, 10)');
      expect(data.contextId).toBe(1);
      expect(data.stackDepth).toBe(2);
      expect(data.result.type).toBe('array');
      expect(data.metadata.maxLength).toBe(500);
    });

    test('should handle null evaluation result', async () => {
      mockCommands.execute.mockResolvedValue(null);

      const result = await tool.execute({
        expression: 'null_function()'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Expression evaluation returned no result');
    });

    test('should use default parameters correctly', async () => {
      const mockResult = {
        property: {
          type: 'string',
          value: 'default test'
        }
      };

      mockCommands.execute.mockResolvedValue(mockResult);

      const result = await tool.execute({
        expression: '"default test"'
      });

      expect(mockCommands.execute).toHaveBeenCalledWith('eval', {
        data: '"default test"',
        c: 0,  // default contextId
        d: 0   // default stackDepth
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.metadata.maxLength).toBe(1000); // default maxLength
    });
  });
});
/**
 * Tests for DebugEvaluateExpression MCP Tool
 */

const DebugEvaluateExpression = require('../../../../src/mcp/tools/DebugEvaluateExpression');
const ServiceRegistry = require('../../../../src/mcp/ServiceRegistry');

describe('DebugEvaluateExpression', () => {
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
    test('should return valid tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('debug_evaluate_expression');
      expect(definition.description).toContain('Evaluate a PHP expression');
      expect(definition.inputSchema.required).toContain('expression');
    });
  });

  describe('execute', () => {
    test('should evaluate expression successfully', async () => {
      const mockResult = {
        property: {
          type: 'int',
          value: '42'
        }
      };

      mockCommands.execute.mockResolvedValue(mockResult);

      const result = await tool.execute({
        expression: '$a + $b'
      });

      expect(mockCommands.execute).toHaveBeenCalledWith('eval', {
        data: '$a + $b',
        c: 0,
        d: 0
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.expression).toBe('$a + $b');
      expect(data.result.type).toBe('int');
      expect(data.result.value).toBe(42);
    });

    test('should handle missing active session', async () => {
      mockServices.unregister('activeSession');

      const result = await tool.execute({
        expression: 'test'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('No debugging session is active');
    });

    test('should handle evaluation errors', async () => {
      mockCommands.execute.mockRejectedValue(new Error('Evaluation failed'));

      const result = await tool.execute({
        expression: 'invalid syntax'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Failed to evaluate expression');
    });

    test('should format different types correctly', async () => {
      const stringResult = {
        property: { type: 'string', value: 'test string' }
      };

      mockCommands.execute.mockResolvedValue(stringResult);

      const result = await tool.execute({
        expression: '"test string"'
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.result.value).toBe('test string');
    });

    test('should handle long strings with truncation', async () => {
      const longString = 'a'.repeat(2000);
      const stringResult = {
        property: { type: 'string', value: longString }
      };

      mockCommands.execute.mockResolvedValue(stringResult);

      const result = await tool.execute({
        expression: 'str_repeat("a", 2000)',
        maxLength: 100
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.result.value.__truncated).toBe(true);
      expect(data.result.value.__originalLength).toBe(2000);
    });
  });
});
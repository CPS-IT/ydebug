/**
 * Tests for DebugInspectObject MCP Tool
 */

const DebugInspectObject = require('../../../src/mcp/tools/DebugInspectObject');
const ServiceRegistry = require('../../../src/mcp/ServiceRegistry');

describe('DebugInspectObject', () => {
  let tool;
  let mockServices;
  let mockCommands;

  beforeEach(() => {
    mockServices = new ServiceRegistry();
    
    mockCommands = {
      execute: jest.fn()
    };

    // Setup active session
    mockServices.register('activeSession', {
      sessionId: 'test-session',
      commands: mockCommands
    });

    tool = new DebugInspectObject(mockServices);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    test('should return valid tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('debug_inspect_object');
      expect(definition.description).toContain('Inspect a specific object');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
      expect(definition.inputSchema.properties).toHaveProperty('fullName');
      expect(definition.inputSchema.required).toContain('fullName');
    });

    test('should have proper parameter validation', () => {
      const schema = tool.getDefinition().inputSchema;
      
      expect(schema.properties.fullName.minLength).toBe(1);
      expect(schema.properties.contextId.default).toBe(0);
      expect(schema.properties.stackDepth.default).toBe(0);
      expect(schema.properties.maxDepth.default).toBe(3);
      expect(schema.properties.maxDepth.maximum).toBe(10);
    });
  });

  describe('execute', () => {
    const mockObjectData = {
      name: 'testObject',
      type: 'object',
      fullName: '$testObject',
      hasChildren: true,
      size: '3',
      className: 'TestClass',
      children: [
        {
          name: 'prop1',
          type: 'string',
          value: 'value1',
          fullName: '$testObject->prop1'
        },
        {
          name: 'prop2',
          type: 'int',
          value: '42',
          fullName: '$testObject->prop2'
        }
      ]
    };

    beforeEach(() => {
      mockCommands.execute.mockResolvedValue({
        property: mockObjectData
      });
    });

    test('should inspect object successfully', async () => {
      const result = await tool.execute({
        fullName: '$testObject'
      });

      expect(mockCommands.execute).toHaveBeenCalledWith('property_get', {
        n: '$testObject',
        d: 0,
        c: 0
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.fullName).toBe('$testObject');
      expect(data.object.type).toBe('object');
      expect(data.object.className).toBe('TestClass');
    });

    test('should use provided parameters', async () => {
      await tool.execute({
        fullName: '$obj->prop',
        contextId: 1,
        stackDepth: 2,
        maxDepth: 5
      });

      expect(mockCommands.execute).toHaveBeenCalledWith('property_get', {
        n: '$obj->prop',
        d: 2,
        c: 1
      });
    });

    test('should handle missing active session', async () => {
      mockServices.unregister('activeSession');

      const result = await tool.execute({
        fullName: '$test'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('No debugging session is active');
    });

    test('should handle property not found', async () => {
      mockCommands.execute.mockResolvedValue(null);

      const result = await tool.execute({
        fullName: '$nonexistent'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Object $nonexistent not found');
    });

    test('should handle command errors', async () => {
      mockCommands.execute.mockRejectedValue(new Error('Property error'));

      const result = await tool.execute({
        fullName: '$test'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Failed to inspect object');
    });

    test('should format object with children', async () => {
      const result = await tool.execute({
        fullName: '$testObject',
        maxDepth: 2
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      
      expect(data.object.value.prop1).toBe('value1');
      expect(data.object.value.prop2).toBe(42);
      expect(data.metadata.requestedDepth).toBe(2);
    });

    test('should respect depth limits', async () => {
      const deepObject = {
        name: 'deep',
        type: 'object',
        hasChildren: true,
        size: '1',
        children: [
          {
            name: 'level1',
            type: 'object',
            hasChildren: true,
            size: '1',
            children: [
              {
                name: 'level2',
                type: 'string',
                value: 'deep value'
              }
            ]
          }
        ]
      };

      mockCommands.execute.mockResolvedValue({ property: deepObject });

      const result = await tool.execute({
        fullName: '$deep',
        maxDepth: 1
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      
      expect(data.object.value.level1.__type).toBe('object');
      expect(data.object.value.level1.__summary).toContain('depth limit reached');
    });

    test('should format primitive types correctly', async () => {
      const primitives = {
        name: 'primitives',
        type: 'object',
        children: [
          { name: 'nullVal', type: 'null', value: null },
          { name: 'boolVal', type: 'bool', value: '1' },
          { name: 'intVal', type: 'int', value: '123' },
          { name: 'floatVal', type: 'float', value: '3.14' },
          { name: 'stringVal', type: 'string', value: 'test' },
          { name: 'resource', type: 'resource', value: 'Resource #1' }
        ]
      };

      mockCommands.execute.mockResolvedValue({ property: primitives });

      const result = await tool.execute({
        fullName: '$primitives'
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      const values = data.object.value;
      
      expect(values.nullVal).toBeNull();
      expect(values.boolVal).toBe(true);
      expect(values.intVal).toBe(123);
      expect(values.floatVal).toBe(3.14);
      expect(values.stringVal).toBe('test');
      expect(values.resource.__type).toBe('resource');
      expect(values.resource.__value).toBe('Resource #1');
    });
  });
});
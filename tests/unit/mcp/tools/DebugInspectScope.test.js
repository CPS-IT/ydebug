/**
 * Tests for DebugInspectScope MCP Tool
 */

const DebugInspectScope = require('../../../../src/mcp/tools/DebugInspectScope');
const ServiceRegistry = require('../../../../src/mcp/ServiceRegistry');

describe('DebugInspectScope', () => {
  let tool;
  let mockServices;
  let mockCommands;

  beforeEach(() => {
    mockServices = new ServiceRegistry();
    
    mockCommands = {
      getContextNames: jest.fn(),
      getContext: jest.fn()
    };

    // Setup active session
    mockServices.register('activeSession', {
      sessionId: 'test-session',
      commands: mockCommands
    });

    tool = new DebugInspectScope(mockServices);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    test('should return valid tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('debug_inspect_scope');
      expect(definition.description).toContain('Inspect a specific variable scope');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
      expect(definition.inputSchema.properties).toHaveProperty('contextId');
      expect(definition.inputSchema.properties).toHaveProperty('stackDepth');
      expect(definition.inputSchema.properties).toHaveProperty('includeMetadata');
      expect(definition.inputSchema.properties).toHaveProperty('maxDepth');
    });

    test('should have proper parameter validation', () => {
      const schema = tool.getDefinition().inputSchema;
      
      // Context ID validation
      expect(schema.properties.contextId.minimum).toBe(0);
      expect(schema.properties.contextId.maximum).toBe(10);
      expect(schema.properties.contextId.default).toBe(0);

      // Stack depth validation
      expect(schema.properties.stackDepth.minimum).toBe(0);
      expect(schema.properties.stackDepth.maximum).toBe(10);
      expect(schema.properties.stackDepth.default).toBe(0);

      // Max depth validation
      expect(schema.properties.maxDepth.minimum).toBe(0);
      expect(schema.properties.maxDepth.maximum).toBe(5);
      expect(schema.properties.maxDepth.default).toBe(3);
    });
  });

  describe('execute', () => {
    const mockContextNames = {
      contexts: [
        { id: 0, name: 'Locals' },
        { id: 1, name: 'Globals' },
        { id: 2, name: 'Class' }
      ]
    };

    const mockContextData = {
      variables: [
        {
          name: 'localVar',
          type: 'string',
          value: 'test value',
          fullName: '$localVar',
          hasChildren: false,
          facet: 'public'
        },
        {
          name: 'arrayVar',
          type: 'array',
          value: '',
          fullName: '$arrayVar',
          hasChildren: true,
          size: '3',
          children: [
            { name: '0', type: 'string', value: 'item1' },
            { name: '1', type: 'string', value: 'item2' },
            { name: '2', type: 'int', value: '42' }
          ]
        }
      ]
    };

    beforeEach(() => {
      mockCommands.getContextNames.mockResolvedValue(mockContextNames);
      mockCommands.getContext.mockResolvedValue(mockContextData);
    });

    test('should inspect local context by default', async () => {
      const result = await tool.execute({});

      expect(mockCommands.getContextNames).toHaveBeenCalledWith(0);
      expect(mockCommands.getContext).toHaveBeenCalledWith(0, 0);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.contextId).toBe(0);
      expect(data.stackDepth).toBe(0);
      expect(data.variables).toHaveLength(2);
      expect(data.contextInfo.name).toBe('Local');
      expect(data.metadata.availableContexts).toHaveLength(3);
    });

    test('should inspect specific context', async () => {
      const result = await tool.execute({ contextId: 1, stackDepth: 2 });

      expect(mockCommands.getContextNames).toHaveBeenCalledWith(2);
      expect(mockCommands.getContext).toHaveBeenCalledWith(1, 2);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.contextId).toBe(1);
      expect(data.stackDepth).toBe(2);
      expect(data.contextInfo.name).toBe('Global');
    });

    test('should exclude metadata when requested', async () => {
      const result = await tool.execute({ includeMetadata: false });

      expect(mockCommands.getContextNames).not.toHaveBeenCalled();
      expect(mockCommands.getContext).toHaveBeenCalledWith(0, 0);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.metadata).toBeNull();
      expect(data.variables).toHaveLength(2);
    });

    test('should handle missing active session', async () => {
      mockServices.unregister('activeSession');

      const result = await tool.execute({});

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('No debugging session is active');
    });

    test('should handle context names error gracefully', async () => {
      mockCommands.getContextNames.mockRejectedValue(new Error('Context names error'));

      const result = await tool.execute({});

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.metadata.availableContexts).toEqual([]);
      expect(data.metadata.warning).toContain('Could not retrieve available contexts');
    });

    test('should handle context data error gracefully', async () => {
      mockCommands.getContext.mockRejectedValue(new Error('Context error'));

      const result = await tool.execute({});

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.variables).toEqual([]);
      expect(data.contextInfo.error).toBe('Context error');
    });

    test('should format variables correctly', async () => {
      const complexVariables = {
        variables: [
          {
            name: 'nullVar',
            type: 'null',
            value: null,
            hasChildren: false
          },
          {
            name: 'boolVar',
            type: 'bool',
            value: '1',
            hasChildren: false
          },
          {
            name: 'intVar',
            type: 'int',
            value: '123',
            hasChildren: false
          },
          {
            name: 'floatVar',
            type: 'float',
            value: '3.14',
            hasChildren: false
          },
          {
            name: 'resourceVar',
            type: 'resource',
            value: 'Resource id #5',
            hasChildren: false
          }
        ]
      };

      mockCommands.getContext.mockResolvedValue(complexVariables);

      const result = await tool.execute({});

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      const vars = data.variables;
      
      expect(vars.find(v => v.name === 'nullVar').value).toBeNull();
      expect(vars.find(v => v.name === 'boolVar').value).toBe(true);
      expect(vars.find(v => v.name === 'intVar').value).toBe(123);
      expect(vars.find(v => v.name === 'floatVar').value).toBe(3.14);
      
      const resourceVar = vars.find(v => v.name === 'resourceVar');
      expect(resourceVar.value.__type).toBe('resource');
      expect(resourceVar.value.__value).toBe('Resource id #5');
    });

    test('should handle nested arrays and objects', async () => {
      const result = await tool.execute({ maxDepth: 2 });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      const arrayVar = data.variables.find(v => v.name === 'arrayVar');
      
      expect(arrayVar.value['0']).toBe('item1');
      expect(arrayVar.value['1']).toBe('item2');
      expect(arrayVar.value['2']).toBe(42);
    });

    test('should limit depth correctly', async () => {
      const deepNested = {
        variables: [
          {
            name: 'deepArray',
            type: 'array',
            hasChildren: true,
            size: '1',
            children: [
              {
                name: '0',
                type: 'array', 
                hasChildren: true,
                size: '1',
                children: [
                  { name: '0', type: 'string', value: 'deep' }
                ]
              }
            ]
          }
        ]
      };

      mockCommands.getContext.mockResolvedValue(deepNested);

      const result = await tool.execute({ maxDepth: 1 });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      const deepVar = data.variables.find(v => v.name === 'deepArray');
      
      expect(deepVar.value.__type).toBe('array');
      expect(deepVar.value.__summary).toContain('depth limit reached');
    });

    test('should include proper metadata', async () => {
      const result = await tool.execute({ contextId: 2, maxDepth: 4 });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      
      expect(data.metadata.currentContextId).toBe(2);
      expect(data.metadata.maxDepth).toBe(4);
      expect(data.metadata.timestamp).toBeDefined();
      expect(data.metadata.availableContexts).toEqual([
        { id: 0, name: 'Locals', description: 'Local function/method variables' },
        { id: 1, name: 'Globals', description: 'Global scope variables' },
        { id: 2, name: 'Class', description: 'Class instance variables' }
      ]);
    });
  });
});
/**
 * Tests for DebugInspectVariables MCP Tool
 */

const DebugInspectVariables = require('../../../src/mcp/tools/DebugInspectVariables');
const ServiceRegistry = require('../../../src/mcp/ServiceRegistry');

describe('DebugInspectVariables', () => {
  let tool;
  let mockServices;
  let mockCommands;

  beforeEach(() => {
    mockServices = new ServiceRegistry();
    
    mockCommands = {
      getLocalVariables: jest.fn(),
      getGlobalVariables: jest.fn(),
      getClassVariables: jest.fn()
    };

    // Setup active session
    mockServices.register('activeSession', {
      sessionId: 'test-session',
      commands: mockCommands
    });

    tool = new DebugInspectVariables(mockServices);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    test('should return valid tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('debug_inspect_variables');
      expect(definition.description).toContain('Inspect variables');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
      expect(definition.inputSchema.properties).toHaveProperty('scope');
      expect(definition.inputSchema.properties).toHaveProperty('stackDepth');
      expect(definition.inputSchema.properties).toHaveProperty('includePrivate');
      expect(definition.inputSchema.properties).toHaveProperty('maxDepth');
    });

    test('should have proper parameter validation', () => {
      const schema = tool.getDefinition().inputSchema;
      
      // Scope validation
      expect(schema.properties.scope.enum).toEqual(['local', 'global', 'class', 'all']);
      expect(schema.properties.scope.default).toBe('local');

      // Stack depth validation
      expect(schema.properties.stackDepth.minimum).toBe(0);
      expect(schema.properties.stackDepth.maximum).toBe(10);
      expect(schema.properties.stackDepth.default).toBe(0);

      // Max depth validation
      expect(schema.properties.maxDepth.minimum).toBe(0);
      expect(schema.properties.maxDepth.maximum).toBe(5);
      expect(schema.properties.maxDepth.default).toBe(2);
    });
  });

  describe('execute', () => {
    const mockLocalVariables = {
      variables: [
        {
          name: 'testVar',
          type: 'string',
          value: 'test value',
          fullName: '$testVar',
          hasChildren: false
        },
        {
          name: '_privateVar',
          type: 'int',
          value: '42',
          fullName: '$_privateVar',
          hasChildren: false
        }
      ]
    };

    const mockGlobalVariables = {
      variables: [
        {
          name: 'globalVar',
          type: 'array',
          value: '',
          fullName: '$GLOBALS[\'globalVar\']',
          hasChildren: true,
          size: '2'
        }
      ]
    };

    beforeEach(() => {
      mockCommands.getLocalVariables.mockResolvedValue(mockLocalVariables);
      mockCommands.getGlobalVariables.mockResolvedValue(mockGlobalVariables);
      mockCommands.getClassVariables.mockResolvedValue({ variables: [] });
    });

    test('should inspect local variables by default', async () => {
      const result = await tool.execute({});

      expect(mockCommands.getLocalVariables).toHaveBeenCalledWith(0);
      expect(mockCommands.getGlobalVariables).not.toHaveBeenCalled();
      expect(mockCommands.getClassVariables).not.toHaveBeenCalled();

      expect(result.isSuccess).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const data = JSON.parse(result.content[0].text);
      expect(data.scope).toBe('local');
      expect(data.stackDepth).toBe(0);
      expect(data.variables.local).toHaveLength(2);
    });

    test('should inspect specific scope', async () => {
      const result = await tool.execute({ scope: 'global' });

      expect(mockCommands.getLocalVariables).not.toHaveBeenCalled();
      expect(mockCommands.getGlobalVariables).toHaveBeenCalledWith(0);
      expect(mockCommands.getClassVariables).not.toHaveBeenCalled();

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.variables.global).toHaveLength(1);
    });

    test('should inspect all scopes when requested', async () => {
      const result = await tool.execute({ scope: 'all' });

      expect(mockCommands.getLocalVariables).toHaveBeenCalledWith(0);
      expect(mockCommands.getGlobalVariables).toHaveBeenCalledWith(0);
      expect(mockCommands.getClassVariables).toHaveBeenCalledWith(0);

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.variables).toHaveProperty('local');
      expect(data.variables).toHaveProperty('global');
      expect(data.variables).toHaveProperty('class');
    });

    test('should filter private variables when includePrivate is false', async () => {
      const result = await tool.execute({ 
        scope: 'local', 
        includePrivate: false 
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.variables.local).toHaveLength(1);
      expect(data.variables.local[0].name).toBe('testVar');
    });

    test('should include private variables when includePrivate is true', async () => {
      const result = await tool.execute({ 
        scope: 'local', 
        includePrivate: true 
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.variables.local).toHaveLength(2);
      const names = data.variables.local.map(v => v.name);
      expect(names).toContain('testVar');
      expect(names).toContain('_privateVar');
    });

    test('should use specified stack depth', async () => {
      await tool.execute({ scope: 'local', stackDepth: 2 });

      expect(mockCommands.getLocalVariables).toHaveBeenCalledWith(2);
    });

    test('should handle missing active session', async () => {
      mockServices.unregister('activeSession');

      const result = await tool.execute({});

      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('No debugging session is active');
    });

    test('should handle command errors gracefully', async () => {
      mockCommands.getLocalVariables.mockRejectedValue(new Error('DBGp error'));

      const result = await tool.execute({ scope: 'local' });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.variables.local).toEqual([]);
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
          }
        ]
      };

      mockCommands.getLocalVariables.mockResolvedValue(complexVariables);

      const result = await tool.execute({ scope: 'local' });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      const vars = data.variables.local;
      
      expect(vars.find(v => v.name === 'nullVar').value).toBeNull();
      expect(vars.find(v => v.name === 'boolVar').value).toBe(true);
      expect(vars.find(v => v.name === 'intVar').value).toBe(123);
      expect(vars.find(v => v.name === 'floatVar').value).toBe(3.14);
    });

    test('should include metadata in response', async () => {
      const result = await tool.execute({ 
        scope: 'local',
        maxDepth: 3,
        includePrivate: false 
      });

      expect(result.isSuccess).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.includePrivate).toBe(false);
      expect(data.metadata.maxDepth).toBe(3);
      expect(data.metadata.totalVariables).toBeGreaterThanOrEqual(0);
      expect(data.metadata.timestamp).toBeDefined();
    });
  });
});
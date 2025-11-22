/**
 * Tests for DebugSetBreakpoint MCP Tool
 */

const DebugSetBreakpoint = require('../../../../src/mcp/tools/DebugSetBreakpoint');
const ServiceRegistry = require('../../../../src/mcp/ServiceRegistry');

describe('DebugSetBreakpoint MCP Tool', () => {
  let tool;
  let serviceRegistry;
  let mockActiveSession;

  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
    tool = new DebugSetBreakpoint(serviceRegistry);
    
    // Setup mock active session
    mockActiveSession = {
      sessionId: 'test-session-123',
      commands: {
        setBreakpoint: jest.fn().mockResolvedValue({
          id: 'bp_1',
          filename: '/test/file.php',
          lineno: 10
        })
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    test('should return correct tool definition', () => {
      const definition = tool.getDefinition();
      
      expect(definition.name).toBe('debug_set_breakpoint');
      expect(definition.description).toContain('Set a breakpoint');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['filename', 'lineno']);
      
      const properties = definition.inputSchema.properties;
      expect(properties.filename).toBeDefined();
      expect(properties.lineno).toBeDefined();
      expect(properties.type).toBeDefined();
      expect(properties.state).toBeDefined();
      expect(properties.temporary).toBeDefined();
      expect(properties.expression).toBeDefined();
    });

    test('should have correct enum values for type', () => {
      const definition = tool.getDefinition();
      const typeEnum = definition.inputSchema.properties.type.enum;
      
      expect(typeEnum).toContain('line');
      expect(typeEnum).toContain('conditional');
      expect(typeEnum).toContain('exception');
    });

    test('should have correct enum values for state', () => {
      const definition = tool.getDefinition();
      const stateEnum = definition.inputSchema.properties.state.enum;
      
      expect(stateEnum).toContain('enabled');
      expect(stateEnum).toContain('disabled');
    });
  });

  describe('execute', () => {
    test('should successfully set breakpoint with required parameters', async () => {
      serviceRegistry.register('activeSession', mockActiveSession);
      
      const params = {
        filename: '/test/file.php',
        lineno: 10
      };
      
      const result = await tool.execute(params);
      
      expect(mockActiveSession.commands.setBreakpoint).toHaveBeenCalledWith(
        '/test/file.php',
        10,
        {
          type: 'line',
          state: 'enabled',
          temporary: false
        }
      );
      
      expect(result.isSuccess).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.breakpointId).toBe('bp_1');
      expect(response.filename).toBe('/test/file.php');
      expect(response.lineno).toBe(10);
      expect(response.message).toContain('Breakpoint set at /test/file.php:10');
    });

    test('should set breakpoint with all optional parameters', async () => {
      serviceRegistry.register('activeSession', mockActiveSession);
      
      const params = {
        filename: '/test/file.php',
        lineno: 15,
        type: 'conditional',
        state: 'disabled',
        temporary: true,
        expression: '$x > 10'
      };
      
      const result = await tool.execute(params);
      
      expect(mockActiveSession.commands.setBreakpoint).toHaveBeenCalledWith(
        '/test/file.php',
        15,
        {
          type: 'conditional',
          state: 'disabled',
          temporary: true,
          expression: '$x > 10'
        }
      );
      
      expect(result.isSuccess).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.type).toBe('conditional');
      expect(response.state).toBe('disabled');
      expect(response.temporary).toBe(true);
      expect(response.expression).toBe('$x > 10');
    });

    test('should handle missing active session', async () => {
      const params = {
        filename: '/test/file.php',
        lineno: 10
      };
      
      const result = await tool.execute(params);
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('No debugging session is active');
      expect(mockActiveSession.commands.setBreakpoint).not.toHaveBeenCalled();
    });

    test('should handle breakpoint setting errors', async () => {
      serviceRegistry.register('activeSession', mockActiveSession);
      
      const breakpointError = new Error('Invalid filename');
      mockActiveSession.commands.setBreakpoint.mockRejectedValue(breakpointError);
      
      const params = {
        filename: '/invalid/file.php',
        lineno: 10
      };
      
      const result = await tool.execute(params);
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Failed to set breakpoint: Invalid filename');
    });
  });

  describe('parameter validation', () => {
    test('should require filename and lineno', () => {
      const definition = tool.getDefinition();
      expect(definition.inputSchema.required).toEqual(['filename', 'lineno']);
    });

    test('should validate lineno minimum value', () => {
      const definition = tool.getDefinition();
      const linenoProperty = definition.inputSchema.properties.lineno;
      
      expect(linenoProperty.type).toBe('integer');
      expect(linenoProperty.minimum).toBe(1);
    });

    test('should accept valid parameters', () => {
      const validParams = {
        filename: '/test/file.php',
        lineno: 10,
        type: 'line',
        state: 'enabled'
      };
      
      const validation = tool.validateParameters(validParams);
      expect(validation.valid).toBe(true);
    });
  });
});
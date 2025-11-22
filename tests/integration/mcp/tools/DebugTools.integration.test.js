/**
 * Integration tests for MCP Debugging Tools
 */

const MCPServer = require('../../../../src/mcp/MCPServer');

describe('MCP Debugging Tools Integration', () => {
  let server;

  beforeEach(() => {
    server = new MCPServer({ transport: 'stdio' });
  });

  afterEach(async () => {
    if (server && server.isRunning) {
      await server.stop();
    }
  });

  describe('Tool Registration', () => {
    test('should register all debugging tools', () => {
      expect(server.tools.size).toBe(8);
      
      // Check that all expected tools are registered
      const expectedTools = [
        'debug_start_session',
        'debug_stop_session',
        'debug_set_breakpoint',
        'debug_remove_breakpoint',
        'debug_list_breakpoints',
        'debug_step_execution',
        'debug_continue_execution',
        'debug_get_status'
      ];
      
      expectedTools.forEach(toolName => {
        expect(server.tools.has(toolName)).toBe(true);
      });
    });

    test('should initialize tools with service registry', () => {
      const tool = server.tools.get('debug_start_session');
      expect(tool.services).toBe(server.serviceRegistry);
    });
  });

  describe('Tools List Handler', () => {
    test('should return list of all debugging tools', async () => {
      const result = await server.handleToolsList({});
      
      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBe(8);
      
      // Check that each tool has required properties
      result.tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      });
    });

    test('should include debug_start_session tool definition', async () => {
      const result = await server.handleToolsList({});
      
      const startSessionTool = result.tools.find(t => t.name === 'debug_start_session');
      expect(startSessionTool).toBeDefined();
      expect(startSessionTool.description).toContain('Start a debugging session');
      expect(startSessionTool.inputSchema.properties.host).toBeDefined();
      expect(startSessionTool.inputSchema.properties.port).toBeDefined();
    });

    test('should include debug_set_breakpoint tool definition', async () => {
      const result = await server.handleToolsList({});
      
      const setBreakpointTool = result.tools.find(t => t.name === 'debug_set_breakpoint');
      expect(setBreakpointTool).toBeDefined();
      expect(setBreakpointTool.description).toContain('Set a breakpoint');
      expect(setBreakpointTool.inputSchema.required).toEqual(['filename', 'lineno']);
    });
  });

  describe('Tools Call Handler', () => {
    test('should reject call to non-existent tool', async () => {
      const result = await server.handleToolsCall({
        name: 'non_existent_tool',
        arguments: {}
      });
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Tool \'non_existent_tool\' not found');
    });

    test('should reject call without tool name', async () => {
      const result = await server.handleToolsCall({ arguments: {} });
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Tool name is required');
    });

    test('should handle debug_get_status without active session', async () => {
      const result = await server.handleToolsCall({
        name: 'debug_get_status',
        arguments: {}
      });
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('No debugging session is active');
    });

    test('should validate tool parameters', async () => {
      const result = await server.handleToolsCall({
        name: 'debug_set_breakpoint',
        arguments: {
          // Missing required filename parameter
          lineno: 10
        }
      });
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Invalid parameters');
    });
  });

  describe('Tool Workflow', () => {
    test('should maintain session state across tool calls', async () => {
      // Mock the DBGpClient for this test
      const mockSession = {
        sessionId: 'test-session',
        client: { isConnected: () => true },
        commands: { 
          status: jest.fn().mockResolvedValue({ status: 'running' }),
          listBreakpoints: jest.fn().mockResolvedValue([])
        }
      };
      
      // Manually register active session for testing workflow
      server.serviceRegistry.register('activeSession', mockSession);
      
      // Test debug_get_status with active session
      const statusResult = await server.handleToolsCall({
        name: 'debug_get_status',
        arguments: {}
      });
      
      expect(statusResult.isSuccess).toBe(true);
      const statusResponse = JSON.parse(statusResult.content[0].text);
      expect(statusResponse.status).toBe('running');
      
      // Test debug_list_breakpoints with same session
      const breakpointsResult = await server.handleToolsCall({
        name: 'debug_list_breakpoints',
        arguments: {}
      });
      
      expect(breakpointsResult.isSuccess).toBe(true);
      const breakpointsResponse = JSON.parse(breakpointsResult.content[0].text);
      expect(breakpointsResponse.breakpoints).toEqual([]);
      expect(breakpointsResponse.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle tool execution errors gracefully', async () => {
      // This will fail because there's no real connection
      const result = await server.handleToolsCall({
        name: 'debug_start_session',
        arguments: {
          host: 'localhost',
          port: 9999 // Invalid port
        }
      });
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Failed to start debugging session');
    });

    test('should return formatted error responses', async () => {
      const result = await server.handleToolsCall({
        name: 'debug_stop_session',
        arguments: {}
      });
      
      expect(result).toHaveProperty('isSuccess');
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });
  });
});
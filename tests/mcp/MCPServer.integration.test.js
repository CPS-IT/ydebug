/**
 * MCPServer Integration Tests
 * Tests main MCP server with real components
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const MCPServer = require('../../src/mcp/MCPServer');

// Mock Logger module
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../src/utils/Logger', () => ({ logger: mockLogger }));

describe('MCPServer Integration', () => {
  let server;

  beforeEach(() => {
    server = new MCPServer();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    try {
      if (server && server.isRunning) {
        await server.stop();
      }
    } catch (_error) { // eslint-disable-line no-unused-vars
      // Ignore cleanup errors in tests
    }
  });

  describe('Basic Functionality', () => {
    test('should create server with default config', () => {
      expect(server.config.transport).toBe('stdio');
      expect(server.isRunning).toBe(false);
    });

    test('should create server with custom config', () => {
      const customServer = new MCPServer({ transport: 'stdio', debug: true });
      expect(customServer.config.debug).toBe(true);
    });

    test('should initialize with services', async () => {
      const services = { testService: { name: 'test' } };
      await server.initialize(services);
      
      // Check that services were registered correctly
      expect(server.serviceRegistry.has('testService')).toBe(true);
      expect(server.serviceRegistry.get('testService')).toBe(services.testService);
    });

    test('should get server status', async () => {
      await server.initialize();
      const status = server.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('transport');
      expect(status).toHaveProperty('capabilities');
      expect(status).toHaveProperty('services');
    });
  });

  describe('MCP Method Handlers', () => {
    beforeEach(async () => {
      await server.initialize();
    });

    test('should handle ping request', async () => {
      const result = await server.handlePing({});
      
      expect(result).toHaveProperty('pong', true);
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('number');
    });

    test('should handle tools list request', async () => {
      const result = await server.handleToolsList({});
      
      expect(result).toHaveProperty('tools');
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBe(8); // 8 debugging tools registered
      
      // Check that all expected tools are present
      const toolNames = result.tools.map(tool => tool.name);
      expect(toolNames).toContain('debug_start_session');
      expect(toolNames).toContain('debug_stop_session');
      expect(toolNames).toContain('debug_set_breakpoint');
      expect(toolNames).toContain('debug_remove_breakpoint');
      expect(toolNames).toContain('debug_list_breakpoints');
      expect(toolNames).toContain('debug_step_execution');
      expect(toolNames).toContain('debug_continue_execution');
      expect(toolNames).toContain('debug_get_status');
    });

    test('should handle resources list request', async () => {
      const result = await server.handleResourcesList({});
      
      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources).toHaveLength(6);
      
      // Check that each resource has the required MCP resource format
      result.resources.forEach(resource => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType', 'application/json');
        expect(resource).toHaveProperty('annotations');
        expect(resource.uri).toMatch(/^ydebug:\/\//);
        expect(resource.annotations).toHaveProperty('supportsSubscriptions', true);
      });
    });

    test('should handle tools/call with proper error for missing tool name', async () => {
      const result = await server.handleToolsCall({});
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Tool name is required');
    });

    test('should throw error for missing URI in resources/read', async () => {
      await expect(server.handleResourcesRead({})).rejects.toThrow('Resource URI is required');
    });

    test('should throw error for unknown resource in resources/read', async () => {
      await expect(server.handleResourcesRead({ uri: 'unknown://resource' })).rejects.toThrow('Resource not found: unknown://resource');
    });

    test('should handle initialize request', async () => {
      const clientCaps = {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      };
      
      const result = await server.handleInitialize(clientCaps);
      
      expect(result).toHaveProperty('protocolVersion');
      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('serverInfo');
    });

    test('should reject invalid initialize request', async () => {
      const invalidCaps = { invalid: 'data' };
      
      await expect(server.handleInitialize(invalidCaps)).rejects.toThrow('Capability negotiation failed');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for unsupported transport', () => {
      expect(() => {
        new MCPServer({ transport: 'unsupported' });
      }).toThrow('Unsupported transport: unsupported');
    });

    test('should handle start without initialization', async () => {
      await expect(server.start()).rejects.toThrow('Transport not initialized');
    });

    test('should handle double start', async () => {
      await server.initialize();
      await server.start();
      
      await expect(server.start()).rejects.toThrow('MCP server is already running');
    });

    test('should handle stop when not running', async () => {
      await server.initialize();
      await server.stop(); // Should not throw
      
      expect(server.isRunning).toBe(false);
    });
  });

  describe('Server Lifecycle', () => {
    test('should complete full lifecycle', async () => {
      // Initialize
      await server.initialize({ testService: {} });
      expect(server.isRunning).toBe(false);
      
      // Start
      await server.start();
      expect(server.isRunning).toBe(true);
      
      // Stop
      await server.stop();
      expect(server.isRunning).toBe(false);
    });

    test('should emit lifecycle events', async () => {
      const initializedSpy = jest.fn();
      const startedSpy = jest.fn();
      const stoppedSpy = jest.fn();
      
      server.on('initialized', initializedSpy);
      server.on('started', startedSpy);
      server.on('stopped', stoppedSpy);
      
      await server.initialize();
      expect(initializedSpy).toHaveBeenCalled();
      
      await server.start();
      expect(startedSpy).toHaveBeenCalled();
      
      await server.stop();
      expect(stoppedSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    test('should use stdio transport by default', () => {
      const defaultServer = new MCPServer();
      expect(defaultServer.config.transport).toBe('stdio');
    });

    test('should accept custom configuration', () => {
      const config = { transport: 'stdio', customOption: true };
      const customServer = new MCPServer(config);
      expect(customServer.config).toEqual(config);
    });
  });
});
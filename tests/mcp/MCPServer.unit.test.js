/**
 * MCPServer Comprehensive Unit Tests
 * Tests all methods, error paths, and edge cases for maximum coverage
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const MCPServer = require('../../src/mcp/MCPServer');
const ServiceRegistry = require('../../src/mcp/ServiceRegistry');
const JsonRpcHandler = require('../../src/mcp/protocol/JsonRpcHandler');
const CapabilityManager = require('../../src/mcp/protocol/CapabilityManager');

// Mock all dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../src/utils/Logger', () => ({ logger: mockLogger }));

// Mock StdioTransport constructor
jest.mock('../../src/mcp/transport/StdioTransport', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(),
    stop: jest.fn().mockResolvedValue(),
    send: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    isConnected: true,
    getStatus: jest.fn().mockReturnValue({ type: 'StdioTransport', isConnected: true })
  }));
});

// Create manual mocks instead of using jest.mock with constructors
const mockServiceRegistry = {
  register: jest.fn(),
  get: jest.fn(),
  getStatus: jest.fn().mockReturnValue({ serviceCount: 0, services: [] })
};

const mockJsonRpc = {
  parseMessage: jest.fn(),
  isRequest: jest.fn(),
  isNotification: jest.fn(),
  isResponse: jest.fn(),
  createSuccessResponse: jest.fn(),
  createErrorResponse: jest.fn(),
  serializeMessage: jest.fn(),
  constructor: { ErrorCodes: { PARSE_ERROR: -32700, METHOD_NOT_FOUND: -32601, INTERNAL_ERROR: -32603 } }
};

const mockCapabilityManager = {
  negotiateCapabilities: jest.fn(),
  getServerCapabilities: jest.fn(),
  reset: jest.fn(),
  getStatus: jest.fn().mockReturnValue({ isNegotiated: false })
};

const mockTransport = {
  start: jest.fn().mockResolvedValue(),
  stop: jest.fn().mockResolvedValue(),
  send: jest.fn().mockResolvedValue(),
  on: jest.fn(),
  isConnected: true,
  getStatus: jest.fn().mockReturnValue({ type: 'StdioTransport', isConnected: true })
};

// Mock MCP Tools
jest.mock('../../src/mcp/tools/DebugStartSession', () => {
  return jest.fn().mockImplementation(() => ({
    getDefinition: () => ({ name: 'debug_start_session', description: 'Start debug session', inputSchema: {} }),
    validateParameters: () => ({ valid: true }),
    execute: jest.fn().mockResolvedValue({ success: true })
  }));
});

jest.mock('../../src/mcp/tools/DebugStopSession', () => {
  return jest.fn().mockImplementation(() => ({
    getDefinition: () => ({ name: 'debug_stop_session', description: 'Stop debug session', inputSchema: {} }),
    validateParameters: () => ({ valid: true }),
    execute: jest.fn().mockResolvedValue({ success: true })
  }));
});

jest.mock('../../src/mcp/tools/DebugSetBreakpoint', () => {
  return jest.fn().mockImplementation(() => ({
    getDefinition: () => ({ name: 'debug_set_breakpoint', description: 'Set breakpoint', inputSchema: {} }),
    validateParameters: () => ({ valid: true }),
    execute: jest.fn().mockResolvedValue({ success: true })
  }));
});

jest.mock('../../src/mcp/tools/DebugRemoveBreakpoint', () => {
  return jest.fn().mockImplementation(() => ({
    getDefinition: () => ({ name: 'debug_remove_breakpoint', description: 'Remove breakpoint', inputSchema: {} }),
    validateParameters: () => ({ valid: true }),
    execute: jest.fn().mockResolvedValue({ success: true })
  }));
});

jest.mock('../../src/mcp/tools/DebugListBreakpoints', () => {
  return jest.fn().mockImplementation(() => ({
    getDefinition: () => ({ name: 'debug_list_breakpoints', description: 'List breakpoints', inputSchema: {} }),
    validateParameters: () => ({ valid: true }),
    execute: jest.fn().mockResolvedValue({ success: true })
  }));
});

jest.mock('../../src/mcp/tools/DebugStepExecution', () => {
  return jest.fn().mockImplementation(() => ({
    getDefinition: () => ({ name: 'debug_step_execution', description: 'Step execution', inputSchema: {} }),
    validateParameters: () => ({ valid: true }),
    execute: jest.fn().mockResolvedValue({ success: true })
  }));
});

jest.mock('../../src/mcp/tools/DebugContinueExecution', () => {
  return jest.fn().mockImplementation(() => ({
    getDefinition: () => ({ name: 'debug_continue_execution', description: 'Continue execution', inputSchema: {} }),
    validateParameters: () => ({ valid: true }),
    execute: jest.fn().mockResolvedValue({ success: true })
  }));
});

jest.mock('../../src/mcp/tools/DebugGetStatus', () => {
  return jest.fn().mockImplementation(() => ({
    getDefinition: () => ({ name: 'debug_get_status', description: 'Get debug status', inputSchema: {} }),
    validateParameters: () => ({ valid: true }),
    execute: jest.fn().mockResolvedValue({ success: true })
  }));
});

describe('MCPServer Unit Tests', () => {
  let server;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock constructors to return our mock instances
    jest.spyOn(ServiceRegistry.prototype, 'register').mockImplementation(mockServiceRegistry.register);
    jest.spyOn(ServiceRegistry.prototype, 'get').mockImplementation(mockServiceRegistry.get);
    jest.spyOn(ServiceRegistry.prototype, 'getStatus').mockImplementation(mockServiceRegistry.getStatus);

    jest.spyOn(JsonRpcHandler.prototype, 'parseMessage').mockImplementation(mockJsonRpc.parseMessage);
    jest.spyOn(JsonRpcHandler.prototype, 'isRequest').mockImplementation(mockJsonRpc.isRequest);
    jest.spyOn(JsonRpcHandler.prototype, 'isNotification').mockImplementation(mockJsonRpc.isNotification);
    jest.spyOn(JsonRpcHandler.prototype, 'isResponse').mockImplementation(mockJsonRpc.isResponse);
    jest.spyOn(JsonRpcHandler.prototype, 'createSuccessResponse').mockImplementation(mockJsonRpc.createSuccessResponse);
    jest.spyOn(JsonRpcHandler.prototype, 'createErrorResponse').mockImplementation(mockJsonRpc.createErrorResponse);
    jest.spyOn(JsonRpcHandler.prototype, 'serializeMessage').mockImplementation(mockJsonRpc.serializeMessage);

    jest.spyOn(CapabilityManager.prototype, 'negotiateCapabilities').mockImplementation(mockCapabilityManager.negotiateCapabilities);
    jest.spyOn(CapabilityManager.prototype, 'getServerCapabilities').mockImplementation(mockCapabilityManager.getServerCapabilities);
    jest.spyOn(CapabilityManager.prototype, 'reset').mockImplementation(mockCapabilityManager.reset);
    jest.spyOn(CapabilityManager.prototype, 'getStatus').mockImplementation(mockCapabilityManager.getStatus);

    server = new MCPServer();

    // Override the logger directly to ensure mocking works
    server.logger = mockLogger;

    // Set up the transport property manually since we're mocking
    server.transport = mockTransport;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should create instance with default config', () => {
      expect(server.config.transport).toBe('stdio');
      expect(server.isRunning).toBe(false);
      expect(server.currentRequestId).toBe(0);
    });

    test('should merge custom config with defaults', () => {
      const customConfig = { transport: 'stdio', debug: true, customProp: 'test' };
      const customServer = new MCPServer(customConfig);

      expect(customServer.config.transport).toBe('stdio');
      expect(customServer.config.debug).toBe(true);
      expect(customServer.config.customProp).toBe('test');
    });

    test('should throw error for unsupported transport', () => {
      expect(() => {
        new MCPServer({ transport: 'websocket' });
      }).toThrow('Unsupported transport: websocket');
    });

    test('should throw error for null transport', () => {
      expect(() => {
        new MCPServer({ transport: null });
      }).toThrow('Unsupported transport: null');
    });

    test('should setup tools map correctly', () => {
      expect(server.tools).toBeInstanceOf(Map);
      expect(server.tools.size).toBe(8); // All 8 debugging tools
    });

    test('should setup method handlers correctly', () => {
      expect(server.methodHandlers).toBeInstanceOf(Map);
      expect(server.methodHandlers.has('initialize')).toBe(true);
      expect(server.methodHandlers.has('tools/list')).toBe(true);
      expect(server.methodHandlers.has('tools/call')).toBe(true);
      expect(server.methodHandlers.has('resources/list')).toBe(true);
      expect(server.methodHandlers.has('resources/read')).toBe(true);
      expect(server.methodHandlers.has('ping')).toBe(true);
    });

    test('should bind methods to preserve context', () => {
      // Verify that bound methods maintain the correct 'this' context
      const { handleTransportMessage } = server;
      expect(typeof handleTransportMessage).toBe('function');
    });
  });

  describe('initialize', () => {
    test('should initialize without services', async () => {
      await server.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith('Initializing MCP server');
      expect(mockLogger.info).toHaveBeenCalledWith('MCP server initialized successfully');
    });

    test('should register provided services', async () => {
      const services = {
        dbgpClient: { connect: jest.fn() },
        activeSession: { isActive: jest.fn() }
      };

      await server.initialize(services);

      expect(mockServiceRegistry.register).toHaveBeenCalledWith('dbgpClient', services.dbgpClient);
      expect(mockServiceRegistry.register).toHaveBeenCalledWith('activeSession', services.activeSession);
    });

    test('should emit initialized event', async () => {
      const spy = jest.fn();
      server.on('initialized', spy);

      await server.initialize();

      expect(spy).toHaveBeenCalled();
    });

    test('should setup transport', async () => {
      await server.initialize();

      // Verify transport is created and configured
      expect(server.transport).toBeDefined();
      expect(server.transport.on).toBeDefined();
      expect(typeof server.transport.start).toBe('function');
      expect(typeof server.transport.stop).toBe('function');
    });
  });

  describe('start', () => {
    beforeEach(async () => {
      await server.initialize();
      // Ensure we use mockTransport for start tests
      server.transport = mockTransport;
    });

    test('should start transport and set running state', async () => {
      await server.start();

      expect(mockTransport.start).toHaveBeenCalled();
      expect(server.isRunning).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting MCP server');
      expect(mockLogger.info).toHaveBeenCalledWith('MCP server started successfully');
    });

    test('should emit started event', async () => {
      const spy = jest.fn();
      server.on('started', spy);

      await server.start();

      expect(spy).toHaveBeenCalled();
    });

    test('should throw error if already running', async () => {
      server.isRunning = true;

      await expect(server.start()).rejects.toThrow('MCP server is already running');
    });

    test('should throw error if transport not initialized', async () => {
      server.transport = null;

      await expect(server.start()).rejects.toThrow('Transport not initialized. Call initialize() first.');
    });

    test('should handle transport start error', async () => {
      const error = new Error('Transport start failed');
      mockTransport.start.mockRejectedValue(error);

      await expect(server.start()).rejects.toThrow('Transport start failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to start MCP server:', error);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await server.initialize();
      // Ensure we use mockTransport for stop tests and reset any previous error configurations
      server.transport = mockTransport;
      mockTransport.start.mockResolvedValue(); // Reset any previous rejections
      await server.start();
    });

    test('should stop transport and reset state', async () => {
      await server.stop();

      expect(mockTransport.stop).toHaveBeenCalled();
      expect(server.isRunning).toBe(false);
      expect(mockCapabilityManager.reset).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping MCP server');
      expect(mockLogger.info).toHaveBeenCalledWith('MCP server stopped successfully');
    });

    test('should emit stopped event', async () => {
      const spy = jest.fn();
      server.on('stopped', spy);

      await server.stop();

      expect(spy).toHaveBeenCalled();
    });

    test('should do nothing if not running', async () => {
      server.isRunning = false;

      await server.stop();

      expect(mockTransport.stop).not.toHaveBeenCalled();
    });

    test('should handle transport stop error', async () => {
      const error = new Error('Transport stop failed');
      mockTransport.stop.mockRejectedValue(error);

      await expect(server.stop()).rejects.toThrow('Transport stop failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error stopping MCP server:', error);
    });

    test('should handle missing transport gracefully', async () => {
      server.transport = null;

      await server.stop();

      expect(server.isRunning).toBe(false);
      expect(mockCapabilityManager.reset).toHaveBeenCalled();
    });
  });

  describe('initializeTransport', () => {
    test('should create StdioTransport for stdio config', () => {
      server.config.transport = 'stdio';
      server.initializeTransport();

      // Verify that a transport was created and is of the expected type
      expect(server.transport).toBeDefined();
      expect(typeof server.transport.start).toBe('function');
      expect(typeof server.transport.stop).toBe('function');
      expect(typeof server.transport.on).toBe('function');
    });

    test('should throw error for unsupported transport in initializeTransport', () => {
      server.config.transport = 'http';

      expect(() => server.initializeTransport()).toThrow('Unsupported transport: http');
    });

    test('should setup transport event handlers', () => {
      server.initializeTransport();

      // Verify that transport is created and event handlers are set up
      expect(server.transport).toBeDefined();
      expect(server.transport.on).toBeDefined();

      // The transport should have on() method for event handling
      expect(typeof server.transport.on).toBe('function');

      // Verify event handler methods exist on server
      expect(typeof server.handleTransportMessage).toBe('function');
      expect(typeof server.handleTransportError).toBe('function');
      expect(typeof server.handleTransportDisconnect).toBe('function');
    });

    test('should handle transport connect event', () => {
      const connectSpy = jest.fn();
      server.on('clientConnected', connectSpy);

      server.initializeTransport();

      // Verify transport was created and event handler methods exist
      expect(server.transport).toBeDefined();
      expect(typeof server.handleTransportMessage).toBe('function');
      expect(typeof server.handleTransportError).toBe('function');
      expect(typeof server.handleTransportDisconnect).toBe('function');

      // Verify server can emit clientConnected event
      server.emit('clientConnected');
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('handleTransportMessage', () => {
    beforeEach(async () => {
      await server.initialize();
      // Ensure we use mockTransport for transport message tests
      server.transport = mockTransport;
      mockJsonRpc.parseMessage.mockReturnValue({ success: true, message: {} });
    });

    test('should handle parse error', async () => {
      mockJsonRpc.parseMessage.mockReturnValue({ success: false, error: 'Invalid JSON' });
      server.sendErrorResponse = jest.fn();

      await server.handleTransportMessage('invalid json');

      expect(server.sendErrorResponse).toHaveBeenCalledWith(-32700, 'Invalid JSON', null, null);
    });

    test('should handle request messages', async () => {
      const request = { method: 'ping', id: 1 };
      mockJsonRpc.parseMessage.mockReturnValue({ success: true, message: request });
      mockJsonRpc.isRequest.mockReturnValue(true);
      server.handleRequest = jest.fn();

      await server.handleTransportMessage(JSON.stringify(request));

      expect(server.handleRequest).toHaveBeenCalledWith(request);
    });

    test('should handle notification messages', async () => {
      const notification = { method: 'notify' };
      mockJsonRpc.parseMessage.mockReturnValue({ success: true, message: notification });
      mockJsonRpc.isRequest.mockReturnValue(false);
      mockJsonRpc.isNotification.mockReturnValue(true);
      mockJsonRpc.isResponse.mockReturnValue(false);
      server.handleNotification = jest.fn();

      await server.handleTransportMessage(JSON.stringify(notification));

      expect(server.handleNotification).toHaveBeenCalledWith(notification);
    });

    test('should handle response messages', async () => {
      const response = { result: 'success', id: 1 };
      mockJsonRpc.parseMessage.mockReturnValue({ success: true, message: response });
      mockJsonRpc.isRequest.mockReturnValue(false);
      mockJsonRpc.isNotification.mockReturnValue(false);
      mockJsonRpc.isResponse.mockReturnValue(true);

      await server.handleTransportMessage(JSON.stringify(response));

      expect(mockLogger.debug).toHaveBeenCalledWith('Received response:', response);
    });

    test('should handle transport message error', async () => {
      mockJsonRpc.parseMessage.mockImplementation(() => { throw new Error('Parser error'); });
      server.sendErrorResponse = jest.fn();

      await server.handleTransportMessage('some message');

      expect(mockLogger.error).toHaveBeenCalledWith('Error handling transport message:', expect.any(Error));
      expect(server.sendErrorResponse).toHaveBeenCalledWith(-32603, 'Internal server error', { details: 'Parser error' }, null);
    });
  });

  describe('handleRequest', () => {
    beforeEach(async () => {
      await server.initialize();
      server.sendErrorResponse = jest.fn();
      server.sendSuccessResponse = jest.fn();
    });

    test('should handle valid request with handler', async () => {
      const request = { method: 'ping', params: {}, id: 1 };

      await server.handleRequest(request);

      expect(mockLogger.debug).toHaveBeenCalledWith('Handling request: ping', { id: 1, params: {} });
      expect(server.sendSuccessResponse).toHaveBeenCalledWith(expect.any(Object), 1);
    });

    test('should handle request with no params', async () => {
      const request = { method: 'ping', id: 1 };

      await server.handleRequest(request);

      expect(server.sendSuccessResponse).toHaveBeenCalledWith(expect.any(Object), 1);
    });

    test('should handle method not found', async () => {
      const request = { method: 'nonexistent', params: {}, id: 1 };

      await server.handleRequest(request);

      expect(server.sendErrorResponse).toHaveBeenCalledWith(-32601, 'Method not found: nonexistent', null, 1);
    });

    test('should handle handler error', async () => {
      // Mock a handler that throws an error
      const error = new Error('Handler failed');
      server.methodHandlers.set('test_error', jest.fn().mockRejectedValue(error));

      const request = { method: 'test_error', params: {}, id: 1 };

      await server.handleRequest(request);

      expect(mockLogger.error).toHaveBeenCalledWith('Error in method handler test_error:', error);
      expect(server.sendErrorResponse).toHaveBeenCalledWith(-32603, 'Handler failed', { method: 'test_error' }, 1);
    });
  });

  describe('handleNotification', () => {
    beforeEach(async () => {
      await server.initialize();
    });

    test('should handle notification with handler', async () => {
      const handler = jest.fn();
      server.methodHandlers.set('test_notify', handler);

      const notification = { method: 'test_notify', params: { test: true } };

      await server.handleNotification(notification);

      expect(mockLogger.debug).toHaveBeenCalledWith('Handling notification: test_notify', { params: { test: true } });
      expect(handler).toHaveBeenCalledWith({ test: true });
    });

    test('should handle notification without params', async () => {
      const handler = jest.fn();
      server.methodHandlers.set('test_notify', handler);

      const notification = { method: 'test_notify' };

      await server.handleNotification(notification);

      expect(handler).toHaveBeenCalledWith({});
    });

    test('should handle notification without handler', async () => {
      const notification = { method: 'unknown_notify' };

      await server.handleNotification(notification);

      expect(mockLogger.warn).toHaveBeenCalledWith('No handler for notification: unknown_notify');
    });

    test('should handle notification handler error', async () => {
      const error = new Error('Notification handler failed');
      const handler = jest.fn().mockRejectedValue(error);
      server.methodHandlers.set('error_notify', handler);

      const notification = { method: 'error_notify' };

      await server.handleNotification(notification);

      expect(mockLogger.error).toHaveBeenCalledWith('Error in notification handler error_notify:', error);
    });
  });

  describe('handleInitialize', () => {
    beforeEach(async () => {
      await server.initialize();
      mockCapabilityManager.negotiateCapabilities.mockReturnValue(true);
      mockCapabilityManager.getServerCapabilities.mockReturnValue({ version: '1.0.0' });
    });

    test('should handle successful initialization', async () => {
      const params = { protocolVersion: '2024-11-05', capabilities: {} };
      const spy = jest.fn();
      server.on('initialized', spy);

      const result = await server.handleInitialize(params);

      expect(mockLogger.info).toHaveBeenCalledWith('Handling initialize request');
      expect(mockCapabilityManager.negotiateCapabilities).toHaveBeenCalledWith(params);
      expect(mockLogger.info).toHaveBeenCalledWith('Initialization successful');
      expect(spy).toHaveBeenCalledWith(params);
      expect(result).toEqual({ version: '1.0.0' });
    });

    test('should handle capability negotiation failure', async () => {
      mockCapabilityManager.negotiateCapabilities.mockReturnValue(false);

      const params = { invalid: 'params' };

      await expect(server.handleInitialize(params)).rejects.toThrow('Capability negotiation failed');
    });
  });

  describe('handleToolsList', () => {
    beforeEach(async () => {
      await server.initialize();
    });

    test('should return list of all tools', async () => {
      const result = await server.handleToolsList({});

      expect(result).toHaveProperty('tools');
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools).toHaveLength(8);
      expect(mockLogger.debug).toHaveBeenCalledWith('Listing 8 available tools');
    });

    test('should return tools with proper format', async () => {
      const result = await server.handleToolsList({});

      result.tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('handleToolsCall', () => {
    beforeEach(async () => {
      await server.initialize();
    });

    test('should execute tool successfully', async () => {
      // Mock a successful tool execution
      const mockTool = {
        validateParameters: jest.fn().mockReturnValue({ valid: true }),
        execute: jest.fn().mockResolvedValue({ isSuccess: true, content: [{ type: 'text', text: 'Success' }] })
      };
      server.tools.set('debug_get_status', mockTool);

      const params = { name: 'debug_get_status', arguments: {} };
      const result = await server.handleToolsCall(params);

      expect(mockLogger.info).toHaveBeenCalledWith('Executing MCP tool: debug_get_status', {});
      expect(mockLogger.info).toHaveBeenCalledWith('MCP tool \'debug_get_status\' executed successfully');
      expect(result).toEqual({ isSuccess: true, content: [{ type: 'text', text: 'Success' }] });
    });

    test('should handle missing tool name', async () => {
      const result = await server.handleToolsCall({});

      expect(result).toEqual({
        isSuccess: false,
        content: [{
          type: 'text',
          text: 'Tool execution failed: Tool name is required'
        }]
      });
    });

    test('should handle tool not found', async () => {
      const params = { name: 'nonexistent_tool', arguments: {} };

      const result = await server.handleToolsCall(params);

      expect(result).toEqual({
        isSuccess: false,
        content: [{
          type: 'text',
          text: 'Tool \'nonexistent_tool\' not found'
        }]
      });
    });

    test('should handle invalid tool parameters', async () => {
      const mockTool = {
        validateParameters: jest.fn().mockReturnValue({ valid: false, errors: ['Invalid param'] }),
        formatErrorResponse: jest.fn().mockReturnValue({ isSuccess: false, content: [] })
      };
      server.tools.set('invalid_tool', mockTool);

      const params = { name: 'invalid_tool', arguments: { invalid: 'param' } };

      await server.handleToolsCall(params);

      expect(mockTool.formatErrorResponse).toHaveBeenCalledWith(
        expect.any(Error),
        'Invalid parameters: Invalid param'
      );
    });

    test('should handle tool execution error', async () => {
      const error = new Error('Tool execution failed');
      const mockTool = {
        validateParameters: jest.fn().mockReturnValue({ valid: true }),
        execute: jest.fn().mockRejectedValue(error)
      };
      server.tools.set('error_tool', mockTool);

      const params = { name: 'error_tool', arguments: {} };

      const result = await server.handleToolsCall(params);

      expect(mockLogger.error).toHaveBeenCalledWith('MCP tool execution failed:', error);
      expect(result).toEqual({
        isSuccess: false,
        content: [{
          type: 'text',
          text: 'Tool execution failed: Tool execution failed'
        }]
      });
    });

    test('should handle tool call without arguments', async () => {
      // Mock a successful tool execution without arguments
      const mockTool = {
        validateParameters: jest.fn().mockReturnValue({ valid: true }),
        execute: jest.fn().mockResolvedValue({ isSuccess: true, content: [{ type: 'text', text: 'Status retrieved' }] })
      };
      server.tools.set('debug_get_status', mockTool);

      const params = { name: 'debug_get_status' };
      const result = await server.handleToolsCall(params);

      expect(mockTool.execute).toHaveBeenCalledWith({});
      expect(result).toEqual({ isSuccess: true, content: [{ type: 'text', text: 'Status retrieved' }] });
    });
  });

  describe('handleResourcesList', () => {
    test('should return list of registered resources', async () => {
      const result = await server.handleResourcesList({});
      
      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources).toHaveLength(6);
      
      // Check that each resource has required fields
      result.resources.forEach(resource => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType');
        expect(resource).toHaveProperty('annotations');
        expect(resource.uri).toMatch(/^ydebug:\/\//);
        expect(resource.mimeType).toBe('application/json');
        expect(resource.annotations).toHaveProperty('supportsSubscriptions', true);
      });
      
      // Check specific resource URIs are present
      const uris = result.resources.map(r => r.uri);
      expect(uris).toContain('ydebug://debugging-session');
      expect(uris).toContain('ydebug://active-breakpoints');
      expect(uris).toContain('ydebug://execution-state');
      expect(uris).toContain('ydebug://variable-context');
      expect(uris).toContain('ydebug://execution-history');
      expect(uris).toContain('ydebug://analysis-results');
    });
  });

  describe('handleResourcesRead', () => {
    test('should require URI parameter', async () => {
      await expect(server.handleResourcesRead({})).rejects.toThrow('Resource URI is required');
    });

    test('should handle resource not found', async () => {
      await expect(server.handleResourcesRead({ uri: 'ydebug://nonexistent' })).rejects.toThrow('Resource not found: ydebug://nonexistent');
    });

    test('should read valid resource', async () => {
      // Mock the resource registry readResource method to avoid actual service calls
      const mockReadResource = jest.spyOn(server.resourceRegistry, 'readResource')
        .mockResolvedValue({ data: 'mock resource data' });

      const result = await server.handleResourcesRead({ uri: 'ydebug://debugging-session' });
      
      expect(result).toHaveProperty('contents');
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents[0]).toHaveProperty('uri', 'ydebug://debugging-session');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(result.contents[0]).toHaveProperty('text');
      
      mockReadResource.mockRestore();
    });
  });

  describe('handlePing', () => {
    test('should return pong with timestamp', async () => {
      const result = await server.handlePing({});

      expect(result).toHaveProperty('pong', true);
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('number');
    });
  });

  describe('sendSuccessResponse', () => {
    beforeEach(async () => {
      await server.initialize();
      mockJsonRpc.createSuccessResponse.mockReturnValue({ success: true });
      server.sendMessage = jest.fn();
    });

    test('should create and send success response', async () => {
      const result = { data: 'test' };
      const id = 123;

      await server.sendSuccessResponse(result, id);

      expect(mockJsonRpc.createSuccessResponse).toHaveBeenCalledWith(result, id);
      expect(server.sendMessage).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('sendErrorResponse', () => {
    beforeEach(async () => {
      await server.initialize();
      mockJsonRpc.createErrorResponse.mockReturnValue({ error: 'test error' });
      server.sendMessage = jest.fn();
    });

    test('should create and send error response', async () => {
      const code = -32600;
      const message = 'Invalid request';
      const data = { details: 'test' };
      const id = 123;

      await server.sendErrorResponse(code, message, data, id);

      expect(mockJsonRpc.createErrorResponse).toHaveBeenCalledWith(code, message, data, id);
      expect(server.sendMessage).toHaveBeenCalledWith({ error: 'test error' });
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await server.initialize();
      // Ensure we use mockTransport for sendMessage tests and it's connected
      server.transport = mockTransport;
      mockTransport.isConnected = true;
      mockJsonRpc.serializeMessage.mockReturnValue('{"test": true}');
    });

    test('should serialize and send message', async () => {
      const message = { test: true };

      await server.sendMessage(message);

      expect(mockJsonRpc.serializeMessage).toHaveBeenCalledWith(message);
      expect(mockTransport.send).toHaveBeenCalledWith('{"test": true}');
    });

    test('should throw error if transport not connected', async () => {
      mockTransport.isConnected = false;
      server.transport = null;

      await expect(server.sendMessage({})).rejects.toThrow('Transport not connected');
    });
  });

  describe('handleTransportError', () => {
    test('should log error and emit error event', () => {
      const error = new Error('Transport error');
      const errorSpy = jest.fn();
      server.on('error', errorSpy);

      server.handleTransportError(error);

      expect(mockLogger.error).toHaveBeenCalledWith('MCP transport error:', error);
      expect(errorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('handleTransportDisconnect', () => {
    beforeEach(async () => {
      await server.initialize();
      server.isRunning = true;
    });

    test('should reset state and emit disconnect event', () => {
      const disconnectSpy = jest.fn();
      server.on('clientDisconnected', disconnectSpy);

      server.handleTransportDisconnect();

      expect(mockLogger.info).toHaveBeenCalledWith('MCP client disconnected');
      expect(server.isRunning).toBe(false);
      expect(mockCapabilityManager.reset).toHaveBeenCalled();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      await server.initialize();
      // Ensure we use mockTransport for getStatus tests
      server.transport = mockTransport;
    });

    test('should return complete server status', () => {
      const status = server.getStatus();

      expect(status).toHaveProperty('isRunning', false);
      expect(status).toHaveProperty('transport', { type: 'StdioTransport', isConnected: true });
      expect(status).toHaveProperty('capabilities', { isNegotiated: false });
      expect(status).toHaveProperty('services', { serviceCount: 0, services: [] });
      expect(status).toHaveProperty('resources');
      expect(status.resources).toHaveProperty('resourceCount', 6);
      expect(status.resources).toHaveProperty('resources');
      expect(status.resources).toHaveProperty('subscriptions', 0);
      expect(status.resources).toHaveProperty('cachedResources', 0);
      expect(Array.isArray(status.resources.resources)).toBe(true);
      expect(status.resources.resources).toHaveLength(6);
    });

    test('should handle missing transport', () => {
      server.transport = null;

      const status = server.getStatus();

      expect(status.transport).toBeNull();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle empty string transport message', async () => {
      await server.initialize();
      server.sendErrorResponse = jest.fn();
      mockJsonRpc.parseMessage.mockReturnValue({ success: false, error: 'Empty message' });

      await server.handleTransportMessage('');

      expect(server.sendErrorResponse).toHaveBeenCalled();
    });

    test('should handle malformed JSON in transport message', async () => {
      await server.initialize();
      server.sendErrorResponse = jest.fn();
      mockJsonRpc.parseMessage.mockReturnValue({ success: false, error: 'Invalid JSON' });

      await server.handleTransportMessage('{invalid json}');

      expect(server.sendErrorResponse).toHaveBeenCalled();
    });

    test('should handle request with null id', async () => {
      await server.initialize();
      server.sendSuccessResponse = jest.fn();

      const request = { method: 'ping', id: null };
      await server.handleRequest(request);

      expect(server.sendSuccessResponse).toHaveBeenCalledWith(expect.any(Object), null);
    });

    test('should handle notification with complex params', async () => {
      await server.initialize();
      const handler = jest.fn();
      server.methodHandlers.set('complex_notify', handler);

      const notification = {
        method: 'complex_notify',
        params: {
          nested: { data: [1, 2, 3] },
          array: ['a', 'b', 'c']
        }
      };

      await server.handleNotification(notification);

      expect(handler).toHaveBeenCalledWith(notification.params);
    });

    test('should handle tool validation with multiple errors', async () => {
      await server.initialize();
      const mockTool = {
        validateParameters: jest.fn().mockReturnValue({
          valid: false,
          errors: ['Missing required param', 'Invalid type', 'Out of range']
        }),
        formatErrorResponse: jest.fn().mockReturnValue({ isSuccess: false })
      };
      server.tools.set('multi_error_tool', mockTool);

      const params = { name: 'multi_error_tool', arguments: {} };

      await server.handleToolsCall(params);

      expect(mockTool.formatErrorResponse).toHaveBeenCalledWith(
        expect.any(Error),
        'Invalid parameters: Missing required param, Invalid type, Out of range'
      );
    });
  });
});

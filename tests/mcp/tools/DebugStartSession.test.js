/**
 * Tests for DebugStartSession MCP Tool
 */

// Mock DBGpClient and DBGpCommands BEFORE requiring the tool
const mockClient = {
  connect: jest.fn().mockResolvedValue(),
  isConnected: jest.fn().mockReturnValue(true),
  disconnect: jest.fn().mockResolvedValue()
};

const mockCommands = {
  status: jest.fn().mockResolvedValue({ status: 'starting' })
};

const MockDBGpClient = jest.fn().mockImplementation(() => mockClient);
const MockDBGpCommands = jest.fn().mockImplementation(() => mockCommands);

jest.mock('../../../src/debugger/DBGpClient', () => MockDBGpClient);
jest.mock('../../../src/debugger/DBGpCommands', () => MockDBGpCommands);

// Now require the modules
const DebugStartSession = require('../../../src/mcp/tools/DebugStartSession');
const ServiceRegistry = require('../../../src/mcp/ServiceRegistry');

describe('DebugStartSession MCP Tool', () => {
  let tool;
  let serviceRegistry;

  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
    tool = new DebugStartSession(serviceRegistry);
    
    // Reset mocks
    MockDBGpClient.mockClear();
    MockDBGpCommands.mockClear();
    mockClient.connect.mockClear();
    mockClient.isConnected.mockClear(); 
    mockClient.disconnect.mockClear();
    mockCommands.status.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    test('should return correct tool definition', () => {
      const definition = tool.getDefinition();
      
      expect(definition.name).toBe('debug_start_session');
      expect(definition.description).toContain('Start a debugging session');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties.host).toBeDefined();
      expect(definition.inputSchema.properties.port).toBeDefined();
      expect(definition.inputSchema.properties.timeout).toBeDefined();
    });
  });

  describe('execute', () => {
    test('should successfully start debugging session with default parameters', async () => {
      const result = await tool.execute({});
      
      expect(MockDBGpClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9003,
        timeout: 10000
      });
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockCommands.status).toHaveBeenCalled();
      
      expect(result.isSuccess).toBe(true);
      expect(result.content[0].text).toContain('Debugging session started successfully');
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        status: 'starting',
        host: 'localhost',
        port: 9003
      });
    });

    test('should start debugging session with custom parameters', async () => {
      const params = {
        host: '192.168.1.100',
        port: 9005,
        timeout: 15000
      };
      
      const result = await tool.execute(params);
      
      expect(MockDBGpClient).toHaveBeenCalledWith(params);
      expect(result.isSuccess).toBe(true);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.host).toBe('192.168.1.100');
      expect(response.port).toBe(9005);
    }, 5000);

    test('should register active session in service registry', async () => {
      await tool.execute({});
      
      const activeSession = serviceRegistry.get('activeSession');
      expect(activeSession).toBeDefined();
      expect(activeSession.sessionId).toMatch(/^session_/);
      expect(activeSession.client).toBe(mockClient);
      expect(activeSession.commands).toBe(mockCommands);
      expect(activeSession.host).toBe('localhost');
      expect(activeSession.port).toBe(9003);
      expect(activeSession.status).toBe('starting');
    });

    test('should handle connection errors', async () => {
      const connectionError = new Error('Connection refused');
      mockClient.connect.mockRejectedValue(connectionError);
      
      const result = await tool.execute({});
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Failed to start debugging session');
      expect(result.content[0].text).toContain('Connection refused');
    });

    test('should handle status command errors', async () => {
      const statusError = new Error('Status command failed');
      mockCommands.status.mockRejectedValue(statusError);
      
      const result = await tool.execute({});
      
      expect(result.isSuccess).toBe(false);
      expect(result.content[0].text).toContain('Failed to start debugging session');
    });

    test('should validate parameter types', () => {
      const definition = tool.getDefinition();
      const portProperty = definition.inputSchema.properties.port;
      
      expect(portProperty.type).toBe('integer');
      expect(portProperty.minimum).toBe(1);
      expect(portProperty.maximum).toBe(65535);
      
      const timeoutProperty = definition.inputSchema.properties.timeout;
      expect(timeoutProperty.minimum).toBe(1000);
      expect(timeoutProperty.maximum).toBe(60000);
    });
  });

  describe('parameter validation', () => {
    test('should accept valid parameters', () => {
      const validParams = {
        host: 'localhost',
        port: 9003,
        timeout: 10000
      };
      
      const validation = tool.validateParameters(validParams);
      expect(validation.valid).toBe(true);
    });

    test('should accept parameters with defaults', () => {
      const validation = tool.validateParameters({});
      expect(validation.valid).toBe(true);
    });
  });
});
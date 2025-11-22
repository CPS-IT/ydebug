/**
 * MCPServerCommand Diagnostics Tests
 * Tests for new diagnostic and testing capabilities
 */

const MCPServerCommand = require('../../../../src/cli/commands/mcp-server');

// Mock Logger module
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  setLevel: jest.fn()
};

jest.mock('../../../../src/utils/Logger', () => ({ logger: mockLogger }));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();

// Mock process.exit
const originalProcessExit = process.exit;
const mockProcessExit = jest.fn();

describe('MCPServerCommand Diagnostics', () => {
  let command;

  beforeEach(() => {
    command = new MCPServerCommand();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    process.exit = mockProcessExit;
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  describe('Configuration Validation', () => {
    test('should validate valid configuration', async () => {
      const mockConfigManager = {
        get: jest.fn().mockReturnValue({
          server: {
            transport: 'stdio',
            port: 3000,
            timeout: 30000
          },
          features: {
            cacheTTL: 5000
          }
        })
      };

      await command.validateConfiguration(mockConfigManager);

      expect(mockConsoleLog).toHaveBeenCalledWith('[OK] MCP configuration is valid');
      expect(mockConfigManager.get).toHaveBeenCalledWith('mcp');
    });

    test('should detect invalid transport type', async () => {
      const mockConfigManager = {
        get: jest.fn().mockReturnValue({
          server: {
            transport: 'invalid-transport'
          }
        })
      };

      await command.validateConfiguration(mockConfigManager);

      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] MCP configuration validation failed:');
      expect(mockConsoleError).toHaveBeenCalledWith('  - Invalid transport type: invalid-transport. Must be \'stdio\' or \'http\'');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should detect invalid port range', async () => {
      const mockConfigManager = {
        get: jest.fn().mockReturnValue({
          server: {
            port: 99999
          }
        })
      };

      await command.validateConfiguration(mockConfigManager);

      expect(mockConsoleError).toHaveBeenCalledWith('  - Invalid port: 99999. Must be between 1-65535');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should detect invalid timeout', async () => {
      const mockConfigManager = {
        get: jest.fn().mockReturnValue({
          server: {
            timeout: 500
          }
        })
      };

      await command.validateConfiguration(mockConfigManager);

      expect(mockConsoleError).toHaveBeenCalledWith('  - Invalid timeout: 500. Must be at least 1000ms');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Health Checks', () => {
    test('should perform health check with healthy server', () => {
      const mockServer = {
        getStatus: jest.fn().mockReturnValue({
          isRunning: true,
          transport: { isConnected: true },
          capabilities: { isNegotiated: true },
          services: { serviceCount: 1 },
          resources: { resourceCount: 6 }
        })
      };

      const health = command.performHealthCheck(mockServer);

      expect(health.overall).toBe('healthy');
      expect(health.checks.serverRunning.status).toBe('pass');
      expect(health.checks.transport.status).toBe('pass');
      expect(health.checks.capabilities.status).toBe('pass');
      expect(health.checks.services.status).toBe('pass');
      expect(health.checks.resources.status).toBe('pass');
    });

    test('should detect unhealthy server', () => {
      const mockServer = {
        getStatus: jest.fn().mockReturnValue({
          isRunning: false,
          transport: null,
          capabilities: { isNegotiated: false },
          services: { serviceCount: 0 },
          resources: { resourceCount: 0 }
        })
      };

      const health = command.performHealthCheck(mockServer);

      expect(health.overall).toBe('unhealthy');
      expect(health.checks.serverRunning.status).toBe('fail');
    });

    test('should display health check results', () => {
      const health = {
        overall: 'healthy',
        checks: {
          test: { status: 'pass', description: 'Test check' }
        },
        timestamp: Date.now()
      };

      command.displayHealthCheck(health);

      expect(mockConsoleLog).toHaveBeenCalledWith('MCP Server Health Check:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Overall Status: HEALTHY');
    });
  });

  describe('Tool Testing', () => {
    test('should validate tool structure', async () => {
      const mockTool = {
        getDefinition: jest.fn().mockReturnValue({
          name: 'test_tool',
          description: 'Test tool',
          inputSchema: { type: 'object' }
        }),
        execute: jest.fn()
      };

      const mockServer = {
        tools: new Map([['test_tool', mockTool]])
      };

      await command.testMCPTools(mockServer);

      expect(mockConsoleLog).toHaveBeenCalledWith('Testing tool: test_tool');
      expect(mockConsoleLog).toHaveBeenCalledWith('  [OK] test_tool - definition and structure valid');
      expect(mockConsoleLog).toHaveBeenCalledWith('Tool Test Results: 1 passed, 0 failed');
    });
  });

  describe('Resource Testing', () => {
    test('should validate resource structure', async () => {
      const mockResource = {
        getMetadata: jest.fn().mockReturnValue({
          name: 'Test Resource',
          description: 'Test resource'
        }),
        read: jest.fn().mockResolvedValue({ test: true })
      };

      const mockServer = {
        resourceRegistry: {
          listResources: jest.fn().mockReturnValue(['test://resource']),
          getResource: jest.fn().mockReturnValue(mockResource)
        }
      };

      await command.testMCPResources(mockServer);

      expect(mockConsoleLog).toHaveBeenCalledWith('Testing resource: test://resource');
      expect(mockConsoleLog).toHaveBeenCalledWith('  [OK] test://resource - read operation successful');
      expect(mockConsoleLog).toHaveBeenCalledWith('Resource Test Results: 1 passed, 0 failed');
    });
  });
});
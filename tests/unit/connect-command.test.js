/**
 * Connect Command Tests - Comprehensive Coverage
 * Tests for src/cli/commands/connect.js - Full implementation coverage
 *
 * Copyright (C) 2024 YDebug Contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const ConnectCommand = require('../../src/cli/commands/connect');

// Mock dependencies
jest.mock('../../src/debugger', () => ({
  DBGpClient: jest.fn(),
}));
jest.mock('../../src/config');

// Mock console methods to capture output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

// Suppress DEBUG environment variable for cleaner tests
const originalDebug = process.env.DEBUG;
beforeAll(() => {
  delete process.env.DEBUG;
});

afterAll(() => {
  if (originalDebug !== undefined) {
    process.env.DEBUG = originalDebug;
  }
  // Restore console methods
  mockConsoleLog.mockRestore();
  mockConsoleError.mockRestore();
  mockProcessExit.mockRestore();
});

describe('ConnectCommand - Comprehensive Coverage', () => {
  let command;
  let mockDBGpClient;
  let mockLoadConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup DBGpClient mock
    mockDBGpClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
    };
    
    // Reset the module cache and set up fresh mock
    jest.resetModules();
    
    // Mock the DBGpClient constructor to return our mock instance
    const debuggerModule = require('../../src/debugger');
    debuggerModule.DBGpClient.mockImplementation(() => mockDBGpClient);
    
    // Setup config mock
    mockLoadConfig = require('../../src/config').loadConfig;
    mockLoadConfig.mockReturnValue({
      xdebug: {
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      },
    });
    
    // Create command instance (after module reset)
    const ConnectCommandClass = require('../../src/cli/commands/connect');
    command = new ConnectCommandClass();
    
    // Mock console methods
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('Configuration Building', () => {
    test('should build configuration with defaults', () => {
      const config = {};
      const options = {};
      
      const result = command.buildConnectionConfig(config, options);
      
      expect(result).toEqual({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      });
    });

    test('should use configuration file settings', () => {
      const config = {
        xdebug: {
          host: 'config-host',
          port: 9010,
          timeout: 15000,
        },
      };
      const options = {};
      
      const result = command.buildConnectionConfig(config, options);
      
      expect(result).toEqual({
        host: 'config-host',
        port: 9010,
        timeout: 15000,
      });
    });

    test('should override config with command-line options', () => {
      const config = {
        xdebug: {
          host: 'config-host',
          port: 9010,
          timeout: 15000,
        },
      };
      const options = {
        host: 'option-host',
        port: '9011',
        timeout: '5000',
      };
      
      const result = command.buildConnectionConfig(config, options);
      
      expect(result).toEqual({
        host: 'option-host',
        port: 9011,
        timeout: 5000,
      });
    });

    test('should handle partial command-line overrides', () => {
      const config = {
        xdebug: {
          host: 'config-host',
          port: 9010,
          timeout: 15000,
        },
      };
      const options = {
        port: '9012',
      };
      
      const result = command.buildConnectionConfig(config, options);
      
      expect(result).toEqual({
        host: 'config-host',
        port: 9012,
        timeout: 15000,
      });
    });

    test('should handle missing xdebug config section', () => {
      const config = {
        logging: { level: 'info' },
      };
      const options = {};
      
      const result = command.buildConnectionConfig(config, options);
      
      expect(result).toEqual({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      });
    });

    test('should parse port and timeout as integers', () => {
      const config = {};
      const options = {
        port: '9012',
        timeout: '8000',
      };
      
      const result = command.buildConnectionConfig(config, options);
      
      expect(result.port).toBe(9012);
      expect(result.timeout).toBe(8000);
      expect(typeof result.port).toBe('number');
      expect(typeof result.timeout).toBe('number');
    });

    test('should handle invalid port numbers gracefully', () => {
      const config = {};
      const options = {
        port: 'invalid',
        timeout: 'also-invalid',
      };
      
      const result = command.buildConnectionConfig(config, options);
      
      // parseInt on invalid strings returns NaN, but should still be numbers
      expect(typeof result.port).toBe('number');
      expect(typeof result.timeout).toBe('number');
    });
  });

  describe('Execute Method - Success Scenarios', () => {
    test('should execute successful connection with default options', async () => {
      const initData = {
        appid: '12345',
        idekey: 'PHPSTORM',
        session: 'session123',
        thread: 'thread1',
        parent: 'parent1',
        language: 'PHP',
        protocol_version: '1.0',
        fileuri: 'file:///path/to/file.php',
      };
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute({});
      
      expect(require('../../src/debugger').DBGpClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      });
      expect(mockDBGpClient.connect).toHaveBeenCalled();
      expect(mockDBGpClient.disconnect).toHaveBeenCalled();
      expect(mockDBGpClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      // Check success output
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', expect.stringContaining('Testing connection to Xdebug at localhost:9003'));
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Connected to Xdebug successfully!');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Connection Details:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Host: localhost');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Port: 9003');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', expect.stringMatching(/Connection Time: \d+ms/));
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Session Information:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Application ID: 12345');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  IDE Key: PHPSTORM');
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Xdebug connection test completed successfully!');
    });

    test('should execute successful connection with custom options', async () => {
      const initData = { appid: '67890', idekey: 'VSCODE' };
      const options = {
        host: '192.168.1.100',
        port: '9001',
        timeout: '5000',
      };
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute(options);
      
      expect(require('../../src/debugger').DBGpClient).toHaveBeenCalledWith({
        host: '192.168.1.100',
        port: 9001,
        timeout: 5000,
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', expect.stringContaining('Testing connection to Xdebug at 192.168.1.100:9001'));
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Host: 192.168.1.100');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Port: 9001');
    }, 2000);

    test('should execute successful connection with minimal init data', async () => {
      const initData = { appid: '11111' };
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Connected to Xdebug successfully!');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Application ID: 11111');
      // Should not log other session info that's not present
      expect(mockConsoleLog).not.toHaveBeenCalledWith('[INFO]', expect.stringContaining('IDE Key:'));
    });

    test('should execute successful connection with null init data', async () => {
      mockDBGpClient.connect.mockResolvedValue(null);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Connected to Xdebug successfully!');
      // Should not try to display session information
      expect(mockConsoleLog).not.toHaveBeenCalledWith('[INFO]', 'Session Information:');
    });
  });

  describe('Execute Method - Connection Failure Scenarios', () => {
    test('should handle ECONNREFUSED error', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', 'Failed to connect to Xdebug');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Connection Attempt:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Host: localhost');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Port: 9003');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Timeout: 10000ms');
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', 'Error Details:');
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', '  Connection refused');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Troubleshooting:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Connection refused - Xdebug is likely not running or listening');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Verify Xdebug is configured to listen on localhost:9003');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle ETIMEDOUT error', async () => {
      const error = new Error('Connection timeout');
      error.code = 'ETIMEDOUT';
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Connection timed out - Xdebug may be slow to respond');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Try increasing the timeout with --timeout option');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Check network connectivity and firewall settings');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle timeout error by message', async () => {
      const error = new Error('Connection timeout after 10000ms');
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Connection timed out - Xdebug may be slow to respond');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle ENOTFOUND error', async () => {
      const error = new Error('Host not found');
      error.code = 'ENOTFOUND';
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Host not found - Check the hostname/IP address');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Verify DNS resolution if using a hostname');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle ECONNRESET error', async () => {
      const error = new Error('Connection reset');
      error.code = 'ECONNRESET';
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Connection was reset by the remote host');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Xdebug may have closed the connection unexpectedly');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle unknown error', async () => {
      const error = new Error('Unknown connection error');
      error.code = 'UNKNOWN';
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Unexpected error occurred');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Check Xdebug configuration and PHP error logs');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle error without message or code', async () => {
      const error = new Error();
      delete error.message;
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', '  Unknown error');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle error with only code', async () => {
      const error = { code: 'TEST_ERROR' };
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', '  TEST_ERROR');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should show configuration help after error', async () => {
      const error = new Error('Test error');
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Common Xdebug Configuration (php.ini):');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  zend_extension=xdebug');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.mode=debug');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.client_host=localhost');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.client_port=9003');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.start_with_request=yes');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'For more help, check the YDebug documentation or run `ydebug config --show`');
    });
  });

  describe('Execute Method - Disconnect Failures', () => {
    test('should handle disconnect failure after successful connection', async () => {
      const initData = { appid: '12345' };
      const disconnectError = new Error('Disconnect failed');
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockRejectedValue(disconnectError);
      
      await command.execute({});
      
      // Should still show success message even if disconnect fails
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Connected to Xdebug successfully!');
      expect(mockDBGpClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('Execute Method - Configuration Errors', () => {
    test('should handle config loading error', async () => {
      mockLoadConfig.mockImplementation(() => {
        throw new Error('Config load failed');
      });
      
      await command.execute({});
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', 'Config load failed');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle buildConnectionConfig error', async () => {
      // Override the method to throw an error
      command.buildConnectionConfig = jest.fn(() => {
        throw new Error('Build config failed');
      });
      
      await command.execute({});
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', 'Build config failed');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Execute Method - DBGpClient Construction Errors', () => {
    test('should handle DBGpClient constructor error', async () => {
      require('../../src/debugger').DBGpClient.mockImplementation(() => {
        throw new Error('Client creation failed');
      });
      
      await command.execute({});
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', 'Client creation failed');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Execute Method - Timing and Performance', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time (500ms elapsed)
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should accurately measure connection time on success', async () => {
      const initData = { appid: '12345' };
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Connection Time: 500ms');
    });

    test('should accurately measure connection time on failure', async () => {
      const error = new Error('Connection failed');
      
      mockDBGpClient.connect.mockRejectedValue(error);
      
      await command.execute({});
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Time Elapsed: 500ms');
    });
  });

  describe('Execute Method - Error Event Handling', () => {
    test('should set up error event handler on DBGp client', async () => {
      const initData = { appid: '12345' };
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute({});
      
      // Verify error event handler was registered
      expect(mockDBGpClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      // Test the error handler does nothing (prevents unhandled errors)
      const errorHandler = mockDBGpClient.on.mock.calls.find(call => call[0] === 'error')[1];
      expect(() => errorHandler(new Error('test'))).not.toThrow();
    });
  });

  describe('Execute Method - Integration Tests', () => {
    test('should properly integrate with config loading and client creation', async () => {
      const customConfig = {
        xdebug: {
          host: 'test.local',
          port: 9009,
          timeout: 20000,
        },
      };
      const options = { port: '9010' }; // Override config port
      const initData = { appid: 'integration-test' };
      
      mockLoadConfig.mockReturnValue(customConfig);
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute(options);
      
      // Verify config was loaded
      expect(mockLoadConfig).toHaveBeenCalled();
      
      // Verify client was created with merged config
      expect(require('../../src/debugger').DBGpClient).toHaveBeenCalledWith({
        host: 'test.local',   // From config
        port: 9010,           // From options (override)
        timeout: 20000,       // From config
      });
      
      // Verify connection flow
      expect(mockDBGpClient.connect).toHaveBeenCalled();
      expect(mockDBGpClient.disconnect).toHaveBeenCalled();
      
      // Verify success output with correct values
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', expect.stringContaining('test.local:9010'));
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Host: test.local');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Port: 9010');
    });
  });

  describe('Command Structure and Inheritance', () => {
    test('should be properly instantiable', () => {
      const ConnectCommandClass = require('../../src/cli/commands/connect');
      expect(command).toBeInstanceOf(ConnectCommandClass);
      expect(typeof command.execute).toBe('function');
      expect(typeof command.buildConnectionConfig).toBe('function');
      expect(typeof command.displayConnectionSuccess).toBe('function');
      expect(typeof command.displayConnectionFailure).toBe('function');
      expect(typeof command.displayTroubleshootingInfo).toBe('function');
    });

    test('should have all required methods', () => {
      expect(typeof command.buildConnectionConfig).toBe('function');
      expect(typeof command.loadConfig).toBe('function');
      expect(typeof command.info).toBe('function');
      expect(typeof command.success).toBe('function');
      expect(typeof command.error).toBe('function');
      expect(typeof command.handleError).toBe('function');
    });

    test('should properly extend BaseCommand', () => {
      // Test inherited methods exist
      expect(typeof command.info).toBe('function');
      expect(typeof command.success).toBe('function');
      expect(typeof command.error).toBe('function');
      expect(typeof command.warn).toBe('function');
      expect(typeof command.handleError).toBe('function');
      expect(typeof command.loadConfig).toBe('function');
    });
  });

  describe('Display Methods - Isolated Testing', () => {
    test('should display connection success with full init data', () => {
      const initData = {
        appid: '12345',
        idekey: 'PHPSTORM',
        session: 'session123',
        thread: 'thread1',
        parent: 'parent1',
        language: 'PHP',
        protocol_version: '1.0',
        fileuri: 'file:///path/to/file.php',
      };
      const connectionConfig = { host: 'localhost', port: 9003 };
      const connectionTime = 250;
      
      command.displayConnectionSuccess(initData, connectionConfig, connectionTime);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Connected to Xdebug successfully!');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Connection Details:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Host: localhost');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Port: 9003');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Connection Time: 250ms');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Session Information:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Application ID: 12345');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  IDE Key: PHPSTORM');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Session: session123');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Thread: thread1');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Parent: parent1');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Language: PHP');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Protocol Version: 1.0');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Initial File: file:///path/to/file.php');
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Xdebug connection test completed successfully!');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Your debugging environment is ready.');
    });

    test('should display connection success with partial init data', () => {
      const initData = {
        appid: '67890',
        language: 'PHP',
      };
      const connectionConfig = { host: '192.168.1.100', port: 9001 };
      const connectionTime = 150;
      
      command.displayConnectionSuccess(initData, connectionConfig, connectionTime);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Application ID: 67890');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Language: PHP');
      // Should not display missing fields
      expect(mockConsoleLog).not.toHaveBeenCalledWith('[INFO]', expect.stringContaining('IDE Key:'));
      expect(mockConsoleLog).not.toHaveBeenCalledWith('[INFO]', expect.stringContaining('Session:'));
    });

    test('should display connection success with null init data', () => {
      const connectionConfig = { host: 'localhost', port: 9003 };
      const connectionTime = 100;
      
      command.displayConnectionSuccess(null, connectionConfig, connectionTime);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Connected to Xdebug successfully!');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Connection Details:');
      // Should not try to display session information
      expect(mockConsoleLog).not.toHaveBeenCalledWith('[INFO]', 'Session Information:');
    });

    test('should display connection failure with error details', () => {
      const error = new Error('Test connection failed');
      error.code = 'ECONNREFUSED';
      const connectionConfig = { host: 'localhost', port: 9003, timeout: 10000 };
      const connectionTime = 5000;
      
      command.displayConnectionFailure(error, connectionConfig, connectionTime);
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', 'Failed to connect to Xdebug');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Connection Attempt:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Host: localhost');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Port: 9003');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Timeout: 10000ms');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Time Elapsed: 5000ms');
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', 'Error Details:');
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', '  Test connection failed');
    });

    test('should display troubleshooting for ECONNREFUSED', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      const connectionConfig = { host: 'test.local', port: 9010 };
      
      command.displayTroubleshootingInfo(error, connectionConfig);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Troubleshooting:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Connection refused - Xdebug is likely not running or listening');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Verify Xdebug is configured to listen on test.local:9010');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Check your PHP configuration for xdebug.mode=debug');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Ensure xdebug.start_with_request=yes or trigger debugging manually');
    });

    test('should display troubleshooting for ETIMEDOUT', () => {
      const error = new Error('Connection timed out');
      error.code = 'ETIMEDOUT';
      const connectionConfig = { host: 'localhost', port: 9003 };
      
      command.displayTroubleshootingInfo(error, connectionConfig);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Connection timed out - Xdebug may be slow to respond');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Try increasing the timeout with --timeout option');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Check network connectivity and firewall settings');
    });

    test('should display troubleshooting for timeout by message', () => {
      const error = new Error('Connection timeout after 10000ms');
      const connectionConfig = { host: 'localhost', port: 9003 };
      
      command.displayTroubleshootingInfo(error, connectionConfig);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Connection timed out - Xdebug may be slow to respond');
    });

    test('should display troubleshooting for ENOTFOUND', () => {
      const error = new Error('Host not found');
      error.code = 'ENOTFOUND';
      const connectionConfig = { host: 'localhost', port: 9003 };
      
      command.displayTroubleshootingInfo(error, connectionConfig);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Host not found - Check the hostname/IP address');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Verify DNS resolution if using a hostname');
    });

    test('should display troubleshooting for ECONNRESET', () => {
      const error = new Error('Connection reset');
      error.code = 'ECONNRESET';
      const connectionConfig = { host: 'localhost', port: 9003 };
      
      command.displayTroubleshootingInfo(error, connectionConfig);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Connection was reset by the remote host');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Xdebug may have closed the connection unexpectedly');
    });

    test('should display troubleshooting for unknown error', () => {
      const error = new Error('Some unknown error');
      error.code = 'UNKNOWN';
      const connectionConfig = { host: 'localhost', port: 9003 };
      
      command.displayTroubleshootingInfo(error, connectionConfig);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Unexpected error occurred');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Check Xdebug configuration and PHP error logs');
    });

    test('should always display configuration help', () => {
      const error = new Error('Any error');
      const connectionConfig = { host: 'test.local', port: 9009 };
      
      command.displayTroubleshootingInfo(error, connectionConfig);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Common Xdebug Configuration (php.ini):');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  zend_extension=xdebug');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.mode=debug');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.client_host=test.local');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.client_port=9009');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.start_with_request=yes');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'For more help, check the YDebug documentation or run `ydebug config --show`');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle empty options object', async () => {
      const initData = { appid: '12345' };
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute({});
      
      expect(require('../../src/debugger').DBGpClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      });
    });

    test('should handle null options', async () => {
      const initData = { appid: '12345' };
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute(null);
      
      expect(require('../../src/debugger').DBGpClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      });
    });

    test('should handle undefined options', async () => {
      const initData = { appid: '12345' };
      
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute(undefined);
      
      expect(require('../../src/debugger').DBGpClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      });
    });

    test('should handle empty config object', async () => {
      mockLoadConfig.mockReturnValue({});
      
      const initData = { appid: '12345' };
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute({});
      
      expect(require('../../src/debugger').DBGpClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      });
    });

    test('should handle config without xdebug section', async () => {
      mockLoadConfig.mockReturnValue({
        logging: { level: 'info' },
        other: { setting: 'value' },
      });
      
      const initData = { appid: '12345' };
      mockDBGpClient.connect.mockResolvedValue(initData);
      mockDBGpClient.disconnect.mockResolvedValue();
      
      await command.execute({});
      
      expect(require('../../src/debugger').DBGpClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
      });
    });

    test('should handle complex error during connection', async () => {
      // Create an error-like object that's not a proper Error
      const complexError = {
        message: 'Complex error occurred',
        code: 'COMPLEX',
        details: { nested: 'information' },
        stack: 'fake stack trace',
      };
      
      mockDBGpClient.connect.mockRejectedValue(complexError);
      
      await command.execute({});
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', '  Complex error occurred');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Method Isolation and Independence', () => {
    test('displayConnectionSuccess should not depend on execute context', () => {
      // Test that the method works independently
      const isolatedCommand = new ConnectCommand();
      const initData = { appid: 'isolated-test' };
      const config = { host: 'isolated.local', port: 8080 };
      
      isolatedCommand.displayConnectionSuccess(initData, config, 123);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[SUCCESS]', 'Connected to Xdebug successfully!');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Host: isolated.local');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Port: 8080');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Connection Time: 123ms');
    });

    test('displayConnectionFailure should not depend on execute context', () => {
      const isolatedCommand = new ConnectCommand();
      const error = new Error('Isolated test error');
      const config = { host: 'isolated.local', port: 8080, timeout: 5000 };
      
      isolatedCommand.displayConnectionFailure(error, config, 456);
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', 'Failed to connect to Xdebug');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Host: isolated.local');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Port: 8080');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Timeout: 5000ms');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  Time Elapsed: 456ms');
    });

    test('displayTroubleshootingInfo should not depend on execute context', () => {
      const isolatedCommand = new ConnectCommand();
      const error = new Error('Isolated troubleshooting test');
      error.code = 'ECONNREFUSED';
      const config = { host: 'trouble.local', port: 7070 };
      
      isolatedCommand.displayTroubleshootingInfo(error, config);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', 'Troubleshooting:');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  - Verify Xdebug is configured to listen on trouble.local:7070');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.client_host=trouble.local');
      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO]', '  xdebug.client_port=7070');
    });

    test('buildConnectionConfig should not depend on execute context', () => {
      const isolatedCommand = new ConnectCommand();
      const config = {
        xdebug: {
          host: 'config.local',
          port: 6060,
          timeout: 15000,
        },
      };
      const options = { host: 'override.local' };
      
      const result = isolatedCommand.buildConnectionConfig(config, options);
      
      expect(result).toEqual({
        host: 'override.local',
        port: 6060,
        timeout: 15000,
      });
    });
  });
});
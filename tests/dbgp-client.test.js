/**
 * DBGp Client Tests - Fixed Version
 * Fast, reliable tests for DBGpClient without async hanging issues
 *
 * Copyright (C) 2024 YDebug Contributors
 */

const DBGpClient = require('../src/debugger/DBGpClient');
const { EventEmitter } = require('events');

// Mock the net module
jest.mock('net');
const net = require('net');

describe('DBGpClient - Fixed', () => {
  let client;
  let mockSocket;

  beforeEach(() => {
    // Create a simple mock socket
    mockSocket = {
      on: jest.fn(),
      connect: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      removeAllListeners: jest.fn(),
      destroy: jest.fn(),
    };

    // Mock net.Socket
    net.Socket = jest.fn(() => mockSocket);

    // Use short timeouts for faster tests
    client = new DBGpClient({ timeout: 100 });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any pending commands to prevent timeout errors
    if (client && client.pendingCommands) {
      client.pendingCommands.clear();
    }
    // Clear any connection timeouts
    if (client && client.connectionTimeout) {
      clearTimeout(client.connectionTimeout);
      client.connectionTimeout = null;
    }
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with test configuration', () => {
      const config = client.getConfig();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(9003);
      expect(config.timeout).toBe(100);
    });

    test('should use default configuration when no options provided', () => {
      const defaultClient = new DBGpClient();
      const config = defaultClient.getConfig();
      expect(config.timeout).toBe(30000);
    });

    test('should accept custom configuration', () => {
      const customClient = new DBGpClient({
        host: '192.168.1.100',
        port: 9001,
        timeout: 50,
        custom: 'value',
      });

      const config = customClient.getConfig();
      expect(config.host).toBe('192.168.1.100');
      expect(config.port).toBe(9001);
      expect(config.timeout).toBe(50);
      expect(config.custom).toBe('value');
    });

    test('should extend EventEmitter', () => {
      expect(client).toBeInstanceOf(EventEmitter);
    });

    test('should initialize as disconnected', () => {
      expect(client.isConnectedToDebugger()).toBe(false);
    });
  });

  describe('Message Processing', () => {
    test('should process init messages through xmlParser', async () => {
      const xml = '<init appid="12345" idekey="test" session="session123" />';
      const mockParsed = { 
        init: { appid: '12345', idekey: 'test', session: 'session123' },
        transactionId: 0 
      };
      
      // Mock xmlParser to simulate parsing
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      xmlParser.parseDBGpResponse = jest.fn().mockResolvedValue(mockParsed);
      
      // Mock the emit to capture the event
      const initSpy = jest.fn();
      client.on('init', initSpy);
      
      await client.processMessage(xml);
      
      expect(xmlParser.parseDBGpResponse).toHaveBeenCalledWith(xml);
      expect(initSpy).toHaveBeenCalledWith(mockParsed.init);
    });

    test('should process response messages through xmlParser', async () => {
      const xml = '<response command="run" transaction_id="1" status="break" />';
      const mockParsed = { 
        response: { command: 'run', transaction_id: '1', status: 'break' },
        transactionId: 1 
      };
      
      // Mock xmlParser
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      xmlParser.parseDBGpResponse = jest.fn().mockResolvedValue(mockParsed);
      
      // Mock transactionManager
      const { transactionManager } = require('../src/debugger/TransactionManager');
      transactionManager.completePending = jest.fn();
      
      // Mock pending command
      const mockResolve = jest.fn();
      client.pendingCommands.set('1', { 
        resolve: mockResolve, 
        timeoutId: setTimeout(() => {}, 1000) 
      });
      
      await client.processMessage(xml);
      
      expect(xmlParser.parseDBGpResponse).toHaveBeenCalledWith(xml);
      expect(mockResolve).toHaveBeenCalledWith(xml);
      // Command should be removed from pending after processing
      expect(client.pendingCommands.has('1')).toBe(false);
    });

    test('should handle XML parsing errors', async () => {
      const xml = 'invalid xml';
      
      // Mock xmlParser to throw error
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      xmlParser.parseDBGpResponse = jest.fn().mockRejectedValue(new Error('XML parsing failed'));
      
      const errorSpy = jest.fn();
      client.on('error', errorSpy);
      
      await client.processMessage(xml);
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to parse message')
        })
      );
    });
  });

  describe('Command Building', () => {
    test('should build simple commands', () => {
      const command = client.buildCommand('run', 1);
      expect(command).toBe('run -i 1');
    });

    test('should build commands with options', () => {
      const command = client.buildCommand('breakpoint_set', 2, {
        t: 'line',
        f: 'file.php',
        n: 10
      });
      expect(command).toBe('breakpoint_set -i 2 -t line -f file.php -n 10');
    });

    test('should ignore null/undefined options', () => {
      const command = client.buildCommand('test', 3, {
        valid: 'value',
        nullValue: null,
        undefinedValue: undefined
      });
      expect(command).toBe('test -i 3 -valid value');
    });
  });

  describe('Data Processing', () => {
    test('should handle data buffer correctly', () => {
      client.buffer = '';
      
      // Simulate partial data
      client.handleData(Buffer.from('<init appid="test"'));
      expect(client.buffer).toBe('<init appid="test"');
      
      // Complete the message - just test that buffer is processed
      const originalProcessMessage = client.processMessage;
      client.processMessage = jest.fn();
      client.handleData(Buffer.from(' />\0'));
      
      expect(client.buffer).toBe('');
      expect(client.processMessage).toHaveBeenCalledWith('<init appid="test" />');
      
      client.processMessage = originalProcessMessage;
    });

    test('should process multiple messages', () => {
      const originalProcessMessage = client.processMessage;
      client.processMessage = jest.fn();
      
      // Send two messages at once
      const data = '<init appid="test1" />\0<init appid="test2" />\0';
      client.handleData(Buffer.from(data));
      
      expect(client.processMessage).toHaveBeenCalledTimes(2);
      expect(client.processMessage).toHaveBeenCalledWith('<init appid="test1" />');
      expect(client.processMessage).toHaveBeenCalledWith('<init appid="test2" />');
      
      client.processMessage = originalProcessMessage;
    });

    test('should emit init events through xmlParser', async () => {
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      xmlParser.parseDBGpResponse = jest.fn().mockResolvedValue({
        init: { appid: 'test' },
        transactionId: 0
      });
      
      const initSpy = jest.fn();
      client.on('init', initSpy);
      
      await client.processMessage('<init appid="test" />');
      
      expect(initSpy).toHaveBeenCalledWith({ appid: 'test' });
    });

    test('should emit response events through xmlParser', async () => {
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      const { transactionManager } = require('../src/debugger/TransactionManager');
      
      xmlParser.parseDBGpResponse = jest.fn().mockResolvedValue({
        response: { command: 'run', transaction_id: '1' },
        transactionId: 1
      });
      transactionManager.completePending = jest.fn();
      
      // Mock pending command
      client.pendingCommands.set('1', { 
        resolve: jest.fn(), 
        timeoutId: setTimeout(() => {}, 1000) 
      });
      
      const responseSpy = jest.fn();
      client.on('response', responseSpy);
      
      await client.processMessage('<response command="run" transaction_id="1" />');
      
      expect(responseSpy).toHaveBeenCalledWith({
        command: 'run',
        transaction_id: '1'
      });
    });
  });

  describe('Connection State Management', () => {
    test('should reject commands when not connected', async () => {
      client.isConnected = false;
      
      await expect(client.sendCommand('run')).rejects.toThrow('Not connected to debugger');
    });

    test('should handle disconnect when not connected', async () => {
      client.isConnected = false;
      client.socket = null;

      await expect(client.disconnect()).resolves.toBeUndefined();
    });

    test('should track connected state', () => {
      expect(client.isConnectedToDebugger()).toBe(false);
      
      client.isConnected = true;
      expect(client.isConnectedToDebugger()).toBe(true);
      
      client.isConnected = false;
      expect(client.isConnectedToDebugger()).toBe(false);
    });
  });

  describe('Connection Flow Tests', () => {
    test('should not connect if already connected', async () => {
      client.isConnected = true;
      
      const connectPromise = client.connect();
      await expect(connectPromise).resolves.toBeUndefined();
      
      // Should not create new socket when already connected
      expect(net.Socket).not.toHaveBeenCalled();
    });

    test('should set up socket connection properly', () => {
      // Test that connect method exists and is callable
      expect(typeof client.connect).toBe('function');
      expect(client.isConnectedToDebugger()).toBe(false);
      
      // Verify socket gets assigned during connection attempt  
      client.connect().catch(() => {}); // Ignore promise
      expect(client.socket).toBeDefined();
    });

    test('should handle direct socket event triggers', () => {
      const disconnectSpy = jest.fn();
      client.on('disconnect', disconnectSpy);
      client.isConnected = true;
      client.socket = mockSocket;

      // Directly call cleanup to simulate close event effects
      client.cleanup();

      expect(client.isConnectedToDebugger()).toBe(false);
    });

    test('should perform graceful disconnect with stop command', async () => {
      client.isConnected = true;
      client.socket = mockSocket;
      
      const disconnectPromise = client.disconnect();

      // Simulate stop command response
      setImmediate(() => {
        client.processMessage('<response command="stop" transaction_id="1" status="stopped" />');
      });

      await disconnectPromise;
      
      expect(mockSocket.write).toHaveBeenCalledWith('stop -i 1\0');
      expect(mockSocket.end).toHaveBeenCalled();
      expect(client.isConnectedToDebugger()).toBe(false);
    });
  });

  describe('Command Operations', () => {
    beforeEach(() => {
      client.isConnected = true;
      client.socket = mockSocket;
    });

    test('should send commands through sendCommand method', async () => {
      const { transactionManager } = require('../src/debugger/TransactionManager');
      transactionManager.getNext = jest.fn().mockReturnValue(1);
      transactionManager.registerPending = jest.fn();
      
      const commandPromise = client.sendCommand('status');
      
      expect(mockSocket.write).toHaveBeenCalledWith('status -i 1\0');
      expect(client.pendingCommands.size).toBe(1);
      expect(client.pendingCommands.has('1')).toBe(true);
      
      // Simulate response to resolve promise
      const pendingCommand = client.pendingCommands.get('1');
      pendingCommand.resolve('<response transaction_id="1" status="break" />');
      
      const result = await commandPromise;
      expect(result).toBe('<response transaction_id="1" status="break" />');
    });

    test('should track pending commands correctly', () => {
      const { transactionManager } = require('../src/debugger/TransactionManager');
      transactionManager.getNext = jest.fn()
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(2);
      transactionManager.registerPending = jest.fn();
      
      client.sendCommand('run');
      client.sendCommand('step_into');
      
      expect(client.pendingCommands.size).toBe(2);
      expect(client.pendingCommands.has('1')).toBe(true);
      expect(client.pendingCommands.has('2')).toBe(true);
    });

    test('should handle command timeout', (done) => {
      const { transactionManager } = require('../src/debugger/TransactionManager');
      transactionManager.getNext = jest.fn().mockReturnValue(1);
      transactionManager.registerPending = jest.fn();
      transactionManager.completePending = jest.fn();
      
      client.config.timeout = 50; // Very short timeout for testing
      
      const commandPromise = client.sendCommand('status');
      
      commandPromise.catch((error) => {
        expect(error.message).toBe('Command timeout: status');
        expect(client.pendingCommands.size).toBe(0);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    test('should emit error on invalid XML through xmlParser', async () => {
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      xmlParser.parseDBGpResponse = jest.fn().mockRejectedValue(new Error('XML parsing failed'));
      
      const errorSpy = jest.fn();
      client.on('error', errorSpy);
      
      await client.processMessage('invalid xml');
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to parse message')
        })
      );
    });

    test('should clean up pending commands', () => {
      const mockReject = jest.fn();
      client.pendingCommands.set('1', {
        resolve: jest.fn(),
        reject: mockReject
      });

      client.cleanup();

      expect(client.pendingCommands.size).toBe(0);
      expect(mockReject).toHaveBeenCalledWith(new Error('Connection closed'));
    });

    test('should clean up connection resources', () => {
      client.isConnected = true;
      client.socket = mockSocket;
      client.connectionTimeout = setTimeout(() => {}, 1000);
      
      client.cleanup();
      
      expect(client.isConnected).toBe(false);
      expect(client.socket).toBeNull();
      expect(client.buffer).toBe('');
    });

    test('should handle socket write errors', async () => {
      client.isConnected = true;
      client.socket = { ...mockSocket, write: jest.fn(() => { throw new Error('Write failed'); }) };

      await expect(client.sendCommand('run')).rejects.toThrow('Write failed');
    });
  });

  describe('Advanced Features', () => {
    beforeEach(() => {
      client.isConnected = true;
      client.socket = mockSocket;
    });

    test('should handle response with pending command through xmlParser', async () => {
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      const { transactionManager } = require('../src/debugger/TransactionManager');
      
      xmlParser.parseDBGpResponse = jest.fn().mockResolvedValue({
        response: { command: 'run', transaction_id: '1', status: 'running' },
        transactionId: 1
      });
      transactionManager.completePending = jest.fn();
      
      const mockResolve = jest.fn();
      client.pendingCommands.set('1', {
        resolve: mockResolve,
        reject: jest.fn(),
        timeoutId: setTimeout(() => {}, 1000)
      });

      await client.processMessage('<response command="run" transaction_id="1" status="running" />');

      expect(mockResolve).toHaveBeenCalledWith('<response command="run" transaction_id="1" status="running" />');
      expect(client.pendingCommands.has('1')).toBe(false);
    });

    test('should ignore responses without matching pending command', async () => {
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      
      xmlParser.parseDBGpResponse = jest.fn().mockResolvedValue({
        response: { command: 'run', transaction_id: '999', status: 'running' },
        transactionId: 999
      });
      
      const responseSpy = jest.fn();
      client.on('response', responseSpy);

      await client.processMessage('<response command="run" transaction_id="999" />');

      expect(responseSpy).toHaveBeenCalledWith({
        command: 'run',
        transaction_id: '999',
        status: 'running'
      });
      // Should not crash even if no pending command matches
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty messages', () => {
      client.buffer = '';
      client.handleData(Buffer.from('\0'));
      expect(client.buffer).toBe('');
    });

    test('should handle messages without null terminator', () => {
      client.buffer = '';
      client.handleData(Buffer.from('<init appid="test" />'));
      expect(client.buffer).toBe('<init appid="test" />');
    });

    test('should handle multiple null terminators', () => {
      const originalProcessMessage = client.processMessage;
      client.processMessage = jest.fn();
      
      client.handleData(Buffer.from('<init appid="test" />\0\0'));
      
      expect(client.processMessage).toHaveBeenCalledTimes(1);
      expect(client.processMessage).toHaveBeenCalledWith('<init appid="test" />');
      
      client.processMessage = originalProcessMessage;
    });

    test('should handle response without transaction_id through xmlParser', async () => {
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      
      xmlParser.parseDBGpResponse = jest.fn().mockResolvedValue({
        response: { command: 'test' },
        transactionId: null
      });
      
      const responseSpy = jest.fn();
      client.on('response', responseSpy);
      
      await client.processMessage('<response command="test" />');
      
      expect(responseSpy).toHaveBeenCalledWith({ command: 'test' });
    });

    test('should handle XML with special characters through xmlParser', async () => {
      const { xmlParser } = require('../src/debugger/DBGpXmlParser');
      
      xmlParser.parseDBGpResponse = jest.fn().mockResolvedValue({
        init: { appid: 'test&123', idekey: 'key<test' },
        transactionId: 0
      });
      
      const initSpy = jest.fn();
      client.on('init', initSpy);
      
      const xml = '<init appid="test&amp;123" idekey="key&lt;test" />';
      await client.processMessage(xml);
      
      expect(initSpy).toHaveBeenCalledWith({
        appid: 'test&123',
        idekey: 'key<test'
      });
    });
  });

  describe('Advanced Error Scenarios', () => {
    test('should handle disconnect timeout gracefully', async () => {
      const { transactionManager } = require('../src/debugger/TransactionManager');
      transactionManager.getNext = jest.fn().mockReturnValue(1);
      transactionManager.registerPending = jest.fn();
      
      client.isConnected = true;
      client.socket = mockSocket;
      
      // Don't respond to stop command - should timeout after 1000ms
      const disconnectPromise = client.disconnect();
      
      // Should resolve due to timeout, not hang
      await expect(disconnectPromise).resolves.toBeUndefined();
      expect(mockSocket.write).toHaveBeenCalledWith('stop -i 1\0');
    });

    test('should handle command timeout properly', async () => {
      const { transactionManager } = require('../src/debugger/TransactionManager');
      transactionManager.getNext = jest.fn().mockReturnValue(1);
      transactionManager.registerPending = jest.fn();
      transactionManager.completePending = jest.fn();
      
      client.isConnected = true;
      client.socket = mockSocket;
      client.config.timeout = 50; // Short timeout for testing
      
      const commandPromise = client.sendCommand('run');
      
      // Don't send response - let it timeout with client's short timeout
      await expect(commandPromise).rejects.toThrow('Command timeout: run');
      
      // Verify command was removed from pending
      expect(client.pendingCommands.size).toBe(0);
    });

    test('should reject pending commands on cleanup', () => {
      const mockReject = jest.fn();
      client.pendingCommands.set('1', {
        resolve: jest.fn(),
        reject: mockReject
      });
      
      client.cleanup();
      
      expect(mockReject).toHaveBeenCalledWith(expect.any(Error));
      expect(client.pendingCommands.size).toBe(0);
    });
  });
});
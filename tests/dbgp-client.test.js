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

  describe('XML Parsing', () => {
    test('should parse init messages correctly', () => {
      const xml = '<init appid="12345" idekey="test" session="session123" />';
      const result = client.parseXml(xml);
      
      expect(result.init).toEqual({
        appid: '12345',
        idekey: 'test',
        session: 'session123'
      });
    });

    test('should parse response messages correctly', () => {
      const xml = '<response command="run" transaction_id="1" status="break" />';
      const result = client.parseXml(xml);
      
      expect(result.response).toEqual({
        command: 'run',
        transaction_id: '1',
        status: 'break'
      });
    });

    test('should parse response with content', () => {
      const xml = '<response command="stack_get" transaction_id="2"><stack level="0" type="file" filename="/path/file.php" lineno="10" /></response>';
      const result = client.parseXml(xml);
      
      expect(result.response.command).toBe('stack_get');
      expect(result.response.content).toContain('<stack level="0"');
    });

    test('should handle malformed XML', () => {
      expect(() => {
        client.parseXml('invalid xml');
      }).toThrow('Unknown message format');
    });

    test('should parse attributes correctly', () => {
      const attrs = client.parseAttributes('<test name="value" id="123" />');
      expect(attrs).toEqual({
        name: 'value',
        id: '123'
      });
    });

    test('should handle empty attributes', () => {
      const attrs = client.parseAttributes('<test>');
      expect(attrs).toEqual({});
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

    test('should emit init events', () => {
      const initSpy = jest.fn();
      client.on('init', initSpy);
      
      client.processMessage('<init appid="test" />');
      
      expect(initSpy).toHaveBeenCalledWith({ appid: 'test' });
    });

    test('should emit response events', () => {
      const responseSpy = jest.fn();
      client.on('response', responseSpy);
      
      client.processMessage('<response command="run" transaction_id="1" />');
      
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

    test('should resolve breakpoint setting with response', async () => {
      const breakpointPromise = client.setBreakpoint('/path/file.php', 10);
      
      // Simulate response
      setImmediate(() => {
        client.processMessage('<response command="breakpoint_set" transaction_id="1" id="bp123" />');
      });
      
      const result = await breakpointPromise;
      expect(mockSocket.write).toHaveBeenCalledWith('breakpoint_set -i 1 -t line -f /path/file.php -n 10\0');
      expect(result.id).toBe('bp123');
      expect(result.command).toBe('breakpoint_set');
    });

    test('should resolve breakpoint removal with response', async () => {
      const removePromise = client.removeBreakpoint('bp1');
      
      // Simulate response
      setImmediate(() => {
        client.processMessage('<response command="breakpoint_remove" transaction_id="1" />');
      });
      
      const result = await removePromise;
      expect(mockSocket.write).toHaveBeenCalledWith('breakpoint_remove -i 1 -d bp1\0');
      expect(result.command).toBe('breakpoint_remove');
    });

    test('should resolve variable retrieval with content', async () => {
      const variablePromise = client.getVariable('$testVar');
      
      // Simulate response with content
      setImmediate(() => {
        client.processMessage('<response command="property_get" transaction_id="1"><property name="testVar" type="string">test value</property></response>');
      });
      
      const result = await variablePromise;
      expect(mockSocket.write).toHaveBeenCalledWith('property_get -i 1 -n $testVar\0');
      expect(result.command).toBe('property_get');
      expect(result.content).toContain('testVar');
    });

    test('should track command counter', () => {
      expect(client.commandCounter).toBe(0);
      
      client.sendCommand('run');
      expect(client.commandCounter).toBe(1);
      
      client.sendCommand('step_into');
      expect(client.commandCounter).toBe(2);
    });

    test('should store pending commands', () => {
      client.sendCommand('run');
      client.sendCommand('step_into');
      
      expect(client.pendingCommands.size).toBe(2);
      expect(client.pendingCommands.has('1')).toBe(true);
      expect(client.pendingCommands.has('2')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should emit error on invalid XML', () => {
      const errorSpy = jest.fn();
      client.on('error', errorSpy);
      
      client.processMessage('invalid xml');
      
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

    test('should handle context retrieval commands', async () => {
      const contextPromise = client.getContext();
      
      // Simulate both stack_get and context_get responses
      setImmediate(() => {
        client.processMessage('<response command="stack_get" transaction_id="1"><stack level="0" type="file" filename="/test.php" lineno="10" /></response>');
        client.processMessage('<response command="context_get" transaction_id="2"><property name="var1" type="string">value1</property></response>');
      });
      
      const result = await contextPromise;
      
      expect(mockSocket.write).toHaveBeenCalledWith('stack_get -i 1\0');
      expect(mockSocket.write).toHaveBeenCalledWith('context_get -i 2\0');
      expect(result.stack).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.stack.command).toBe('stack_get');
      expect(result.context.command).toBe('context_get');
    });

    test('should handle getContext error scenarios', async () => {
      const contextPromise = client.getContext();
      
      // Simulate error in one of the commands
      setImmediate(() => {
        client.processMessage('<response command="stack_get" transaction_id="1" status="error"><error code="404"><message>File not found</message></error></response>');
      });
      
      await expect(contextPromise).rejects.toThrow('Failed to get context');
    });

    test('should handle response with pending command', () => {
      const mockResolve = jest.fn();
      client.pendingCommands.set('1', {
        resolve: mockResolve,
        reject: jest.fn()
      });

      client.processMessage('<response command="run" transaction_id="1" status="running" />');

      expect(mockResolve).toHaveBeenCalledWith({
        command: 'run',
        transaction_id: '1',
        status: 'running'
      });
      expect(client.pendingCommands.has('1')).toBe(false);
    });

    test('should ignore responses without matching pending command', () => {
      const responseSpy = jest.fn();
      client.on('response', responseSpy);

      client.processMessage('<response command="run" transaction_id="999" />');

      expect(responseSpy).toHaveBeenCalled();
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

    test('should handle response without transaction_id', () => {
      const responseSpy = jest.fn();
      client.on('response', responseSpy);
      
      client.processMessage('<response command="test" />');
      
      expect(responseSpy).toHaveBeenCalledWith({
        command: 'test'
      });
    });

    test('should handle XML with special characters', () => {
      const xml = '<init appid="test&amp;123" idekey="key&lt;test" />';
      const result = client.parseXml(xml);
      
      // The simple parser doesn't decode HTML entities, it extracts raw attribute values
      expect(result.init).toEqual({
        appid: 'test&amp;123',
        idekey: 'key&lt;test'
      });
    });
  });

  describe('Advanced Error Scenarios', () => {
    test('should handle disconnect timeout gracefully', async () => {
      client.isConnected = true;
      client.socket = mockSocket;
      
      // Don't respond to stop command - should timeout after 1000ms
      const disconnectPromise = client.disconnect();
      
      // Should resolve due to timeout, not hang
      await expect(disconnectPromise).resolves.toBeUndefined();
      expect(mockSocket.write).toHaveBeenCalledWith('stop -i 1\0');
    });

    test('should handle command timeout properly', async () => {
      client.isConnected = true;
      client.socket = mockSocket;
      
      const commandPromise = client.sendCommand('run');
      
      // Don't send response - let it timeout with client's 100ms timeout
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
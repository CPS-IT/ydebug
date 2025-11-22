/**
 * StdioTransport Enhanced Unit Tests
 * Comprehensive tests with improved mocking and error scenarios
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const EventEmitter = require('events');

// Mock Logger module first - must be before StdioTransport import
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('../../../../src/utils/Logger', () => ({ logger: mockLogger }));

// Import after mocking
const StdioTransport = require('../../../../src/mcp/transport/StdioTransport');

// Create comprehensive process mocks
class MockProcess extends EventEmitter {
  constructor() {
    super();
    this.setEncoding = jest.fn();
    this.resume = jest.fn();
    this.pause = jest.fn();
    this.removeAllListeners = jest.fn().mockImplementation((eventName) => {
      super.removeAllListeners(eventName);
      return this;
    });
    this.write = jest.fn();
  }
}

describe('StdioTransport Enhanced Tests', () => {
  let transport;
  let mockStdin;
  let mockStdout;
  let originalProcess;

  beforeEach(() => {
    // Store original process objects
    originalProcess = {
      stdin: process.stdin,
      stdout: process.stdout
    };

    // Create new mocks for each test
    mockStdin = new MockProcess();
    mockStdout = new MockProcess();

    // Setup stdout.write with proper async behavior
    mockStdout.write = jest.fn((data, encoding, callback) => {
      if (typeof encoding === 'function') {
        callback = encoding;
        encoding = 'utf8';
      }
      
      // Simulate async write operation immediately for faster tests
      setImmediate(() => {
        if (callback) callback();
      });
      
      return true;
    });

    // Use Object.defineProperty to properly replace process streams
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      configurable: true,
      writable: true
    });
    
    Object.defineProperty(process, 'stdout', {
      value: mockStdout,
      configurable: true,
      writable: true
    });

    // Create transport instance after mocking
    transport = new StdioTransport();

    // Clear all mocks after transport creation but keep the mock setup
    mockStdin.setEncoding.mockClear();
    mockStdin.removeAllListeners.mockClear();
    mockStdout.removeAllListeners.mockClear();
    mockStdout.write.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.warn.mockClear();
  });

  afterEach(() => {
    // Restore original process objects using Object.defineProperty
    Object.defineProperty(process, 'stdin', {
      value: originalProcess.stdin,
      configurable: true,
      writable: true
    });
    
    Object.defineProperty(process, 'stdout', {
      value: originalProcess.stdout,
      configurable: true,
      writable: true
    });
  });

  afterAll(() => {
    // Ensure process is fully restored after all tests in this file
    if (originalProcess) {
      Object.defineProperty(process, 'stdin', {
        value: originalProcess.stdin,
        configurable: true,
        writable: true
      });
      
      Object.defineProperty(process, 'stdout', {
        value: originalProcess.stdout,
        configurable: true,
        writable: true
      });
    }
  });

  describe('Initialization', () => {
    test('should initialize with correct default state', () => {
      expect(transport.isConnected).toBe(false);
      expect(transport.messageBuffer).toBe('');
      expect(transport.logger).toEqual(mockLogger);
    });

    test('should inherit from Transport and EventEmitter', () => {
      expect(transport).toBeInstanceOf(EventEmitter);
    });

    test('should have initial empty buffer', () => {
      expect(transport.messageBuffer).toBe('');
    });
  });

  describe('Transport Start', () => {
    test('should start transport successfully', async () => {
      await transport.start();
      
      expect(transport.isConnected).toBe(true);
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting STDIO transport for MCP');
      expect(mockLogger.info).toHaveBeenCalledWith('STDIO transport started successfully');
    });

    test('should emit connect event when started', async () => {
      const connectSpy = jest.fn();
      transport.on('connect', connectSpy);
      
      await transport.start();
      
      expect(connectSpy).toHaveBeenCalled();
    });

    test('should throw error when starting already started transport', async () => {
      await transport.start();
      
      await expect(transport.start()).rejects.toThrow('STDIO transport is already started');
    });

    test('should setup event listeners when starting', async () => {
      await transport.start();
      
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('data');
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('end');
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('error');
      expect(mockStdout.removeAllListeners).toHaveBeenCalledWith('error');
      
      // Verify listeners are added (we can't easily test the exact listeners)
      expect(mockStdin.listenerCount('data')).toBe(1);
      expect(mockStdin.listenerCount('end')).toBe(1);
      expect(mockStdin.listenerCount('error')).toBe(1);
      expect(mockStdout.listenerCount('error')).toBe(1);
    });

    test('should clean up existing listeners before adding new ones', async () => {
      // Add some dummy listeners first
      mockStdin.on('data', () => {});
      mockStdin.on('end', () => {});
      mockStdin.on('error', () => {});
      mockStdout.on('error', () => {});
      
      await transport.start();
      
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('data');
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('end');
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('error');
      expect(mockStdout.removeAllListeners).toHaveBeenCalledWith('error');
    });
  });

  describe('Transport Stop', () => {
    test('should stop transport successfully', async () => {
      await transport.start();
      await transport.stop();
      
      expect(transport.isConnected).toBe(false);
      expect(transport.messageBuffer).toBe('');
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping STDIO transport');
      expect(mockLogger.info).toHaveBeenCalledWith('STDIO transport stopped');
    });

    test('should emit disconnect event when stopped', async () => {
      const disconnectSpy = jest.fn();
      transport.on('disconnect', disconnectSpy);
      
      await transport.start();
      await transport.stop();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });

    test('should handle stop when not connected', async () => {
      await transport.stop();
      
      expect(transport.isConnected).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalledWith('Stopping STDIO transport');
    });

    test('should clean up event listeners when stopping', async () => {
      await transport.start();
      await transport.stop();
      
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('data');
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('end');
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('error');
      expect(mockStdout.removeAllListeners).toHaveBeenCalledWith('error');
    });

    test('should clear message buffer when stopping', async () => {
      await transport.start();
      
      // Add some data to buffer
      transport.messageBuffer = 'partial message';
      
      await transport.stop();
      
      expect(transport.messageBuffer).toBe('');
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      await transport.start();
    });

    test('should send message successfully', async () => {
      const message = '{"jsonrpc":"2.0","method":"test","id":1}';
      
      await transport.send(message);
      
      expect(mockStdout.write).toHaveBeenCalledWith(
        message + '\n',
        'utf8',
        expect.any(Function)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Message sent via STDIO:', message);
    });

    test('should add newline delimiter to messages', async () => {
      const message = 'test message';
      
      await transport.send(message);
      
      expect(mockStdout.write).toHaveBeenCalledWith(
        'test message\n',
        'utf8',
        expect.any(Function)
      );
    });

    test('should handle empty message', async () => {
      await transport.send('');
      
      expect(mockStdout.write).toHaveBeenCalledWith('\n', 'utf8', expect.any(Function));
    });

    test('should reject send when not connected', async () => {
      await transport.stop();
      
      await expect(transport.send('test')).rejects.toThrow('STDIO transport not connected');
    });

    test('should handle stdout write error', async () => {
      const writeError = new Error('Write failed');
      mockStdout.write.mockImplementation((data, encoding, callback) => {
        setImmediate(() => {
          callback(writeError);
        });
        return false;
      });
      
      await expect(transport.send('test')).rejects.toThrow('Write failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send message via STDIO:', writeError);
    });

    test('should handle multiple concurrent sends', async () => {
      const messages = [
        '{"jsonrpc":"2.0","method":"test1","id":1}',
        '{"jsonrpc":"2.0","method":"test2","id":2}',
        '{"jsonrpc":"2.0","method":"test3","id":3}'
      ];
      
      const sendPromises = messages.map(msg => transport.send(msg));
      await Promise.all(sendPromises);
      
      expect(mockStdout.write).toHaveBeenCalledTimes(3);
      messages.forEach(msg => {
        expect(mockStdout.write).toHaveBeenCalledWith(msg + '\n', 'utf8', expect.any(Function));
      });
    });

    test('should handle large message sending', async () => {
      const largeData = 'x'.repeat(10000);
      const largeMessage = `{"data":"${largeData}"}`;
      
      await transport.send(largeMessage);
      
      expect(mockStdout.write).toHaveBeenCalledWith(largeMessage + '\n', 'utf8', expect.any(Function));
    });

    test('should handle stdout write without callback', async () => {
      mockStdout.write.mockImplementation((data, encoding, callback) => {
        // Even when no callback is provided by implementation, the transport adds one
        if (callback) {
          setImmediate(() => callback());
        }
        return true;
      });
      
      await transport.send('test');
      
      expect(mockStdout.write).toHaveBeenCalledWith('test\n', 'utf8', expect.any(Function));
    });
  });

  describe('Input Handling', () => {
    beforeEach(async () => {
      await transport.start();
    });

    test('should process single complete message', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const testMessage = '{"jsonrpc":"2.0","method":"test","id":1}';
      transport.handleInput(testMessage + '\n');
      
      expect(messageSpy).toHaveBeenCalledWith(testMessage);
      expect(mockLogger.debug).toHaveBeenCalledWith('Received message via STDIO:', testMessage);
    });

    test('should process multiple messages in single input', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const message1 = '{"jsonrpc":"2.0","method":"test1","id":1}';
      const message2 = '{"jsonrpc":"2.0","method":"test2","id":2}';
      
      transport.handleInput(message1 + '\n' + message2 + '\n');
      
      expect(messageSpy).toHaveBeenCalledTimes(2);
      expect(messageSpy).toHaveBeenNthCalledWith(1, message1);
      expect(messageSpy).toHaveBeenNthCalledWith(2, message2);
    });

    test('should buffer partial messages', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const partialMessage = '{"jsonrpc":"2.0","method":"test"';
      const completion = ',"id":1}';
      
      // Send partial message
      transport.handleInput(partialMessage);
      expect(messageSpy).not.toHaveBeenCalled();
      expect(transport.messageBuffer).toBe(partialMessage);
      
      // Send completion with newline
      transport.handleInput(completion + '\n');
      expect(messageSpy).toHaveBeenCalledWith(partialMessage + completion);
      expect(transport.messageBuffer).toBe('');
    });

    test('should handle empty lines gracefully', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      transport.handleInput('\n\n\n');
      
      expect(messageSpy).not.toHaveBeenCalled();
      expect(transport.messageBuffer).toBe('');
    });

    test('should trim whitespace from messages', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const testMessage = '  {"jsonrpc":"2.0","method":"test","id":1}  ';
      transport.handleInput(testMessage + '\n');
      
      expect(messageSpy).toHaveBeenCalledWith(testMessage.trim());
    });

    test('should handle messages with different line endings', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const message1 = '{"jsonrpc":"2.0","method":"test1","id":1}';
      const message2 = '{"jsonrpc":"2.0","method":"test2","id":2}';
      const message3 = '{"jsonrpc":"2.0","method":"test3","id":3}';
      
      transport.handleInput(message1 + '\r\n' + message2 + '\n' + message3 + '\r');
      
      // Only first two should be processed (third has no newline)
      expect(messageSpy).toHaveBeenCalledTimes(2);
      expect(messageSpy).toHaveBeenNthCalledWith(1, message1);
      expect(messageSpy).toHaveBeenNthCalledWith(2, message2);
      expect(transport.messageBuffer).toBe(message3 + '\r');
    });

    test('should handle chunked message input', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const largeMessage = '{"jsonrpc":"2.0","method":"test","params":{"data":"' + 'x'.repeat(1000) + '"},"id":1}';
      const chunkSize = 100;
      
      // Send message in chunks
      for (let i = 0; i < largeMessage.length; i += chunkSize) {
        const chunk = largeMessage.substring(i, i + chunkSize);
        transport.handleInput(chunk);
      }
      
      // Message should still be buffered
      expect(messageSpy).not.toHaveBeenCalled();
      expect(transport.messageBuffer).toBe(largeMessage);
      
      // Add newline to complete
      transport.handleInput('\n');
      expect(messageSpy).toHaveBeenCalledWith(largeMessage);
      expect(transport.messageBuffer).toBe('');
    });

    test('should handle mixed complete and partial messages', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const completeMessage = '{"jsonrpc":"2.0","method":"complete","id":1}';
      const partialMessage = '{"jsonrpc":"2.0","method":"partial"';
      
      transport.handleInput(completeMessage + '\n' + partialMessage);
      
      expect(messageSpy).toHaveBeenCalledTimes(1);
      expect(messageSpy).toHaveBeenCalledWith(completeMessage);
      expect(transport.messageBuffer).toBe(partialMessage);
    });

    test('should handle empty string input', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      transport.handleInput('');
      
      expect(messageSpy).not.toHaveBeenCalled();
      expect(transport.messageBuffer).toBe('');
    });

    test('should handle whitespace-only input', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      transport.handleInput('   \t   \n   \r\n   ');
      
      expect(messageSpy).not.toHaveBeenCalled();
      expect(transport.messageBuffer).toBe('   ');
    });

    test('should preserve buffer across multiple partial inputs', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const parts = ['{"json', 'rpc":"2.0",', '"method":"test",', '"id":1}'];
      
      // Send each part separately
      parts.forEach(part => {
        transport.handleInput(part);
        expect(messageSpy).not.toHaveBeenCalled();
      });
      
      // Verify buffer contains all parts
      expect(transport.messageBuffer).toBe(parts.join(''));
      
      // Complete the message
      transport.handleInput('\n');
      expect(messageSpy).toHaveBeenCalledWith(parts.join(''));
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await transport.start();
    });

    test('should handle stdin data events', () => {
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      const testData = '{"jsonrpc":"2.0","method":"test","id":1}\n';
      mockStdin.emit('data', testData);
      
      expect(messageSpy).toHaveBeenCalledWith('{"jsonrpc":"2.0","method":"test","id":1}');
    });

    test('should handle stdin end event', () => {
      const disconnectSpy = jest.fn();
      transport.on('disconnect', disconnectSpy);
      
      mockStdin.emit('end');
      
      expect(transport.isConnected).toBe(false);
      expect(disconnectSpy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('STDIO input stream ended');
    });

    test('should handle stdin error event', () => {
      const errorSpy = jest.fn();
      transport.on('error', errorSpy);
      
      const testError = new Error('STDIN error');
      mockStdin.emit('error', testError);
      
      expect(errorSpy).toHaveBeenCalledWith(testError);
      expect(mockLogger.error).toHaveBeenCalledWith('STDIO input error:', testError);
    });

    test('should handle stdout error event', () => {
      const errorSpy = jest.fn();
      transport.on('error', errorSpy);
      
      const testError = new Error('STDOUT error');
      mockStdout.emit('error', testError);
      
      expect(errorSpy).toHaveBeenCalledWith(testError);
      expect(mockLogger.error).toHaveBeenCalledWith('STDIO output error:', testError);
    });

    test('should handle multiple error events', () => {
      const errorSpy = jest.fn();
      transport.on('error', errorSpy);
      
      const stdinError = new Error('STDIN error');
      const stdoutError = new Error('STDOUT error');
      
      mockStdin.emit('error', stdinError);
      mockStdout.emit('error', stdoutError);
      
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenNthCalledWith(1, stdinError);
      expect(errorSpy).toHaveBeenNthCalledWith(2, stdoutError);
    });
  });

  describe('Status Reporting', () => {
    test('should return correct status when disconnected', () => {
      const status = transport.getStatus();
      
      expect(status).toEqual({
        type: 'StdioTransport',
        isConnected: false,
        bufferSize: 0,
        hasBufferedData: false
      });
    });

    test('should return correct status when connected', async () => {
      await transport.start();
      
      const status = transport.getStatus();
      
      expect(status).toEqual({
        type: 'StdioTransport',
        isConnected: true,
        bufferSize: 0,
        hasBufferedData: false
      });
    });

    test('should report buffer status correctly', async () => {
      await transport.start();
      
      // Add some data to buffer
      transport.handleInput('partial message');
      
      const status = transport.getStatus();
      
      expect(status.bufferSize).toBe('partial message'.length);
      expect(status.hasBufferedData).toBe(true);
    });

    test('should update status after buffer is cleared', async () => {
      await transport.start();
      
      transport.handleInput('partial');
      transport.handleInput(' message\n');
      
      const status = transport.getStatus();
      
      expect(status.bufferSize).toBe(0);
      expect(status.hasBufferedData).toBe(false);
    });

    test('should include parent class status', async () => {
      await transport.start();
      
      const status = transport.getStatus();
      
      expect(status).toHaveProperty('type', 'StdioTransport');
      expect(status).toHaveProperty('isConnected', true);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from buffer overflow scenario', async () => {
      await transport.start();
      
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      // Fill buffer with large partial message
      const largePartial = 'x'.repeat(100000);
      transport.handleInput(largePartial);
      
      expect(transport.messageBuffer.length).toBe(100000);
      
      // Complete with newline
      transport.handleInput('\n');
      
      expect(messageSpy).toHaveBeenCalledWith(largePartial);
      expect(transport.messageBuffer).toBe('');
    });

    test('should handle rapid start/stop cycles', async () => {
      for (let i = 0; i < 5; i++) {
        await transport.start();
        expect(transport.isConnected).toBe(true);
        
        await transport.stop();
        expect(transport.isConnected).toBe(false);
      }
    });

    test('should maintain state consistency after errors', async () => {
      await transport.start();
      
      const messageSpy = jest.fn();
      const errorSpy = jest.fn();
      transport.on('message', messageSpy);
      transport.on('error', errorSpy);
      
      // Trigger an error
      const testError = new Error('Test error');
      mockStdin.emit('error', testError);
      
      // Verify error was handled
      expect(errorSpy).toHaveBeenCalledWith(testError);
      
      // Transport should still be connected and functional
      expect(transport.isConnected).toBe(true);
      
      // Should still be able to process messages
      transport.handleInput('{"jsonrpc":"2.0","method":"test","id":1}\n');
      expect(messageSpy).toHaveBeenCalled();
    });
  });

  describe('Concurrent Operation Handling', () => {
    test('should handle concurrent start attempts gracefully', async () => {
      const startPromise1 = transport.start();
      const startPromise2 = transport.start().catch(e => e);
      
      const results = await Promise.all([startPromise1, startPromise2]);
      
      expect(transport.isConnected).toBe(true);
      expect(results[1]).toBeInstanceOf(Error);
      expect(results[1].message).toContain('already started');
    });

    test('should handle message processing during stop', async () => {
      await transport.start();
      
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      // Start processing a message
      transport.handleInput('{"jsonrpc":"2.0","method":"test"');
      
      // Stop transport while message is partial
      await transport.stop();
      
      expect(transport.isConnected).toBe(false);
      expect(transport.messageBuffer).toBe('');
    });

    test('should handle multiple simultaneous message inputs', async () => {
      await transport.start();
      
      const messageSpy = jest.fn();
      transport.on('message', messageSpy);
      
      // Simulate rapid message inputs
      const messages = [
        '{"jsonrpc":"2.0","method":"test1","id":1}\n',
        '{"jsonrpc":"2.0","method":"test2","id":2}\n',
        '{"jsonrpc":"2.0","method":"test3","id":3}\n'
      ];
      
      messages.forEach(msg => transport.handleInput(msg));
      
      expect(messageSpy).toHaveBeenCalledTimes(3);
    });
  });
});
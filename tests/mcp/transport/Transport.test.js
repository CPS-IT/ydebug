/**
 * Transport Abstract Class Unit Tests
 * Tests the base transport class and its abstract methods
 *
 * Copyright (C) 2024 YDebug Contributors
 * Licensed under GPL-3.0
 */

const EventEmitter = require('events');
const Transport = require('../../../src/mcp/transport/Transport');

describe('Transport Abstract Class', () => {
  let transport;

  beforeEach(() => {
    transport = new Transport();
  });

  describe('Initialization', () => {
    test('should inherit from EventEmitter', () => {
      expect(transport).toBeInstanceOf(EventEmitter);
    });

    test('should initialize with default values', () => {
      expect(transport.isConnected).toBe(false);
    });

    test('should be able to emit and listen to events', () => {
      const testSpy = jest.fn();
      transport.on('test', testSpy);
      
      transport.emit('test', 'data');
      
      expect(testSpy).toHaveBeenCalledWith('data');
    });
  });

  describe('Abstract Method Requirements', () => {
    test('should throw error when calling start() directly', async () => {
      await expect(transport.start()).rejects.toThrow('start() must be implemented by subclass');
    });

    test('should throw error when calling stop() directly', async () => {
      await expect(transport.stop()).rejects.toThrow('stop() must be implemented by subclass');
    });

    test('should throw error when calling send() directly', async () => {
      await expect(transport.send('test')).rejects.toThrow('send() must be implemented by subclass');
    });

    test('should have correct error messages for abstract methods', async () => {
      try {
        await transport.start();
      } catch (error) {
        expect(error.message).toBe('start() must be implemented by subclass');
      }

      try {
        await transport.stop();
      } catch (error) {
        expect(error.message).toBe('stop() must be implemented by subclass');
      }

      try {
        await transport.send('test');
      } catch (error) {
        expect(error.message).toBe('send() must be implemented by subclass');
      }
    });
  });

  describe('Status Reporting', () => {
    test('should return correct default status', () => {
      const status = transport.getStatus();
      
      expect(status).toEqual({
        type: 'Transport',
        isConnected: false
      });
    });

    test('should reflect connection state changes', () => {
      expect(transport.getStatus().isConnected).toBe(false);
      
      transport.isConnected = true;
      expect(transport.getStatus().isConnected).toBe(true);
      
      transport.isConnected = false;
      expect(transport.getStatus().isConnected).toBe(false);
    });

    test('should return constructor name as type', () => {
      expect(transport.getStatus().type).toBe('Transport');
    });

    test('should return status as new object each time', () => {
      const status1 = transport.getStatus();
      const status2 = transport.getStatus();
      
      expect(status1).toEqual(status2);
      expect(status1).not.toBe(status2);
    });
  });

  describe('Subclass Implementation', () => {
    class TestTransport extends Transport {
      constructor() {
        super();
        this.started = false;
        this.stopped = false;
        this.sentMessages = [];
      }

      async start() {
        if (this.started) {
          throw new Error('Already started');
        }
        this.started = true;
        this.isConnected = true;
        this.emit('connect');
      }

      async stop() {
        if (!this.started) {
          return;
        }
        this.started = false;
        this.stopped = true;
        this.isConnected = false;
        this.emit('disconnect');
      }

      async send(message) {
        if (!this.isConnected) {
          throw new Error('Not connected');
        }
        this.sentMessages.push(message);
        this.emit('messageSent', message);
      }
    }

    test('should allow proper subclass implementation', async () => {
      const testTransport = new TestTransport();
      
      expect(testTransport).toBeInstanceOf(Transport);
      expect(testTransport).toBeInstanceOf(EventEmitter);
      expect(testTransport.isConnected).toBe(false);
    });

    test('should execute subclass start method', async () => {
      const testTransport = new TestTransport();
      const connectSpy = jest.fn();
      testTransport.on('connect', connectSpy);
      
      await testTransport.start();
      
      expect(testTransport.started).toBe(true);
      expect(testTransport.isConnected).toBe(true);
      expect(connectSpy).toHaveBeenCalled();
    });

    test('should execute subclass stop method', async () => {
      const testTransport = new TestTransport();
      const disconnectSpy = jest.fn();
      testTransport.on('disconnect', disconnectSpy);
      
      await testTransport.start();
      await testTransport.stop();
      
      expect(testTransport.stopped).toBe(true);
      expect(testTransport.isConnected).toBe(false);
      expect(disconnectSpy).toHaveBeenCalled();
    });

    test('should execute subclass send method', async () => {
      const testTransport = new TestTransport();
      const messageSentSpy = jest.fn();
      testTransport.on('messageSent', messageSentSpy);
      
      await testTransport.start();
      await testTransport.send('test message');
      
      expect(testTransport.sentMessages).toContain('test message');
      expect(messageSentSpy).toHaveBeenCalledWith('test message');
    });

    test('should inherit status reporting with custom type', () => {
      const testTransport = new TestTransport();
      const status = testTransport.getStatus();
      
      expect(status).toEqual({
        type: 'TestTransport',
        isConnected: false
      });
    });

    test('should handle subclass errors properly', async () => {
      const testTransport = new TestTransport();
      
      // Test start error
      await testTransport.start();
      await expect(testTransport.start()).rejects.toThrow('Already started');
      
      // Test send error when not connected
      await testTransport.stop();
      await expect(testTransport.send('test')).rejects.toThrow('Not connected');
    });

    test('should allow multiple instances with separate state', async () => {
      const transport1 = new TestTransport();
      const transport2 = new TestTransport();
      
      await transport1.start();
      await transport1.send('message1');
      
      expect(transport1.isConnected).toBe(true);
      expect(transport1.sentMessages).toContain('message1');
      
      expect(transport2.isConnected).toBe(false);
      expect(transport2.sentMessages).not.toContain('message1');
    });
  });

  describe('Event Emitter Capabilities', () => {
    test('should support multiple event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      transport.on('test', listener1);
      transport.on('test', listener2);
      
      transport.emit('test', 'data');
      
      expect(listener1).toHaveBeenCalledWith('data');
      expect(listener2).toHaveBeenCalledWith('data');
    });

    test('should support once listeners', () => {
      const onceSpy = jest.fn();
      const normalSpy = jest.fn();
      
      transport.once('test', onceSpy);
      transport.on('test', normalSpy);
      
      transport.emit('test', 'data1');
      transport.emit('test', 'data2');
      
      expect(onceSpy).toHaveBeenCalledTimes(1);
      expect(onceSpy).toHaveBeenCalledWith('data1');
      expect(normalSpy).toHaveBeenCalledTimes(2);
    });

    test('should support listener removal', () => {
      const listener = jest.fn();
      
      transport.on('test', listener);
      transport.emit('test', 'data1');
      
      transport.off('test', listener);
      transport.emit('test', 'data2');
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('data1');
    });

    test('should support error events', () => {
      const errorSpy = jest.fn();
      transport.on('error', errorSpy);
      
      const testError = new Error('Test error');
      transport.emit('error', testError);
      
      expect(errorSpy).toHaveBeenCalledWith(testError);
    });

    test('should maintain event listener count', () => {
      expect(transport.listenerCount('test')).toBe(0);
      
      const listener = jest.fn();
      transport.on('test', listener);
      expect(transport.listenerCount('test')).toBe(1);
      
      transport.on('test', jest.fn());
      expect(transport.listenerCount('test')).toBe(2);
      
      transport.off('test', listener);
      expect(transport.listenerCount('test')).toBe(1);
    });

    test('should support prependListener', () => {
      const callOrder = [];
      
      transport.on('test', () => callOrder.push('second'));
      transport.prependListener('test', () => callOrder.push('first'));
      
      transport.emit('test');
      
      expect(callOrder).toEqual(['first', 'second']);
    });

    test('should handle event listener errors gracefully', () => {
      const errorListener = () => {
        throw new Error('Listener error');
      };
      const normalListener = jest.fn();
      
      transport.on('test', errorListener);
      transport.on('test', normalListener);
      
      // EventEmitter throws when a listener throws and there's no error handler
      expect(() => transport.emit('test')).toThrow('Listener error');
      // Normal listener should not have been called because the error stopped execution
      expect(normalListener).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    test('should allow connection state to be modified', () => {
      expect(transport.isConnected).toBe(false);
      
      transport.isConnected = true;
      expect(transport.isConnected).toBe(true);
      expect(transport.getStatus().isConnected).toBe(true);
      
      transport.isConnected = false;
      expect(transport.isConnected).toBe(false);
      expect(transport.getStatus().isConnected).toBe(false);
    });

    test('should support boolean coercion for connection state', () => {
      transport.isConnected = 0;
      expect(transport.getStatus().isConnected).toBe(0); // Preserves original value
      
      transport.isConnected = '';
      expect(transport.getStatus().isConnected).toBe('');
      
      transport.isConnected = null;
      expect(transport.getStatus().isConnected).toBeNull();
    });

    test('should support custom properties in subclasses', () => {
      class CustomTransport extends Transport {
        constructor() {
          super();
          this.customProperty = 'test';
        }

        getStatus() {
          return {
            ...super.getStatus(),
            customProperty: this.customProperty
          };
        }

        async start() {
          this.isConnected = true;
        }

        async stop() {
          this.isConnected = false;
        }

        async send(message) {
          return message;
        }
      }

      const customTransport = new CustomTransport();
      const status = customTransport.getStatus();
      
      expect(status).toEqual({
        type: 'CustomTransport',
        isConnected: false,
        customProperty: 'test'
      });
    });
  });

  describe('Async Method Behavior', () => {
    test('should return promises from abstract methods', () => {
      const startPromise = transport.start().catch(() => {});
      const stopPromise = transport.stop().catch(() => {});
      const sendPromise = transport.send('test').catch(() => {});
      
      expect(startPromise).toBeInstanceOf(Promise);
      expect(stopPromise).toBeInstanceOf(Promise);
      expect(sendPromise).toBeInstanceOf(Promise);
    });

    test('should handle async operations in subclasses', async () => {
      class AsyncTransport extends Transport {
        async start() {
          await new Promise(resolve => setTimeout(resolve, 10));
          this.isConnected = true;
          return 'started';
        }

        async stop() {
          await new Promise(resolve => setTimeout(resolve, 5));
          this.isConnected = false;
          return 'stopped';
        }

        async send(message) {
          await new Promise(resolve => setTimeout(resolve, 1));
          return `sent: ${message}`;
        }
      }

      const asyncTransport = new AsyncTransport();
      
      const startResult = await asyncTransport.start();
      expect(startResult).toBe('started');
      expect(asyncTransport.isConnected).toBe(true);
      
      const sendResult = await asyncTransport.send('hello');
      expect(sendResult).toBe('sent: hello');
      
      const stopResult = await asyncTransport.stop();
      expect(stopResult).toBe('stopped');
      expect(asyncTransport.isConnected).toBe(false);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle multiple inheritance scenarios', () => {
      class MiddleTransport extends Transport {
        constructor() {
          super();
          this.middleProperty = true;
        }
      }

      class FinalTransport extends MiddleTransport {
        constructor() {
          super();
          this.finalProperty = true;
        }

        async start() { this.isConnected = true; }
        async stop() { this.isConnected = false; }
        async send() { return 'sent'; }
      }

      const finalTransport = new FinalTransport();
      
      expect(finalTransport).toBeInstanceOf(Transport);
      expect(finalTransport).toBeInstanceOf(MiddleTransport);
      expect(finalTransport.middleProperty).toBe(true);
      expect(finalTransport.finalProperty).toBe(true);
      expect(finalTransport.getStatus().type).toBe('FinalTransport');
    });

    test('should handle constructor.name edge cases', () => {
      // Create anonymous class
      const AnonymousTransport = class extends Transport {
        async start() {}
        async stop() {}
        async send() {}
      };

      const anonymousTransport = new AnonymousTransport();
      const status = anonymousTransport.getStatus();
      
      expect(status.type).toBe('AnonymousTransport');
    });

    test('should handle null/undefined property access safely', () => {
      const transport = new Transport();
      
      // These shouldn't throw errors
      expect(() => transport.getStatus()).not.toThrow();
      expect(() => transport.isConnected).not.toThrow();
      expect(() => transport.constructor.name).not.toThrow();
    });

    test('should support method override validation', () => {
      class IncompleteTransport extends Transport {
        async start() {
          this.isConnected = true;
        }
        // Missing stop() and send() implementations
      }

      const incompleteTransport = new IncompleteTransport();
      
      // start() should work
      expect(incompleteTransport.start()).resolves.toBeUndefined();
      
      // stop() and send() should still throw
      expect(incompleteTransport.stop()).rejects.toThrow('stop() must be implemented by subclass');
      expect(incompleteTransport.send('test')).rejects.toThrow('send() must be implemented by subclass');
    });
  });
});
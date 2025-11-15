/**
 * Tests for DBGpTimeoutError class
 * Comprehensive test coverage for timeout-related error handling
 */

const DBGpTimeoutError = require('../../../src/debugger/errors/DBGpTimeoutError');
const DBGpError = require('../../../src/debugger/errors/DBGpError');

describe('DBGpTimeoutError', () => {
  describe('constructor', () => {
    it('should create basic timeout error with message', () => {
      const error = new DBGpTimeoutError('Operation timed out');

      expect(error.message).toBe('Operation timed out');
      expect(error.code).toBe('DBGP_TIMEOUT_ERROR');
      expect(error.category).toBe('timeout');
      expect(error.recoverable).toBe(true);
      expect(error.timeout).toBeNull();
      expect(error.operation).toBe('unknown');
      expect(error.command).toBeNull();
      expect(error.transactionId).toBeNull();
      expect(error.elapsed).toBeNull();
    });

    it('should create timeout error with all options', () => {
      const cause = new Error('Network timeout');
      const error = new DBGpTimeoutError('Command timed out', {
        code: 'CUSTOM_TIMEOUT_ERROR',
        timeout: 5000,
        operation: 'command_execution',
        command: 'step_into',
        transactionId: 123,
        elapsed: 4800,
        cause,
        recoverable: false
      });

      expect(error.message).toBe('Command timed out');
      expect(error.code).toBe('CUSTOM_TIMEOUT_ERROR');
      expect(error.category).toBe('timeout');
      expect(error.recoverable).toBe(false);
      expect(error.timeout).toBe(5000);
      expect(error.operation).toBe('command_execution');
      expect(error.command).toBe('step_into');
      expect(error.transactionId).toBe(123);
      expect(error.elapsed).toBe(4800);
      expect(error.cause).toBe(cause);
    });

    it('should add timeout details to context', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        timeout: 3000,
        operation: 'response_wait',
        command: 'breakpoint_list',
        transactionId: 456,
        elapsed: 2900
      });

      expect(error.getContext('timeoutMs')).toBe(3000);
      expect(error.getContext('operation')).toBe('response_wait');
      expect(error.getContext('command')).toBe('breakpoint_list');
      expect(error.getContext('transactionId')).toBe(456);
      expect(error.getContext('elapsedMs')).toBe(2900);
    });

    it('should only add non-null timeout details to context', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        timeout: 1000,
        operation: 'connection'
        // other fields intentionally omitted
      });

      expect(error.getContext('timeoutMs')).toBe(1000);
      expect(error.getContext('operation')).toBe('connection');
      expect(error.getContext('command')).toBeUndefined();
      expect(error.getContext('transactionId')).toBeUndefined();
      expect(error.getContext('elapsedMs')).toBeUndefined();
    });

    it('should default recoverable to true when not specified', () => {
      const error = new DBGpTimeoutError('Timeout occurred');
      expect(error.recoverable).toBe(true);
    });

    it('should default operation to unknown when not specified', () => {
      const error = new DBGpTimeoutError('Timeout occurred');
      expect(error.operation).toBe('unknown');
    });

    it('should handle empty options object', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {});

      expect(error.code).toBe('DBGP_TIMEOUT_ERROR');
      expect(error.category).toBe('timeout');
      expect(error.recoverable).toBe(true);
      expect(error.operation).toBe('unknown');
    });

    it('should handle zero values correctly', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        timeout: 0,
        transactionId: 0,
        elapsed: 0
      });

      // Zero values are treated as falsy and default to null
      expect(error.timeout).toBeNull();
      expect(error.transactionId).toBeNull();
      expect(error.elapsed).toBeNull();
      // Zero values don't get added to context because they're falsy
      expect(error.getContext('timeoutMs')).toBeUndefined();
      expect(error.getContext('transactionId')).toBeUndefined();
      expect(error.getContext('elapsedMs')).toBeUndefined();
    });

    it('should handle empty string values', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        operation: '',
        command: ''
      });

      // Empty strings are falsy, so they get replaced with defaults
      expect(error.operation).toBe('unknown'); // default fallback
      expect(error.command).toBeNull(); // default fallback
      // operation gets default value 'unknown' so it's added to context
      expect(error.getContext('operation')).toBe('unknown');
      // command is null so not added to context
      expect(error.getContext('command')).toBeUndefined();
    });
  });

  describe('inheritance', () => {
    it('should inherit from DBGpError', () => {
      const error = new DBGpTimeoutError('Timeout occurred');

      expect(error).toBeInstanceOf(DBGpTimeoutError);
      expect(error).toBeInstanceOf(DBGpError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct constructor name', () => {
      const error = new DBGpTimeoutError('Timeout occurred');
      expect(error.constructor.name).toBe('DBGpTimeoutError');
      expect(error.name).toBe('DBGpTimeoutError');
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message for DBGP_COMMAND_TIMEOUT', () => {
      const error = new DBGpTimeoutError('Command timed out', {
        code: 'DBGP_COMMAND_TIMEOUT',
        command: 'step_over',
        timeout: 10000
      });

      const message = error.getUserMessage();
      expect(message).toBe('Command \'step_over\' timed out after 10 seconds. The debugger may be unresponsive or processing a long-running operation.');
    });

    it('should return user-friendly message for DBGP_COMMAND_TIMEOUT with unknown command', () => {
      const error = new DBGpTimeoutError('Command timed out', {
        code: 'DBGP_COMMAND_TIMEOUT',
        timeout: 5000
      });

      const message = error.getUserMessage();
      expect(message).toBe('Command \'unknown\' timed out after 5 seconds. The debugger may be unresponsive or processing a long-running operation.');
    });

    it('should return user-friendly message for DBGP_CONNECTION_TIMEOUT', () => {
      const error = new DBGpTimeoutError('Connection timed out', {
        code: 'DBGP_CONNECTION_TIMEOUT',
        timeout: 30000
      });

      const message = error.getUserMessage();
      expect(message).toBe('Connection timed out after 30 seconds. Unable to establish connection with the debugger.');
    });

    it('should return user-friendly message for DBGP_RESPONSE_TIMEOUT', () => {
      const error = new DBGpTimeoutError('Response timed out', {
        code: 'DBGP_RESPONSE_TIMEOUT',
        timeout: 15000
      });

      const message = error.getUserMessage();
      expect(message).toBe('No response received from debugger within 15 seconds. The debugger may be busy or disconnected.');
    });

    it('should return user-friendly message for DBGP_INIT_TIMEOUT', () => {
      const error = new DBGpTimeoutError('Init timed out', {
        code: 'DBGP_INIT_TIMEOUT',
        timeout: 20000
      });

      const message = error.getUserMessage();
      expect(message).toBe('Debugger initialization timed out after 20 seconds. The debugging session failed to start properly.');
    });

    it('should return default message for unknown error codes', () => {
      const error = new DBGpTimeoutError('Unknown timeout', {
        code: 'UNKNOWN_TIMEOUT',
        operation: 'custom_operation',
        timeout: 8000
      });

      const message = error.getUserMessage();
      expect(message).toBe('Operation \'custom_operation\' timed out after 8 seconds: Unknown timeout');
    });

    it('should handle unknown timeout value', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        code: 'DBGP_COMMAND_TIMEOUT',
        command: 'status'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Command \'status\' timed out after unknown seconds. The debugger may be unresponsive or processing a long-running operation.');
    });

    it('should round timeout seconds correctly', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        code: 'DBGP_CONNECTION_TIMEOUT',
        timeout: 2500 // 2.5 seconds
      });

      const message = error.getUserMessage();
      expect(message).toBe('Connection timed out after 3 seconds. Unable to establish connection with the debugger.');
    });

    it('should handle fractional seconds', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        code: 'DBGP_RESPONSE_TIMEOUT',
        timeout: 1200 // 1.2 seconds
      });

      const message = error.getUserMessage();
      expect(message).toBe('No response received from debugger within 1 seconds. The debugger may be busy or disconnected.');
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should return suggestions for DBGP_COMMAND_TIMEOUT', () => {
      const error = new DBGpTimeoutError('Command timed out', {
        code: 'DBGP_COMMAND_TIMEOUT'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Increase command timeout in configuration',
        'Check if debugger is processing a long-running operation',
        'Verify debugger is still responsive and connected',
        'Consider breaking execution if debugger is stuck in a loop'
      ]);
    });

    it('should return suggestions for DBGP_CONNECTION_TIMEOUT', () => {
      const error = new DBGpTimeoutError('Connection timed out', {
        code: 'DBGP_CONNECTION_TIMEOUT'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Increase connection timeout in configuration',
        'Check network connectivity and latency',
        'Verify debugger is listening on the correct port',
        'Ensure firewall allows connections on the debug port'
      ]);
    });

    it('should return suggestions for DBGP_RESPONSE_TIMEOUT', () => {
      const error = new DBGpTimeoutError('Response timed out', {
        code: 'DBGP_RESPONSE_TIMEOUT'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Increase response timeout for slow operations',
        'Check if debugger process is still running',
        'Verify network stability between debugger and client',
        'Consider restarting the debugging session'
      ]);
    });

    it('should return suggestions for DBGP_INIT_TIMEOUT', () => {
      const error = new DBGpTimeoutError('Init timed out', {
        code: 'DBGP_INIT_TIMEOUT'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Increase initialization timeout',
        'Check debugger configuration and startup time',
        'Verify PHP application starts without errors',
        'Review debugger logs for initialization issues'
      ]);
    });

    it('should return default suggestions for unknown error codes', () => {
      const error = new DBGpTimeoutError('Unknown timeout', {
        code: 'UNKNOWN_TIMEOUT'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Increase timeout values in configuration',
        'Check system performance and resource availability',
        'Monitor debugger responsiveness',
        'Consider using shorter operations or breaking them into steps'
      ]);
    });
  });

  describe('static factory methods', () => {
    describe('commandTimeout', () => {
      it('should create command timeout error with full info', () => {
        const command = 'breakpoint_set';
        const timeout = 5000;
        const transactionId = 123;
        const elapsed = 4900;

        const error = DBGpTimeoutError.commandTimeout(command, timeout, transactionId, elapsed);

        expect(error).toBeInstanceOf(DBGpTimeoutError);
        expect(error.message).toBe('Command \'breakpoint_set\' timed out after 5000ms');
        expect(error.code).toBe('DBGP_COMMAND_TIMEOUT');
        expect(error.command).toBe(command);
        expect(error.timeout).toBe(timeout);
        expect(error.transactionId).toBe(transactionId);
        expect(error.elapsed).toBe(elapsed);
        expect(error.operation).toBe('command_execution');
      });

      it('should create command timeout error with minimal info', () => {
        const command = 'status';
        const timeout = 3000;

        const error = DBGpTimeoutError.commandTimeout(command, timeout);

        expect(error.message).toBe('Command \'status\' timed out after 3000ms');
        expect(error.transactionId).toBeNull();
        expect(error.elapsed).toBeNull();
      });

      it('should handle null transaction ID and elapsed time', () => {
        const error = DBGpTimeoutError.commandTimeout('test', 1000, null, null);

        expect(error.transactionId).toBeNull();
        expect(error.elapsed).toBeNull();
      });

      it('should handle zero transaction ID and elapsed time', () => {
        const error = DBGpTimeoutError.commandTimeout('test', 1000, 0, 0);

        // Zero values are treated as falsy and become null
        expect(error.transactionId).toBeNull();
        expect(error.elapsed).toBeNull();
      });
    });

    describe('connectionTimeout', () => {
      it('should create connection timeout error with host and port', () => {
        const timeout = 10000;
        const host = '192.168.1.100';
        const port = 9003;

        const error = DBGpTimeoutError.connectionTimeout(timeout, host, port);

        expect(error).toBeInstanceOf(DBGpTimeoutError);
        expect(error.message).toBe('Connection to 192.168.1.100:9003 timed out after 10000ms');
        expect(error.code).toBe('DBGP_CONNECTION_TIMEOUT');
        expect(error.timeout).toBe(timeout);
        expect(error.operation).toBe('connection');
        expect(error.recoverable).toBe(true);
      });

      it('should create connection timeout error without host and port', () => {
        const timeout = 5000;

        const error = DBGpTimeoutError.connectionTimeout(timeout);

        expect(error.message).toBe('Connection to debugger timed out after 5000ms');
        expect(error.code).toBe('DBGP_CONNECTION_TIMEOUT');
      });

      it('should handle only host without port', () => {
        const error = DBGpTimeoutError.connectionTimeout(3000, 'localhost');

        expect(error.message).toBe('Connection to debugger timed out after 3000ms');
      });

      it('should handle only port without host', () => {
        const error = DBGpTimeoutError.connectionTimeout(3000, null, 9003);

        expect(error.message).toBe('Connection to debugger timed out after 3000ms');
      });

      it('should handle empty string host', () => {
        const error = DBGpTimeoutError.connectionTimeout(3000, '', 9003);

        expect(error.message).toBe('Connection to debugger timed out after 3000ms');
      });

      it('should handle zero port', () => {
        const error = DBGpTimeoutError.connectionTimeout(3000, 'localhost', 0);

        expect(error.message).toBe('Connection to debugger timed out after 3000ms');
      });
    });

    describe('responseTimeout', () => {
      it('should create response timeout error with full info', () => {
        const timeout = 8000;
        const command = 'property_get';
        const transactionId = 456;

        const error = DBGpTimeoutError.responseTimeout(timeout, command, transactionId);

        expect(error).toBeInstanceOf(DBGpTimeoutError);
        expect(error.message).toBe('No response received within 8000ms for command \'property_get\'');
        expect(error.code).toBe('DBGP_RESPONSE_TIMEOUT');
        expect(error.timeout).toBe(timeout);
        expect(error.command).toBe(command);
        expect(error.transactionId).toBe(transactionId);
        expect(error.operation).toBe('response_wait');
      });

      it('should create response timeout error without command', () => {
        const timeout = 6000;

        const error = DBGpTimeoutError.responseTimeout(timeout);

        expect(error.message).toBe('No response received within 6000ms');
        expect(error.command).toBeNull();
        expect(error.transactionId).toBeNull();
      });

      it('should handle null command and transaction ID', () => {
        const error = DBGpTimeoutError.responseTimeout(2000, null, null);

        expect(error.message).toBe('No response received within 2000ms');
        expect(error.command).toBeNull();
        expect(error.transactionId).toBeNull();
      });

      it('should handle zero transaction ID', () => {
        const error = DBGpTimeoutError.responseTimeout(2000, 'test', 0);

        // Zero values are treated as falsy and become null
        expect(error.transactionId).toBeNull();
      });
    });

    describe('initTimeout', () => {
      it('should create initialization timeout error', () => {
        const timeout = 15000;

        const error = DBGpTimeoutError.initTimeout(timeout);

        expect(error).toBeInstanceOf(DBGpTimeoutError);
        expect(error.message).toBe('Debugger initialization timed out after 15000ms');
        expect(error.code).toBe('DBGP_INIT_TIMEOUT');
        expect(error.timeout).toBe(timeout);
        expect(error.operation).toBe('initialization');
        expect(error.recoverable).toBe(false);
      });

      it('should handle zero timeout', () => {
        const error = DBGpTimeoutError.initTimeout(0);

        // Zero values are treated as falsy and become null
        expect(error.timeout).toBeNull();
        expect(error.message).toBe('Debugger initialization timed out after 0ms');
      });
    });
  });

  describe('utility methods', () => {
    describe('getTimeoutSeconds', () => {
      it('should return timeout in seconds', () => {
        const error = new DBGpTimeoutError('Timeout', { timeout: 5000 });
        expect(error.getTimeoutSeconds()).toBe(5);
      });

      it('should round timeout seconds', () => {
        const error = new DBGpTimeoutError('Timeout', { timeout: 2500 });
        expect(error.getTimeoutSeconds()).toBe(3);
      });

      it('should return 0 for null timeout', () => {
        const error = new DBGpTimeoutError('Timeout');
        expect(error.getTimeoutSeconds()).toBe(0);
      });

      it('should handle zero timeout', () => {
        const error = new DBGpTimeoutError('Timeout', { timeout: 0 });
        // Zero timeout becomes null, so getTimeoutSeconds returns 0
        expect(error.getTimeoutSeconds()).toBe(0);
      });

      it('should handle fractional seconds', () => {
        const error = new DBGpTimeoutError('Timeout', { timeout: 1200 });
        expect(error.getTimeoutSeconds()).toBe(1);
      });
    });

    describe('getElapsedSeconds', () => {
      it('should return elapsed time in seconds', () => {
        const error = new DBGpTimeoutError('Timeout', { elapsed: 4000 });
        expect(error.getElapsedSeconds()).toBe(4);
      });

      it('should round elapsed seconds', () => {
        const error = new DBGpTimeoutError('Timeout', { elapsed: 3700 });
        expect(error.getElapsedSeconds()).toBe(4);
      });

      it('should return 0 for null elapsed time', () => {
        const error = new DBGpTimeoutError('Timeout');
        expect(error.getElapsedSeconds()).toBe(0);
      });

      it('should handle zero elapsed time', () => {
        const error = new DBGpTimeoutError('Timeout', { elapsed: 0 });
        // Zero elapsed becomes null, so getElapsedSeconds returns 0
        expect(error.getElapsedSeconds()).toBe(0);
      });

      it('should handle fractional seconds', () => {
        const error = new DBGpTimeoutError('Timeout', { elapsed: 800 });
        expect(error.getElapsedSeconds()).toBe(1);
      });
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new DBGpTimeoutError('Command timeout', {
        code: 'DBGP_COMMAND_TIMEOUT',
        timeout: 5000,
        operation: 'command_execution',
        command: 'step_into',
        transactionId: 123,
        elapsed: 4800
      });

      const json = error.toJSON();

      expect(json.name).toBe('DBGpTimeoutError');
      expect(json.message).toBe('Command timeout');
      expect(json.code).toBe('DBGP_COMMAND_TIMEOUT');
      expect(json.category).toBe('timeout');
      expect(json.context).toEqual({
        timeoutMs: 5000,
        operation: 'command_execution',
        command: 'step_into',
        transactionId: 123,
        elapsedMs: 4800
      });
    });

    it('should be JSON.stringify compatible', () => {
      const error = new DBGpTimeoutError('Test timeout', {
        timeout: 3000,
        command: 'test_command'
      });

      expect(() => JSON.stringify(error)).not.toThrow();

      const parsed = JSON.parse(JSON.stringify(error));
      expect(parsed.name).toBe('DBGpTimeoutError');
      expect(parsed.context.timeoutMs).toBe(3000);
      expect(parsed.context.command).toBe('test_command');
    });
  });

  describe('toString', () => {
    it('should include timeout-specific information', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        code: 'DBGP_COMMAND_TIMEOUT',
        timeout: 5000,
        command: 'breakpoint_set',
        transactionId: 789,
        elapsed: 4900
      });

      const str = error.toString();

      expect(str).toContain('DBGpTimeoutError: Timeout occurred');
      expect(str).toContain('Code: DBGP_COMMAND_TIMEOUT');
      expect(str).toContain('5000');
      expect(str).toContain('breakpoint_set');
      expect(str).toContain('789');
      expect(str).toContain('4900');
    });
  });

  describe('context handling', () => {
    it('should preserve existing context when adding timeout details', () => {
      const error = new DBGpTimeoutError('Timeout occurred', {
        context: { existingKey: 'existingValue' },
        timeout: 2000,
        operation: 'test_operation'
      });

      expect(error.getContext('existingKey')).toBe('existingValue');
      expect(error.getContext('timeoutMs')).toBe(2000);
      expect(error.getContext('operation')).toBe('test_operation');
    });
  });

  describe('edge cases', () => {
    it('should handle null message', () => {
      const error = new DBGpTimeoutError(null);
      // null gets converted to string 'null'
      expect(error.message).toBe('null');
    });

    it('should handle undefined options', () => {
      const error = new DBGpTimeoutError('Test', undefined);
      expect(error.code).toBe('DBGP_TIMEOUT_ERROR');
      expect(error.category).toBe('timeout');
    });

    it('should handle negative timeout values', () => {
      const error = new DBGpTimeoutError('Timeout', { timeout: -1000 });
      expect(error.timeout).toBe(-1000);
      expect(error.getTimeoutSeconds()).toBe(-1);
    });

    it('should handle negative elapsed values', () => {
      const error = new DBGpTimeoutError('Timeout', { elapsed: -500 });
      expect(error.elapsed).toBe(-500);
      // Math.round(-500 / 1000) = Math.round(-0.5) = -0
      expect(error.getElapsedSeconds()).toBe(-0);
    });

    it('should handle very large timeout values', () => {
      const largeTimeout = Number.MAX_SAFE_INTEGER;
      const error = new DBGpTimeoutError('Timeout', { timeout: largeTimeout });
      expect(error.timeout).toBe(largeTimeout);
    });

    it('should handle boolean values in context', () => {
      const error = new DBGpTimeoutError('Test error', {
        context: { flag: true, other: false }
      });

      expect(error.getContext('flag')).toBe(true);
      expect(error.getContext('other')).toBe(false);
    });
  });

  describe('error chaining', () => {
    it('should chain timeout errors properly', () => {
      const networkError = new Error('Original timeout error');
      networkError.stack = 'Original stack trace';

      const error = new DBGpTimeoutError('Timeout occurred', {
        cause: networkError
      });

      expect(error.cause).toBe(networkError);
      expect(error.stack).toContain('Caused by: Original stack trace');
    });
  });
});

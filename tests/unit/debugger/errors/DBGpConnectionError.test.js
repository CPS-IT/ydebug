/**
 * Tests for DBGpConnectionError class
 * Comprehensive test coverage for connection-related error handling
 */

const DBGpConnectionError = require('../../../../src/debugger/errors/DBGpConnectionError');
const DBGpError = require('../../../../src/debugger/errors/DBGpError');

describe('DBGpConnectionError', () => {
  describe('constructor', () => {
    it('should create basic connection error with message', () => {
      const error = new DBGpConnectionError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('DBGP_CONNECTION_ERROR');
      expect(error.category).toBe('connection');
      expect(error.recoverable).toBe(true);
      expect(error.connectionState).toBe('unknown');
      expect(error.host).toBeNull();
      expect(error.port).toBeNull();
    });

    it('should create connection error with all options', () => {
      const cause = new Error('Network error');
      const error = new DBGpConnectionError('Connection failed', {
        code: 'CUSTOM_CONNECTION_ERROR',
        connectionState: 'connecting',
        host: 'localhost',
        port: 9003,
        cause,
        recoverable: false
      });

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('CUSTOM_CONNECTION_ERROR');
      expect(error.category).toBe('connection');
      expect(error.recoverable).toBe(false);
      expect(error.connectionState).toBe('connecting');
      expect(error.host).toBe('localhost');
      expect(error.port).toBe(9003);
      expect(error.cause).toBe(cause);
    });

    it('should add connection details to context', () => {
      const error = new DBGpConnectionError('Connection failed', {
        connectionState: 'handshake',
        host: '192.168.1.100',
        port: 9003
      });

      expect(error.getContext('connectionState')).toBe('handshake');
      expect(error.getContext('host')).toBe('192.168.1.100');
      expect(error.getContext('port')).toBe(9003);
    });

    it('should only add non-null connection details to context', () => {
      const error = new DBGpConnectionError('Connection failed', {
        connectionState: 'connecting'
        // host and port intentionally omitted
      });

      expect(error.getContext('connectionState')).toBe('connecting');
      expect(error.getContext('host')).toBeUndefined();
      expect(error.getContext('port')).toBeUndefined();
    });

    it('should default recoverable to true when not specified', () => {
      const error = new DBGpConnectionError('Connection failed');
      expect(error.recoverable).toBe(true);
    });

    it('should handle empty options object', () => {
      const error = new DBGpConnectionError('Connection failed', {});

      expect(error.code).toBe('DBGP_CONNECTION_ERROR');
      expect(error.category).toBe('connection');
      expect(error.recoverable).toBe(true);
      expect(error.connectionState).toBe('unknown');
    });
  });

  describe('inheritance', () => {
    it('should inherit from DBGpError', () => {
      const error = new DBGpConnectionError('Connection failed');

      expect(error).toBeInstanceOf(DBGpConnectionError);
      expect(error).toBeInstanceOf(DBGpError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct constructor name', () => {
      const error = new DBGpConnectionError('Connection failed');
      expect(error.constructor.name).toBe('DBGpConnectionError');
      expect(error.name).toBe('DBGpConnectionError');
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message for ECONNREFUSED', () => {
      const error = new DBGpConnectionError('Connection refused', {
        code: 'ECONNREFUSED',
        host: 'localhost',
        port: 9003
      });

      const message = error.getUserMessage();
      expect(message).toBe('Cannot connect to debugger at localhost:9003. Make sure Xdebug is running and configured properly.');
    });

    it('should return user-friendly message for ETIMEDOUT', () => {
      const error = new DBGpConnectionError('Timed out', {
        code: 'ETIMEDOUT',
        host: '192.168.1.100',
        port: 9003
      });

      const message = error.getUserMessage();
      expect(message).toBe('Connection to debugger at 192.168.1.100:9003 timed out. Check network connectivity and firewall settings.');
    });

    it('should return user-friendly message for ENOTFOUND', () => {
      const error = new DBGpConnectionError('Host not found', {
        code: 'ENOTFOUND',
        host: 'nonexistent.host'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Cannot find debugger host nonexistent.host. Check the hostname or IP address.');
    });

    it('should return user-friendly message for ECONNRESET', () => {
      const error = new DBGpConnectionError('Connection reset', {
        code: 'ECONNRESET'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Connection to debugger was reset. The debugger may have closed the connection unexpectedly.');
    });

    it('should return user-friendly message for DBGP_CONNECTION_LOST', () => {
      const error = new DBGpConnectionError('Connection lost', {
        code: 'DBGP_CONNECTION_LOST',
        connectionState: 'debugging'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Lost connection to debugger during debugging. The debugging session was interrupted.');
    });

    it('should return default message for unknown error codes', () => {
      const error = new DBGpConnectionError('Unknown error', {
        code: 'UNKNOWN_ERROR'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Connection error: Unknown error');
    });

    it('should handle missing host/port gracefully', () => {
      const error = new DBGpConnectionError('Connection failed', {
        code: 'ECONNREFUSED'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Cannot connect to debugger at debugger. Make sure Xdebug is running and configured properly.');
    });

    it('should handle only host without port', () => {
      const error = new DBGpConnectionError('Connection failed', {
        code: 'ETIMEDOUT',
        host: 'localhost'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Connection to debugger at debugger timed out. Check network connectivity and firewall settings.');
    });

    it('should handle only port without host', () => {
      const error = new DBGpConnectionError('Connection failed', {
        code: 'ECONNREFUSED',
        port: 9003
      });

      const message = error.getUserMessage();
      expect(message).toBe('Cannot connect to debugger at debugger. Make sure Xdebug is running and configured properly.');
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should return suggestions for ECONNREFUSED', () => {
      const error = new DBGpConnectionError('Connection refused', {
        code: 'ECONNREFUSED',
        host: 'localhost',
        port: 9003
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Start your PHP application with Xdebug enabled',
        'Check that xdebug.mode=debug is set in php.ini',
        'Verify xdebug.start_with_request=yes or trigger debugging manually',
        'Ensure Xdebug is listening on localhost:9003'
      ]);
    });

    it('should return suggestions for ETIMEDOUT', () => {
      const error = new DBGpConnectionError('Timed out', {
        code: 'ETIMEDOUT'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Increase connection timeout in configuration',
        'Check network connectivity between debugger and IDE',
        'Verify firewall settings allow connections on the debug port',
        'Ensure the target application is running and accessible'
      ]);
    });

    it('should return suggestions for ENOTFOUND', () => {
      const error = new DBGpConnectionError('Host not found', {
        code: 'ENOTFOUND'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Verify the hostname or IP address is correct',
        'Check DNS resolution for the hostname',
        'Use IP address instead of hostname if DNS issues persist'
      ]);
    });

    it('should return suggestions for ECONNRESET', () => {
      const error = new DBGpConnectionError('Connection reset', {
        code: 'ECONNRESET'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Check debugger logs for errors',
        'Verify Xdebug configuration is correct',
        'Restart the debugging session',
        'Check if debugger process is stable'
      ]);
    });

    it('should return base suggestions for unknown error codes', () => {
      const error = new DBGpConnectionError('Unknown error', {
        code: 'UNKNOWN_ERROR'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Check DBGp connection status',
        'Verify debugger configuration',
        'Review error context for more details'
      ]);
    });

    it('should handle missing host/port in suggestions', () => {
      const error = new DBGpConnectionError('Connection refused', {
        code: 'ECONNREFUSED'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions[3]).toBe('Ensure Xdebug is listening on localhost:9003');
    });
  });

  describe('static factory methods', () => {
    describe('fromNetworkError', () => {
      it('should create connection error from network error', () => {
        const networkError = new Error('ECONNREFUSED');
        networkError.code = 'ECONNREFUSED';

        const connectionInfo = {
          host: 'localhost',
          port: 9003,
          state: 'connecting'
        };

        const error = DBGpConnectionError.fromNetworkError(networkError, connectionInfo);

        expect(error).toBeInstanceOf(DBGpConnectionError);
        expect(error.message).toBe('ECONNREFUSED');
        expect(error.code).toBe('ECONNREFUSED');
        expect(error.cause).toBe(networkError);
        expect(error.host).toBe('localhost');
        expect(error.port).toBe(9003);
        expect(error.connectionState).toBe('connecting');
      });

      it('should handle network error without code', () => {
        const networkError = new Error('Generic network error');

        const error = DBGpConnectionError.fromNetworkError(networkError);

        expect(error.code).toBe('DBGP_NETWORK_ERROR');
        expect(error.connectionState).toBe('connecting');
        expect(error.host).toBeNull();
        expect(error.port).toBeNull();
      });

      it('should handle empty connection info', () => {
        const networkError = new Error('Network error');
        networkError.code = 'ETIMEDOUT';

        const error = DBGpConnectionError.fromNetworkError(networkError, {});

        expect(error.code).toBe('ETIMEDOUT');
        expect(error.connectionState).toBe('connecting');
        expect(error.host).toBeNull();
        expect(error.port).toBeNull();
      });

      it('should handle missing connection info', () => {
        const networkError = new Error('Network error');

        const error = DBGpConnectionError.fromNetworkError(networkError);

        expect(error.connectionState).toBe('connecting');
        expect(error.host).toBeNull();
        expect(error.port).toBeNull();
      });
    });

    describe('timeout', () => {
      it('should create timeout error with full connection info', () => {
        const connectionInfo = {
          host: '192.168.1.100',
          port: 9003,
          state: 'handshake'
        };

        const error = DBGpConnectionError.timeout(5000, connectionInfo);

        expect(error).toBeInstanceOf(DBGpConnectionError);
        expect(error.message).toBe('Connection timed out after 5000ms');
        expect(error.code).toBe('ETIMEDOUT');
        expect(error.host).toBe('192.168.1.100');
        expect(error.port).toBe(9003);
        expect(error.connectionState).toBe('handshake');
      });

      it('should create timeout error with minimal info', () => {
        const error = DBGpConnectionError.timeout(3000);

        expect(error.message).toBe('Connection timed out after 3000ms');
        expect(error.code).toBe('ETIMEDOUT');
        expect(error.connectionState).toBe('connecting');
        expect(error.host).toBeNull();
        expect(error.port).toBeNull();
      });

      it('should handle empty connection info', () => {
        const error = DBGpConnectionError.timeout(2000, {});

        expect(error.connectionState).toBe('connecting');
      });
    });

    describe('connectionLost', () => {
      it('should create connection lost error with full info', () => {
        const connectionInfo = {
          host: 'localhost',
          port: 9003
        };

        const error = DBGpConnectionError.connectionLost('debugging', connectionInfo);

        expect(error).toBeInstanceOf(DBGpConnectionError);
        expect(error.message).toBe('Connection lost during debugging');
        expect(error.code).toBe('DBGP_CONNECTION_LOST');
        expect(error.connectionState).toBe('debugging');
        expect(error.host).toBe('localhost');
        expect(error.port).toBe(9003);
        expect(error.recoverable).toBe(false);
      });

      it('should create connection lost error with minimal info', () => {
        const error = DBGpConnectionError.connectionLost('initialization');

        expect(error.message).toBe('Connection lost during initialization');
        expect(error.connectionState).toBe('initialization');
        expect(error.recoverable).toBe(false);
        expect(error.host).toBeNull();
        expect(error.port).toBeNull();
      });

      it('should handle empty connection info', () => {
        const error = DBGpConnectionError.connectionLost('testing', {});

        expect(error.connectionState).toBe('testing');
      });
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new DBGpConnectionError('Connection failed', {
        code: 'ECONNREFUSED',
        connectionState: 'connecting',
        host: 'localhost',
        port: 9003
      });

      const json = error.toJSON();

      expect(json.name).toBe('DBGpConnectionError');
      expect(json.message).toBe('Connection failed');
      expect(json.code).toBe('ECONNREFUSED');
      expect(json.category).toBe('connection');
      expect(json.context).toEqual({
        connectionState: 'connecting',
        host: 'localhost',
        port: 9003
      });
    });

    it('should be JSON.stringify compatible', () => {
      const error = new DBGpConnectionError('Test error', {
        host: 'test.host',
        port: 9000
      });

      expect(() => JSON.stringify(error)).not.toThrow();

      const parsed = JSON.parse(JSON.stringify(error));
      expect(parsed.name).toBe('DBGpConnectionError');
      expect(parsed.context.host).toBe('test.host');
      expect(parsed.context.port).toBe(9000);
    });
  });

  describe('toString', () => {
    it('should include connection-specific information', () => {
      const error = new DBGpConnectionError('Connection failed', {
        code: 'ECONNREFUSED',
        connectionState: 'connecting',
        host: 'localhost',
        port: 9003
      });

      const str = error.toString();

      expect(str).toContain('DBGpConnectionError: Connection failed');
      expect(str).toContain('Code: ECONNREFUSED');
      expect(str).toContain('connectionState');
      expect(str).toContain('localhost');
      expect(str).toContain('9003');
    });
  });

  describe('context handling', () => {
    it('should preserve existing context when adding connection details', () => {
      const error = new DBGpConnectionError('Connection failed', {
        context: { existingKey: 'existingValue' },
        connectionState: 'connecting',
        host: 'localhost'
      });

      expect(error.getContext('existingKey')).toBe('existingValue');
      expect(error.getContext('connectionState')).toBe('connecting');
      expect(error.getContext('host')).toBe('localhost');
    });
  });

  describe('edge cases', () => {
    it('should handle null message', () => {
      const error = new DBGpConnectionError(null);
      // null gets converted to string 'null' by Error constructor
      expect(error.message).toBe('null');
    });

    it('should handle undefined options', () => {
      const error = new DBGpConnectionError('Test', undefined);
      expect(error.code).toBe('DBGP_CONNECTION_ERROR');
      expect(error.category).toBe('connection');
    });

    it('should handle zero port number', () => {
      const error = new DBGpConnectionError('Connection failed', {
        host: 'localhost',
        port: 0
      });

      // Zero port is treated as falsy and becomes null
      expect(error.port).toBeNull();
      // Zero port doesn't get added to context because it's falsy
      expect(error.getContext('port')).toBeUndefined();
    });

    it('should handle empty string host', () => {
      const error = new DBGpConnectionError('Connection failed', {
        host: '',
        port: 9003
      });

      // Empty string host is treated as falsy and becomes null
      expect(error.host).toBeNull();
      // Empty string host doesn't get added to context because it's falsy
      expect(error.getContext('host')).toBeUndefined();
    });

    it('should handle boolean values in context', () => {
      const error = new DBGpConnectionError('Test error', {
        context: { flag: true, other: false }
      });

      expect(error.getContext('flag')).toBe(true);
      expect(error.getContext('other')).toBe(false);
    });
  });

  describe('error chaining', () => {
    it('should chain network errors properly', () => {
      const networkError = new Error('Original network error');
      networkError.stack = 'Original stack trace';

      const error = new DBGpConnectionError('Connection failed', {
        cause: networkError
      });

      expect(error.cause).toBe(networkError);
      expect(error.stack).toContain('Caused by: Original stack trace');
    });
  });
});

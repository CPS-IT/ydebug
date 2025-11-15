/**
 * Tests for DBGpProtocolError class
 * Comprehensive test coverage for protocol-related error handling
 */

const DBGpProtocolError = require('../../../src/debugger/errors/DBGpProtocolError');
const DBGpError = require('../../../src/debugger/errors/DBGpError');

describe('DBGpProtocolError', () => {
  describe('constructor', () => {
    it('should create basic protocol error with message', () => {
      const error = new DBGpProtocolError('Protocol error');

      expect(error.message).toBe('Protocol error');
      expect(error.code).toBe('DBGP_PROTOCOL_ERROR');
      expect(error.category).toBe('protocol');
      expect(error.recoverable).toBe(true);
      expect(error.command).toBeNull();
      expect(error.transactionId).toBeNull();
      expect(error.response).toBeNull();
      expect(error.protocolVersion).toBeNull();
    });

    it('should create protocol error with all options', () => {
      const cause = new Error('XML parse error');
      const response = '<xml>malformed</xml';
      const error = new DBGpProtocolError('Invalid XML', {
        code: 'CUSTOM_PROTOCOL_ERROR',
        command: 'status',
        transactionId: 123,
        response,
        protocolVersion: '1.0',
        cause,
        recoverable: false
      });

      expect(error.message).toBe('Invalid XML');
      expect(error.code).toBe('CUSTOM_PROTOCOL_ERROR');
      expect(error.category).toBe('protocol');
      expect(error.recoverable).toBe(false);
      expect(error.command).toBe('status');
      expect(error.transactionId).toBe(123);
      expect(error.response).toBe(response);
      expect(error.protocolVersion).toBe('1.0');
      expect(error.cause).toBe(cause);
    });

    it('should add protocol details to context', () => {
      const response = '<xml>test response</xml>';
      const error = new DBGpProtocolError('Protocol error', {
        command: 'step_into',
        transactionId: 456,
        response,
        protocolVersion: '2.0'
      });

      expect(error.getContext('command')).toBe('step_into');
      expect(error.getContext('transactionId')).toBe(456);
      expect(error.getContext('protocolVersion')).toBe('2.0');
      expect(error.getContext('responseLength')).toBe(response.length);
    });

    it('should only add non-null protocol details to context', () => {
      const error = new DBGpProtocolError('Protocol error', {
        command: 'breakpoint_set'
        // other fields intentionally omitted
      });

      expect(error.getContext('command')).toBe('breakpoint_set');
      expect(error.getContext('transactionId')).toBeUndefined();
      expect(error.getContext('protocolVersion')).toBeUndefined();
      expect(error.getContext('responseLength')).toBeUndefined();
    });

    it('should default recoverable to true when not specified', () => {
      const error = new DBGpProtocolError('Protocol error');
      expect(error.recoverable).toBe(true);
    });

    it('should handle empty options object', () => {
      const error = new DBGpProtocolError('Protocol error', {});

      expect(error.code).toBe('DBGP_PROTOCOL_ERROR');
      expect(error.category).toBe('protocol');
      expect(error.recoverable).toBe(true);
    });

    it('should handle zero transaction ID', () => {
      const error = new DBGpProtocolError('Protocol error', {
        transactionId: 0
      });

      // Zero values are treated as falsy and become null
      expect(error.transactionId).toBeNull();
      // Zero values don't get added to context because they're falsy
      expect(error.getContext('transactionId')).toBeUndefined();
    });

    it('should handle empty string values', () => {
      const error = new DBGpProtocolError('Protocol error', {
        command: '',
        response: '',
        protocolVersion: ''
      });

      // Empty strings are treated as falsy and become null
      expect(error.command).toBeNull();
      expect(error.response).toBeNull();
      expect(error.protocolVersion).toBeNull();
      // Empty strings don't get added to context because they're falsy
      expect(error.getContext('responseLength')).toBeUndefined();
    });
  });

  describe('inheritance', () => {
    it('should inherit from DBGpError', () => {
      const error = new DBGpProtocolError('Protocol error');

      expect(error).toBeInstanceOf(DBGpProtocolError);
      expect(error).toBeInstanceOf(DBGpError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct constructor name', () => {
      const error = new DBGpProtocolError('Protocol error');
      expect(error.constructor.name).toBe('DBGpProtocolError');
      expect(error.name).toBe('DBGpProtocolError');
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message for DBGP_XML_PARSE_ERROR', () => {
      const error = new DBGpProtocolError('XML parse failed', {
        code: 'DBGP_XML_PARSE_ERROR',
        command: 'status'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Invalid XML response from debugger for command \'status\'. The debugger may have sent malformed data.');
    });

    it('should return user-friendly message for DBGP_XML_PARSE_ERROR without command', () => {
      const error = new DBGpProtocolError('XML parse failed', {
        code: 'DBGP_XML_PARSE_ERROR'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Invalid XML response from debugger. The debugger may have sent malformed data.');
    });

    it('should return user-friendly message for DBGP_INVALID_RESPONSE', () => {
      const error = new DBGpProtocolError('Invalid response', {
        code: 'DBGP_INVALID_RESPONSE',
        command: 'step_over'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Unexpected response format from debugger for command \'step_over\'. The response does not match the expected DBGp protocol.');
    });

    it('should return user-friendly message for DBGP_INVALID_RESPONSE without command', () => {
      const error = new DBGpProtocolError('Invalid response', {
        code: 'DBGP_INVALID_RESPONSE'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Unexpected response format from debugger. The response does not match the expected DBGp protocol.');
    });

    it('should return user-friendly message for DBGP_COMMAND_ERROR', () => {
      const error = new DBGpProtocolError('Command failed', {
        code: 'DBGP_COMMAND_ERROR',
        command: 'eval'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Debugger reported an error for command \'eval\'. The command may not be supported or the arguments may be invalid.');
    });

    it('should return user-friendly message for DBGP_COMMAND_ERROR without command', () => {
      const error = new DBGpProtocolError('Command failed', {
        code: 'DBGP_COMMAND_ERROR'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Debugger reported an error. The command may not be supported or the arguments may be invalid.');
    });

    it('should return user-friendly message for DBGP_TRANSACTION_MISMATCH', () => {
      const error = new DBGpProtocolError('Transaction mismatch', {
        code: 'DBGP_TRANSACTION_MISMATCH',
        transactionId: 123
      });

      const message = error.getUserMessage();
      expect(message).toBe('Transaction ID mismatch in debugger response. Expected transaction 123 but got a different ID.');
    });

    it('should return user-friendly message for DBGP_PROTOCOL_VERSION_ERROR', () => {
      const error = new DBGpProtocolError('Version error', {
        code: 'DBGP_PROTOCOL_VERSION_ERROR',
        protocolVersion: '3.0'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Unsupported DBGp protocol version: 3.0. The debugger may be using an incompatible version.');
    });

    it('should return user-friendly message for DBGP_PROTOCOL_VERSION_ERROR without version', () => {
      const error = new DBGpProtocolError('Version error', {
        code: 'DBGP_PROTOCOL_VERSION_ERROR'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Unsupported DBGp protocol version. The debugger may be using an incompatible version.');
    });

    it('should return default message for unknown error codes', () => {
      const error = new DBGpProtocolError('Unknown protocol error', {
        code: 'UNKNOWN_PROTOCOL_ERROR'
      });

      const message = error.getUserMessage();
      expect(message).toBe('Protocol error: Unknown protocol error');
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should return suggestions for DBGP_XML_PARSE_ERROR', () => {
      const error = new DBGpProtocolError('XML parse failed', {
        code: 'DBGP_XML_PARSE_ERROR'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Check debugger configuration for proper XML output',
        'Verify Xdebug version compatibility',
        'Enable debug logging to inspect raw XML responses',
        'Check if debugger is sending binary or corrupted data'
      ]);
    });

    it('should return suggestions for DBGP_INVALID_RESPONSE', () => {
      const error = new DBGpProtocolError('Invalid response', {
        code: 'DBGP_INVALID_RESPONSE'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Verify DBGp protocol compliance in debugger',
        'Check if response format matches expected schema',
        'Update debugger to a compatible version',
        'Enable verbose logging to inspect response structure'
      ]);
    });

    it('should return suggestions for DBGP_COMMAND_ERROR', () => {
      const error = new DBGpProtocolError('Command error', {
        code: 'DBGP_COMMAND_ERROR'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Check if the command is supported by the debugger',
        'Verify command arguments are correct and properly formatted',
        'Review debugger documentation for command usage',
        'Try a simpler command to test basic connectivity'
      ]);
    });

    it('should return suggestions for DBGP_TRANSACTION_MISMATCH', () => {
      const error = new DBGpProtocolError('Transaction mismatch', {
        code: 'DBGP_TRANSACTION_MISMATCH'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Check for concurrent command execution issues',
        'Verify transaction ID management is working correctly',
        'Enable transaction logging for debugging',
        'Restart the debugging session to reset state'
      ]);
    });

    it('should return suggestions for DBGP_PROTOCOL_VERSION_ERROR', () => {
      const error = new DBGpProtocolError('Version error', {
        code: 'DBGP_PROTOCOL_VERSION_ERROR'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Update Xdebug to a compatible version',
        'Check protocol version negotiation',
        'Review compatibility matrix for your setup',
        'Use a different debugger client if available'
      ]);
    });

    it('should return base suggestions for unknown error codes', () => {
      const error = new DBGpProtocolError('Unknown error', {
        code: 'UNKNOWN_PROTOCOL_ERROR'
      });

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toEqual([
        'Check DBGp connection status',
        'Verify debugger configuration',
        'Review error context for more details'
      ]);
    });
  });

  describe('static factory methods', () => {
    describe('xmlParseError', () => {
      it('should create XML parse error from parse error', () => {
        const parseError = new Error('Unexpected token');
        const response = '<xml>malformed</xml';
        const command = 'breakpoint_list';

        const error = DBGpProtocolError.xmlParseError(parseError, response, command);

        expect(error).toBeInstanceOf(DBGpProtocolError);
        expect(error.message).toBe('Failed to parse XML response: Unexpected token');
        expect(error.code).toBe('DBGP_XML_PARSE_ERROR');
        expect(error.cause).toBe(parseError);
        expect(error.response).toBe(response);
        expect(error.command).toBe(command);
      });

      it('should create XML parse error without command', () => {
        const parseError = new Error('Invalid XML');
        const response = 'not xml at all';

        const error = DBGpProtocolError.xmlParseError(parseError, response);

        expect(error.message).toBe('Failed to parse XML response: Invalid XML');
        expect(error.code).toBe('DBGP_XML_PARSE_ERROR');
        expect(error.command).toBeNull();
      });

      it('should handle null command', () => {
        const parseError = new Error('Parse failed');
        const response = '<invalid>';

        const error = DBGpProtocolError.xmlParseError(parseError, response, null);

        expect(error.command).toBeNull();
      });
    });

    describe('invalidResponse', () => {
      it('should create invalid response error', () => {
        const expectedFormat = 'XML with <response> element';
        const actualResponse = '{"json": "instead"}';
        const command = 'property_get';

        const error = DBGpProtocolError.invalidResponse(expectedFormat, actualResponse, command);

        expect(error).toBeInstanceOf(DBGpProtocolError);
        expect(error.message).toBe('Invalid response format. Expected XML with <response> element but received different format');
        expect(error.code).toBe('DBGP_INVALID_RESPONSE');
        expect(error.response).toBe(actualResponse);
        expect(error.command).toBe(command);
      });

      it('should create invalid response error without command', () => {
        const expectedFormat = 'Valid XML';
        const actualResponse = 'Plain text';

        const error = DBGpProtocolError.invalidResponse(expectedFormat, actualResponse);

        expect(error.command).toBeNull();
      });

      it('should handle null command', () => {
        const error = DBGpProtocolError.invalidResponse('XML', 'text', null);
        expect(error.command).toBeNull();
      });
    });

    describe('commandError', () => {
      it('should create command error with full info', () => {
        const errorMessage = 'Invalid breakpoint location';
        const command = 'breakpoint_set';
        const transactionId = 789;

        const error = DBGpProtocolError.commandError(errorMessage, command, transactionId);

        expect(error).toBeInstanceOf(DBGpProtocolError);
        expect(error.message).toBe('Command error: Invalid breakpoint location');
        expect(error.code).toBe('DBGP_COMMAND_ERROR');
        expect(error.command).toBe(command);
        expect(error.transactionId).toBe(transactionId);
        expect(error.recoverable).toBe(true);
      });

      it('should create command error without transaction ID', () => {
        const errorMessage = 'Command not supported';
        const command = 'unknown_command';

        const error = DBGpProtocolError.commandError(errorMessage, command);

        expect(error.message).toBe('Command error: Command not supported');
        expect(error.transactionId).toBeNull();
      });

      it('should handle null transaction ID explicitly', () => {
        const error = DBGpProtocolError.commandError('Error', 'cmd', null);
        expect(error.transactionId).toBeNull();
      });

      it('should handle zero transaction ID', () => {
        const error = DBGpProtocolError.commandError('Error', 'cmd', 0);
        // Zero values are treated as falsy and become null
        expect(error.transactionId).toBeNull();
      });
    });

    describe('transactionMismatch', () => {
      it('should create transaction mismatch error with full info', () => {
        const expected = 100;
        const actual = 101;
        const command = 'step_into';

        const error = DBGpProtocolError.transactionMismatch(expected, actual, command);

        expect(error).toBeInstanceOf(DBGpProtocolError);
        expect(error.message).toBe('Transaction ID mismatch: expected 100, got 101');
        expect(error.code).toBe('DBGP_TRANSACTION_MISMATCH');
        expect(error.command).toBe(command);
        expect(error.transactionId).toBe(expected);
        expect(error.recoverable).toBe(false);
      });

      it('should create transaction mismatch error without command', () => {
        const expected = 200;
        const actual = 201;

        const error = DBGpProtocolError.transactionMismatch(expected, actual);

        expect(error.message).toBe('Transaction ID mismatch: expected 200, got 201');
        expect(error.command).toBeNull();
      });

      it('should handle null command', () => {
        const error = DBGpProtocolError.transactionMismatch(1, 2, null);
        expect(error.command).toBeNull();
      });

      it('should handle zero transaction IDs', () => {
        const error = DBGpProtocolError.transactionMismatch(0, 1);
        // Zero values are treated as falsy and become null
        expect(error.transactionId).toBeNull();
        expect(error.message).toBe('Transaction ID mismatch: expected 0, got 1');
      });
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const response = '<xml>response</xml>';
      const error = new DBGpProtocolError('Protocol error', {
        code: 'DBGP_XML_PARSE_ERROR',
        command: 'status',
        transactionId: 123,
        response,
        protocolVersion: '1.0'
      });

      const json = error.toJSON();

      expect(json.name).toBe('DBGpProtocolError');
      expect(json.message).toBe('Protocol error');
      expect(json.code).toBe('DBGP_XML_PARSE_ERROR');
      expect(json.category).toBe('protocol');
      expect(json.context).toEqual({
        command: 'status',
        transactionId: 123,
        protocolVersion: '1.0',
        responseLength: response.length
      });
    });

    it('should be JSON.stringify compatible', () => {
      const error = new DBGpProtocolError('Test error', {
        command: 'test_command',
        transactionId: 456
      });

      expect(() => JSON.stringify(error)).not.toThrow();

      const parsed = JSON.parse(JSON.stringify(error));
      expect(parsed.name).toBe('DBGpProtocolError');
      expect(parsed.context.command).toBe('test_command');
      expect(parsed.context.transactionId).toBe(456);
    });
  });

  describe('toString', () => {
    it('should include protocol-specific information', () => {
      const error = new DBGpProtocolError('Protocol error', {
        code: 'DBGP_XML_PARSE_ERROR',
        command: 'breakpoint_set',
        transactionId: 789,
        protocolVersion: '2.0'
      });

      const str = error.toString();

      expect(str).toContain('DBGpProtocolError: Protocol error');
      expect(str).toContain('Code: DBGP_XML_PARSE_ERROR');
      expect(str).toContain('breakpoint_set');
      expect(str).toContain('789');
      expect(str).toContain('2.0');
    });
  });

  describe('context handling', () => {
    it('should preserve existing context when adding protocol details', () => {
      const error = new DBGpProtocolError('Protocol error', {
        context: { existingKey: 'existingValue' },
        command: 'status',
        transactionId: 123
      });

      expect(error.getContext('existingKey')).toBe('existingValue');
      expect(error.getContext('command')).toBe('status');
      expect(error.getContext('transactionId')).toBe(123);
    });

    it('should calculate response length correctly', () => {
      const longResponse = 'a'.repeat(1000);
      const error = new DBGpProtocolError('Protocol error', {
        response: longResponse
      });

      expect(error.getContext('responseLength')).toBe(1000);
    });
  });

  describe('edge cases', () => {
    it('should handle null message', () => {
      const error = new DBGpProtocolError(null);
      // null gets converted to string 'null' by Error constructor
      expect(error.message).toBe('null');
    });

    it('should handle undefined options', () => {
      const error = new DBGpProtocolError('Test', undefined);
      expect(error.code).toBe('DBGP_PROTOCOL_ERROR');
      expect(error.category).toBe('protocol');
    });

    it('should handle very long response strings', () => {
      const veryLongResponse = 'x'.repeat(100000);
      const error = new DBGpProtocolError('Protocol error', {
        response: veryLongResponse
      });

      expect(error.response).toBe(veryLongResponse);
      expect(error.getContext('responseLength')).toBe(100000);
    });

    it('should handle boolean values in context', () => {
      const error = new DBGpProtocolError('Test error', {
        context: { flag: true, other: false }
      });

      expect(error.getContext('flag')).toBe(true);
      expect(error.getContext('other')).toBe(false);
    });

    it('should handle negative transaction IDs', () => {
      const error = new DBGpProtocolError('Protocol error', {
        transactionId: -1
      });

      expect(error.transactionId).toBe(-1);
      expect(error.getContext('transactionId')).toBe(-1);
    });
  });

  describe('error chaining', () => {
    it('should chain parse errors properly', () => {
      const parseError = new Error('Original parse error');
      parseError.stack = 'Original stack trace';

      const error = new DBGpProtocolError('Protocol error', {
        cause: parseError
      });

      expect(error.cause).toBe(parseError);
      expect(error.stack).toContain('Caused by: Original stack trace');
    });
  });
});

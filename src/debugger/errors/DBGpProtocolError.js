/**
 * DBGp Protocol Error Class
 * Handles protocol-related errors in DBGp communication
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

const DBGpError = require('./DBGpError');

/**
 * Protocol-related error for DBGp communication
 * Used for XML parsing, command format, and protocol violations
 */
class DBGpProtocolError extends DBGpError {
  /**
   * Create a DBGp protocol error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {string} options.command - Command that caused the error
   * @param {number} options.transactionId - Transaction ID if available
   * @param {string} options.response - Raw response that caused the error
   * @param {string} options.protocolVersion - DBGp protocol version
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'DBGP_PROTOCOL_ERROR',
      category: 'protocol',
      recoverable: options.recoverable !== false
    });

    this.command = options.command || null;
    this.transactionId = options.transactionId || null;
    this.response = options.response || null;
    this.protocolVersion = options.protocolVersion || null;

    // Add protocol details to context
    if (this.command) this.addContext('command', this.command);
    if (this.transactionId) this.addContext('transactionId', this.transactionId);
    if (this.protocolVersion) this.addContext('protocolVersion', this.protocolVersion);
    if (this.response) this.addContext('responseLength', this.response.length);
  }

  /**
   * Get user-friendly error message
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    switch (this.code) {
    case 'DBGP_XML_PARSE_ERROR':
      return `Invalid XML response from debugger${this.command ? ` for command '${this.command}'` : ''}. The debugger may have sent malformed data.`;
    case 'DBGP_INVALID_RESPONSE':
      return `Unexpected response format from debugger${this.command ? ` for command '${this.command}'` : ''}. The response does not match the expected DBGp protocol.`;
    case 'DBGP_COMMAND_ERROR':
      return `Debugger reported an error${this.command ? ` for command '${this.command}'` : ''}. The command may not be supported or the arguments may be invalid.`;
    case 'DBGP_TRANSACTION_MISMATCH':
      return `Transaction ID mismatch in debugger response. Expected transaction ${this.transactionId} but got a different ID.`;
    case 'DBGP_PROTOCOL_VERSION_ERROR':
      return `Unsupported DBGp protocol version${this.protocolVersion ? `: ${this.protocolVersion}` : ''}. The debugger may be using an incompatible version.`;
    default:
      return `Protocol error: ${this.message}`;
    }
  }

  /**
   * Get recovery suggestions specific to protocol errors
   * @returns {string[]} Array of recovery suggestions
   */
  getRecoverySuggestions() {
    const suggestions = [];
    
    switch (this.code) {
    case 'DBGP_XML_PARSE_ERROR':
      suggestions.push(
        'Check debugger configuration for proper XML output',
        'Verify Xdebug version compatibility',
        'Enable debug logging to inspect raw XML responses',
        'Check if debugger is sending binary or corrupted data'
      );
      break;
        
    case 'DBGP_INVALID_RESPONSE':
      suggestions.push(
        'Verify DBGp protocol compliance in debugger',
        'Check if response format matches expected schema',
        'Update debugger to a compatible version',
        'Enable verbose logging to inspect response structure'
      );
      break;
        
    case 'DBGP_COMMAND_ERROR':
      suggestions.push(
        'Check if the command is supported by the debugger',
        'Verify command arguments are correct and properly formatted',
        'Review debugger documentation for command usage',
        'Try a simpler command to test basic connectivity'
      );
      break;
        
    case 'DBGP_TRANSACTION_MISMATCH':
      suggestions.push(
        'Check for concurrent command execution issues',
        'Verify transaction ID management is working correctly',
        'Enable transaction logging for debugging',
        'Restart the debugging session to reset state'
      );
      break;
        
    case 'DBGP_PROTOCOL_VERSION_ERROR':
      suggestions.push(
        'Update Xdebug to a compatible version',
        'Check protocol version negotiation',
        'Review compatibility matrix for your setup',
        'Use a different debugger client if available'
      );
      break;
        
    default:
      suggestions.push(...super.getRecoverySuggestions());
    }
    
    return suggestions;
  }

  /**
   * Create XML parsing error
   * @param {Error} parseError - Original parsing error
   * @param {string} response - Raw response that failed to parse
   * @param {string} command - Command that generated the response
   * @returns {DBGpProtocolError} Protocol error instance
   * @static
   */
  static xmlParseError(parseError, response, command = null) {
    return new DBGpProtocolError(
      `Failed to parse XML response: ${parseError.message}`,
      {
        code: 'DBGP_XML_PARSE_ERROR',
        cause: parseError,
        response: response,
        command: command
      }
    );
  }

  /**
   * Create invalid response error
   * @param {string} expectedFormat - Expected response format
   * @param {string} actualResponse - Actual response received
   * @param {string} command - Command that generated the response
   * @returns {DBGpProtocolError} Protocol error instance
   * @static
   */
  static invalidResponse(expectedFormat, actualResponse, command = null) {
    return new DBGpProtocolError(
      `Invalid response format. Expected ${expectedFormat} but received different format`,
      {
        code: 'DBGP_INVALID_RESPONSE',
        response: actualResponse,
        command: command
      }
    );
  }

  /**
   * Create command error from debugger response
   * @param {string} errorMessage - Error message from debugger
   * @param {string} command - Command that caused the error
   * @param {number} transactionId - Transaction ID
   * @returns {DBGpProtocolError} Protocol error instance
   * @static
   */
  static commandError(errorMessage, command, transactionId = null) {
    return new DBGpProtocolError(
      `Command error: ${errorMessage}`,
      {
        code: 'DBGP_COMMAND_ERROR',
        command: command,
        transactionId: transactionId,
        recoverable: true
      }
    );
  }

  /**
   * Create transaction mismatch error
   * @param {number} expected - Expected transaction ID
   * @param {number} actual - Actual transaction ID received
   * @param {string} command - Command that caused the mismatch
   * @returns {DBGpProtocolError} Protocol error instance
   * @static
   */
  static transactionMismatch(expected, actual, command = null) {
    return new DBGpProtocolError(
      `Transaction ID mismatch: expected ${expected}, got ${actual}`,
      {
        code: 'DBGP_TRANSACTION_MISMATCH',
        command: command,
        transactionId: expected,
        recoverable: false
      }
    );
  }
}

module.exports = DBGpProtocolError;
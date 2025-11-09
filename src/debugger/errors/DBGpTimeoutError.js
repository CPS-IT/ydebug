/**
 * DBGp Timeout Error Class
 * Handles timeout-related errors in DBGp communication
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
 * Timeout-related error for DBGp communication
 * Used for command timeouts, response timeouts, and operation timeouts
 */
class DBGpTimeoutError extends DBGpError {
  /**
   * Create a DBGp timeout error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {number} options.timeout - Timeout value in milliseconds
   * @param {string} options.operation - Operation that timed out
   * @param {string} options.command - Command that timed out
   * @param {number} options.transactionId - Transaction ID if available
   * @param {number} options.elapsed - Elapsed time before timeout
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'DBGP_TIMEOUT_ERROR',
      category: 'timeout',
      recoverable: options.recoverable !== false
    });

    this.timeout = options.timeout || null;
    this.operation = options.operation || 'unknown';
    this.command = options.command || null;
    this.transactionId = options.transactionId || null;
    this.elapsed = options.elapsed || null;

    // Add timeout details to context
    if (this.timeout) this.addContext('timeoutMs', this.timeout);
    if (this.operation) this.addContext('operation', this.operation);
    if (this.command) this.addContext('command', this.command);
    if (this.transactionId) this.addContext('transactionId', this.transactionId);
    if (this.elapsed) this.addContext('elapsedMs', this.elapsed);
  }

  /**
   * Get user-friendly error message
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    const timeoutSeconds = this.timeout ? Math.round(this.timeout / 1000) : 'unknown';
    
    switch (this.code) {
    case 'DBGP_COMMAND_TIMEOUT':
      return `Command '${this.command || 'unknown'}' timed out after ${timeoutSeconds} seconds. The debugger may be unresponsive or processing a long-running operation.`;
    case 'DBGP_CONNECTION_TIMEOUT':
      return `Connection timed out after ${timeoutSeconds} seconds. Unable to establish connection with the debugger.`;
    case 'DBGP_RESPONSE_TIMEOUT':
      return `No response received from debugger within ${timeoutSeconds} seconds. The debugger may be busy or disconnected.`;
    case 'DBGP_INIT_TIMEOUT':
      return `Debugger initialization timed out after ${timeoutSeconds} seconds. The debugging session failed to start properly.`;
    default:
      return `Operation '${this.operation}' timed out after ${timeoutSeconds} seconds: ${this.message}`;
    }
  }

  /**
   * Get recovery suggestions specific to timeout errors
   * @returns {string[]} Array of recovery suggestions
   */
  getRecoverySuggestions() {
    const suggestions = [];
    
    switch (this.code) {
    case 'DBGP_COMMAND_TIMEOUT':
      suggestions.push(
        'Increase command timeout in configuration',
        'Check if debugger is processing a long-running operation',
        'Verify debugger is still responsive and connected',
        'Consider breaking execution if debugger is stuck in a loop'
      );
      break;
        
    case 'DBGP_CONNECTION_TIMEOUT':
      suggestions.push(
        'Increase connection timeout in configuration',
        'Check network connectivity and latency',
        'Verify debugger is listening on the correct port',
        'Ensure firewall allows connections on the debug port'
      );
      break;
        
    case 'DBGP_RESPONSE_TIMEOUT':
      suggestions.push(
        'Increase response timeout for slow operations',
        'Check if debugger process is still running',
        'Verify network stability between debugger and client',
        'Consider restarting the debugging session'
      );
      break;
        
    case 'DBGP_INIT_TIMEOUT':
      suggestions.push(
        'Increase initialization timeout',
        'Check debugger configuration and startup time',
        'Verify PHP application starts without errors',
        'Review debugger logs for initialization issues'
      );
      break;
        
    default:
      suggestions.push(
        'Increase timeout values in configuration',
        'Check system performance and resource availability',
        'Monitor debugger responsiveness',
        'Consider using shorter operations or breaking them into steps'
      );
    }
    
    return suggestions;
  }

  /**
   * Create command timeout error
   * @param {string} command - Command that timed out
   * @param {number} timeout - Timeout value in milliseconds
   * @param {number} transactionId - Transaction ID
   * @param {number} elapsed - Elapsed time before timeout
   * @returns {DBGpTimeoutError} Timeout error instance
   * @static
   */
  static commandTimeout(command, timeout, transactionId = null, elapsed = null) {
    return new DBGpTimeoutError(
      `Command '${command}' timed out after ${timeout}ms`,
      {
        code: 'DBGP_COMMAND_TIMEOUT',
        command: command,
        timeout: timeout,
        transactionId: transactionId,
        elapsed: elapsed,
        operation: 'command_execution'
      }
    );
  }

  /**
   * Create connection timeout error
   * @param {number} timeout - Timeout value in milliseconds
   * @param {string} host - Host being connected to
   * @param {number} port - Port being connected to
   * @returns {DBGpTimeoutError} Timeout error instance
   * @static
   */
  static connectionTimeout(timeout, host = null, port = null) {
    const hostPort = host && port ? `${host}:${port}` : 'debugger';
    return new DBGpTimeoutError(
      `Connection to ${hostPort} timed out after ${timeout}ms`,
      {
        code: 'DBGP_CONNECTION_TIMEOUT',
        timeout: timeout,
        operation: 'connection',
        recoverable: true
      }
    );
  }

  /**
   * Create response timeout error
   * @param {number} timeout - Timeout value in milliseconds
   * @param {string} command - Command waiting for response
   * @param {number} transactionId - Transaction ID
   * @returns {DBGpTimeoutError} Timeout error instance
   * @static
   */
  static responseTimeout(timeout, command = null, transactionId = null) {
    return new DBGpTimeoutError(
      `No response received within ${timeout}ms${command ? ` for command '${command}'` : ''}`,
      {
        code: 'DBGP_RESPONSE_TIMEOUT',
        timeout: timeout,
        command: command,
        transactionId: transactionId,
        operation: 'response_wait'
      }
    );
  }

  /**
   * Create initialization timeout error
   * @param {number} timeout - Timeout value in milliseconds
   * @returns {DBGpTimeoutError} Timeout error instance
   * @static
   */
  static initTimeout(timeout) {
    return new DBGpTimeoutError(
      `Debugger initialization timed out after ${timeout}ms`,
      {
        code: 'DBGP_INIT_TIMEOUT',
        timeout: timeout,
        operation: 'initialization',
        recoverable: false
      }
    );
  }

  /**
   * Get timeout in seconds
   * @returns {number} Timeout in seconds
   */
  getTimeoutSeconds() {
    return this.timeout ? Math.round(this.timeout / 1000) : 0;
  }

  /**
   * Get elapsed time in seconds
   * @returns {number} Elapsed time in seconds
   */
  getElapsedSeconds() {
    return this.elapsed ? Math.round(this.elapsed / 1000) : 0;
  }
}

module.exports = DBGpTimeoutError;
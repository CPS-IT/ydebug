/**
 * DBGp Connection Error Class
 * Handles connection-related errors in DBGp communication
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
 * Connection-related error for DBGp communication
 * Used for network, socket, and connection establishment errors
 */
class DBGpConnectionError extends DBGpError {
  /**
   * Create a DBGp connection error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {string} options.connectionState - State when error occurred
   * @param {string} options.host - Host being connected to
   * @param {number} options.port - Port being connected to
   * @param {Error} options.cause - Original network error
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'DBGP_CONNECTION_ERROR',
      category: 'connection',
      recoverable: options.recoverable !== false
    });

    this.connectionState = options.connectionState || 'unknown';
    this.host = options.host || null;
    this.port = options.port || null;

    // Add connection details to context
    this.addContext('connectionState', this.connectionState);
    if (this.host) this.addContext('host', this.host);
    if (this.port) this.addContext('port', this.port);
  }

  /**
   * Get user-friendly error message
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    const hostPort = this.host && this.port ? `${this.host}:${this.port}` : 'debugger';
    
    switch (this.code) {
    case 'ECONNREFUSED':
      return `Cannot connect to debugger at ${hostPort}. Make sure Xdebug is running and configured properly.`;
    case 'ETIMEDOUT':
      return `Connection to debugger at ${hostPort} timed out. Check network connectivity and firewall settings.`;
    case 'ENOTFOUND':
      return `Cannot find debugger host ${this.host}. Check the hostname or IP address.`;
    case 'ECONNRESET':
      return 'Connection to debugger was reset. The debugger may have closed the connection unexpectedly.';
    case 'DBGP_CONNECTION_LOST':
      return `Lost connection to debugger during ${this.connectionState}. The debugging session was interrupted.`;
    default:
      return `Connection error: ${this.message}`;
    }
  }

  /**
   * Get recovery suggestions specific to connection errors
   * @returns {string[]} Array of recovery suggestions
   */
  getRecoverySuggestions() {
    const suggestions = [];
    
    switch (this.code) {
    case 'ECONNREFUSED':
      suggestions.push(
        'Start your PHP application with Xdebug enabled',
        'Check that xdebug.mode=debug is set in php.ini',
        'Verify xdebug.start_with_request=yes or trigger debugging manually',
        `Ensure Xdebug is listening on ${this.host || 'localhost'}:${this.port || 9003}`
      );
      break;
        
    case 'ETIMEDOUT':
      suggestions.push(
        'Increase connection timeout in configuration',
        'Check network connectivity between debugger and IDE',
        'Verify firewall settings allow connections on the debug port',
        'Ensure the target application is running and accessible'
      );
      break;
        
    case 'ENOTFOUND':
      suggestions.push(
        'Verify the hostname or IP address is correct',
        'Check DNS resolution for the hostname',
        'Use IP address instead of hostname if DNS issues persist'
      );
      break;
        
    case 'ECONNRESET':
      suggestions.push(
        'Check debugger logs for errors',
        'Verify Xdebug configuration is correct',
        'Restart the debugging session',
        'Check if debugger process is stable'
      );
      break;
        
    default:
      suggestions.push(...super.getRecoverySuggestions());
    }
    
    return suggestions;
  }

  /**
   * Create connection error from network error
   * @param {Error} networkError - Original network error
   * @param {Object} connectionInfo - Connection information
   * @returns {DBGpConnectionError} Connection error instance
   * @static
   */
  static fromNetworkError(networkError, connectionInfo = {}) {
    return new DBGpConnectionError(
      networkError.message,
      {
        code: networkError.code || 'DBGP_NETWORK_ERROR',
        cause: networkError,
        host: connectionInfo.host,
        port: connectionInfo.port,
        connectionState: connectionInfo.state || 'connecting'
      }
    );
  }

  /**
   * Create timeout error
   * @param {number} timeout - Timeout value in milliseconds
   * @param {Object} connectionInfo - Connection information
   * @returns {DBGpConnectionError} Timeout error instance
   * @static
   */
  static timeout(timeout, connectionInfo = {}) {
    return new DBGpConnectionError(
      `Connection timed out after ${timeout}ms`,
      {
        code: 'ETIMEDOUT',
        host: connectionInfo.host,
        port: connectionInfo.port,
        connectionState: connectionInfo.state || 'connecting'
      }
    );
  }

  /**
   * Create connection lost error
   * @param {string} state - State when connection was lost
   * @param {Object} connectionInfo - Connection information
   * @returns {DBGpConnectionError} Connection lost error instance
   * @static
   */
  static connectionLost(state, connectionInfo = {}) {
    return new DBGpConnectionError(
      `Connection lost during ${state}`,
      {
        code: 'DBGP_CONNECTION_LOST',
        connectionState: state,
        host: connectionInfo.host,
        port: connectionInfo.port,
        recoverable: false // Connection loss is generally not recoverable
      }
    );
  }
}

module.exports = DBGpConnectionError;
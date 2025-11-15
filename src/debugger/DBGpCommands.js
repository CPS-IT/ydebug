/**
 * DBGp Commands
 * Command execution framework for DBGp protocol operations
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

const { logger } = require('../utils/Logger');
const { commandRegistry } = require('./CommandRegistry');
const DBGpTimeoutError = require('./errors/DBGpTimeoutError');
const DBGpProtocolError = require('./errors/DBGpProtocolError');
const DBGpConnectionError = require('./errors/DBGpConnectionError');

/**
 * DBGp Commands handler
 * Provides command execution framework and core DBGp command implementations
 */
class DBGpCommands {
  constructor(client) {
    this.client = client;
    this.commandTimeout = 5000; // 5 seconds default timeout
  }

  /**
     * Execute a DBGp command using the command registry
     * @param {string} commandName - Name of the command to execute
     * @param {Object} args - Command arguments
     * @param {Object} options - Execution options
     * @param {number} options.timeout - Command timeout in milliseconds
     * @returns {Promise<Object>} Parsed command response
     */
  async executeCommand(commandName, args = {}, options = {}) {
    const timeout = options.timeout || this.commandTimeout;

    logger.debug(`Executing DBGp command: ${commandName}`, args);
    const startTime = Date.now();

    try {
      // Use command registry for execution
      const result = await commandRegistry.execute(commandName, this.client, args, { timeout });
      const duration = Date.now() - startTime;

      logger.debug(`Command completed in ${duration}ms: ${commandName}`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Command failed after ${duration}ms: ${commandName} - ${error.message}`);

      // Convert to appropriate error types if not already a DBGp error
      if (error instanceof DBGpTimeoutError ||
          error instanceof DBGpConnectionError ||
          error instanceof DBGpProtocolError) {
        // Already a specific DBGp error, re-throw as is
        throw error;
      }

      // Convert generic errors to appropriate DBGp error types
      if (error.message.includes('timeout') || error.message.includes('Command timeout')) {
        throw new DBGpTimeoutError(
          `Command ${commandName} timed out after ${timeout}ms`,
          {
            code: 'COMMAND_TIMEOUT',
            context: {
              command: commandName,
              timeout,
              duration,
              originalError: error.message
            },
            cause: error
          }
        );
      }

      if (error.message.includes('not connected') || error.message.includes('Not connected')) {
        throw new DBGpConnectionError(
          `Cannot execute command ${commandName}: not connected to debugger`,
          {
            code: 'NOT_CONNECTED',
            context: {
              command: commandName,
              originalError: error.message
            },
            cause: error,
            recoverable: true
          }
        );
      }

      if (error.message.includes('connection') || error.message.includes('Connection')) {
        throw new DBGpConnectionError(
          `Connection error during command ${commandName}: ${error.message}`,
          {
            code: 'CONNECTION_ERROR',
            context: {
              command: commandName,
              duration
            },
            cause: error,
            recoverable: true
          }
        );
      }

      // Default to protocol error for other cases
      throw new DBGpProtocolError(
        `Protocol error during command ${commandName}: ${error.message}`,
        {
          code: 'COMMAND_EXECUTION_ERROR',
          context: {
            command: commandName,
            duration
          },
          cause: error,
          recoverable: false
        }
      );
    }
  }


  /**
     * Get list of available commands
     * @returns {Array<string>} Array of command names
     */
  getAvailableCommands() {
    return commandRegistry.getCommandNames();
  }

  /**
     * Check if a command is supported
     * @param {string} commandName - Name of command to check
     * @returns {boolean} True if command is supported
     */
  isCommandSupported(commandName) {
    return commandRegistry.hasCommand(commandName);
  }

  /**
     * Get command information
     * @param {string} commandName - Name of command
     * @returns {Object} Command information
     */
  getCommandInfo(commandName) {
    return commandRegistry.getCommandInfo(commandName);
  }

  // ===== Core DBGp Commands =====

  /**
     * Execute status command to get current debugger status
     * @returns {Promise<Object>} Status response
     */
  async status() {
    logger.info('Getting debugger status');

    try {
      const result = await this.executeCommand('status');
      logger.info(`Debugger status: ${result.status} ${result.reason ? `(${result.reason})` : ''}`);
      return result;
    } catch (error) {
      logger.error('Failed to get debugger status:', error.message);
      throw error;
    }
  }

  /**
     * Get debugger feature information
     * @param {string} featureName - Name of feature to query
     * @returns {Promise<Object>} Feature response
     */
  async featureGet(featureName) {
    logger.debug(`Getting feature: ${featureName}`);

    try {
      const result = await this.executeCommand('feature_get', { featureName });
      logger.debug(`Feature ${featureName}: supported=${result.supported}, value="${result.value}"`);
      return result;
    } catch (error) {
      logger.error(`Failed to get feature ${featureName}:`, error.message);
      throw error;
    }
  }

  /**
     * Set debugger feature value
     * @param {string} featureName - Name of feature to set
     * @param {string} value - Value to set
     * @returns {Promise<Object>} Set feature response
     */
  async featureSet(featureName, value) {
    logger.debug(`Setting feature ${featureName} to: ${value}`);

    try {
      const result = await this.executeCommand('feature_set', { featureName, value });
      logger.debug(`Feature set ${featureName}: success=${result.success}`);
      return result;
    } catch (error) {
      logger.error(`Failed to set feature ${featureName}:`, error.message);
      throw error;
    }
  }

  /**
     * Execute step over command for demonstration flow
     * @returns {Promise<Object>} Step response
     */
  async stepOver() {
    logger.info('Executing step over');

    try {
      const result = await this.executeCommand('step_over');
      logger.info(`Step over completed: ${result.status} ${result.reason ? `(${result.reason})` : ''}`);
      return result;
    } catch (error) {
      logger.error('Failed to execute step over:', error.message);
      throw error;
    }
  }

  /**
     * Set a breakpoint at the specified location
     * @param {string} filename - File path for the breakpoint
     * @param {number} lineno - Line number for the breakpoint
     * @param {Object} options - Additional breakpoint options
     * @param {string} options.type - Breakpoint type (default: 'line')
     * @param {string} options.state - Breakpoint state (default: 'enabled')
     * @param {boolean} options.temporary - Whether breakpoint is temporary (default: false)
     * @param {string} options.expression - Expression for conditional breakpoints
     * @returns {Promise<Object>} Breakpoint set response
     */
  async setBreakpoint(filename, lineno, options = {}) {
    logger.info(`Setting breakpoint at ${filename}:${lineno}`);

    try {
      const args = {
        type: options.type || 'line',
        filename,
        lineno,
        state: options.state || 'enabled',
        temporary: options.temporary || false,
        ...options
      };

      const result = await this.executeCommand('breakpoint_set', args);
      logger.info(`Breakpoint set successfully: ID ${result.breakpointId}, State: ${result.state}`);
      return result;
    } catch (error) {
      logger.error(`Failed to set breakpoint at ${filename}:${lineno}:`, error.message);
      throw error;
    }
  }

  /**
     * List all currently set breakpoints
     * @returns {Promise<Object>} Breakpoints list response
     */
  async listBreakpoints() {
    logger.info('Listing all breakpoints');

    try {
      const result = await this.executeCommand('breakpoint_list');
      logger.info(`Found ${result.count} breakpoints`);
      return result;
    } catch (error) {
      logger.error('Failed to list breakpoints:', error.message);
      throw error;
    }
  }

  /**
     * Get available execution contexts
     * @param {number} [depth=0] - Stack depth level
     * @returns {Promise<Object>} Available contexts
     */
  async getContextNames(depth = 0) {
    logger.info('Getting available execution contexts');
    
    try {
      const result = await this.executeCommand('context_names', { depth });
      logger.info(`Found ${result.count} available contexts`);
      return result;
    } catch (error) {
      logger.error('Failed to get context names:', error.message);
      throw error;
    }
  }

  /**
     * Get variables from specified context
     * @param {number} [contextId=0] - Context ID (0=local, 1=global, 2=class)
     * @param {number} [depth=0] - Stack depth level
     * @returns {Promise<Object>} Variables in context
     */
  async getContext(contextId = 0, depth = 0) {
    logger.info(`Getting variables from context ${contextId} at depth ${depth}`);
    
    try {
      const result = await this.executeCommand('context_get', { contextId, depth });
      logger.info(`Found ${result.count} variables in context ${contextId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to get context ${contextId}:`, error.message);
      throw error;
    }
  }

  /**
     * Get local variables (shorthand for context 0)
     * @param {number} [depth=0] - Stack depth level
     * @returns {Promise<Object>} Local variables
     */
  async getLocalVariables(depth = 0) {
    return await this.getContext(0, depth);
  }

  /**
     * Get global variables (shorthand for context 1)
     * @param {number} [depth=0] - Stack depth level
     * @returns {Promise<Object>} Global variables
     */
  async getGlobalVariables(depth = 0) {
    return await this.getContext(1, depth);
  }

  /**
     * Get class variables (shorthand for context 2)
     * @param {number} [depth=0] - Stack depth level
     * @returns {Promise<Object>} Class variables
     */
  async getClassVariables(depth = 0) {
    return await this.getContext(2, depth);
  }

  /**
     * Execute any registered command by name
     * @param {string} commandName - Name of command to execute
     * @param {Object} args - Command arguments
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Command result
     */
  async execute(commandName, args = {}, options = {}) {
    return await this.executeCommand(commandName, args, options);
  }

  /**
     * Set command timeout
     * @param {number} timeout - Timeout in milliseconds
     */
  setTimeout(timeout) {
    this.commandTimeout = timeout;
    logger.debug(`Command timeout set to ${timeout}ms`);
  }

  /**
     * Get current command timeout
     * @returns {number} Current timeout in milliseconds
     */
  getTimeout() {
    return this.commandTimeout;
  }

  /**
   * Validate transaction ID in response matches expected ID
   * @param {Object} response - Response object with transactionId
   * @param {number} expectedId - Expected transaction ID
   * @throws {DBGpProtocolError} If transaction IDs don't match
   */
  validateTransactionId(response, expectedId) {
    if (response.transactionId !== expectedId) {
      throw new DBGpProtocolError(
        `Transaction ID mismatch: expected ${expectedId}, got ${response.transactionId}`,
        {
          code: 'TRANSACTION_MISMATCH',
          context: {
            expected: expectedId,
            actual: response.transactionId
          }
        }
      );
    }
  }
}

module.exports = {
  DBGpCommands
};

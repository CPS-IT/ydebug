/**
 * Base Command Class
 * Abstract base class for all DBGp commands following Command Pattern
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

const { logger } = require('../../utils/Logger');
const DBGpProtocolError = require('../errors/DBGpProtocolError');
const { dbgpConfig } = require('../DBGpConfig');

/**
 * Abstract base class for DBGp commands
 * Defines the interface and common functionality for all command implementations
 */
class BaseCommand {
  /**
   * Create a command instance
   * @param {string} name - Command name
   * @param {string} description - Command description
   * @param {number} timeout - Command timeout in milliseconds
   */
  constructor(name, description = '', timeout = null) {
    if (new.target === BaseCommand) {
      throw new DBGpProtocolError(
        'BaseCommand is abstract and cannot be instantiated directly',
        {
          code: 'ABSTRACT_CLASS_INSTANTIATION',
          recoverable: false,
          category: 'implementation'
        }
      );
    }
    
    this.name = name;
    this.description = description;
    // Use DBGpConfig for timeout, fall back to provided value or default
    this.timeout = timeout !== null ? timeout : dbgpConfig.get('commandTimeout', 30000);
  }

  /**
   * Get the command name
   * @returns {string} Command name
   */
  getName() {
    return this.name;
  }

  /**
   * Build the command string to send to DBGp
   * Must be implemented by subclasses
   * @param {number} transactionId - Transaction ID for the command
   * @param {Object} args - Command arguments
   * @returns {string} Command string
   * @abstract
   */
  buildCommand(transactionId, _args = {}) {
    throw new DBGpProtocolError(
      `buildCommand must be implemented by ${this.constructor.name}`,
      {
        code: 'ABSTRACT_METHOD_NOT_IMPLEMENTED',
        context: {
          className: this.constructor.name,
          method: 'buildCommand'
        },
        recoverable: false,
        category: 'implementation'
      }
    );
  }

  /**
   * Parse the response from DBGp
   * Must be implemented by subclasses
   * @param {Object} response - Parsed XML response
   * @returns {Object} Processed response data
   * @abstract
   */
  parseResponse(_response) {
    throw new DBGpProtocolError(
      `parseResponse must be implemented by ${this.constructor.name}`,
      {
        code: 'ABSTRACT_METHOD_NOT_IMPLEMENTED',
        context: {
          className: this.constructor.name,
          method: 'parseResponse'
        },
        recoverable: false,
        category: 'implementation'
      }
    );
  }

  /**
   * Validate command arguments
   * Can be overridden by subclasses for custom validation
   * @param {Object} args - Command arguments
   * @throws {Error} If arguments are invalid
   */
  validateArgs(_args = {}) {
    // Base implementation - no validation
    // Subclasses can override to add specific validation
  }

  /**
   * Execute the command through the provided client
   * @param {Object} client - DBGp client instance
   * @param {Object} args - Command arguments
   * @returns {Promise<Object>} Command execution result
   */
  async execute(client, args = {}) {
    try {
      // Validate arguments
      this.validateArgs(args);
      
      // Log command execution
      logger.debug(`Executing command: ${this.name}`, args);
      
      // Get transaction ID from client's transaction manager
      const transactionId = client.transactionManager?.getNext() || Math.floor(Math.random() * 1000);
      
      // Build command string
      const commandString = this.buildCommand(transactionId, args);
      
      // Send command through client
      const rawResponse = await client.sendCommand(commandString, this.timeout);
      
      // Parse response using client's XML parser
      const parsedResponse = client.xmlParser?.parseResponse(rawResponse) || { data: rawResponse };
      
      // Process response through command's parser
      const result = this.parseResponse(parsedResponse);
      
      logger.debug(`Command ${this.name} completed successfully`);
      return result;
      
    } catch (error) {
      logger.error(`Command ${this.name} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get command timeout
   * @returns {number} Timeout in milliseconds
   */
  getTimeout() {
    return this.timeout;
  }

  /**
   * Set command timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setTimeout(timeout) {
    this.timeout = timeout;
  }

  /**
   * Get command description for help/documentation
   * Can be overridden by subclasses
   * @returns {string} Command description
   */
  getDescription() {
    return `Execute ${this.name} command`;
  }

  /**
   * Get expected arguments for this command
   * Can be overridden by subclasses
   * @returns {Object} Expected arguments schema
   */
  getExpectedArgs() {
    return {};
  }
}

module.exports = BaseCommand;
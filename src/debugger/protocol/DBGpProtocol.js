/**
 * DBGp Protocol Interface
 * Defines the protocol abstraction layer for DBGp communication
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

const MessageBuilder = require('./MessageBuilder');
const ResponseParser = require('./ResponseParser');
const { logger } = require('../../utils/Logger');

/**
 * DBGp Protocol abstraction layer
 * Provides a clean interface for DBGp protocol communication
 */
class DBGpProtocol {
  /**
   * Create a DBGp protocol instance
   * @param {Object} options - Protocol options
   * @param {string} options.version - Protocol version (default: '1.0')
   * @param {Object} options.config - Protocol configuration
   */
  constructor(options = {}) {
    this.version = options.version || '1.0';
    this.config = options.config || {};
    
    this.messageBuilder = new MessageBuilder({
      version: this.version,
      ...this.config
    });
    
    this.responseParser = new ResponseParser({
      version: this.version,
      ...this.config
    });
    
    this.supportedCommands = new Set([
      'status', 'feature_get', 'feature_set', 'run', 'step_into', 
      'step_over', 'step_out', 'stop', 'detach', 'breakpoint_get',
      'breakpoint_set', 'breakpoint_remove', 'breakpoint_update',
      'stack_get', 'stack_depth', 'context_names', 'context_get',
      'typemap_get', 'property_get', 'property_set', 'property_value',
      'source', 'stdout', 'stderr', 'eval'
    ]);
    
    logger.debug(`Initialized DBGp protocol v${this.version}`);
  }

  /**
   * Build a command message
   * @param {string} command - Command name
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments
   * @returns {string} Formatted command message
   */
  buildCommand(command, transactionId, args = {}) {
    if (!this.isCommandSupported(command)) {
      logger.warn(`Command '${command}' may not be supported by this protocol version`);
    }
    
    return this.messageBuilder.buildCommand(command, transactionId, args);
  }

  /**
   * Parse a response message
   * @param {string} response - Raw response from debugger
   * @returns {Object} Parsed response object
   */
  parseResponse(response) {
    return this.responseParser.parseResponse(response);
  }

  /**
   * Parse initialization message
   * @param {string} initMessage - Raw init message from debugger
   * @returns {Object} Parsed init data
   */
  parseInit(initMessage) {
    return this.responseParser.parseInit(initMessage);
  }

  /**
   * Check if a command is supported
   * @param {string} command - Command name to check
   * @returns {boolean} True if command is supported
   */
  isCommandSupported(command) {
    return this.supportedCommands.has(command);
  }

  /**
   * Get supported commands
   * @returns {string[]} Array of supported command names
   */
  getSupportedCommands() {
    return Array.from(this.supportedCommands).sort();
  }

  /**
   * Add support for a custom command
   * @param {string} command - Command name to add
   */
  addCommandSupport(command) {
    this.supportedCommands.add(command);
    logger.debug(`Added support for command: ${command}`);
  }

  /**
   * Remove support for a command
   * @param {string} command - Command name to remove
   * @returns {boolean} True if command was removed
   */
  removeCommandSupport(command) {
    const removed = this.supportedCommands.delete(command);
    if (removed) {
      logger.debug(`Removed support for command: ${command}`);
    }
    return removed;
  }

  /**
   * Validate command arguments
   * @param {string} command - Command name
   * @param {Object} args - Command arguments
   * @returns {boolean} True if arguments are valid
   * @throws {Error} If arguments are invalid
   */
  validateCommand(command, args = {}) {
    return this.messageBuilder.validateCommand(command, args);
  }

  /**
   * Get protocol capabilities
   * @returns {Object} Protocol capabilities
   */
  getCapabilities() {
    return {
      version: this.version,
      supportedCommands: this.getSupportedCommands(),
      maxDataSize: this.config.maxDataSize || 1024 * 1024,
      maxChildren: this.config.maxChildren || 100,
      maxDepth: this.config.maxDepth || 10,
      encoding: 'utf-8',
      supportsAsync: false, // DBGp is inherently synchronous
      supportsPostMortem: false
    };
  }

  /**
   * Create error response for invalid commands
   * @param {number} transactionId - Transaction ID
   * @param {string} errorMessage - Error message
   * @param {number} errorCode - Error code (optional)
   * @returns {string} Error response XML
   */
  createErrorResponse(transactionId, errorMessage, errorCode = 998) {
    return this.messageBuilder.createErrorResponse(transactionId, errorMessage, errorCode);
  }

  /**
   * Extract transaction ID from command
   * @param {string} command - Command string
   * @returns {number|null} Transaction ID or null if not found
   */
  extractTransactionId(command) {
    return this.messageBuilder.extractTransactionId(command);
  }

  /**
   * Extract transaction ID from response
   * @param {string|Object} response - Response string or parsed object
   * @returns {number|null} Transaction ID or null if not found
   */
  extractResponseTransactionId(response) {
    return this.responseParser.extractTransactionId(response);
  }

  /**
   * Check if response indicates an error
   * @param {Object} parsedResponse - Parsed response object
   * @returns {Error|null} Error object if response contains error, null otherwise
   */
  checkResponseError(parsedResponse) {
    return this.responseParser.checkError(parsedResponse);
  }

  /**
   * Format data for transmission
   * @param {*} data - Data to format
   * @param {string} encoding - Encoding type (default: 'base64')
   * @returns {string} Formatted data
   */
  formatData(data, encoding = 'base64') {
    return this.messageBuilder.formatData(data, encoding);
  }

  /**
   * Parse data from response
   * @param {string} data - Encoded data
   * @param {string} encoding - Encoding type (default: 'base64')
   * @returns {*} Parsed data
   */
  parseData(data, encoding = 'base64') {
    return this.responseParser.parseData(data, encoding);
  }

  /**
   * Get protocol statistics
   * @returns {Object} Protocol statistics
   */
  getStats() {
    return {
      version: this.version,
      supportedCommandCount: this.supportedCommands.size,
      messageBuilderStats: this.messageBuilder.getStats(),
      responseParserStats: this.responseParser.getStats()
    };
  }

  /**
   * Update protocol configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.messageBuilder.updateConfig(this.config);
    this.responseParser.updateConfig(this.config);
    
    logger.debug('Updated protocol configuration', Object.keys(newConfig));
  }
}

module.exports = DBGpProtocol;
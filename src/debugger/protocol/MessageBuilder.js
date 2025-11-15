/**
 * DBGp Message Builder
 * Handles construction of DBGp command messages
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

/**
 * Message Builder for DBGp commands
 * Constructs properly formatted command messages for the DBGp protocol
 */
class MessageBuilder {
  /**
   * Create a message builder instance
   * @param {Object} options - Builder options
   * @param {string} options.version - Protocol version
   * @param {string} options.encoding - Default encoding for data
   */
  constructor(options = {}) {
    this.version = options.version || '1.0';
    this.encoding = options.encoding || 'base64';
    this.stats = {
      commandsBuilt: 0,
      errorsCreated: 0
    };
  }

  /**
   * Build a command message
   * @param {string} command - Command name
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments
   * @returns {string} Formatted command string
   */
  buildCommand(command, transactionId, args = {}) {
    const commandParts = [command, `-i ${transactionId}`];
    
    // Add command-specific arguments
    switch (command) {
    case 'feature_get':
      if (args.featureName) {
        commandParts.push(`-n ${this._escapeArgument(args.featureName)}`);
      }
      break;
        
    case 'feature_set':
      if (args.featureName) {
        commandParts.push(`-n ${this._escapeArgument(args.featureName)}`);
      }
      if (args.value !== undefined) {
        commandParts.push(`-v ${this._escapeArgument(args.value)}`);
      }
      break;
        
    case 'breakpoint_set':
      if (args.type) {
        commandParts.push(`-t ${this._escapeArgument(args.type)}`);
      }
      if (args.filename) {
        commandParts.push(`-f ${this._escapeArgument(args.filename)}`);
      }
      if (args.lineno) {
        commandParts.push(`-n ${args.lineno}`);
      }
      if (args.state) {
        commandParts.push(`-s ${this._escapeArgument(args.state)}`);
      }
      if (args.temporary) {
        commandParts.push('-r 1');
      }
      if (args.expression) {
        commandParts.push(`-- ${this._encodeData(args.expression)}`);
      }
      break;
        
    case 'breakpoint_remove':
    case 'breakpoint_update':
      if (args.breakpointId) {
        commandParts.push(`-d ${args.breakpointId}`);
      }
      break;
        
    case 'stack_get':
      if (args.depth !== undefined) {
        commandParts.push(`-d ${args.depth}`);
      }
      break;
        
    case 'context_get':
      if (args.depth !== undefined) {
        commandParts.push(`-d ${args.depth}`);
      }
      if (args.contextId !== undefined) {
        commandParts.push(`-c ${args.contextId}`);
      }
      break;
        
    case 'property_get':
      if (args.name) {
        commandParts.push(`-n ${this._escapeArgument(args.name)}`);
      }
      if (args.depth !== undefined) {
        commandParts.push(`-d ${args.depth}`);
      }
      if (args.contextId !== undefined) {
        commandParts.push(`-c ${args.contextId}`);
      }
      if (args.page !== undefined) {
        commandParts.push(`-p ${args.page}`);
      }
      if (args.maxDataSize !== undefined) {
        commandParts.push(`-m ${args.maxDataSize}`);
      }
      break;
        
    case 'property_set':
      if (args.name) {
        commandParts.push(`-n ${this._escapeArgument(args.name)}`);
      }
      if (args.depth !== undefined) {
        commandParts.push(`-d ${args.depth}`);
      }
      if (args.contextId !== undefined) {
        commandParts.push(`-c ${args.contextId}`);
      }
      if (args.type) {
        commandParts.push(`-t ${this._escapeArgument(args.type)}`);
      }
      if (args.value !== undefined) {
        commandParts.push(`-- ${this._encodeData(args.value)}`);
      }
      break;
        
    case 'source':
      if (args.filename) {
        commandParts.push(`-f ${this._escapeArgument(args.filename)}`);
      }
      if (args.beginLine !== undefined) {
        commandParts.push(`-b ${args.beginLine}`);
      }
      if (args.endLine !== undefined) {
        commandParts.push(`-e ${args.endLine}`);
      }
      break;
        
    case 'eval':
      if (args.expression) {
        commandParts.push(`-- ${this._encodeData(args.expression)}`);
      }
      break;
        
      // Commands with no additional arguments
    case 'status':
    case 'run':
    case 'step_into':
    case 'step_over':
    case 'step_out':
    case 'stop':
    case 'detach':
    case 'stack_depth':
    case 'context_names':
    case 'typemap_get':
      // No additional arguments needed
      break;
        
    default:
      logger.warn(`Unknown command: ${command}, using basic format`);
      // For unknown commands, add generic arguments
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) {
          commandParts.push(`-${key} ${this._escapeArgument(value)}`);
        }
      }
      break;
    }
    
    const commandString = commandParts.join(' ');
    this.stats.commandsBuilt++;
    
    logger.debug(`Built command: ${commandString}`);
    return commandString;
  }

  /**
   * Create an error response
   * @param {number} transactionId - Transaction ID
   * @param {string} message - Error message
   * @param {number} code - Error code
   * @returns {string} Error response XML
   */
  createErrorResponse(transactionId, message, code = 998) {
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<response xmlns="urn:debugger_protocol_v1" 
          command="error" 
          transaction_id="${transactionId}">
  <error code="${code}" apperr="4">
    <message><![CDATA[${message}]]></message>
  </error>
</response>`;
    
    this.stats.errorsCreated++;
    return errorXml;
  }

  /**
   * Validate command arguments
   * @param {string} command - Command name
   * @param {Object} args - Command arguments
   * @returns {boolean} True if valid
   * @throws {Error} If arguments are invalid
   */
  validateCommand(command, args = {}) {
    switch (command) {
    case 'feature_get':
      if (!args.featureName) {
        throw new Error('feature_get requires featureName argument');
      }
      break;
        
    case 'feature_set':
      if (!args.featureName) {
        throw new Error('feature_set requires featureName argument');
      }
      if (args.value === undefined) {
        throw new Error('feature_set requires value argument');
      }
      break;
        
    case 'breakpoint_set':
      if (!args.type) {
        throw new Error('breakpoint_set requires type argument');
      }
      if (args.type === 'line' && (!args.filename || args.lineno === undefined)) {
        throw new Error('Line breakpoint requires filename and lineno arguments');
      }
      break;
        
    case 'breakpoint_remove':
    case 'breakpoint_update':
      if (!args.breakpointId) {
        throw new Error(`${command} requires breakpointId argument`);
      }
      break;
        
    case 'property_get':
      if (!args.name) {
        throw new Error('property_get requires name argument');
      }
      break;
        
    case 'property_set':
      if (!args.name) {
        throw new Error('property_set requires name argument');
      }
      if (args.value === undefined) {
        throw new Error('property_set requires value argument');
      }
      break;
        
    case 'eval':
      if (!args.expression) {
        throw new Error('eval requires expression argument');
      }
      break;
    }
    
    return true;
  }

  /**
   * Extract transaction ID from command string
   * @param {string} command - Command string
   * @returns {number|null} Transaction ID or null
   */
  extractTransactionId(command) {
    const match = command.match(/-i\s+(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Format data for transmission
   * @param {*} data - Data to format
   * @param {string} encoding - Encoding type
   * @returns {string} Formatted data
   */
  formatData(data, encoding = this.encoding) {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    
    switch (encoding) {
    case 'base64':
      return Buffer.from(stringData, 'utf8').toString('base64');
    case 'urlencode':
      return encodeURIComponent(stringData);
    case 'none':
    default:
      return stringData;
    }
  }

  /**
   * Encode data for command arguments
   * @param {*} data - Data to encode
   * @returns {string} Encoded data
   * @private
   */
  _encodeData(data) {
    return this.formatData(data, this.encoding);
  }

  /**
   * Escape command argument
   * @param {string} arg - Argument to escape
   * @returns {string} Escaped argument
   * @private
   */
  _escapeArgument(arg) {
    const stringArg = String(arg);
    
    // If argument contains spaces or special characters, quote it
    if (/[\s"'\\]/.test(stringArg)) {
      return `"${stringArg.replace(/[\\"]/g, '\\$&')}"`;
    }
    
    return stringArg;
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.encoding) {
      this.encoding = config.encoding;
    }
  }

  /**
   * Get builder statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats.commandsBuilt = 0;
    this.stats.errorsCreated = 0;
  }
}

module.exports = MessageBuilder;
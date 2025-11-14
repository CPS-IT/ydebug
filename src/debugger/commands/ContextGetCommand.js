/**
 * Context Get Command
 * Implements the context_get DBGp command for retrieving variable context
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

const BaseCommand = require('./BaseCommand');
const { logger } = require('../../utils/Logger');

/**
 * Context Get Command implementation
 * Retrieves variables from a specific context (local, global, class)
 */
class ContextGetCommand extends BaseCommand {
  /**
   * Create a ContextGetCommand instance
   */
  constructor() {
    super('context_get', 'Get variables from specified context');
  }

  /**
   * Build the context_get command string
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments
   * @param {number} [args.contextId=0] - Context ID to retrieve
   * @param {number} [args.depth=0] - Stack depth level
   * @returns {string} Command string
   */
  buildCommand(transactionId, args = {}) {
    const contextId = args.contextId !== undefined ? args.contextId : 0;
    const depth = args.depth !== undefined ? args.depth : 0;

    let command = `context_get -i ${transactionId}`;

    // Add context ID
    command += ` -c ${contextId}`;

    // Add stack depth if specified
    if (depth !== 0) {
      command += ` -d ${depth}`;
    }

    return command;
  }

  /**
   * Parse context_get response
   * @param {Object} response - Parsed XML response
   * @returns {Object} Processed context data with variables
   */
  parseResponse(response) {
    logger.debug('Parsing context_get response');

    // Check for errors first
    if (response.error) {
      throw new Error(`Context get failed: ${response.error.message || 'Unknown error'}`);
    }

    const variables = [];
    const contextId = response.$ && response.$.contextId ? parseInt(response.$.contextId, 10) : 0;

    // Handle property elements (variables)
    if (response.property) {
      const properties = Array.isArray(response.property) 
        ? response.property 
        : [response.property];

      for (const prop of properties) {
        if (prop) {
          // Parse each variable using the existing parseProperty logic
          const variable = this.parseVariable(prop);
          if (variable) {
            variables.push(variable);
          }
        }
      }
    }

    const result = {
      contextId,
      variables,
      count: variables.length,
      success: true
    };

    logger.debug(`Found ${variables.length} variables in context ${contextId}`);

    return result;
  }

  /**
   * Parse individual variable from property element
   * @param {Object} property - Property element from XML
   * @returns {Object} Parsed variable data
   */
  parseVariable(property) {
    if (!property) return null;

    const attrs = property.$ || {};
    const variable = {
      name: attrs.name || null,
      fullname: attrs.fullname || attrs.name || null,
      type: attrs.type || 'undefined',
      classname: attrs.classname || null,
      constant: attrs.constant === '1',
      children: attrs.children ? parseInt(attrs.children, 10) : 0,
      size: attrs.size ? parseInt(attrs.size, 10) : 0,
      encoding: attrs.encoding || 'base64',
      numchildren: attrs.numchildren ? parseInt(attrs.numchildren, 10) : 0,
      value: null,
      hasChildren: false,
      properties: []
    };

    // Parse value based on encoding
    if (property._) {
      variable.value = this.parseValue(property._, variable.encoding);
    }

    // Handle child properties for complex types
    variable.hasChildren = variable.numchildren > 0 || variable.children > 0;
    if (property.property && variable.hasChildren) {
      const childProperties = Array.isArray(property.property) 
        ? property.property 
        : [property.property];
      
      variable.properties = childProperties
        .map(child => this.parseVariable(child))
        .filter(Boolean);
    }

    return variable;
  }

  /**
   * Parse variable value with proper encoding handling
   * @param {string} rawValue - Raw value from XML
   * @param {string} encoding - Value encoding (base64, none, etc.)
   * @returns {*} Parsed value
   */
  parseValue(rawValue, encoding = 'base64') {
    if (!rawValue) return null;

    try {
      switch (encoding) {
      case 'base64':
        // Validate base64 format before decoding
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(rawValue)) {
          logger.warn(`Invalid base64 format: ${rawValue.substring(0, 20)}...`);
          return rawValue; // Return raw value if invalid format
        }
        return Buffer.from(rawValue, 'base64').toString('utf8');
      case 'none':
        return rawValue;
      case 'urlencode':
        return decodeURIComponent(rawValue);
      default:
        logger.warn(`Unknown encoding: ${encoding}, treating as base64`);
        // Apply same base64 validation for unknown encodings
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(rawValue)) {
          return rawValue; // Return raw value if invalid format
        }
        return Buffer.from(rawValue, 'base64').toString('utf8');
      }
    } catch (error) {
      logger.warn(`Failed to parse value with encoding '${encoding}':`, error.message);
      return rawValue; // Return raw value if parsing fails
    }
  }

  /**
   * Validate context_get arguments
   * @param {Object} args - Arguments to validate
   */
  validateArgs(args = {}) {
    // contextId is optional, defaults to 0 (local variables)
    if (args.contextId !== undefined) {
      if (!Number.isInteger(args.contextId) || args.contextId < 0) {
        throw new Error('contextId must be a non-negative integer');
      }
    }

    // depth is optional, defaults to 0 (current stack frame)
    if (args.depth !== undefined) {
      if (!Number.isInteger(args.depth) || args.depth < 0) {
        throw new Error('depth must be a non-negative integer');
      }
    }
  }

  /**
   * Get command description for help
   * @returns {string} Command description
   */
  getDescription() {
    return 'Retrieve variables from the specified execution context (local, global, class)';
  }

  /**
   * Get expected arguments schema
   * @returns {Object} Expected arguments
   */
  getExpectedArgs() {
    return {
      contextId: {
        type: 'number',
        description: 'Context ID (0=local, 1=global, 2=class)',
        required: false,
        default: 0
      },
      depth: {
        type: 'number',
        description: 'Stack frame depth (0=current frame)',
        required: false,
        default: 0
      }
    };
  }
}

module.exports = ContextGetCommand;
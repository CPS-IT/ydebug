/**
 * Context Names Command
 * Implements the context_names DBGp command for retrieving available contexts
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
 * Context Names Command implementation
 * Retrieves the list of available execution contexts
 */
class ContextNamesCommand extends BaseCommand {
  /**
   * Create a ContextNamesCommand instance
   */
  constructor() {
    super('context_names', 'Get list of available execution contexts');
  }

  /**
   * Build the context_names command string
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments
   * @param {number} [args.depth=0] - Stack depth level
   * @returns {string} Command string
   */
  buildCommand(transactionId, args = {}) {
    const depth = args.depth !== undefined ? args.depth : 0;

    let command = `context_names -i ${transactionId}`;

    // Add stack depth if specified
    if (depth !== 0) {
      command += ` -d ${depth}`;
    }

    return command;
  }

  /**
   * Parse context_names response
   * @param {Object} response - Parsed XML response
   * @returns {Object} Processed contexts data
   */
  parseResponse(response) {
    logger.debug('Parsing context_names response');

    // Check for errors first
    if (response.error) {
      throw new Error(`Context names failed: ${response.error.message || 'Unknown error'}`);
    }

    const contexts = [];

    // Handle context elements
    if (response.context) {
      const contextElements = Array.isArray(response.context)
        ? response.context
        : [response.context];

      for (const ctx of contextElements) {
        if (ctx && ctx.$) {
          const context = {
            id: ctx.$.id ? parseInt(ctx.$.id, 10) : null,
            name: ctx.$.name || 'unknown',
            description: this.getContextDescription(ctx.$.name, ctx.$.id)
          };
          contexts.push(context);
        }
      }
    }

    // Sort contexts by ID for consistent ordering
    contexts.sort((a, b) => (a.id || 0) - (b.id || 0));

    const result = {
      contexts,
      count: contexts.length,
      success: true
    };

    logger.debug(`Found ${contexts.length} available contexts`);

    return result;
  }

  /**
   * Get human-readable description for context
   * @param {string} name - Context name
   * @param {string|number} id - Context ID
   * @returns {string} Context description
   */
  getContextDescription(name, id) {
    // Handle null/undefined IDs explicitly
    if (id === null || id === undefined) {
      return `Context ID ${id}`;
    }
    
    const contextId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    // Standard DBGp context mappings
    switch (contextId) {
    case 0:
      return 'Local variables in current function scope';
    case 1:
      return 'Global variables and superglobals ($_GET, $_POST, etc.)';
    case 2:
      return 'Class variables and object properties';
    default:
      if (name) {
        return `${name} context`;
      }
      return `Context ID ${contextId}`;
    }
  }

  /**
   * Validate context_names arguments
   * @param {Object} args - Arguments to validate
   */
  validateArgs(args = {}) {
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
    return 'Get list of available execution contexts for variable inspection';
  }

  /**
   * Get expected arguments schema
   * @returns {Object} Expected arguments
   */
  getExpectedArgs() {
    return {
      depth: {
        type: 'number',
        description: 'Stack frame depth (0=current frame)',
        required: false,
        default: 0
      }
    };
  }
}

module.exports = ContextNamesCommand;
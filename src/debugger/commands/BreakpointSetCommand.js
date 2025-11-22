/**
 * Breakpoint Set Command
 * Implements the breakpoint_set DBGp command for setting breakpoints
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
 * Breakpoint Set Command implementation
 * Sets breakpoints in the target application
 */
class BreakpointSetCommand extends BaseCommand {
  /**
   * Create a BreakpointSetCommand instance
   */
  constructor() {
    super('breakpoint_set', 'Set a breakpoint at specified location');
  }

  /**
   * Build the breakpoint_set command string
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments
   * @param {string} args.type - Breakpoint type (line, call, return, exception, conditional, watch)
   * @param {string} args.filename - File path for the breakpoint
   * @param {number} args.lineno - Line number for line breakpoints
   * @param {string} args.function - Function name for call/return breakpoints
   * @param {string} args.exception - Exception name for exception breakpoints
   * @param {string} args.expression - Expression for conditional/watch breakpoints
   * @param {string} args.state - Breakpoint state (enabled, disabled)
   * @param {boolean} args.temporary - Whether breakpoint is temporary
   * @param {number} args.hitValue - Hit count value
   * @param {string} args.hitCondition - Hit condition (>=, ==, %)
   * @returns {string} Command string
   */
  buildCommand(transactionId, args = {}) {
    // Set defaults
    const type = args.type || 'line';
    const state = args.state || 'enabled';
    const temporary = args.temporary ? '1' : '0';

    let command = `breakpoint_set -i ${transactionId} -t ${type}`;

    // Add filename for line, call, return breakpoints
    if (args.filename && (type === 'line' || type === 'call' || type === 'return')) {
      // Convert filename to proper file:// URI if not already formatted
      let fileUri = args.filename;
      if (!fileUri.startsWith('file://')) {
        // Ensure it starts with / for absolute paths
        if (!fileUri.startsWith('/')) {
          fileUri = '/' + fileUri;
        }
        fileUri = 'file://' + fileUri;
      }
      command += ` -f ${fileUri}`;
    }

    // Add line number for line breakpoints
    if (args.lineno && type === 'line') {
      command += ` -n ${args.lineno}`;
    }

    // Add function name for call/return breakpoints
    if (args.function && (type === 'call' || type === 'return')) {
      command += ` -m ${args.function}`;
    }

    // Add exception name for exception breakpoints
    if (args.exception && type === 'exception') {
      command += ` -x ${args.exception}`;
    }

    // Add state if not default
    if (state !== 'enabled') {
      command += ` -s ${state}`;
    }

    // Add temporary flag
    command += ` -r ${temporary}`;

    // Add hit condition if specified
    if (args.hitValue && args.hitCondition) {
      command += ` -h ${args.hitValue} -o ${args.hitCondition}`;
    }

    // Add expression for conditional/watch breakpoints (base64 encoded)
    if (args.expression && (type === 'conditional' || type === 'watch')) {
      const encodedExpression = Buffer.from(args.expression).toString('base64');
      command += ` -- ${encodedExpression}`;
    }

    return command;
  }

  /**
   * Parse breakpoint_set response
   * @param {Object} response - Parsed XML response
   * @returns {Object} Processed breakpoint data
   */
  parseResponse(response) {
    logger.debug('Parsing breakpoint_set response');

    // Check for errors first
    if (response.error) {
      throw new Error(`Breakpoint set failed: ${response.error.message || 'Unknown error'}`);
    }

    // Extract breakpoint ID from response attributes
    const breakpointId = response.$ && response.$.id;
    const state = response.$ && response.$.state;

    if (!breakpointId) {
      throw new Error('Invalid breakpoint response: missing breakpoint ID');
    }

    const result = {
      breakpointId,
      state: state || 'enabled',
      success: true
    };

    logger.debug(`Breakpoint set successfully: ID ${breakpointId}, State: ${result.state}`);

    return result;
  }

  /**
   * Validate breakpoint_set arguments
   * @param {Object} args - Arguments to validate
   * @throws {Error} If arguments are invalid
   */
  validateArgs(args = {}) {
    const type = args.type || 'line';

    // Validate breakpoint type
    const validTypes = ['line', 'call', 'return', 'exception', 'conditional', 'watch'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid breakpoint type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Type-specific validation
    switch (type) {
    case 'line':
      if (!args.filename) {
        throw new Error('Line breakpoints require filename argument');
      }
      if (!args.lineno || args.lineno <= 0) {
        throw new Error('Line breakpoints require valid line number (lineno > 0)');
      }
      break;

    case 'call':
    case 'return':
      if (!args.function && !args.filename) {
        throw new Error(`${type} breakpoints require either function or filename argument`);
      }
      break;

    case 'exception':
      if (!args.exception) {
        throw new Error('Exception breakpoints require exception argument');
      }
      break;

    case 'conditional':
    case 'watch':
      if (!args.expression) {
        throw new Error(`${type} breakpoints require expression argument`);
      }
      break;
    }

    // Validate hit condition
    if (args.hitValue !== undefined || args.hitCondition !== undefined) {
      if (!args.hitValue || !args.hitCondition) {
        throw new Error('Hit conditions require both hitValue and hitCondition');
      }

      const validConditions = ['>=', '==', '%'];
      if (!validConditions.includes(args.hitCondition)) {
        throw new Error(`Invalid hit condition: ${args.hitCondition}. Must be one of: ${validConditions.join(', ')}`);
      }

      if (typeof args.hitValue !== 'number' || args.hitValue <= 0) {
        throw new Error('Hit value must be a positive number');
      }
    }

    // Validate state
    if (args.state) {
      const validStates = ['enabled', 'disabled'];
      if (!validStates.includes(args.state)) {
        throw new Error(`Invalid breakpoint state: ${args.state}. Must be one of: ${validStates.join(', ')}`);
      }
    }
  }

  /**
   * Get command description for help
   * @returns {string} Command description
   */
  getDescription() {
    return 'Set a breakpoint at the specified location in the target application';
  }

  /**
   * Get expected arguments schema
   * @returns {Object} Expected arguments
   */
  getExpectedArgs() {
    return {
      type: {
        type: 'string',
        description: 'Breakpoint type (line, call, return, exception, conditional, watch)',
        default: 'line',
        required: false
      },
      filename: {
        type: 'string',
        description: 'File path for the breakpoint',
        required: true
      },
      lineno: {
        type: 'number',
        description: 'Line number for line breakpoints',
        required: true
      },
      function: {
        type: 'string',
        description: 'Function name for call/return breakpoints',
        required: false
      },
      exception: {
        type: 'string',
        description: 'Exception name for exception breakpoints',
        required: false
      },
      expression: {
        type: 'string',
        description: 'Expression for conditional/watch breakpoints',
        required: false
      },
      state: {
        type: 'string',
        description: 'Breakpoint state (enabled, disabled)',
        default: 'enabled',
        required: false
      },
      temporary: {
        type: 'boolean',
        description: 'Whether breakpoint is temporary',
        default: false,
        required: false
      },
      hitValue: {
        type: 'number',
        description: 'Hit count value',
        required: false
      },
      hitCondition: {
        type: 'string',
        description: 'Hit condition (>=, ==, %)',
        required: false
      }
    };
  }
}

module.exports = BreakpointSetCommand;

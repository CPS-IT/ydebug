/**
 * Breakpoint List Command
 * Implements the breakpoint_list DBGp command for listing breakpoints
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
 * Breakpoint List Command implementation
 * Lists all currently set breakpoints
 */
class BreakpointListCommand extends BaseCommand {
  /**
   * Create a BreakpointListCommand instance
   */
  constructor() {
    super('breakpoint_list', 'List all current breakpoints');
  }

  /**
   * Build the breakpoint_list command string
   * @param {number} transactionId - Transaction ID
   * @param {Object} _args - Command arguments (none for breakpoint_list)
   * @returns {string} Command string
   */
  buildCommand(transactionId, _args = {}) {
    return `breakpoint_list -i ${transactionId}`;
  }

  /**
   * Parse breakpoint_list response
   * @param {Object} response - Parsed XML response
   * @returns {Object} Processed breakpoints data
   */
  parseResponse(response) {
    logger.debug('Parsing breakpoint_list response');

    // Check for errors first
    if (response.error) {
      throw new Error(`Breakpoint list failed: ${response.error.message || 'Unknown error'}`);
    }

    const breakpoints = [];

    // Handle breakpoint elements
    if (response.breakpoint) {
      const breakpointElements = Array.isArray(response.breakpoint)
        ? response.breakpoint
        : [response.breakpoint];

      for (const bp of breakpointElements) {
        const breakpoint = {
          id: bp.$ && bp.$.id,
          type: bp.$ && bp.$.type,
          state: bp.$ && bp.$.state || 'enabled',
          filename: bp.$ && bp.$.filename,
          lineno: bp.$ && bp.$.lineno ? parseInt(bp.$.lineno, 10) : null,
          function: bp.$ && bp.$.function,
          exception: bp.$ && bp.$.exception,
          hitValue: bp.$ && bp.$.hit_value ? parseInt(bp.$.hit_value, 10) : null,
          hitCondition: bp.$ && bp.$.hit_condition,
          hitCount: bp.$ && bp.$.hit_count ? parseInt(bp.$.hit_count, 10) : 0,
          temporary: bp.$ && bp.$.temporary === '1'
        };

        // Parse expression if present (base64 encoded)
        if (bp.expression) {
          try {
            breakpoint.expression = Buffer.from(bp.expression, 'base64').toString('utf8');
          } catch (error) {
            logger.warn('Failed to decode breakpoint expression:', error.message);
            breakpoint.expression = bp.expression; // Keep raw if decode fails
          }
        }

        breakpoints.push(breakpoint);
      }
    }

    const result = {
      breakpoints,
      count: breakpoints.length,
      success: true
    };

    logger.debug(`Found ${breakpoints.length} breakpoints`);

    return result;
  }

  /**
   * Validate breakpoint_list arguments
   * @param {Object} _args - Arguments to validate (none required)
   */
  validateArgs(_args = {}) {
    // No arguments required for breakpoint_list
  }

  /**
   * Get command description for help
   * @returns {string} Command description
   */
  getDescription() {
    return 'List all currently set breakpoints in the target application';
  }

  /**
   * Get expected arguments schema
   * @returns {Object} Expected arguments (none)
   */
  getExpectedArgs() {
    return {};
  }
}

module.exports = BreakpointListCommand;

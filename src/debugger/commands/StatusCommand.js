/**
 * Status Command Implementation
 * Handles DBGp status command execution
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

/**
 * Status command implementation
 * Gets the current status of the debugging session
 */
class StatusCommand extends BaseCommand {
  /**
   * Create a status command instance
   * @param {Object} options - Command options
   */
  constructor(options = {}) {
    super('status', options);
  }

  /**
   * Build the status command string
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments (unused for status)
   * @returns {string} Command string
   */
  buildCommand(transactionId, _args = {}) {
    return `status -i ${transactionId}`;
  }

  /**
   * Parse status command response
   * @param {Object} response - Parsed XML response
   * @returns {Object} Status information
   */
  parseResponse(response) {
    if (!response || !response.$) {
      throw new Error('Invalid status response format');
    }

    const attributes = response.$;
    
    return {
      status: attributes.status || 'unknown',
      reason: attributes.reason || '',
      transactionId: attributes.transaction_id,
      command: attributes.command,
      isRunning: attributes.status === 'running',
      isBreak: attributes.status === 'break',
      isStopped: attributes.status === 'stopped',
    };
  }

  /**
   * Validate status command arguments
   * @param {Object} args - Command arguments
   */
  validateArgs(_args = {}) {
    // Status command requires no arguments
    // This is just for demonstration of validation pattern
  }

  /**
   * Get command description
   * @returns {string} Description
   */
  getDescription() {
    return 'Get the current status of the debugging session';
  }

  /**
   * Get expected arguments
   * @returns {Object} Expected arguments schema
   */
  getExpectedArgs() {
    return {}; // No arguments expected
  }
}

module.exports = StatusCommand;
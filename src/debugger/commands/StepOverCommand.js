/**
 * Step Over Command Implementation
 * Handles DBGp step_over command execution
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
 * Step Over command implementation
 * Executes the current line and stops at the next line in the same context
 */
class StepOverCommand extends BaseCommand {
  /**
   * Create a step over command instance
   * @param {Object} options - Command options
   */
  constructor(options = {}) {
    super('step_over', options);
  }

  /**
   * Build the step_over command string
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments (unused for step_over)
   * @returns {string} Command string
   */
  buildCommand(transactionId, _args = {}) {
    return `step_over -i ${transactionId}`;
  }

  /**
   * Parse step_over command response
   * @param {Object} response - Parsed XML response
   * @returns {Object} Step execution result
   */
  parseResponse(response) {
    if (!response || !response.$) {
      throw new Error('Invalid step_over response format');
    }

    const attributes = response.$;
    
    // Step commands can result in different statuses
    const status = attributes.status || 'unknown';
    const reason = attributes.reason || '';
    
    return {
      status: status,
      reason: reason,
      transactionId: attributes.transaction_id,
      command: attributes.command,
      // Status interpretation
      isBreak: status === 'break',
      isRunning: status === 'running', 
      isStopped: status === 'stopped',
      isEnded: status === 'stopped' && reason === 'ok',
      // Additional context
      message: this._getStatusMessage(status, reason),
      canContinue: status === 'break'
    };
  }

  /**
   * Get human-readable status message
   * @param {string} status - DBGp status
   * @param {string} reason - DBGp reason
   * @returns {string} Status message
   * @private
   */
  _getStatusMessage(status, reason) {
    switch (status) {
    case 'break':
      return 'Execution paused at breakpoint or after step';
    case 'running':
      return 'Execution is continuing';
    case 'stopped':
      return reason === 'ok' ? 'Program execution completed' : 'Program execution stopped';
    default:
      return `Execution status: ${status}`;
    }
  }

  /**
   * Validate step_over command arguments
   * @param {Object} args - Command arguments
   */
  validateArgs(_args = {}) {
    // Step over command requires no arguments
    // This is just for demonstration of validation pattern
  }

  /**
   * Get command description
   * @returns {string} Description
   */
  getDescription() {
    return 'Execute the current line and stop at the next line in the same context';
  }

  /**
   * Get expected arguments
   * @returns {Object} Expected arguments schema
   */
  getExpectedArgs() {
    return {}; // No arguments expected
  }
}

module.exports = StepOverCommand;
/**
 * Feature Set Command Implementation
 * Handles DBGp feature_set command execution
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
 * Feature Set command implementation
 * Sets the value of a specific DBGp feature
 */
class FeatureSetCommand extends BaseCommand {
  /**
   * Create a feature set command instance
   * @param {Object} options - Command options
   */
  constructor(options = {}) {
    super('feature_set', options);
  }

  /**
   * Build the feature_set command string
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments
   * @param {string} args.featureName - Name of the feature to set
   * @param {string} args.value - Value to set for the feature
   * @returns {string} Command string
   */
  buildCommand(transactionId, args = {}) {
    const { featureName, value } = args;
    return `feature_set -i ${transactionId} -n ${featureName} -v ${value}`;
  }

  /**
   * Parse feature_set command response
   * @param {Object} response - Parsed XML response
   * @returns {Object} Feature set result
   */
  parseResponse(response) {
    if (!response || !response.$) {
      throw new Error('Invalid feature_set response format');
    }

    const attributes = response.$;
    
    // Check if the feature was successfully set
    const success = attributes.success === '1' || attributes.success === 'true' || !attributes.success;
    
    return {
      featureName: attributes.feature_name || attributes.name,
      success: success,
      transactionId: attributes.transaction_id,
      command: attributes.command,
      // Additional context
      message: success ? 'Feature set successfully' : 'Failed to set feature',
      error: success ? null : attributes.error || 'Unknown error occurred'
    };
  }

  /**
   * Validate feature_set command arguments
   * @param {Object} args - Command arguments
   * @throws {Error} If arguments are invalid
   */
  validateArgs(args = {}) {
    if (!args.featureName || typeof args.featureName !== 'string') {
      throw new Error('featureName is required and must be a string');
    }

    if (args.featureName.trim() === '') {
      throw new Error('featureName cannot be empty');
    }

    if (args.value === undefined || args.value === null) {
      throw new Error('value is required');
    }

    // Convert value to string for the command
    args.value = String(args.value);
  }

  /**
   * Get command description
   * @returns {string} Description
   */
  getDescription() {
    return 'Set the value of a specific DBGp feature';
  }

  /**
   * Get expected arguments
   * @returns {Object} Expected arguments schema
   */
  getExpectedArgs() {
    return {
      featureName: {
        type: 'string',
        required: true,
        description: 'Name of the feature to set',
        examples: ['max_children', 'max_data', 'max_depth']
      },
      value: {
        type: 'string|number|boolean',
        required: true,
        description: 'Value to set for the feature',
        examples: ['100', 'true', '0']
      }
    };
  }
}

module.exports = FeatureSetCommand;
/**
 * Feature Get Command Implementation
 * Handles DBGp feature_get command execution
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
const DBGpProtocolError = require('../errors/DBGpProtocolError');

/**
 * Feature Get command implementation
 * Retrieves the value of a specific DBGp feature
 */
class FeatureGetCommand extends BaseCommand {
  /**
   * Create a feature get command instance
   * @param {Object} options - Command options
   */
  constructor(options = {}) {
    super('feature_get', options);
  }

  /**
   * Build the feature_get command string
   * @param {number} transactionId - Transaction ID
   * @param {Object} args - Command arguments
   * @param {string} args.featureName - Name of the feature to get
   * @returns {string} Command string
   */
  buildCommand(transactionId, args = {}) {
    const { featureName } = args;
    return `feature_get -i ${transactionId} -n ${featureName}`;
  }

  /**
   * Parse feature_get command response
   * @param {Object} response - Parsed XML response
   * @returns {Object} Feature information
   */
  parseResponse(response) {
    if (!response || !response.$) {
      throw new DBGpProtocolError(
        'Invalid feature_get response format',
        {
          code: 'INVALID_RESPONSE_FORMAT',
          context: {
            command: 'feature_get',
            response: response
          },
          recoverable: false,
          category: 'protocol'
        }
      );
    }

    const attributes = response.$;
    
    // Handle both supported and unsupported features
    const isSupported = attributes.supported === '1' || attributes.supported === 'true';
    const featureValue = response._ || attributes.value || '';

    return {
      featureName: attributes.feature_name || attributes.name,
      supported: isSupported,
      value: featureValue,
      transactionId: attributes.transaction_id,
      command: attributes.command,
      // Additional metadata
      isEnabled: featureValue === '1' || featureValue === 'true',
      rawValue: featureValue,
    };
  }

  /**
   * Validate feature_get command arguments
   * @param {Object} args - Command arguments
   * @throws {Error} If arguments are invalid
   */
  validateArgs(args = {}) {
    if (!args.featureName || typeof args.featureName !== 'string') {
      throw new DBGpProtocolError(
        'featureName is required and must be a string',
        {
          code: 'INVALID_ARGUMENT',
          context: {
            command: 'feature_get',
            argument: 'featureName',
            value: args.featureName,
            type: typeof args.featureName
          },
          recoverable: true,
          category: 'validation'
        }
      );
    }

    if (args.featureName.trim() === '') {
      throw new DBGpProtocolError(
        'featureName cannot be empty',
        {
          code: 'EMPTY_ARGUMENT',
          context: {
            command: 'feature_get',
            argument: 'featureName'
          },
          recoverable: true,
          category: 'validation'
        }
      );
    }
  }

  /**
   * Get command description
   * @returns {string} Description
   */
  getDescription() {
    return 'Get the value of a specific DBGp feature';
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
        description: 'Name of the feature to retrieve',
        examples: ['max_children', 'max_data', 'max_depth', 'supports_async']
      }
    };
  }
}

module.exports = FeatureGetCommand;
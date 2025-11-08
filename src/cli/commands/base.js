/**
 * Base Command Class
 * Base class for all YDebug CLI commands
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

const { loadConfig } = require('../../config');

/**
 * Base class for all CLI commands
 */
class BaseCommand {
  constructor() {
    this.config = null;
  }

  /**
   * Load configuration for this command
   * @returns {Object} Configuration object
   */
  loadConfig() {
    if (!this.config) {
      this.config = loadConfig();
    }
    return this.config;
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   */
  info(message) {
    console.log('[INFO]', message);
  }

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  success(message) {
    console.log('[SUCCESS]', message);
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  warn(message) {
    console.log('[WARNING]', message);
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   */
  error(message) {
    console.error('[ERROR]', message);
  }

  /**
   * Handle command execution errors
   * @param {Error} error - The error that occurred
   */
  handleError(error) {
    this.error(error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }

  /**
   * Execute the command - must be implemented by subclasses
   * @param {Object} _options - Command options (unused in base class)
   */
  async execute(_options) {
    throw new Error('execute() method must be implemented by subclasses');
  }
}

module.exports = BaseCommand;

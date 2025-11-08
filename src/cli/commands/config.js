/**
 * Config Command
 * Handles configuration management for YDebug
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

const BaseCommand = require('./base');
const { createSampleConfig } = require('../../config');

/**
 * Configuration command implementation
 */
class ConfigCommand extends BaseCommand {
  /**
   * Execute config command
   * @param {Object} options - Command options
   */
  async execute(options) {
    try {
      if (options.init) {
        const configPath = options.file || 'ydebug.config.json';
        createSampleConfig(configPath);
        this.success(`Configuration file created at: ${configPath}`);
        this.info('Edit the file to customize your YDebug settings');
      } else if (options.show) {
        const config = this.loadConfig();
        console.log(JSON.stringify(config, null, 2));
      } else {
        this.info('Use --init to create a sample configuration file');
        this.info('Use --show to display current configuration');
      }
    } catch (error) {
      this.handleError(error);
    }
  }
}

module.exports = ConfigCommand;

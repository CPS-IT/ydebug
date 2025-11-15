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
const ConfigManager = require('../../config/ConfigManager');

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
      const configManager = new ConfigManager();

      if (options.init) {
        const configPath = options.file || 'ydebug.config.json';
        configManager.createSample(configPath);
        this.success(`Configuration file created at: ${configPath}`);
        this.info('Edit the file to customize your YDebug settings');
      } else if (options.show) {
        const output = configManager.show();
        console.log(output);
      } else if (options.set && options.key && options.value !== undefined) {
        configManager.set(options.key, options.value, options.file);
        this.success(`Configuration updated: ${options.key} = ${options.value}`);
      } else if (options.get && options.key) {
        const value = configManager.get(options.key);
        if (value !== undefined) {
          console.log(JSON.stringify(value, null, 2));
        } else {
          this.warn(`Configuration key '${options.key}' not found`);
        }
      } else if (options.reset) {
        configManager.reset(options.confirm);
        this.success('Configuration reset to defaults');
      } else {
        this.info('YDebug Configuration Management');
        this.info('');
        this.info('Options:');
        this.info('  --init              Create a sample configuration file');
        this.info('  --show              Display current configuration');
        this.info('  --set <key> <value> Set configuration value');
        this.info('  --get <key>         Get configuration value');
        this.info('  --reset [--confirm] Reset configuration to defaults');
        this.info('  --file <path>       Specify config file (for init/set)');
      }
    } catch (error) {
      this.handleError(error);
    }
  }
}

module.exports = ConfigCommand;

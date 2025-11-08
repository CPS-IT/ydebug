/**
 * YDebug Configuration Management
 * Handles loading and validation of configuration files
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

const fs = require('fs');
const path = require('path');

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  xdebug: {
    host: 'localhost',
    port: 9003,
    timeout: 30000,
  },
  logging: {
    level: 'info',
    file: null,
  },
  ai: {
    enabled: true,
    maxContextLines: 100,
  },
};

/**
 * Configuration file paths to check (in order of priority)
 */
const CONFIG_PATHS = [
  'ydebug.config.json',
  '.ydebug.json',
  path.join(process.env.HOME || process.env.USERPROFILE || '.', '.ydebug.json'),
];

/**
 * Load configuration from file system
 * @returns {Object} Merged configuration object
 */
function loadConfig() {
  let config = { ...DEFAULT_CONFIG };

  for (const configPath of CONFIG_PATHS) {
    try {
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const fileConfig = JSON.parse(fileContent);

        // Validate configuration
        validateConfig(fileConfig);

        // Merge with defaults
        config = mergeConfig(config, fileConfig);

        console.log(`Loaded configuration from: ${configPath}`);
        break;
      }
    } catch (error) {
      console.error(`Error loading config from ${configPath}:`, error.message);
    }
  }

  return config;
}

/**
 * Validate configuration structure
 * @param {Object} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Configuration must be an object');
  }

  // Validate xdebug configuration
  if (config.xdebug) {
    if (
      config.xdebug.port &&
      (!Number.isInteger(config.xdebug.port) ||
        config.xdebug.port < 1 ||
        config.xdebug.port > 65535)
    ) {
      throw new Error('xdebug.port must be a valid port number (1-65535)');
    }

    if (
      config.xdebug.timeout &&
      (!Number.isInteger(config.xdebug.timeout) || config.xdebug.timeout < 1000)
    ) {
      throw new Error('xdebug.timeout must be at least 1000ms');
    }
  }

  // Validate logging configuration
  if (config.logging) {
    const validLevels = ['error', 'warn', 'info', 'debug'];
    if (config.logging.level && !validLevels.includes(config.logging.level)) {
      throw new Error(
        `logging.level must be one of: ${validLevels.join(', ')}`
      );
    }
  }
}

/**
 * Deep merge configuration objects
 * @param {Object} target - Target configuration object
 * @param {Object} source - Source configuration to merge
 * @returns {Object} Merged configuration
 */
function mergeConfig(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        result[key] = mergeConfig(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Create a sample configuration file
 * @param {string} filePath - Path where to create the config file
 */
function createSampleConfig(filePath = 'ydebug.config.json') {
  const sampleConfig = {
    xdebug: {
      host: 'localhost',
      port: 9003,
      timeout: 30000,
    },
    logging: {
      level: 'info',
      file: null,
    },
    ai: {
      enabled: true,
      maxContextLines: 100,
    },
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(sampleConfig, null, 2));
    console.log(`Sample configuration created at: ${filePath}`);
  } catch (error) {
    console.error('Error creating sample config:', error.message);
  }
}

module.exports = {
  loadConfig,
  validateConfig,
  createSampleConfig,
  DEFAULT_CONFIG,
};

/**
 * DBGp Configuration Management
 * Centralized configuration management for DBGp debugging components
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

const { logger } = require('../utils/Logger');
// const DBGpProtocolError = require('./errors/DBGpProtocolError');

/**
 * DBGp Configuration Management
 * Provides centralized configuration with environment variable support
 */
class DBGpConfig {
  /**
   * Create a DBGp configuration instance
   * @param {Object} initialConfig - Initial configuration values
   */
  constructor(initialConfig = {}) {
    this.config = {
      // Connection settings
      host: 'localhost',
      port: 9003,
      timeout: 30000,
      connectionTimeout: 10000,
      initTimeout: 5000,
      
      // Command settings
      commandTimeout: 30000,
      responseTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      
      // Protocol settings
      protocolVersion: '1.0',
      maxDataSize: 1024 * 1024, // 1MB
      maxChildren: 100,
      maxDepth: 10,
      
      // Error handling
      errorRecovery: true,
      logErrors: true,
      throwOnError: true,
      
      // Performance settings
      enableCache: true,
      cacheTimeout: 60000,
      maxConcurrentCommands: 10,
      
      // Development settings
      debug: false,
      verbose: false,
      
      ...initialConfig
    };

    this.envPrefix = 'YDEBUG_';
    this._loadFromEnvironment();
    this._validateConfig();
  }

  /**
   * Load configuration from environment variables
   * @private
   */
  _loadFromEnvironment() {
    const envMappings = {
      // Connection settings
      [`${this.envPrefix}HOST`]: { key: 'host', type: 'string' },
      [`${this.envPrefix}PORT`]: { key: 'port', type: 'number' },
      [`${this.envPrefix}TIMEOUT`]: { key: 'timeout', type: 'number' },
      [`${this.envPrefix}CONNECTION_TIMEOUT`]: { key: 'connectionTimeout', type: 'number' },
      [`${this.envPrefix}INIT_TIMEOUT`]: { key: 'initTimeout', type: 'number' },
      
      // Command settings
      [`${this.envPrefix}COMMAND_TIMEOUT`]: { key: 'commandTimeout', type: 'number' },
      [`${this.envPrefix}RESPONSE_TIMEOUT`]: { key: 'responseTimeout', type: 'number' },
      [`${this.envPrefix}MAX_RETRIES`]: { key: 'maxRetries', type: 'number' },
      [`${this.envPrefix}RETRY_DELAY`]: { key: 'retryDelay', type: 'number' },
      
      // Protocol settings
      [`${this.envPrefix}PROTOCOL_VERSION`]: { key: 'protocolVersion', type: 'string' },
      [`${this.envPrefix}MAX_DATA_SIZE`]: { key: 'maxDataSize', type: 'number' },
      [`${this.envPrefix}MAX_CHILDREN`]: { key: 'maxChildren', type: 'number' },
      [`${this.envPrefix}MAX_DEPTH`]: { key: 'maxDepth', type: 'number' },
      
      // Error handling
      [`${this.envPrefix}ERROR_RECOVERY`]: { key: 'errorRecovery', type: 'boolean' },
      [`${this.envPrefix}LOG_ERRORS`]: { key: 'logErrors', type: 'boolean' },
      [`${this.envPrefix}THROW_ON_ERROR`]: { key: 'throwOnError', type: 'boolean' },
      
      // Performance settings
      [`${this.envPrefix}ENABLE_CACHE`]: { key: 'enableCache', type: 'boolean' },
      [`${this.envPrefix}CACHE_TIMEOUT`]: { key: 'cacheTimeout', type: 'number' },
      [`${this.envPrefix}MAX_CONCURRENT_COMMANDS`]: { key: 'maxConcurrentCommands', type: 'number' },
      
      // Development settings
      [`${this.envPrefix}DEBUG`]: { key: 'debug', type: 'boolean' },
      [`${this.envPrefix}VERBOSE`]: { key: 'verbose', type: 'boolean' }
    };

    for (const [envVar, mapping] of Object.entries(envMappings)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        this.config[mapping.key] = this._parseEnvValue(envValue, mapping.type, mapping.key);
        logger.debug(`Loaded ${mapping.key} from environment: ${this.config[mapping.key]}`);
      }
    }
  }

  /**
   * Parse environment variable value to the correct type
   * @param {string} value - Environment variable value
   * @param {string} type - Expected type
   * @returns {*} Parsed value
   * @private
   */
  _parseEnvValue(value, type, key) {
    switch (type) {
    case 'number': {
      const num = parseInt(value, 10);
      return isNaN(num) ? this.config[key] : num; // Keep original if parsing fails
    }
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1';
    case 'string':
    default:
      return value;
    }
  }

  /**
   * Validate configuration values
   * @private
   * @throws {Error} If configuration is invalid
   */
  _validateConfig() {
    const validations = [
      { key: 'port', min: 1, max: 65535, type: 'number' },
      { key: 'timeout', min: 100, type: 'number' },
      { key: 'connectionTimeout', min: 100, type: 'number' },
      { key: 'initTimeout', min: 100, type: 'number' },
      { key: 'commandTimeout', min: 100, type: 'number' },
      { key: 'responseTimeout', min: 100, type: 'number' },
      { key: 'maxRetries', min: 0, max: 10, type: 'number' },
      { key: 'retryDelay', min: 0, type: 'number' },
      { key: 'maxDataSize', min: 1024, type: 'number' },
      { key: 'maxChildren', min: 1, type: 'number' },
      { key: 'maxDepth', min: 1, type: 'number' },
      { key: 'cacheTimeout', min: 0, type: 'number' },
      { key: 'maxConcurrentCommands', min: 1, type: 'number' }
    ];

    for (const validation of validations) {
      const value = this.config[validation.key];
      
      if (validation.type === 'number' && typeof value !== 'number') {
        throw new Error(`Configuration '${validation.key}' must be a number`);
      }
      
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Configuration '${validation.key}' must be at least ${validation.min}`);
      }
      
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Configuration '${validation.key}' must be at most ${validation.max}`);
      }
    }

    // Validate host
    if (typeof this.config.host !== 'string' || this.config.host.trim() === '') {
      throw new Error('Configuration \'host\' must be a non-empty string');
    }
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = undefined) {
    return Object.prototype.hasOwnProperty.call(this.config, key) ? this.config[key] : defaultValue;
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   * @throws {Error} If value is invalid
   */
  set(key, value) {
    const oldValue = this.config[key];
    this.config[key] = value;
    
    try {
      this._validateConfig();
      logger.debug(`Updated configuration ${key}: ${oldValue} -> ${value}`);
    } catch (error) {
      // Restore old value if validation fails
      this.config[key] = oldValue;
      throw error;
    }
  }

  /**
   * Get all configuration values
   * @returns {Object} Configuration object (copy)
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Update multiple configuration values
   * @param {Object} updates - Configuration updates
   * @throws {Error} If any value is invalid
   */
  update(updates) {
    const backup = { ...this.config };
    
    try {
      Object.assign(this.config, updates);
      this._validateConfig();
      logger.debug('Updated configuration with multiple values', Object.keys(updates));
    } catch (error) {
      // Restore backup if validation fails
      this.config = backup;
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   * @param {Object} initialConfig - Initial configuration to reset to
   */
  reset(initialConfig = {}) {
    const defaultConfig = {
      host: 'localhost',
      port: 9003,
      timeout: 30000,
      connectionTimeout: 10000,
      initTimeout: 5000,
      commandTimeout: 30000,
      responseTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      protocolVersion: '1.0',
      maxDataSize: 1024 * 1024,
      maxChildren: 100,
      maxDepth: 10,
      errorRecovery: true,
      logErrors: true,
      throwOnError: true,
      enableCache: true,
      cacheTimeout: 60000,
      maxConcurrentCommands: 10,
      debug: false,
      verbose: false,
      ...initialConfig
    };

    this.config = defaultConfig;
    this._loadFromEnvironment();
    this._validateConfig();
    
    logger.debug('Reset configuration to defaults');
  }

  /**
   * Get configuration for a specific component
   * @param {string} component - Component name (connection, command, protocol)
   * @returns {Object} Component-specific configuration
   */
  getComponentConfig(component) {
    switch (component) {
    case 'connection':
      return {
        host: this.config.host,
        port: this.config.port,
        timeout: this.config.connectionTimeout,
        initTimeout: this.config.initTimeout
      };
        
    case 'command':
      return {
        timeout: this.config.commandTimeout,
        responseTimeout: this.config.responseTimeout,
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        maxConcurrentCommands: this.config.maxConcurrentCommands
      };
        
    case 'protocol':
      return {
        version: this.config.protocolVersion,
        maxDataSize: this.config.maxDataSize,
        maxChildren: this.config.maxChildren,
        maxDepth: this.config.maxDepth
      };
        
    case 'error':
      return {
        recovery: this.config.errorRecovery,
        logErrors: this.config.logErrors,
        throwOnError: this.config.throwOnError
      };
        
    default:
      throw new Error(`Unknown component: ${component}`);
    }
  }

  /**
   * Export configuration for serialization
   * @returns {Object} Serializable configuration
   */
  toJSON() {
    return {
      config: this.config,
      envPrefix: this.envPrefix,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import configuration from JSON
   * @param {Object} json - JSON configuration
   * @returns {DBGpConfig} New configuration instance
   * @static
   */
  static fromJSON(json) {
    return new DBGpConfig(json.config);
  }
}

// Create singleton instance
const dbgpConfig = new DBGpConfig();

module.exports = {
  DBGpConfig,
  dbgpConfig
};
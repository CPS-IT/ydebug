/**
 * Configuration Manager
 * Advanced configuration management with multiple sources and CLI operations
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
const os = require('os');

/**
 * Enhanced configuration schema with all available options
 */
const DEFAULT_CONFIG = {
  xdebug: {
    host: 'localhost',
    port: 9003,
    timeout: 30000,
    ideKey: 'YDEBUG',
    autostart: true,
    pathMappings: {},
    maxDepth: 3,
    maxChildren: 100,
  },
  logging: {
    level: 'info',
    target: 'console',
    directory: 'var/log',
    filename: 'ydebug.log',
    format: 'text',
    file: null, // Deprecated, use target instead
    timestamp: true,
    colors: true,
    rotation: {
      enabled: false,
      maxSize: '10MB',
      maxFiles: 5,
      interval: 'daily'
    }
  },
  ai: {
    enabled: true,
    maxContextLines: 100,
    analysisDepth: 'medium',
    includeStackTrace: true,
    claude: {
      apiKey: null, // Should be set via environment variable ANTHROPIC_API_KEY
      model: 'claude-sonnet-4-5',
      maxTokens: 4000,
      timeout: 30000,
      maxRetries: 3,
      rateLimitRpm: 60,
    },
  },
  editor: {
    command: null,
    lineFormat: '%f:%l',
  },
  breakpoints: {
    stopOnEntry: false,
    stopOnException: true,
    ignorePatterns: ['vendor/*', 'node_modules/*'],
  },
  display: {
    maxStringLength: 1000,
    showPrivateProperties: false,
    colorOutput: true,
  },
  mcp: {
    server: {
      transport: 'stdio',
      port: 3000,
      host: 'localhost',
      debug: false,
      maxConnections: 10,
      timeout: 30000,
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
        logging: true
      }
    },
    client: {
      timeout: 10000,
      retries: 3
    },
    features: {
      resourceSubscriptions: true,
      toolValidation: true,
      resourceCaching: true,
      cacheTTL: 5000
    }
  },
};

/**
 * Configuration file locations following XDG Base Directory Specification
 */
function getConfigPaths() {
  const homeDir = os.homedir();
  const configDir = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
  
  return [
    // Local project configuration (highest priority)
    path.resolve('.ydebug.json'),
    path.resolve('ydebug.config.json'),
    
    // User-specific configuration
    path.join(configDir, 'ydebug', 'config.json'),
    path.join(homeDir, '.ydebug.json'),
    
    // Legacy locations for backward compatibility
    path.join(homeDir, '.ydebug', 'config.json'),
  ];
}

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS = {
  'YDEBUG_HOST': 'xdebug.host',
  'YDEBUG_PORT': 'xdebug.port',
  'YDEBUG_TIMEOUT': 'xdebug.timeout',
  'YDEBUG_IDE_KEY': 'xdebug.ideKey',
  'YDEBUG_LOG_LEVEL': 'logging.level',
  'YDEBUG_LOG_FILE': 'logging.file',
  'YDEBUG_AI_ENABLED': 'ai.enabled',
  'YDEBUG_MCP_TRANSPORT': 'mcp.server.transport',
  'YDEBUG_MCP_PORT': 'mcp.server.port',
  'YDEBUG_MCP_HOST': 'mcp.server.host',
  'YDEBUG_MCP_DEBUG': 'mcp.server.debug',
  'YDEBUG_MCP_TIMEOUT': 'mcp.server.timeout',
  'YDEBUG_MCP_CACHE_TTL': 'mcp.features.cacheTTL',
};

/**
 * Configuration Manager Class
 */
class ConfigManager {
  constructor() {
    this.cache = null;
    this.configPath = null;
  }

  /**
   * Load configuration from all sources with proper precedence
   * @param {Object} cliOverrides - Command-line argument overrides
   * @returns {Object} Merged configuration
   */
  load(cliOverrides = {}) {
    if (this.cache) {
      return this.mergeOverrides(this.cache, cliOverrides);
    }

    // Start with default configuration
    let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    // Load from configuration files
    const fileConfig = this.loadFromFiles();
    if (fileConfig.config) {
      config = this.mergeDeep(config, fileConfig.config);
      this.configPath = fileConfig.path;
    }

    // Apply environment variable overrides
    const envConfig = this.loadFromEnvironment();
    config = this.mergeDeep(config, envConfig);

    // Cache the result
    this.cache = config;

    // Apply CLI overrides (not cached)
    return this.mergeOverrides(config, cliOverrides);
  }

  /**
   * Load configuration from files
   * @returns {Object} {config, path} or {config: null, path: null}
   */
  loadFromFiles() {
    const configPaths = getConfigPaths();
    
    for (const configPath of configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content);
          
          // Validate configuration
          this.validate(config);
          
          return { config, path: configPath };
        }
      } catch (error) {
        console.warn(`Warning: Failed to load config from ${configPath}: ${error.message}`);
      }
    }
    
    return { config: null, path: null };
  }

  /**
   * Load configuration from environment variables
   * @returns {Object} Configuration object from environment
   */
  loadFromEnvironment() {
    const envConfig = {};
    
    for (const [envVar, configPath] of Object.entries(ENV_MAPPINGS)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(envConfig, configPath, this.parseValue(value));
      }
    }
    
    return envConfig;
  }

  /**
   * Get configuration value by key path
   * @param {string} keyPath - Dot-separated key path (e.g., 'xdebug.host')
   * @returns {any} Configuration value
   */
  get(keyPath) {
    const config = this.load();
    return this.getNestedValue(config, keyPath);
  }

  /**
   * Set configuration value by key path
   * @param {string} keyPath - Dot-separated key path
   * @param {any} value - Value to set
   * @param {string} targetFile - Optional specific file to modify
   */
  set(keyPath, value, targetFile = null) {
    // Determine target configuration file
    const configFile = targetFile || this.getWritableConfigPath();
    
    // Load existing configuration from target file
    let fileConfig = {};
    if (fs.existsSync(configFile)) {
      try {
        const content = fs.readFileSync(configFile, 'utf8');
        fileConfig = JSON.parse(content);
      } catch (error) {
        console.warn(`Warning: Could not parse existing config, creating new: ${error.message}`);
      }
    }
    
    // Set the value
    this.setNestedValue(fileConfig, keyPath, this.parseValue(value));
    
    // Validate the updated configuration
    this.validate(fileConfig);
    
    // Ensure directory exists
    const configDir = path.dirname(configFile);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write back to file
    fs.writeFileSync(configFile, JSON.stringify(fileConfig, null, 2));
    
    // Clear cache to force reload
    this.cache = null;
    
    console.log(`Configuration updated: ${keyPath} = ${value}`);
    console.log(`Saved to: ${configFile}`);
  }

  /**
   * Reset configuration (reset values to defaults, preserving file by default)
   * @param {boolean} confirm - Confirmation flag
   * @param {boolean} deleteFile - If true, delete the file instead of resetting content
   */
  reset(confirm = false, deleteFile = false) {
    if (!confirm) {
      throw new Error('Reset requires confirmation. Use --confirm flag.');
    }

    const configPaths = getConfigPaths().slice(0, 2); // Only local files
    let resetCount = 0;

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        if (deleteFile) {
          // Delete the file (original behavior, now requires explicit flag)
          fs.unlinkSync(configPath);
          console.log(`Removed: ${configPath}`);
          resetCount++;
        } else {
          // Reset content to defaults but preserve the file (new default behavior)
          try {
            fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
            console.log(`Reset content of: ${configPath}`);
            resetCount++;
          } catch (error) {
            console.warn(`Warning: Could not reset ${configPath}: ${error.message}`);
          }
        }
      }
    }

    if (resetCount === 0) {
      console.log('No local configuration files found to reset.');
    } else {
      const action = deleteFile ? 'removed' : 'reset';
      console.log(`${resetCount} configuration file(s) ${action}.`);
    }

    // Clear cache
    this.cache = null;
  }

  /**
   * Create sample configuration file
   * @param {string} filePath - Target file path
   */
  createSample(filePath = null) {
    const targetPath = filePath || this.getWritableConfigPath();
    
    if (fs.existsSync(targetPath)) {
      throw new Error(`Configuration file already exists: ${targetPath}`);
    }

    // Ensure directory exists
    const configDir = path.dirname(targetPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write sample configuration with comments
    const sampleConfig = {
      ...DEFAULT_CONFIG,
      $schema: {
        description: 'YDebug Configuration Schema',
        version: '1.0.0',
        documentation: 'https://github.com/ydebug/ydebug/docs/configuration',
      },
    };

    fs.writeFileSync(targetPath, JSON.stringify(sampleConfig, null, 2));
    console.log(`Sample configuration created: ${targetPath}`);
    
    return targetPath;
  }

  /**
   * Get the configuration as formatted display
   * @returns {string} Formatted configuration
   */
  show() {
    const config = this.load();
    const sources = this.getConfigSources();
    
    let output = 'YDebug Configuration\n';
    output += '===================\n\n';
    
    // Show configuration sources
    output += 'Configuration Sources:\n';
    sources.forEach(source => {
      output += `  ${source.type}: ${source.path || 'N/A'} ${source.loaded ? 'loaded' : 'not found'}\n`;
    });
    output += '\n';
    
    // Show current configuration
    output += 'Current Configuration:\n';
    output += JSON.stringify(config, null, 2);
    
    return output;
  }

  /**
   * Validate configuration against schema
   * @param {Object} config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  validate(config) {
    if (typeof config !== 'object' || config === null) {
      throw new Error('Configuration must be an object');
    }

    // Validate xdebug configuration
    if (config.xdebug) {
      this.validateXdebugConfig(config.xdebug);
    }

    // Validate logging configuration
    if (config.logging) {
      this.validateLoggingConfig(config.logging);
    }

    // Validate AI configuration
    if (config.ai) {
      this.validateAiConfig(config.ai);
    }
  }

  /**
   * Get writable configuration file path
   * @returns {string} Preferred writable config path
   */
  getWritableConfigPath() {
    // Prefer local project configuration
    if (process.cwd() !== os.homedir()) {
      return path.resolve('.ydebug.json');
    }
    
    // Use XDG compliant user configuration
    const homeDir = os.homedir();
    const configDir = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
    return path.join(configDir, 'ydebug', 'config.json');
  }

  /**
   * Get configuration sources information
   * @returns {Array} List of configuration sources
   */
  getConfigSources() {
    const sources = [
      { type: 'defaults', path: null, loaded: true },
    ];
    
    // Check file sources
    const configPaths = getConfigPaths();
    configPaths.forEach(configPath => {
      sources.push({
        type: 'file',
        path: configPath,
        loaded: fs.existsSync(configPath),
      });
    });
    
    // Check environment variables
    const envVars = Object.keys(ENV_MAPPINGS).filter(key => process.env[key]);
    if (envVars.length > 0) {
      sources.push({
        type: 'environment',
        path: envVars.join(', '),
        loaded: true,
      });
    }
    
    return sources;
  }

  // Helper methods
  
  validateXdebugConfig(xdebug) {
    if (xdebug.port && (!Number.isInteger(xdebug.port) || xdebug.port < 1 || xdebug.port > 65535)) {
      throw new Error('xdebug.port must be a valid port number (1-65535)');
    }
    if (xdebug.timeout && (!Number.isInteger(xdebug.timeout) || xdebug.timeout < 1000)) {
      throw new Error('xdebug.timeout must be at least 1000ms');
    }
    if (xdebug.pathMappings && typeof xdebug.pathMappings !== 'object') {
      throw new Error('xdebug.pathMappings must be an object');
    }
  }

  validateLoggingConfig(logging) {
    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (logging.level && !validLevels.includes(logging.level)) {
      throw new Error(`logging.level must be one of: ${validLevels.join(', ')}`);
    }
    
    const validTargets = ['console', 'file', 'both'];
    if (logging.target && !validTargets.includes(logging.target)) {
      throw new Error(`logging.target must be one of: ${validTargets.join(', ')}`);
    }
    
    const validFormats = ['text', 'json'];
    if (logging.format && !validFormats.includes(logging.format)) {
      throw new Error(`logging.format must be one of: ${validFormats.join(', ')}`);
    }
    
    if (logging.rotation?.enabled && typeof logging.rotation.enabled !== 'boolean') {
      throw new Error('logging.rotation.enabled must be a boolean');
    }
  }

  validateAiConfig(ai) {
    const validDepths = ['shallow', 'medium', 'deep'];
    if (ai.analysisDepth && !validDepths.includes(ai.analysisDepth)) {
      throw new Error(`ai.analysisDepth must be one of: ${validDepths.join(', ')}`);
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      current[key] = current[key] || {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  parseValue(value) {
    // Try to parse as JSON first
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
    
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as string if not parseable
    }
  }

  mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.mergeDeep(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  mergeOverrides(config, overrides) {
    if (!overrides || Object.keys(overrides).length === 0) {
      return config;
    }
    return this.mergeDeep(config, overrides);
  }
}

module.exports = ConfigManager;
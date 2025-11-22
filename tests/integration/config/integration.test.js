/**
 * Configuration Integration Tests
 * Tests for ConfigManager and Config command working together end-to-end
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

// Import real implementations (no mocking for integration tests)
const ConfigManager = require('../../../src/config/ConfigManager');
const ConfigCommand = require('../../../src/cli/commands/config');

describe('Configuration Integration Tests', () => {
  let tempDir;
  let originalCwd;
  let originalEnv;
  let testFiles;
  let consoleSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    // Setup test environment
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    testFiles = [];
    
    // Create temporary directory and change to it
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ydebug-integration-test-'));
    process.chdir(tempDir);
    
    // Clear YDEBUG environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('YDEBUG_')) {
        delete process.env[key];
      }
    });
    
    // Setup console spies
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore spies
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    
    // Restore working directory
    process.chdir(originalCwd);
    
    // Clean up temporary directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Cleanup failed - continue with test teardown
    }
    
    // Clean up test files in original directory
    testFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // File cleanup failed - continue with teardown
      }
    });
    
    // Restore environment
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('YDEBUG_')) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe('End-to-End Configuration Workflows', () => {
    test('should create, modify, and read configuration through CLI commands', async () => {
      const configCommand = new ConfigCommand();
      
      // 1. Initialize configuration
      await configCommand.execute({ init: true });
      
      expect(fs.existsSync('ydebug.config.json')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', expect.stringContaining('Configuration file created'));
      
      // 2. Verify initial configuration
      const initialConfig = JSON.parse(fs.readFileSync('ydebug.config.json', 'utf8'));
      expect(initialConfig.xdebug.port).toBe(9003);
      expect(initialConfig.logging.level).toBe('info');
      
      // 3. Modify configuration using set command
      consoleSpy.mockClear();
      await configCommand.execute({
        set: true,
        key: 'xdebug.port',
        value: '9004',
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', 'Configuration updated: xdebug.port = 9004');
      
      // 4. Verify the change was persisted (ConfigManager writes to .ydebug.json)
      const updatedConfig = JSON.parse(fs.readFileSync('.ydebug.json', 'utf8'));
      expect(updatedConfig.xdebug.port).toBe(9004);
      
      // 5. Read the value back using get command
      consoleSpy.mockClear();
      await configCommand.execute({
        get: true,
        key: 'xdebug.port',
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('9004');
      
      // 6. Show full configuration
      consoleSpy.mockClear();
      await configCommand.execute({ show: true });
      
      const showOutput = consoleSpy.mock.calls[0][0];
      expect(showOutput).toContain('YDebug Configuration');
      expect(showOutput).toContain('"port": 9004');
    });

    test('should handle configuration precedence correctly in CLI context', async () => {
      const configCommand = new ConfigCommand();
      const configManager = new ConfigManager();
      
      // 1. Create initial configuration file
      await configCommand.execute({ init: true });
      
      // 2. Set a value in the file
      await configCommand.execute({
        set: true,
        key: 'xdebug.port',
        value: '9005',
      });
      
      // 3. Set environment variable to override
      process.env.YDEBUG_PORT = '9006';
      
      // 4. Get value should show environment override
      consoleSpy.mockClear();
      await configCommand.execute({
        get: true,
        key: 'xdebug.port',
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('9006'); // Environment value
      
      // 5. Direct ConfigManager load should also show environment override
      const config = configManager.load();
      expect(config.xdebug.port).toBe(9006);
      
      // 6. CLI override should take highest precedence
      const configWithCli = configManager.load({ xdebug: { port: 9007 } });
      expect(configWithCli.xdebug.port).toBe(9007);
    });

    test('should handle multiple configuration files with correct precedence', async () => {
      const configCommand = new ConfigCommand();
      
      // Create .ydebug.json (higher precedence)
      fs.writeFileSync('.ydebug.json', JSON.stringify({
        xdebug: { port: 9008, host: 'local-override' },
        logging: { level: 'debug' },
      }));
      
      // Create ydebug.config.json (lower precedence)
      fs.writeFileSync('ydebug.config.json', JSON.stringify({
        xdebug: { port: 9009, timeout: 15000 },
        logging: { level: 'warn' },
        ai: { enabled: false },
      }));
      
      // Get values - should prioritize .ydebug.json
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'xdebug.port' });
      expect(consoleSpy).toHaveBeenCalledWith('9008'); // From .ydebug.json
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'xdebug.host' });
      expect(consoleSpy).toHaveBeenCalledWith('"local-override"'); // From .ydebug.json
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'logging.level' });
      expect(consoleSpy).toHaveBeenCalledWith('"debug"'); // From .ydebug.json
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'xdebug.timeout' });
      expect(consoleSpy).toHaveBeenCalledWith('30000'); // Default value (not in .ydebug.json, fallback to default)
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'ai.enabled' });
      expect(consoleSpy).toHaveBeenCalledWith('true'); // Default value (not in .ydebug.json)
    });

    test('should handle configuration validation errors end-to-end', async () => {
      const configCommand = new ConfigCommand();
      
      // Try to set invalid port
      await configCommand.execute({
        set: true,
        key: 'xdebug.port',
        value: '99999',
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', expect.stringContaining('port must be a valid port number'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
      
      // Try to set invalid log level
      consoleErrorSpy.mockClear();
      processExitSpy.mockClear();
      
      await configCommand.execute({
        set: true,
        key: 'logging.level',
        value: 'invalid-level',
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', expect.stringContaining('logging.level must be one of'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should handle reset functionality end-to-end', async () => {
      const configCommand = new ConfigCommand();
      
      // 1. Create configuration files
      fs.writeFileSync('.ydebug.json', JSON.stringify({ xdebug: { port: 9010 } }));
      fs.writeFileSync('ydebug.config.json', JSON.stringify({ logging: { level: 'debug' } }));
      
      // 2. Verify files exist
      expect(fs.existsSync('.ydebug.json')).toBe(true);
      expect(fs.existsSync('ydebug.config.json')).toBe(true);
      
      // 3. Try reset without confirmation
      await configCommand.execute({ reset: true });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', expect.stringContaining('Reset requires confirmation'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
      
      // Files should still exist
      expect(fs.existsSync('.ydebug.json')).toBe(true);
      expect(fs.existsSync('ydebug.config.json')).toBe(true);
      
      // 4. Reset with confirmation
      processExitSpy.mockClear();
      consoleSpy.mockClear();
      
      await configCommand.execute({ reset: true, confirm: true, delete: true });
      
      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', 'Configuration files removed (reset to defaults)');
      expect(fs.existsSync('.ydebug.json')).toBe(false);
      expect(fs.existsSync('ydebug.config.json')).toBe(false);
    });
  });

  describe('Complex Configuration Scenarios', () => {
    test('should handle nested configuration updates correctly', async () => {
      const configCommand = new ConfigCommand();
      
      // Initialize config
      await configCommand.execute({ init: true });
      
      // Set nested path mappings
      await configCommand.execute({
        set: true,
        key: 'xdebug.pathMappings',
        value: '{"remote":"local","app":"src"}',
      });
      
      // Verify the nested object was set correctly (ConfigManager writes to .ydebug.json)
      const config = JSON.parse(fs.readFileSync('.ydebug.json', 'utf8'));
      expect(config.xdebug.pathMappings).toEqual({
        remote: 'local',
        app: 'src',
      });
      
      // Get the nested value
      consoleSpy.mockClear();
      await configCommand.execute({
        get: true,
        key: 'xdebug.pathMappings',
      });
      
      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toEqual({
        remote: 'local',
        app: 'src',
      });
    });

    test('should handle environment variable parsing with complex values', async () => {
      const configCommand = new ConfigCommand();
      
      // Set complex environment variables
      process.env.YDEBUG_PORT = '9011';
      process.env.YDEBUG_AI_ENABLED = 'false';
      process.env.YDEBUG_LOG_LEVEL = 'trace';
      
      // Get values should parse correctly
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'xdebug.port' });
      expect(consoleSpy).toHaveBeenCalledWith('9011');
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'ai.enabled' });
      expect(consoleSpy).toHaveBeenCalledWith('false');
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'logging.level' });
      expect(consoleSpy).toHaveBeenCalledWith('"trace"');
    });

    test('should handle configuration with custom file paths', async () => {
      const configCommand = new ConfigCommand();
      const customConfigPath = path.join(tempDir, 'custom', 'config.json');
      
      // Initialize with custom path
      await configCommand.execute({
        init: true,
        file: customConfigPath,
      });
      
      expect(fs.existsSync(customConfigPath)).toBe(true);
      
      // Set value in custom config
      await configCommand.execute({
        set: true,
        key: 'xdebug.port',
        value: '9012',
        file: customConfigPath,
      });
      
      // Verify it was written to the custom file
      const customConfig = JSON.parse(fs.readFileSync(customConfigPath, 'utf8'));
      expect(customConfig.xdebug.port).toBe(9012);
      
      // ConfigManager should still use standard paths by default
      const configManager = new ConfigManager();
      const standardConfig = configManager.load();
      expect(standardConfig.xdebug.port).toBe(9003); // Default value
    });

    test('should handle configuration caching correctly', async () => {
      const configManager = new ConfigManager();
      
      // Create initial config
      fs.writeFileSync('.ydebug.json', JSON.stringify({
        xdebug: { port: 9013 },
      }));
      
      // First load should read from file
      const config1 = configManager.load();
      expect(config1.xdebug.port).toBe(9013);
      
      // Modify file directly (simulating external change)
      fs.writeFileSync('.ydebug.json', JSON.stringify({
        xdebug: { port: 9014 },
      }));
      
      // Second load should use cached value
      const config2 = configManager.load();
      expect(config2.xdebug.port).toBe(9013); // Still cached
      
      // Using set should clear cache and create/update .ydebug.json
      const configCommand = new ConfigCommand();
      await configCommand.execute({
        set: true,
        key: 'logging.level',
        value: 'debug',
      });
      
      // The set operation only clears cache on its own ConfigManager instance,
      // so we need a new instance to see the updated file
      const freshConfigManager = new ConfigManager();
      const config3 = freshConfigManager.load();
      expect(config3.xdebug.port).toBe(9014); // Port from modified file (set operation preserves existing values)
      expect(config3.logging.level).toBe('debug'); // From set operation
    });
  });

  describe('Real-world Usage Patterns', () => {
    test('should support typical development workflow', async () => {
      const configCommand = new ConfigCommand();
      
      // Developer initializes project configuration
      await configCommand.execute({ init: true });
      
      // Configure for local development
      await configCommand.execute({ set: true, key: 'xdebug.port', value: '9003' });
      await configCommand.execute({ set: true, key: 'logging.level', value: 'debug' });
      await configCommand.execute({ set: true, key: 'ai.enabled', value: 'true' });
      
      // Set up path mappings for Docker
      await configCommand.execute({
        set: true,
        key: 'xdebug.pathMappings',
        value: '{"/var/www":"/home/user/project"}',
      });
      
      // Verify configuration
      consoleSpy.mockClear();
      await configCommand.execute({ show: true });
      
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('"port": 9003');
      expect(output).toContain('"level": "debug"');
      expect(output).toContain('"/var/www": "/home/user/project"');
      
      // Environment override for CI/testing
      process.env.YDEBUG_AI_ENABLED = 'false';
      process.env.YDEBUG_LOG_LEVEL = 'error';
      
      // Check that environment overrides work
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'ai.enabled' });
      expect(consoleSpy).toHaveBeenCalledWith('false');
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'logging.level' });
      expect(consoleSpy).toHaveBeenCalledWith('"error"');
    });

    test('should handle team configuration sharing', async () => {
      const configCommand = new ConfigCommand();
      
      // Create shared team configuration
      const teamConfig = {
        xdebug: {
          port: 9003,
          pathMappings: {
            '/app': '/workspace/app',
            '/vendor': '/workspace/vendor',
          },
        },
        logging: {
          level: 'info',
          colors: true,
        },
        ai: {
          enabled: true,
          maxContextLines: 50,
        },
        breakpoints: {
          stopOnException: true,
          ignorePatterns: ['vendor/*', 'tests/*'],
        },
      };
      
      // Write team config to standard location
      fs.writeFileSync('ydebug.config.json', JSON.stringify(teamConfig, null, 2));
      
      // Individual developer overrides
      const developerConfig = {
        logging: {
          level: 'debug', // Developer wants more verbose logging
        },
        xdebug: {
          port: 9004, // Developer uses different port
        },
      };
      
      fs.writeFileSync('.ydebug.json', JSON.stringify(developerConfig, null, 2));
      
      // Verify merged configuration
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'xdebug.port' });
      expect(consoleSpy).toHaveBeenCalledWith('9004'); // Developer override
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'logging.level' });
      expect(consoleSpy).toHaveBeenCalledWith('"debug"'); // Developer override
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'ai.maxContextLines' });
      expect(consoleSpy).toHaveBeenCalledWith('100'); // Default value (not overridden in .ydebug.json)
      
      consoleSpy.mockClear();
      await configCommand.execute({ get: true, key: 'xdebug.pathMappings' });
      const pathMappings = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(pathMappings).toEqual({}); // Developer override replaces entire xdebug object
    });

    test('should handle configuration migration scenarios', async () => {
      const configCommand = new ConfigCommand();
      const configManager = new ConfigManager();
      
      // Simulate old configuration format
      const oldConfig = {
        port: 9003, // Old flat structure
        host: 'localhost',
        logLevel: 'info', // Old naming
      };
      
      fs.writeFileSync('.ydebug.json', JSON.stringify(oldConfig));
      
      // Load with ConfigManager (which expects new structure)
      const loadedConfig = configManager.load();
      
      // Should fall back to defaults for missing/incorrectly structured values
      expect(loadedConfig.xdebug.port).toBe(9003); // Default
      expect(loadedConfig.xdebug.host).toBe('localhost'); // Default
      expect(loadedConfig.logging.level).toBe('info'); // Default
      
      // Migrate to new format using CLI
      await configCommand.execute({ set: true, key: 'xdebug.port', value: '9003' });
      await configCommand.execute({ set: true, key: 'xdebug.host', value: 'localhost' });
      await configCommand.execute({ set: true, key: 'logging.level', value: 'info' });
      
      // Verify new structure
      const migratedConfig = JSON.parse(fs.readFileSync('.ydebug.json', 'utf8'));
      expect(migratedConfig.xdebug).toBeDefined();
      expect(migratedConfig.xdebug.port).toBe(9003);
      expect(migratedConfig.xdebug.host).toBe('localhost');
      expect(migratedConfig.logging).toBeDefined();
      expect(migratedConfig.logging.level).toBe('info');
    });
  });
});
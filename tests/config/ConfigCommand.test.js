/**
 * Config Command Unit Tests
 * Comprehensive tests for CLI configuration management
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

// Mock dependencies before importing the command
const mockCreateSample = jest.fn();
const mockShow = jest.fn();
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockReset = jest.fn();

// Mock ConfigManager class
jest.mock('../../src/config/ConfigManager', () => {
  return jest.fn().mockImplementation(() => ({
    createSample: mockCreateSample,
    show: mockShow,
    set: mockSet,
    get: mockGet,
    reset: mockReset,
  }));
});

// Mock the legacy config module
jest.mock('../../src/config', () => ({
  createSampleConfig: jest.fn(),
}));

const ConfigCommand = require('../../src/cli/commands/config');
const BaseCommand = require('../../src/cli/commands/base');

describe('ConfigCommand', () => {
  let configCommand;
  let consoleSpy;
  let consoleErrorSpy;
  let processExitSpy;
  let testFiles;
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    // Create fresh instances
    configCommand = new ConfigCommand();
    
    // Setup spies
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    // Reset all mocks
    jest.clearAllMocks();
    mockCreateSample.mockReset();
    mockShow.mockReset();
    mockSet.mockReset();
    mockGet.mockReset();
    mockReset.mockReset();
    
    // Setup test environment
    testFiles = [];
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ydebug-config-cmd-test-'));
    process.chdir(tempDir);
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
    } catch (error) {
      console.warn(`Warning: Could not clean up temp directory: ${error.message}`);
    }
    
    // Clean up test files in original directory
    testFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.warn(`Warning: Could not clean up test file ${file}: ${error.message}`);
      }
    });
  });

  describe('Class Structure', () => {
    test('should extend BaseCommand', () => {
      expect(configCommand).toBeInstanceOf(BaseCommand);
      expect(configCommand).toBeInstanceOf(ConfigCommand);
    });

    test('should have access to BaseCommand methods', () => {
      expect(typeof configCommand.success).toBe('function');
      expect(typeof configCommand.info).toBe('function');
      expect(typeof configCommand.warn).toBe('function');
      expect(typeof configCommand.error).toBe('function');
      expect(typeof configCommand.handleError).toBe('function');
    });
  });

  describe('Configuration Initialization', () => {
    test('should create sample configuration with --init', async () => {
      const options = { init: true };
      await configCommand.execute(options);
      
      expect(mockCreateSample).toHaveBeenCalledWith('ydebug.config.json');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SUCCESS]',
        'Configuration file created at: ydebug.config.json'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Edit the file to customize your YDebug settings'
      );
    });

    test('should create sample configuration with custom file path', async () => {
      mockCreateSample.mockReturnValue('/custom/path/config.json');
      
      const options = { init: true, file: '/custom/path/config.json' };
      await configCommand.execute(options);
      
      expect(mockCreateSample).toHaveBeenCalledWith('/custom/path/config.json');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SUCCESS]',
        'Configuration file created at: /custom/path/config.json'
      );
    });

    test('should handle errors during configuration initialization', async () => {
      const error = new Error('Failed to create sample configuration');
      mockCreateSample.mockImplementation(() => {
        throw error;
      });
      
      const options = { init: true };
      await configCommand.execute(options);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Failed to create sample configuration');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should use default filename when --init without --file', async () => {
      mockCreateSample.mockReturnValue('ydebug.config.json');
      
      const options = { init: true };
      await configCommand.execute(options);
      
      expect(mockCreateSample).toHaveBeenCalledWith('ydebug.config.json');
    });
  });

  describe('Configuration Display', () => {
    test('should display configuration with --show', async () => {
      const mockOutput = `YDebug Configuration
===================

Configuration Sources:
  defaults: N/A loaded
  file: .ydebug.json not found

Current Configuration:
{
  "xdebug": {
    "host": "localhost",
    "port": 9003
  }
}`;
      mockShow.mockReturnValue(mockOutput);
      
      const options = { show: true };
      await configCommand.execute(options);
      
      expect(mockShow).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(mockOutput);
    });

    test('should handle errors during configuration display', async () => {
      const error = new Error('Failed to load configuration');
      mockShow.mockImplementation(() => {
        throw error;
      });
      
      const options = { show: true };
      await configCommand.execute(options);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Failed to load configuration');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Configuration Set Operations', () => {
    test('should set configuration value with --set', async () => {
      const options = {
        set: true,
        key: 'xdebug.port',
        value: '9004',
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).toHaveBeenCalledWith('xdebug.port', '9004', undefined);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SUCCESS]',
        'Configuration updated: xdebug.port = 9004'
      );
    });

    test('should set configuration value with custom file', async () => {
      const options = {
        set: true,
        key: 'logging.level',
        value: 'debug',
        file: '/custom/config.json',
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).toHaveBeenCalledWith('logging.level', 'debug', '/custom/config.json');
    });

    test('should handle numeric values in set operations', async () => {
      const options = {
        set: true,
        key: 'xdebug.timeout',
        value: '15000',
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).toHaveBeenCalledWith('xdebug.timeout', '15000', undefined);
    });

    test('should handle boolean values in set operations', async () => {
      const options = {
        set: true,
        key: 'ai.enabled',
        value: 'false',
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).toHaveBeenCalledWith('ai.enabled', 'false', undefined);
    });

    test('should handle value of 0 (falsy but valid)', async () => {
      const options = {
        set: true,
        key: 'some.number',
        value: 0,
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).toHaveBeenCalledWith('some.number', 0, undefined);
    });

    test('should handle empty string value', async () => {
      const options = {
        set: true,
        key: 'some.string',
        value: '',
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).toHaveBeenCalledWith('some.string', '', undefined);
    });

    test('should not execute set when key is missing', async () => {
      const options = {
        set: true,
        value: '9004',
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'YDebug Configuration Management');
    });

    test('should not execute set when value is undefined', async () => {
      const options = {
        set: true,
        key: 'xdebug.port',
        value: undefined,
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'YDebug Configuration Management');
    });

    test('should handle errors during set operations', async () => {
      const error = new Error('Invalid configuration value');
      mockSet.mockImplementation(() => {
        throw error;
      });
      
      const options = {
        set: true,
        key: 'xdebug.port',
        value: '99999',
      };
      
      await configCommand.execute(options);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Invalid configuration value');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Configuration Get Operations', () => {
    test('should get configuration value with --get', async () => {
      mockGet.mockReturnValue(9003);
      
      const options = {
        get: true,
        key: 'xdebug.port',
      };
      
      await configCommand.execute(options);
      
      expect(mockGet).toHaveBeenCalledWith('xdebug.port');
      expect(consoleSpy).toHaveBeenCalledWith('9003');
    });

    test('should display JSON formatted object values', async () => {
      mockGet.mockReturnValue({
        host: 'localhost',
        port: 9003,
        timeout: 30000,
      });
      
      const options = {
        get: true,
        key: 'xdebug',
      };
      
      await configCommand.execute(options);
      
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({
        host: 'localhost',
        port: 9003,
        timeout: 30000,
      }, null, 2));
    });

    test('should display boolean values correctly', async () => {
      mockGet.mockReturnValue(true);
      
      const options = {
        get: true,
        key: 'ai.enabled',
      };
      
      await configCommand.execute(options);
      
      expect(consoleSpy).toHaveBeenCalledWith('true');
    });

    test('should display null values correctly', async () => {
      mockGet.mockReturnValue(null);
      
      const options = {
        get: true,
        key: 'logging.file',
      };
      
      await configCommand.execute(options);
      
      expect(consoleSpy).toHaveBeenCalledWith('null');
    });

    test('should warn when configuration key is not found', async () => {
      mockGet.mockReturnValue(undefined);
      
      const options = {
        get: true,
        key: 'nonexistent.key',
      };
      
      await configCommand.execute(options);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[WARNING]',
        "Configuration key 'nonexistent.key' not found"
      );
    });

    test('should not execute get when key is missing', async () => {
      const options = {
        get: true,
      };
      
      await configCommand.execute(options);
      
      expect(mockGet).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'YDebug Configuration Management');
    });

    test('should handle errors during get operations', async () => {
      const error = new Error('Configuration load failed');
      mockGet.mockImplementation(() => {
        throw error;
      });
      
      const options = {
        get: true,
        key: 'xdebug.port',
      };
      
      await configCommand.execute(options);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Configuration load failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Configuration Reset Operations', () => {
    test('should reset configuration with --reset --confirm', async () => {
      const options = {
        reset: true,
        confirm: true,
      };
      
      await configCommand.execute(options);
      
      expect(mockReset).toHaveBeenCalledWith(true);
      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', 'Configuration reset to defaults');
    });

    test('should handle reset without confirmation', async () => {
      const error = new Error('Reset requires confirmation. Use --confirm flag.');
      mockReset.mockImplementation(() => {
        throw error;
      });
      
      const options = {
        reset: true,
      };
      
      await configCommand.execute(options);
      
      expect(mockReset).toHaveBeenCalledWith(undefined);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Reset requires confirmation. Use --confirm flag.');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should pass confirm flag correctly', async () => {
      const options = {
        reset: true,
        confirm: false,
      };
      
      await configCommand.execute(options);
      
      expect(mockReset).toHaveBeenCalledWith(false);
    });

    test('should handle errors during reset operations', async () => {
      const error = new Error('Reset operation failed');
      mockReset.mockImplementation(() => {
        throw error;
      });
      
      const options = {
        reset: true,
        confirm: true,
      };
      
      await configCommand.execute(options);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Reset operation failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Help and Usage Display', () => {
    test('should display usage information when no options provided', async () => {
      const options = {};
      
      await configCommand.execute(options);
      
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'YDebug Configuration Management');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Options:');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  --init              Create a sample configuration file');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  --show              Display current configuration');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  --set <key> <value> Set configuration value');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  --get <key>         Get configuration value');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  --reset [--confirm] Reset configuration to defaults');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  --file <path>       Specify config file (for init/set)');
    });

    test('should display usage when all flags are false', async () => {
      const options = {
        init: false,
        show: false,
        set: false,
        get: false,
        reset: false,
      };
      
      await configCommand.execute(options);
      
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'YDebug Configuration Management');
    });

    test('should display usage when incomplete set options provided', async () => {
      const options = {
        set: true,
        key: 'xdebug.port',
        // missing value
      };
      
      await configCommand.execute(options);
      
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'YDebug Configuration Management');
    });

    test('should display usage when incomplete get options provided', async () => {
      const options = {
        get: true,
        // missing key
      };
      
      await configCommand.execute(options);
      
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'YDebug Configuration Management');
    });
  });

  describe('Option Precedence and Combinations', () => {
    test('should prioritize --init over other options', async () => {
      mockCreateSample.mockReturnValue('config.json');
      
      const options = {
        init: true,
        show: true,
        set: true,
        get: true,
      };
      
      await configCommand.execute(options);
      
      expect(mockCreateSample).toHaveBeenCalled();
      expect(mockShow).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
    });

    test('should prioritize --show over set/get when init is not present', async () => {
      mockShow.mockReturnValue('Configuration display');
      
      const options = {
        show: true,
        set: true,
        get: true,
        key: 'test.key',
        value: 'test.value',
      };
      
      await configCommand.execute(options);
      
      expect(mockShow).toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
    });

    test('should prioritize --set over --get when both are present', async () => {
      const options = {
        set: true,
        get: true,
        key: 'xdebug.port',
        value: '9004',
      };
      
      await configCommand.execute(options);
      
      expect(mockSet).toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
    });

    test('should handle --reset alongside other flags (reset has lower precedence)', async () => {
      const options = {
        reset: true,
        confirm: true,
        show: true, // This will be executed first due to if-else chain
      };
      
      mockShow.mockReturnValue('Configuration display');
      
      await configCommand.execute(options);
      
      expect(mockShow).toHaveBeenCalled(); // Show takes precedence
      expect(mockReset).not.toHaveBeenCalled();
    });
  });
});
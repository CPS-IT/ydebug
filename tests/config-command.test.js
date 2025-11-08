/**
 * Config Command Tests
 * Tests for src/cli/commands/config.js - configuration management command
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


// Mock functions for the config module
const mockCreateSampleConfig = jest.fn();
const mockLoadConfig = jest.fn();

// Mock the config module
jest.mock('../src/config', () => ({
  createSampleConfig: mockCreateSampleConfig,
  loadConfig: mockLoadConfig,
  DEFAULT_CONFIG: {
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
  },
}));

// Import after mocking
const ConfigCommand = require('../src/cli/commands/config');
const BaseCommand = require('../src/cli/commands/base');

describe('ConfigCommand Class', () => {
  let configCommand;
  let consoleSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    configCommand = new ConfigCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset mocks completely (including implementations)
    mockLoadConfig.mockReset();
    mockCreateSampleConfig.mockReset();

    // Set default return value for mockLoadConfig
    mockLoadConfig.mockReturnValue({
      xdebug: { host: 'localhost', port: 9003 },
      logging: { level: 'info' },
    });

    // Clean up any test files
    const testFiles = [
      'test-config.json',
      'ydebug.config.json',
      'custom-config.json',
    ];
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Clean up test files
    const testFiles = [
      'test-config.json',
      'ydebug.config.json',
      'custom-config.json',
    ];
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  describe('Class inheritance', () => {
    test('should extend BaseCommand', () => {
      expect(configCommand).toBeInstanceOf(BaseCommand);
      expect(configCommand).toBeInstanceOf(ConfigCommand);
    });

    test('should have access to BaseCommand methods', () => {
      expect(typeof configCommand.info).toBe('function');
      expect(typeof configCommand.success).toBe('function');
      expect(typeof configCommand.warn).toBe('function');
      expect(typeof configCommand.error).toBe('function');
      expect(typeof configCommand.handleError).toBe('function');
      expect(typeof configCommand.loadConfig).toBe('function');
    });
  });

  describe('Configuration initialization', () => {
    test('should create config file with --init option', async () => {
      const options = { init: true };

      await configCommand.execute(options);

      expect(mockCreateSampleConfig).toHaveBeenCalledWith('ydebug.config.json');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SUCCESS]',
        'Configuration file created at: ydebug.config.json'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Edit the file to customize your YDebug settings'
      );
    });

    test('should create config file with custom path when --file is specified', async () => {
      const options = { init: true, file: 'custom-config.json' };

      await configCommand.execute(options);

      expect(mockCreateSampleConfig).toHaveBeenCalledWith('custom-config.json');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SUCCESS]',
        'Configuration file created at: custom-config.json'
      );
    });

    test('should handle errors during config creation', async () => {
      const error = new Error('Failed to create config file');
      mockCreateSampleConfig.mockImplementation(() => {
        throw error;
      });

      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => {});

      const options = { init: true };
      await configCommand.execute(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Failed to create config file'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processExitSpy.mockRestore();
    });
  });

  describe('Configuration display', () => {
    test('should show current configuration with --show option', async () => {
      const mockConfig = {
        xdebug: { host: 'localhost', port: 9003 },
        logging: { level: 'info' },
      };

      mockLoadConfig.mockReturnValue(mockConfig);

      const options = { show: true };
      await configCommand.execute(options);

      expect(mockLoadConfig).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(mockConfig, null, 2)
      );
    });

    test('should format JSON output correctly', async () => {
      const mockConfig = {
        xdebug: { host: 'localhost', port: 9003, timeout: 5000 },
        logging: { level: 'debug', file: 'debug.log' },
        features: { experimental: false },
      };

      mockLoadConfig.mockReturnValue(mockConfig);

      const options = { show: true };
      await configCommand.execute(options);

      const expectedOutput = JSON.stringify(mockConfig, null, 2);
      expect(consoleSpy).toHaveBeenCalledWith(expectedOutput);

      // Verify JSON formatting
      expect(expectedOutput).toContain('  "xdebug": {');
      expect(expectedOutput).toContain('    "host": "localhost"');
    });

    test('should handle errors during config loading for display', async () => {
      const error = new Error('Failed to load config');
      mockLoadConfig.mockImplementation(() => {
        throw error;
      });

      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => {});

      const options = { show: true };
      await configCommand.execute(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Failed to load config'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processExitSpy.mockRestore();
    });
  });

  describe('Default behavior', () => {
    test('should show usage info when no options provided', async () => {
      const options = {};

      await configCommand.execute(options);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Use --init to create a sample configuration file'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Use --show to display current configuration'
      );
    });

    test('should show usage info when false options provided', async () => {
      const options = { init: false, show: false };

      await configCommand.execute(options);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Use --init to create a sample configuration file'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Use --show to display current configuration'
      );
    });
  });

  describe('Option combinations', () => {
    test('should prioritize --init over --show when both provided', async () => {
      const options = { init: true, show: true };

      await configCommand.execute(options);

      expect(mockCreateSampleConfig).toHaveBeenCalled();
      expect(mockLoadConfig).not.toHaveBeenCalled();
    });

    test('should handle --init with --file option', async () => {
      const options = { init: true, file: 'test-config.json' };

      await configCommand.execute(options);

      expect(mockCreateSampleConfig).toHaveBeenCalledWith('test-config.json');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SUCCESS]',
        'Configuration file created at: test-config.json'
      );
    });

    test('should ignore --file option when only --show is provided', async () => {
      const mockConfig = { test: 'config' };
      mockLoadConfig.mockReturnValue(mockConfig);

      const options = { show: true, file: 'ignored-file.json' };

      await configCommand.execute(options);

      expect(mockLoadConfig).toHaveBeenCalled();
      expect(mockCreateSampleConfig).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty options object', async () => {
      await configCommand.execute({});

      expect(consoleSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Use --init to create a sample configuration file'
      );
    });

    test('should handle undefined options', async () => {
      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => {});

      await configCommand.execute(undefined);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Cannot read properties of undefined (reading \'init\')'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processExitSpy.mockRestore();
    });

    test('should handle null options', async () => {
      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => {});

      await configCommand.execute(null);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Cannot read properties of null (reading \'init\')'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processExitSpy.mockRestore();
    });

    test('should handle options with extra properties', async () => {
      const options = {
        init: true,
        extraProperty: 'ignored',
        anotherExtra: 42,
      };

      await configCommand.execute(options);

      expect(mockCreateSampleConfig).toHaveBeenCalledWith('ydebug.config.json');
    });
  });

  describe('Integration with BaseCommand error handling', () => {
    test('should use BaseCommand error handling for thrown errors', async () => {
      const error = new Error('Configuration error');
      mockCreateSampleConfig.mockImplementation(() => {
        throw error;
      });

      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => {});

      const options = { init: true };
      await configCommand.execute(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Configuration error');
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processExitSpy.mockRestore();
    });

    test('should handle synchronous errors properly', async () => {
      const error = new Error('Synchronous configuration error');
      mockLoadConfig.mockImplementation(() => {
        throw error;
      });

      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => {});

      const options = { show: true };
      await configCommand.execute(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Synchronous configuration error'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processExitSpy.mockRestore();
    });
  });
});

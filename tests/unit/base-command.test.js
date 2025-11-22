/**
 * Base Command Class Tests
 * Tests for src/cli/commands/base.js - the base class for all CLI commands
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

const BaseCommand = require('../../src/cli/commands/base');


// Mock the config module
jest.mock('../../src/config', () => ({
  loadConfig: jest.fn(() => ({
    xdebug: { host: 'localhost', port: 9003 },
    logging: { level: 'info' },
  })),
}));

describe('BaseCommand Class', () => {
  let baseCommand;
  let consoleSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    baseCommand = new BaseCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    // Safely restore spies if they exist
    if (consoleSpy) consoleSpy.mockRestore();
    if (consoleErrorSpy) consoleErrorSpy.mockRestore(); 
    if (processExitSpy) processExitSpy.mockRestore();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with null config', () => {
      expect(baseCommand.config).toBeNull();
    });

    test('should be an instance of BaseCommand', () => {
      expect(baseCommand).toBeInstanceOf(BaseCommand);
    });
  });

  describe('Configuration loading', () => {
    test('should load config when loadConfig is called', () => {
      const config = baseCommand.loadConfig();
      expect(config).toBeDefined();
      expect(config.xdebug).toBeDefined();
      expect(config.xdebug.host).toBe('localhost');
      expect(config.xdebug.port).toBe(9003);
    });

    test('should cache config after first load', () => {
      const config1 = baseCommand.loadConfig();
      const config2 = baseCommand.loadConfig();
      expect(config1).toBe(config2); // Should be the same reference
      expect(baseCommand.config).toBe(config1);
    });
  });

  describe('Logging methods', () => {
    test('should log info messages correctly', () => {
      baseCommand.info('Test info message');
      expect(consoleSpy).toHaveBeenLastCalledWith('[INFO]', 'Test info message');
    });

    test('should log success messages correctly', () => {
      baseCommand.success('Test success message');
      expect(consoleSpy).toHaveBeenLastCalledWith('[SUCCESS]', 'Test success message');
    });

    test('should log warning messages correctly', () => {
      baseCommand.warn('Test warning message');
      expect(consoleSpy).toHaveBeenLastCalledWith('[WARNING]', 'Test warning message');
    });

    test('should log error messages correctly', () => {
      baseCommand.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenLastCalledWith('[ERROR]', 'Test error message');
    });

    test('should handle empty messages', () => {
      baseCommand.info('');
      baseCommand.success('');
      baseCommand.warn('');
      baseCommand.error('');

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle multi-line messages', () => {
      const multiLineMessage = 'Line 1\nLine 2\nLine 3';
      baseCommand.info(multiLineMessage);
      expect(consoleSpy).toHaveBeenLastCalledWith('[INFO]', multiLineMessage);
    });
  });

  describe('Error handling', () => {
    test('should handle errors and exit with code 1', () => {
      const error = new Error('Test error');
      baseCommand.handleError(error);

      expect(consoleErrorSpy).toHaveBeenLastCalledWith('[ERROR]', 'Test error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should show stack trace in DEBUG mode', () => {
      const originalEnv = process.env.DEBUG;
      process.env.DEBUG = 'true';

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      baseCommand.handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
      expect(processExitSpy).toHaveBeenCalledWith(1);

      process.env.DEBUG = originalEnv;
    });

    test('should not show stack trace when DEBUG is not set', () => {
      const originalEnv = process.env.DEBUG;
      delete process.env.DEBUG;

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      baseCommand.handleError(error);

      expect(consoleErrorSpy).toHaveBeenLastCalledWith('[ERROR]', 'Test error');
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(error.stack);
      expect(processExitSpy).toHaveBeenCalledWith(1);

      process.env.DEBUG = originalEnv;
    });

    test('should handle errors without message', () => {
      const error = new Error();
      baseCommand.handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', '');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Execute method', () => {
    test('should throw error when execute is called on base class', async () => {
      await expect(baseCommand.execute({})).rejects.toThrow(
        'execute() method must be implemented by subclasses'
      );
    });

    test('should accept options parameter', async () => {
      await expect(baseCommand.execute({ test: 'option' })).rejects.toThrow(
        'execute() method must be implemented by subclasses'
      );
    });
  });

  describe('Subclass implementation', () => {
    class TestCommand extends BaseCommand {
      async execute(options) {
        this.info('Executing test command');
        return { success: true, options };
      }
    }

    test('should allow proper subclass implementation', async () => {
      const testCommand = new TestCommand();
      const result = await testCommand.execute({ test: 'value' });

      expect(result.success).toBe(true);
      expect(result.options.test).toBe('value');
      expect(consoleSpy).toHaveBeenLastCalledWith('[INFO]', 'Executing test command');
    });

    test('should inherit all logging methods in subclass', () => {
      const testCommand = new TestCommand();

      testCommand.info('Info from subclass');
      testCommand.success('Success from subclass');
      testCommand.warn('Warning from subclass');
      testCommand.error('Error from subclass');

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('should inherit config loading in subclass', () => {
      const testCommand = new TestCommand();
      const config = testCommand.loadConfig();

      expect(config).toBeDefined();
      expect(config.xdebug.host).toBe('localhost');
    });
  });

  describe('Edge cases and error conditions', () => {
    test('should handle null/undefined messages gracefully', () => {
      baseCommand.info(null);
      baseCommand.success(undefined);

      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', null);
      expect(consoleSpy).toHaveBeenLastCalledWith('[SUCCESS]', undefined);
    });

    test('should handle numeric messages', () => {
      baseCommand.info(42);
      baseCommand.success(0);

      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 42);
      expect(consoleSpy).toHaveBeenLastCalledWith('[SUCCESS]', 0);
    });

    test('should handle object messages', () => {
      const obj = { test: 'value' };
      baseCommand.info(obj);

      expect(consoleSpy).toHaveBeenLastCalledWith('[INFO]', obj);
    });
  });
});

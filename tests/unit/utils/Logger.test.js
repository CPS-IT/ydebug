/**
 * Comprehensive unit tests for Logger.js utility
 * Tests all functionality including log levels, filtering, formatting, and console output
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

const { Logger, logger, LOG_LEVELS, LOG_TARGETS, LOG_FORMATS } = require('../../../src/utils/Logger');
const fs = require('fs');
const path = require('path');

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    appendFile: jest.fn().mockResolvedValue(),
    stat: jest.fn().mockResolvedValue({ size: 1000 }),
    mkdir: jest.fn().mockResolvedValue(),
    rename: jest.fn().mockResolvedValue(),
    unlink: jest.fn().mockResolvedValue()
  }
}));

// Mock config manager to avoid circular dependency
jest.mock('../../../src/config/ConfigManager', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue({
      level: 'info',
      target: 'console',
      directory: 'var/log',
      filename: 'test.log',
      format: 'text'
    })
  }));
});

describe('Logger', () => {
  let originalConsole;
  let mockConsole;

  beforeEach(() => {
    // Store original console methods
    originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      log: console.log
    };

    // Create mock console methods
    mockConsole = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      log: jest.fn()
    };

    // Replace console methods with mocks
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
    console.info = mockConsole.info;
    console.log = mockConsole.log;

    // Mock Date.toISOString for consistent timestamps in tests
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.log = originalConsole.log;

    // Clear all mocks
    jest.clearAllMocks();
        
    // Restore Date mock
    Date.prototype.toISOString.mockRestore();
  });

  describe('Logger Class', () => {
    describe('Constructor', () => {
      it('should create logger with default options', () => {
        const testLogger = new Logger();
        expect(testLogger.level).toBe(LOG_LEVELS.INFO);
        expect(testLogger.target).toBe(LOG_TARGETS.CONSOLE);
        expect(testLogger.format).toBe(LOG_FORMATS.TEXT);
        expect(testLogger.category).toBe('general');
      });

      it('should create logger with custom options', () => {
        const options = {
          level: LOG_LEVELS.DEBUG,
          target: LOG_TARGETS.FILE,
          format: LOG_FORMATS.JSON,
          category: 'test',
          directory: 'custom/log',
          filename: 'custom.log'
        };
        const testLogger = new Logger(options);
        expect(testLogger.level).toBe(LOG_LEVELS.DEBUG);
        expect(testLogger.target).toBe(LOG_TARGETS.FILE);
        expect(testLogger.format).toBe(LOG_FORMATS.JSON);
        expect(testLogger.category).toBe('test');
        expect(testLogger.directory).toBe('custom/log');
        expect(testLogger.filename).toBe('custom.log');
      });

      it('should create logger with rotation options', () => {
        const options = {
          rotation: {
            enabled: true,
            maxSize: '5MB',
            maxFiles: 3
          }
        };
        const testLogger = new Logger(options);
        expect(testLogger.rotation.enabled).toBe(true);
        expect(testLogger.rotation.maxSize).toBe(5 * 1024 * 1024);
        expect(testLogger.rotation.maxFiles).toBe(3);
      });
    });

    describe('Static Properties', () => {
      it('should have correct LOG_LEVELS values', () => {
        expect(Logger.LOG_LEVELS).toEqual({
          ERROR: 0,
          WARN: 1,
          INFO: 2,
          DEBUG: 3
        });
      });

      it('should have correct LEVEL_NAMES mapping', () => {
        expect(Logger.LEVEL_NAMES).toEqual({
          0: 'ERROR',
          1: 'WARN',
          2: 'INFO',
          3: 'DEBUG'
        });
      });

      it('should have correct TARGETS values', () => {
        expect(Logger.TARGETS).toEqual({
          CONSOLE: 'console',
          FILE: 'file',
          BOTH: 'both'
        });
      });

      it('should have correct FORMATS values', () => {
        expect(Logger.FORMATS).toEqual({
          TEXT: 'text',
          JSON: 'json'
        });
      });

      it('should have consistent level names and values', () => {
        Object.entries(Logger.LOG_LEVELS).forEach(([name, value]) => {
          expect(Logger.LEVEL_NAMES[value]).toBe(name);
        });
      });
    });

    describe('setLevel()', () => {
      let testLogger;

      beforeEach(() => {
        testLogger = new Logger();
      });

      it('should set ERROR level', () => {
        testLogger.setLevel(LOG_LEVELS.ERROR);
        expect(testLogger.level).toBe(LOG_LEVELS.ERROR);
      });

      it('should set WARN level', () => {
        testLogger.setLevel(LOG_LEVELS.WARN);
        expect(testLogger.level).toBe(LOG_LEVELS.WARN);
      });

      it('should set INFO level', () => {
        testLogger.setLevel(LOG_LEVELS.INFO);
        expect(testLogger.level).toBe(LOG_LEVELS.INFO);
      });

      it('should set DEBUG level', () => {
        testLogger.setLevel(LOG_LEVELS.DEBUG);
        expect(testLogger.level).toBe(LOG_LEVELS.DEBUG);
      });

      it('should update level from default', () => {
        expect(testLogger.level).toBe(LOG_LEVELS.INFO);
        testLogger.setLevel(LOG_LEVELS.ERROR);
        expect(testLogger.level).toBe(LOG_LEVELS.ERROR);
      });
    });

    describe('setTarget()', () => {
      let testLogger;

      beforeEach(() => {
        testLogger = new Logger();
      });

      it('should set target to console', () => {
        testLogger.setTarget(LOG_TARGETS.CONSOLE);
        expect(testLogger.target).toBe(LOG_TARGETS.CONSOLE);
      });

      it('should set target to file', () => {
        testLogger.setTarget(LOG_TARGETS.FILE);
        expect(testLogger.target).toBe(LOG_TARGETS.FILE);
      });

      it('should set target to both', () => {
        testLogger.setTarget(LOG_TARGETS.BOTH);
        expect(testLogger.target).toBe(LOG_TARGETS.BOTH);
      });
    });

    describe('setCategory()', () => {
      let testLogger;

      beforeEach(() => {
        testLogger = new Logger();
      });

      it('should set category', () => {
        testLogger.setCategory('test-category');
        expect(testLogger.category).toBe('test-category');
      });
    });

    describe('parseSize()', () => {
      let testLogger;

      beforeEach(() => {
        testLogger = new Logger();
      });

      it('should parse bytes', () => {
        expect(testLogger.parseSize('1000B')).toBe(1000);
        expect(testLogger.parseSize('1000')).toBe(1000);
      });

      it('should parse kilobytes', () => {
        expect(testLogger.parseSize('5KB')).toBe(5120);
      });

      it('should parse megabytes', () => {
        expect(testLogger.parseSize('10MB')).toBe(10485760);
      });

      it('should parse gigabytes', () => {
        expect(testLogger.parseSize('1GB')).toBe(1073741824);
      });

      it('should handle invalid format', () => {
        expect(testLogger.parseSize('invalid')).toBe(10485760); // Default 10MB
      });
    });

    describe('shouldLog()', () => {
      it('should return true for ERROR level when logger level is ERROR', () => {
        const testLogger = new Logger({ level: LOG_LEVELS.ERROR });
        expect(testLogger.shouldLog(LOG_LEVELS.ERROR)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.WARN)).toBe(false);
        expect(testLogger.shouldLog(LOG_LEVELS.INFO)).toBe(false);
        expect(testLogger.shouldLog(LOG_LEVELS.DEBUG)).toBe(false);
      });

      it('should return true for ERROR and WARN levels when logger level is WARN', () => {
        const testLogger = new Logger({ level: LOG_LEVELS.WARN });
        expect(testLogger.shouldLog(LOG_LEVELS.ERROR)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.WARN)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.INFO)).toBe(false);
        expect(testLogger.shouldLog(LOG_LEVELS.DEBUG)).toBe(false);
      });

      it('should return true for ERROR, WARN, and INFO levels when logger level is INFO', () => {
        const testLogger = new Logger({ level: LOG_LEVELS.INFO });
        expect(testLogger.shouldLog(LOG_LEVELS.ERROR)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.WARN)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.INFO)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.DEBUG)).toBe(false);
      });

      it('should return true for all levels when logger level is DEBUG', () => {
        const testLogger = new Logger({ level: LOG_LEVELS.DEBUG });
        expect(testLogger.shouldLog(LOG_LEVELS.ERROR)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.WARN)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.INFO)).toBe(true);
        expect(testLogger.shouldLog(LOG_LEVELS.DEBUG)).toBe(true);
      });
    });

    describe('formatMessage()', () => {
      let testLogger;

      beforeEach(() => {
        testLogger = new Logger({ format: LOG_FORMATS.TEXT });
      });

      it('should format text message with timestamp, category and level prefix', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message');
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] INFO:', 'Test message']);
      });

      it('should format JSON message', () => {
        testLogger.format = LOG_FORMATS.JSON;
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message');
        const parsed = JSON.parse(result);
        expect(parsed).toEqual({
          timestamp: '2024-01-01T00:00:00.000Z',
          level: 'INFO',
          category: 'general',
          message: 'Test message'
        });
      });

      it('should include data in JSON format', () => {
        testLogger.format = LOG_FORMATS.JSON;
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message', 'arg1', 'arg2');
        const parsed = JSON.parse(result);
        expect(parsed.data).toEqual(['arg1', 'arg2']);
      });

      it('should format ERROR level messages', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.ERROR, 'Error message');
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] ERROR:', 'Error message']);
      });

      it('should format WARN level messages', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.WARN, 'Warning message');
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] WARN:', 'Warning message']);
      });

      it('should format DEBUG level messages', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.DEBUG, 'Debug message');
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] DEBUG:', 'Debug message']);
      });

      it('should use custom category in formatting', () => {
        testLogger.setCategory('custom');
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message');
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [custom] INFO:', 'Test message']);
      });

      it('should handle message with additional arguments', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message', 'arg1', 'arg2');
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] INFO:', 'Test message', 'arg1', 'arg2']);
      });

      it('should handle message with objects as arguments', () => {
        const obj = { key: 'value' };
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message', obj);
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] INFO:', 'Test message', obj]);
      });

      it('should handle message with mixed argument types', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test', 42, true, null, { a: 1 });
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] INFO:', 'Test', 42, true, null, { a: 1 }]);
      });

      it('should handle empty message', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, '');
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] INFO:', '']);
      });

      it('should handle undefined message', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, undefined);
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] INFO:', undefined]);
      });

      it('should handle null message', () => {
        const result = testLogger.formatMessage(LOG_LEVELS.INFO, null);
        expect(result).toEqual(['[2024-01-01T00:00:00.000Z] [general] INFO:', null]);
      });
    });

    describe('Async Logging Methods', () => {
      let testLogger;

      beforeEach(() => {
        testLogger = new Logger({ level: LOG_LEVELS.DEBUG, target: LOG_TARGETS.CONSOLE });
      });

      describe('error()', () => {
        it('should call console.error with formatted message', async () => {
          testLogger.error('Error message');
          // Allow async processing
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.error).toHaveBeenCalledWith(
            '[2024-01-01T00:00:00.000Z] [general] ERROR:',
            'Error message'
          );
        });

        it('should call console.error with additional arguments', async () => {
          testLogger.error('Error message', 'arg1', 'arg2');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.error).toHaveBeenCalledWith(
            '[2024-01-01T00:00:00.000Z] [general] ERROR:',
            'Error message',
            'arg1',
            'arg2'
          );
        });

        it('should not call console.error when level is below ERROR', async () => {
          testLogger.setLevel(-1); // Invalid level that would block ERROR
          testLogger.error('Error message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.error).not.toHaveBeenCalled();
        });

        it('should call console.error when logger level is ERROR', async () => {
          testLogger.setLevel(LOG_LEVELS.ERROR);
          testLogger.error('Error message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.error).toHaveBeenCalledWith(
            '[2024-01-01T00:00:00.000Z] [general] ERROR:',
            'Error message'
          );
        });

        it('should call console.error when logger level is WARN or higher', async () => {
          testLogger.setLevel(LOG_LEVELS.WARN);
          testLogger.error('Error message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.error).toHaveBeenCalled();

          mockConsole.error.mockClear();

          testLogger.setLevel(LOG_LEVELS.INFO);
          testLogger.error('Error message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.error).toHaveBeenCalled();

          mockConsole.error.mockClear();

          testLogger.setLevel(LOG_LEVELS.DEBUG);
          testLogger.error('Error message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.error).toHaveBeenCalled();
        });
      });

      describe('warn()', () => {
        it('should call console.warn with formatted message', async () => {
          testLogger.warn('Warning message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.warn).toHaveBeenCalledWith(
            '[2024-01-01T00:00:00.000Z] [general] WARN:',
            'Warning message'
          );
        });

        it('should call console.warn with additional arguments', async () => {
          testLogger.warn('Warning message', 'arg1', 'arg2');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.warn).toHaveBeenCalledWith(
            '[2024-01-01T00:00:00.000Z] [general] WARN:',
            'Warning message',
            'arg1',
            'arg2'
          );
        });

        it('should not call console.warn when level is ERROR', async () => {
          testLogger.setLevel(LOG_LEVELS.ERROR);
          testLogger.warn('Warning message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.warn).not.toHaveBeenCalled();
        });

        it('should call console.warn when logger level is WARN or higher', async () => {
          testLogger.setLevel(LOG_LEVELS.WARN);
          testLogger.warn('Warning message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.warn).toHaveBeenCalled();

          mockConsole.warn.mockClear();

          testLogger.setLevel(LOG_LEVELS.INFO);
          testLogger.warn('Warning message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.warn).toHaveBeenCalled();

          mockConsole.warn.mockClear();

          testLogger.setLevel(LOG_LEVELS.DEBUG);
          testLogger.warn('Warning message');
          await new Promise(resolve => setImmediate(resolve));
          expect(mockConsole.warn).toHaveBeenCalled();
        });
      });
    });
  });

  describe('File Logging', () => {
    let testLogger;
    let mkdirSpy, appendFileSpy;

    beforeEach(() => {
      testLogger = new Logger({ 
        level: LOG_LEVELS.DEBUG,
        target: LOG_TARGETS.FILE,
        directory: 'test/log',
        filename: 'test.log'
      });
      
      // Create spies for fs.promises methods
      mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue();
      appendFileSpy = jest.spyOn(fs.promises, 'appendFile').mockResolvedValue();
      
      jest.clearAllMocks();
    });

    afterEach(() => {
      mkdirSpy.mockRestore();
      appendFileSpy.mockRestore();
    });

    it('should write to file when target is FILE', async () => {
      testLogger.info('Test message');
      
      // Check that message was queued
      expect(testLogger._writeQueue).toHaveLength(1);
      expect(testLogger._writeQueue[0]).toBe('[2024-01-01T00:00:00.000Z] [general] INFO: Test message');
      
      // Process the queue manually and check fs calls
      await testLogger.processWriteQueue();
      
      expect(mkdirSpy).toHaveBeenCalledWith('test/log', { recursive: true });
      expect(appendFileSpy).toHaveBeenCalledWith(
        path.join('test/log', 'test.log'),
        '[2024-01-01T00:00:00.000Z] [general] INFO: Test message\n',
        'utf8'
      );
    });

    it('should write to both console and file when target is BOTH', async () => {
      testLogger.setTarget(LOG_TARGETS.BOTH);
      testLogger.info('Test message');
      await testLogger.processWriteQueue();
      
      expect(mockConsole.info).toHaveBeenCalled();
      expect(appendFileSpy).toHaveBeenCalled();
    });

    it('should not write to file when target is CONSOLE', async () => {
      testLogger.setTarget(LOG_TARGETS.CONSOLE);
      testLogger.info('Test message');
      await testLogger.processWriteQueue();
      
      expect(mockConsole.info).toHaveBeenCalled();
      expect(appendFileSpy).not.toHaveBeenCalled();
    });
  });

  describe('Log Rotation', () => {
    let testLogger;
    let statSpy, renameSpy, unlinkSpy, mkdirSpy, appendFileSpy;

    beforeEach(() => {
      testLogger = new Logger({
        target: LOG_TARGETS.FILE,
        rotation: {
          enabled: true,
          maxSize: '1KB',
          maxFiles: 3
        }
      });
      
      // Create spies for fs.promises methods
      statSpy = jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 1000 });
      renameSpy = jest.spyOn(fs.promises, 'rename').mockResolvedValue();
      unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();
      mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue();
      appendFileSpy = jest.spyOn(fs.promises, 'appendFile').mockResolvedValue();
      
      jest.clearAllMocks();
    });

    afterEach(() => {
      statSpy.mockRestore();
      renameSpy.mockRestore();
      unlinkSpy.mockRestore();
      mkdirSpy.mockRestore();
      appendFileSpy.mockRestore();
    });

    it('should rotate log files when size limit is reached', async () => {
      // Mock file size to exceed limit
      statSpy.mockResolvedValue({ size: 2000 }); // 2KB > 1KB limit
      
      testLogger.info('Test message');
      await testLogger.processWriteQueue();
      
      expect(renameSpy).toHaveBeenCalled();
    });

    it('should not rotate when size is under limit', async () => {
      // Mock file size under limit
      statSpy.mockResolvedValue({ size: 500 }); // 500B < 1KB limit
      
      testLogger.info('Test message');
      await testLogger.processWriteQueue();
      
      expect(renameSpy).not.toHaveBeenCalled();
    });

    it('should not rotate when rotation is disabled', async () => {
      testLogger.rotation.enabled = false;
      statSpy.mockResolvedValue({ size: 2000 });
      
      testLogger.info('Test message');
      await testLogger.processWriteQueue();
      
      expect(renameSpy).not.toHaveBeenCalled();
    });
  });

  describe('Static Methods', () => {
    it('should create logger with category', () => {
      const categoryLogger = Logger.createLogger('test-category');
      expect(categoryLogger).toBeInstanceOf(Logger);
      expect(categoryLogger.category).toBe('test-category');
    });

    it('should create logger with category and options', () => {
      const categoryLogger = Logger.createLogger('test-category', {
        level: LOG_LEVELS.DEBUG,
        target: LOG_TARGETS.FILE
      });
      expect(categoryLogger.category).toBe('test-category');
      expect(categoryLogger.level).toBe(LOG_LEVELS.DEBUG);
      expect(categoryLogger.target).toBe(LOG_TARGETS.FILE);
    });
  });

  describe('Module Exports', () => {
    it('should export Logger class', () => {
      expect(Logger).toBeDefined();
      expect(typeof Logger).toBe('function');
      expect(Logger.name).toBe('Logger');
    });

    it('should export logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should export LOG_LEVELS constant', () => {
      expect(LOG_LEVELS).toBeDefined();
      expect(LOG_LEVELS).toEqual(Logger.LOG_LEVELS);
    });

    it('should export LOG_TARGETS constant', () => {
      expect(LOG_TARGETS).toBeDefined();
      expect(LOG_TARGETS).toEqual(Logger.TARGETS);
    });

    it('should export LOG_FORMATS constant', () => {
      expect(LOG_FORMATS).toBeDefined();
      expect(LOG_FORMATS).toEqual(Logger.FORMATS);
    });

    it('should have all expected exports', () => {
      const loggerModule = require('../../../src/utils/Logger');
      expect(Object.keys(loggerModule).sort()).toEqual([
        'Logger', 'logger', 'LOG_LEVELS', 'LOG_TARGETS', 'LOG_FORMATS'
      ].sort());
    });
  });

  describe('Default Logger Instance', () => {
    beforeEach(() => {
      // Reset default logger to expected initial state
      logger.setLevel(LOG_LEVELS.INFO);
      logger.setTarget(LOG_TARGETS.CONSOLE);
    });

    it('should be initialized with configured settings', () => {
      expect(logger.level).toBe(LOG_LEVELS.INFO);
      expect(logger.target).toBe(LOG_TARGETS.CONSOLE);
    });

    it('should be an instance of Logger', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should work with error() method', async () => {
      logger.error('Default logger error');
      await new Promise(resolve => setImmediate(resolve));
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[2024-01-01T00:00:00.000Z] [general] ERROR:',
        'Default logger error'
      );
    });

    it('should work with warn() method', async () => {
      logger.warn('Default logger warning');
      await new Promise(resolve => setImmediate(resolve));
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[2024-01-01T00:00:00.000Z] [general] WARN:',
        'Default logger warning'
      );
    });

    it('should work with info() method', async () => {
      logger.info('Default logger info');
      await new Promise(resolve => setImmediate(resolve));
      expect(mockConsole.info).toHaveBeenCalledWith(
        '[2024-01-01T00:00:00.000Z] [general] INFO:',
        'Default logger info'
      );
    });

    it('should not log debug messages by default', async () => {
      logger.debug('Default logger debug');
      await new Promise(resolve => setImmediate(resolve));
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should allow level changes', async () => {
      logger.setLevel(LOG_LEVELS.DEBUG);
      logger.debug('Debug message after level change');
      await new Promise(resolve => setImmediate(resolve));
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[2024-01-01T00:00:00.000Z] [general] DEBUG:',
        'Debug message after level change'
      );
    });

    it('should be the same instance across imports', () => {
      const { logger: logger2 } = require('../../../src/utils/Logger');
      expect(logger).toBe(logger2);
    });

    it('should maintain state across method calls', async () => {
      logger.setLevel(LOG_LEVELS.ERROR);
      logger.info('Should not appear');
      logger.error('Should appear');
      await new Promise(resolve => setImmediate(resolve));
            
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });
  });

});
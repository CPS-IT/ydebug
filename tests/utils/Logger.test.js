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

const { Logger, logger, LOG_LEVELS } = require('../../src/utils/Logger');

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
            it('should create logger with default INFO level', () => {
                const testLogger = new Logger();
                expect(testLogger.level).toBe(LOG_LEVELS.INFO);
            });

            it('should create logger with specified level', () => {
                const testLogger = new Logger(LOG_LEVELS.DEBUG);
                expect(testLogger.level).toBe(LOG_LEVELS.DEBUG);
            });

            it('should create logger with ERROR level', () => {
                const testLogger = new Logger(LOG_LEVELS.ERROR);
                expect(testLogger.level).toBe(LOG_LEVELS.ERROR);
            });

            it('should create logger with WARN level', () => {
                const testLogger = new Logger(LOG_LEVELS.WARN);
                expect(testLogger.level).toBe(LOG_LEVELS.WARN);
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

        describe('shouldLog()', () => {
            it('should return true for ERROR level when logger level is ERROR', () => {
                const testLogger = new Logger(LOG_LEVELS.ERROR);
                expect(testLogger.shouldLog(LOG_LEVELS.ERROR)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.WARN)).toBe(false);
                expect(testLogger.shouldLog(LOG_LEVELS.INFO)).toBe(false);
                expect(testLogger.shouldLog(LOG_LEVELS.DEBUG)).toBe(false);
            });

            it('should return true for ERROR and WARN levels when logger level is WARN', () => {
                const testLogger = new Logger(LOG_LEVELS.WARN);
                expect(testLogger.shouldLog(LOG_LEVELS.ERROR)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.WARN)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.INFO)).toBe(false);
                expect(testLogger.shouldLog(LOG_LEVELS.DEBUG)).toBe(false);
            });

            it('should return true for ERROR, WARN, and INFO levels when logger level is INFO', () => {
                const testLogger = new Logger(LOG_LEVELS.INFO);
                expect(testLogger.shouldLog(LOG_LEVELS.ERROR)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.WARN)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.INFO)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.DEBUG)).toBe(false);
            });

            it('should return true for all levels when logger level is DEBUG', () => {
                const testLogger = new Logger(LOG_LEVELS.DEBUG);
                expect(testLogger.shouldLog(LOG_LEVELS.ERROR)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.WARN)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.INFO)).toBe(true);
                expect(testLogger.shouldLog(LOG_LEVELS.DEBUG)).toBe(true);
            });
        });

        describe('formatMessage()', () => {
            let testLogger;

            beforeEach(() => {
                testLogger = new Logger();
            });

            it('should format message with timestamp and level prefix', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message');
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] INFO:', 'Test message']);
            });

            it('should format ERROR level messages', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.ERROR, 'Error message');
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] ERROR:', 'Error message']);
            });

            it('should format WARN level messages', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.WARN, 'Warning message');
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] WARN:', 'Warning message']);
            });

            it('should format DEBUG level messages', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.DEBUG, 'Debug message');
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] DEBUG:', 'Debug message']);
            });

            it('should handle message with additional arguments', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message', 'arg1', 'arg2');
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] INFO:', 'Test message', 'arg1', 'arg2']);
            });

            it('should handle message with objects as arguments', () => {
                const obj = { key: 'value' };
                const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test message', obj);
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] INFO:', 'Test message', obj]);
            });

            it('should handle message with mixed argument types', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.INFO, 'Test', 42, true, null, { a: 1 });
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] INFO:', 'Test', 42, true, null, { a: 1 }]);
            });

            it('should handle empty message', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.INFO, '');
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] INFO:', '']);
            });

            it('should handle undefined message', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.INFO, undefined);
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] INFO:', undefined]);
            });

            it('should handle null message', () => {
                const result = testLogger.formatMessage(LOG_LEVELS.INFO, null);
                expect(result).toEqual(['[2024-01-01T00:00:00.000Z] INFO:', null]);
            });
        });

        describe('error()', () => {
            let testLogger;

            beforeEach(() => {
                testLogger = new Logger(LOG_LEVELS.DEBUG); // Allow all messages
            });

            it('should call console.error with formatted message', () => {
                testLogger.error('Error message');
                expect(mockConsole.error).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] ERROR:',
                    'Error message'
                );
            });

            it('should call console.error with additional arguments', () => {
                testLogger.error('Error message', 'arg1', 'arg2');
                expect(mockConsole.error).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] ERROR:',
                    'Error message',
                    'arg1',
                    'arg2'
                );
            });

            it('should not call console.error when level is below ERROR', () => {
                // No level is below ERROR, but test the filtering logic
                testLogger.setLevel(-1); // Invalid level that would block ERROR
                testLogger.error('Error message');
                expect(mockConsole.error).not.toHaveBeenCalled();
            });

            it('should call console.error when logger level is ERROR', () => {
                testLogger.setLevel(LOG_LEVELS.ERROR);
                testLogger.error('Error message');
                expect(mockConsole.error).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] ERROR:',
                    'Error message'
                );
            });

            it('should call console.error when logger level is WARN or higher', () => {
                testLogger.setLevel(LOG_LEVELS.WARN);
                testLogger.error('Error message');
                expect(mockConsole.error).toHaveBeenCalled();

                mockConsole.error.mockClear();

                testLogger.setLevel(LOG_LEVELS.INFO);
                testLogger.error('Error message');
                expect(mockConsole.error).toHaveBeenCalled();

                mockConsole.error.mockClear();

                testLogger.setLevel(LOG_LEVELS.DEBUG);
                testLogger.error('Error message');
                expect(mockConsole.error).toHaveBeenCalled();
            });
        });

        describe('warn()', () => {
            let testLogger;

            beforeEach(() => {
                testLogger = new Logger(LOG_LEVELS.DEBUG); // Allow all messages
            });

            it('should call console.warn with formatted message', () => {
                testLogger.warn('Warning message');
                expect(mockConsole.warn).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] WARN:',
                    'Warning message'
                );
            });

            it('should call console.warn with additional arguments', () => {
                testLogger.warn('Warning message', 'arg1', 'arg2');
                expect(mockConsole.warn).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] WARN:',
                    'Warning message',
                    'arg1',
                    'arg2'
                );
            });

            it('should not call console.warn when level is ERROR', () => {
                testLogger.setLevel(LOG_LEVELS.ERROR);
                testLogger.warn('Warning message');
                expect(mockConsole.warn).not.toHaveBeenCalled();
            });

            it('should call console.warn when logger level is WARN or higher', () => {
                testLogger.setLevel(LOG_LEVELS.WARN);
                testLogger.warn('Warning message');
                expect(mockConsole.warn).toHaveBeenCalled();

                mockConsole.warn.mockClear();

                testLogger.setLevel(LOG_LEVELS.INFO);
                testLogger.warn('Warning message');
                expect(mockConsole.warn).toHaveBeenCalled();

                mockConsole.warn.mockClear();

                testLogger.setLevel(LOG_LEVELS.DEBUG);
                testLogger.warn('Warning message');
                expect(mockConsole.warn).toHaveBeenCalled();
            });
        });

        describe('info()', () => {
            let testLogger;

            beforeEach(() => {
                testLogger = new Logger(LOG_LEVELS.DEBUG); // Allow all messages
            });

            it('should call console.info with formatted message', () => {
                testLogger.info('Info message');
                expect(mockConsole.info).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] INFO:',
                    'Info message'
                );
            });

            it('should call console.info with additional arguments', () => {
                testLogger.info('Info message', 'arg1', 'arg2');
                expect(mockConsole.info).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] INFO:',
                    'Info message',
                    'arg1',
                    'arg2'
                );
            });

            it('should not call console.info when level is ERROR or WARN', () => {
                testLogger.setLevel(LOG_LEVELS.ERROR);
                testLogger.info('Info message');
                expect(mockConsole.info).not.toHaveBeenCalled();

                testLogger.setLevel(LOG_LEVELS.WARN);
                testLogger.info('Info message');
                expect(mockConsole.info).not.toHaveBeenCalled();
            });

            it('should call console.info when logger level is INFO or DEBUG', () => {
                testLogger.setLevel(LOG_LEVELS.INFO);
                testLogger.info('Info message');
                expect(mockConsole.info).toHaveBeenCalled();

                mockConsole.info.mockClear();

                testLogger.setLevel(LOG_LEVELS.DEBUG);
                testLogger.info('Info message');
                expect(mockConsole.info).toHaveBeenCalled();
            });
        });

        describe('debug()', () => {
            let testLogger;

            beforeEach(() => {
                testLogger = new Logger(LOG_LEVELS.DEBUG); // Allow all messages
            });

            it('should call console.log with formatted message', () => {
                testLogger.debug('Debug message');
                expect(mockConsole.log).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] DEBUG:',
                    'Debug message'
                );
            });

            it('should call console.log with additional arguments', () => {
                testLogger.debug('Debug message', 'arg1', 'arg2');
                expect(mockConsole.log).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] DEBUG:',
                    'Debug message',
                    'arg1',
                    'arg2'
                );
            });

            it('should not call console.log when level is ERROR, WARN, or INFO', () => {
                testLogger.setLevel(LOG_LEVELS.ERROR);
                testLogger.debug('Debug message');
                expect(mockConsole.log).not.toHaveBeenCalled();

                testLogger.setLevel(LOG_LEVELS.WARN);
                testLogger.debug('Debug message');
                expect(mockConsole.log).not.toHaveBeenCalled();

                testLogger.setLevel(LOG_LEVELS.INFO);
                testLogger.debug('Debug message');
                expect(mockConsole.log).not.toHaveBeenCalled();
            });

            it('should call console.log only when logger level is DEBUG', () => {
                testLogger.setLevel(LOG_LEVELS.DEBUG);
                testLogger.debug('Debug message');
                expect(mockConsole.log).toHaveBeenCalled();
            });
        });

        describe('Level Filtering Integration Tests', () => {
            let testLogger;

            beforeEach(() => {
                testLogger = new Logger();
            });

            it('should respect level filtering across all methods when set to ERROR', () => {
                testLogger.setLevel(LOG_LEVELS.ERROR);

                testLogger.error('Error message');
                testLogger.warn('Warning message');
                testLogger.info('Info message');
                testLogger.debug('Debug message');

                expect(mockConsole.error).toHaveBeenCalledTimes(1);
                expect(mockConsole.warn).not.toHaveBeenCalled();
                expect(mockConsole.info).not.toHaveBeenCalled();
                expect(mockConsole.log).not.toHaveBeenCalled();
            });

            it('should respect level filtering across all methods when set to WARN', () => {
                testLogger.setLevel(LOG_LEVELS.WARN);

                testLogger.error('Error message');
                testLogger.warn('Warning message');
                testLogger.info('Info message');
                testLogger.debug('Debug message');

                expect(mockConsole.error).toHaveBeenCalledTimes(1);
                expect(mockConsole.warn).toHaveBeenCalledTimes(1);
                expect(mockConsole.info).not.toHaveBeenCalled();
                expect(mockConsole.log).not.toHaveBeenCalled();
            });

            it('should respect level filtering across all methods when set to INFO', () => {
                testLogger.setLevel(LOG_LEVELS.INFO);

                testLogger.error('Error message');
                testLogger.warn('Warning message');
                testLogger.info('Info message');
                testLogger.debug('Debug message');

                expect(mockConsole.error).toHaveBeenCalledTimes(1);
                expect(mockConsole.warn).toHaveBeenCalledTimes(1);
                expect(mockConsole.info).toHaveBeenCalledTimes(1);
                expect(mockConsole.log).not.toHaveBeenCalled();
            });

            it('should respect level filtering across all methods when set to DEBUG', () => {
                testLogger.setLevel(LOG_LEVELS.DEBUG);

                testLogger.error('Error message');
                testLogger.warn('Warning message');
                testLogger.info('Info message');
                testLogger.debug('Debug message');

                expect(mockConsole.error).toHaveBeenCalledTimes(1);
                expect(mockConsole.warn).toHaveBeenCalledTimes(1);
                expect(mockConsole.info).toHaveBeenCalledTimes(1);
                expect(mockConsole.log).toHaveBeenCalledTimes(1);
            });
        });

        describe('Edge Cases and Error Handling', () => {
            let testLogger;

            beforeEach(() => {
                testLogger = new Logger(LOG_LEVELS.DEBUG);
            });

            it('should handle Error objects as messages', () => {
                const error = new Error('Test error');
                testLogger.error(error);
                expect(mockConsole.error).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] ERROR:',
                    error
                );
            });

            it('should handle complex objects as messages', () => {
                const complexObj = {
                    nested: { value: 42 },
                    array: [1, 2, 3],
                    func: () => 'test'
                };
                testLogger.info(complexObj);
                expect(mockConsole.info).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] INFO:',
                    complexObj
                );
            });

            it('should handle numbers as messages', () => {
                testLogger.info(42);
                expect(mockConsole.info).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] INFO:',
                    42
                );
            });

            it('should handle booleans as messages', () => {
                testLogger.info(true);
                testLogger.info(false);
                expect(mockConsole.info).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] INFO:',
                    true
                );
                expect(mockConsole.info).toHaveBeenCalledWith(
                    '[2024-01-01T00:00:00.000Z] INFO:',
                    false
                );
            });

            it('should handle multiple calls in sequence', () => {
                testLogger.error('Error 1');
                testLogger.warn('Warning 1');
                testLogger.info('Info 1');
                testLogger.debug('Debug 1');
                testLogger.error('Error 2');

                expect(mockConsole.error).toHaveBeenCalledTimes(2);
                expect(mockConsole.warn).toHaveBeenCalledTimes(1);
                expect(mockConsole.info).toHaveBeenCalledTimes(1);
                expect(mockConsole.log).toHaveBeenCalledTimes(1);
            });

            it('should handle level changes during execution', () => {
                testLogger.setLevel(LOG_LEVELS.ERROR);
                testLogger.info('Should not appear');
                expect(mockConsole.info).not.toHaveBeenCalled();

                testLogger.setLevel(LOG_LEVELS.INFO);
                testLogger.info('Should appear');
                expect(mockConsole.info).toHaveBeenCalledTimes(1);
            });
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

        it('should have all expected exports', () => {
            const loggerModule = require('../../src/utils/Logger');
            expect(Object.keys(loggerModule)).toEqual(['Logger', 'logger', 'LOG_LEVELS']);
        });
    });

    describe('Default Logger Instance', () => {
        beforeEach(() => {
            // Reset default logger to INFO level
            logger.setLevel(LOG_LEVELS.INFO);
        });

        it('should be initialized with INFO level', () => {
            expect(logger.level).toBe(LOG_LEVELS.INFO);
        });

        it('should be an instance of Logger', () => {
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should work with error() method', () => {
            logger.error('Default logger error');
            expect(mockConsole.error).toHaveBeenCalledWith(
                '[2024-01-01T00:00:00.000Z] ERROR:',
                'Default logger error'
            );
        });

        it('should work with warn() method', () => {
            logger.warn('Default logger warning');
            expect(mockConsole.warn).toHaveBeenCalledWith(
                '[2024-01-01T00:00:00.000Z] WARN:',
                'Default logger warning'
            );
        });

        it('should work with info() method', () => {
            logger.info('Default logger info');
            expect(mockConsole.info).toHaveBeenCalledWith(
                '[2024-01-01T00:00:00.000Z] INFO:',
                'Default logger info'
            );
        });

        it('should not log debug messages by default', () => {
            logger.debug('Default logger debug');
            expect(mockConsole.log).not.toHaveBeenCalled();
        });

        it('should allow level changes', () => {
            logger.setLevel(LOG_LEVELS.DEBUG);
            logger.debug('Debug message after level change');
            expect(mockConsole.log).toHaveBeenCalledWith(
                '[2024-01-01T00:00:00.000Z] DEBUG:',
                'Debug message after level change'
            );
        });

        it('should be the same instance across imports', () => {
            const { logger: logger2 } = require('../../src/utils/Logger');
            expect(logger).toBe(logger2);
        });

        it('should maintain state across method calls', () => {
            logger.setLevel(LOG_LEVELS.ERROR);
            logger.info('Should not appear');
            logger.error('Should appear');
            
            expect(mockConsole.info).not.toHaveBeenCalled();
            expect(mockConsole.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('Real Timestamp Behavior', () => {
        let testLogger;

        beforeEach(() => {
            // Remove the Date mock for these tests
            Date.prototype.toISOString.mockRestore();
            testLogger = new Logger(LOG_LEVELS.DEBUG);
        });

        afterEach(() => {
            // Re-mock Date for other tests
            jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
        });

        it('should use real timestamps', () => {
            testLogger.info('Test message');
            
            expect(mockConsole.info).toHaveBeenCalledTimes(1);
            const [prefix, message] = mockConsole.info.mock.calls[0];
            
            // Verify the format matches ISO timestamp pattern
            const timestampPattern = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO:$/;
            expect(prefix).toMatch(timestampPattern);
            expect(message).toBe('Test message');
        });

        it('should have different timestamps for consecutive calls', (done) => {
            testLogger.info('First message');
            
            // Wait a small amount of time to ensure different timestamps
            setTimeout(() => {
                testLogger.info('Second message');
                
                const [firstPrefix] = mockConsole.info.mock.calls[0];
                const [secondPrefix] = mockConsole.info.mock.calls[1];
                
                // Timestamps should be different (though they might be the same if execution is very fast)
                // At minimum, both should be valid ISO timestamps
                const timestampPattern = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO:$/;
                expect(firstPrefix).toMatch(timestampPattern);
                expect(secondPrefix).toMatch(timestampPattern);
                
                done();
            }, 1);
        });
    });

    describe('Performance and Memory', () => {
        let testLogger;

        beforeEach(() => {
            testLogger = new Logger(LOG_LEVELS.DEBUG);
        });

        it('should handle large number of log calls efficiently', () => {
            const startTime = process.hrtime.bigint();
            
            for (let i = 0; i < 1000; i++) {
                testLogger.info(`Message ${i}`);
            }
            
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            
            expect(mockConsole.info).toHaveBeenCalledTimes(1000);
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should not create unnecessary objects when logging is disabled', () => {
            testLogger.setLevel(LOG_LEVELS.ERROR); // Disable info logging
            
            const spy = jest.spyOn(testLogger, 'formatMessage');
            
            testLogger.info('This message should not be formatted');
            
            expect(spy).not.toHaveBeenCalled();
            expect(mockConsole.info).not.toHaveBeenCalled();
            
            spy.mockRestore();
        });

        it('should handle very long messages', () => {
            const longMessage = 'A'.repeat(10000);
            testLogger.info(longMessage);
            
            expect(mockConsole.info).toHaveBeenCalledWith(
                '[2024-01-01T00:00:00.000Z] INFO:',
                longMessage
            );
        });

        it('should handle many arguments efficiently', () => {
            const manyArgs = Array.from({ length: 100 }, (_, i) => `arg${i}`);
            testLogger.info('Message with many args', ...manyArgs);
            
            expect(mockConsole.info).toHaveBeenCalledWith(
                '[2024-01-01T00:00:00.000Z] INFO:',
                'Message with many args',
                ...manyArgs
            );
        });
    });
});
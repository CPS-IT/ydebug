/**
 * Tests for MessageBuilder
 * Comprehensive tests for DBGp command message building
 */

const MessageBuilder = require('../../../../src/debugger/protocol/MessageBuilder');

describe('MessageBuilder', () => {
  let messageBuilder;

  beforeEach(() => {
    messageBuilder = new MessageBuilder();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default options', () => {
      expect(messageBuilder.version).toBe('1.0');
      expect(messageBuilder.encoding).toBe('base64');
      expect(messageBuilder.stats).toBeDefined();
      expect(messageBuilder.stats.commandsBuilt).toBe(0);
      expect(messageBuilder.stats.errorsCreated).toBe(0);
    });

    test('should initialize with custom options', () => {
      const customBuilder = new MessageBuilder({
        version: '2.0',
        encoding: 'urlencode'
      });

      expect(customBuilder.version).toBe('2.0');
      expect(customBuilder.encoding).toBe('urlencode');
    });

    test('should initialize stats tracking', () => {
      const stats = messageBuilder.getStats();
      expect(stats).toHaveProperty('commandsBuilt', 0);
      expect(stats).toHaveProperty('errorsCreated', 0);
    });
  });

  describe('Basic Command Building', () => {
    test('should build simple commands', () => {
      const command = messageBuilder.buildCommand('status', 123);
      expect(command).toBe('status -i 123');
      expect(messageBuilder.stats.commandsBuilt).toBe(1);
    });

    test('should build run command', () => {
      const command = messageBuilder.buildCommand('run', 456);
      expect(command).toBe('run -i 456');
    });

    test('should build step commands', () => {
      expect(messageBuilder.buildCommand('step_into', 1)).toBe('step_into -i 1');
      expect(messageBuilder.buildCommand('step_over', 2)).toBe('step_over -i 2');
      expect(messageBuilder.buildCommand('step_out', 3)).toBe('step_out -i 3');
    });

    test('should build control commands', () => {
      expect(messageBuilder.buildCommand('stop', 4)).toBe('stop -i 4');
      expect(messageBuilder.buildCommand('detach', 5)).toBe('detach -i 5');
    });

    test('should build info commands', () => {
      expect(messageBuilder.buildCommand('stack_depth', 6)).toBe('stack_depth -i 6');
      expect(messageBuilder.buildCommand('context_names', 7)).toBe('context_names -i 7');
      expect(messageBuilder.buildCommand('typemap_get', 8)).toBe('typemap_get -i 8');
    });
  });

  describe('Feature Commands', () => {
    test('should build feature_get command with featureName', () => {
      const command = messageBuilder.buildCommand('feature_get', 123, {
        featureName: 'max_depth'
      });
      expect(command).toBe('feature_get -i 123 -n max_depth');
    });

    test('should build feature_get command without arguments', () => {
      const command = messageBuilder.buildCommand('feature_get', 123);
      expect(command).toBe('feature_get -i 123');
    });

    test('should build feature_set command with full arguments', () => {
      const command = messageBuilder.buildCommand('feature_set', 124, {
        featureName: 'max_children',
        value: 100
      });
      expect(command).toBe('feature_set -i 124 -n max_children -v 100');
    });

    test('should build feature_set command with only featureName', () => {
      const command = messageBuilder.buildCommand('feature_set', 125, {
        featureName: 'show_hidden'
      });
      expect(command).toBe('feature_set -i 125 -n show_hidden');
    });

    test('should build feature_set command with only value', () => {
      const command = messageBuilder.buildCommand('feature_set', 126, {
        value: 'enabled'
      });
      expect(command).toBe('feature_set -i 126 -v enabled');
    });
  });

  describe('Breakpoint Commands', () => {
    test('should build breakpoint_set command with all arguments', () => {
      const command = messageBuilder.buildCommand('breakpoint_set', 200, {
        type: 'line',
        filename: '/path/to/file.php',
        lineno: 42,
        state: 'enabled'
      });
      expect(command).toBe('breakpoint_set -i 200 -t line -f /path/to/file.php -n 42 -s enabled');
    });

    test('should build breakpoint_set command with minimal arguments', () => {
      const command = messageBuilder.buildCommand('breakpoint_set', 201, {
        type: 'line',
        filename: 'file.php',
        lineno: 10
      });
      expect(command).toBe('breakpoint_set -i 201 -t line -f file.php -n 10');
    });

    test('should build breakpoint_set command with temporary flag', () => {
      const command = messageBuilder.buildCommand('breakpoint_set', 202, {
        type: 'line',
        filename: 'file.php',
        lineno: 15,
        temporary: true
      });
      expect(command).toBe('breakpoint_set -i 202 -t line -f file.php -n 15 -r 1');
    });

    test('should build breakpoint_set command with expression', () => {
      const command = messageBuilder.buildCommand('breakpoint_set', 203, {
        type: 'conditional',
        expression: '$variable == "test"'
      });

      const expectedEncoded = messageBuilder._encodeData('$variable == "test"');
      expect(command).toBe(`breakpoint_set -i 203 -t conditional -- ${expectedEncoded}`);
    });

    test('should build breakpoint_remove command', () => {
      const command = messageBuilder.buildCommand('breakpoint_remove', 210, {
        breakpointId: 'bp123'
      });
      expect(command).toBe('breakpoint_remove -i 210 -d bp123');
    });

    test('should build breakpoint_update command', () => {
      const command = messageBuilder.buildCommand('breakpoint_update', 211, {
        breakpointId: 'bp456'
      });
      expect(command).toBe('breakpoint_update -i 211 -d bp456');
    });

    test('should handle breakpoint commands without breakpointId', () => {
      const command = messageBuilder.buildCommand('breakpoint_remove', 212);
      expect(command).toBe('breakpoint_remove -i 212');
    });
  });

  describe('Stack and Context Commands', () => {
    test('should build stack_get command with depth', () => {
      const command = messageBuilder.buildCommand('stack_get', 300, {
        depth: 2
      });
      expect(command).toBe('stack_get -i 300 -d 2');
    });

    test('should build stack_get command without depth', () => {
      const command = messageBuilder.buildCommand('stack_get', 301);
      expect(command).toBe('stack_get -i 301');
    });

    test('should build context_get command with all arguments', () => {
      const command = messageBuilder.buildCommand('context_get', 310, {
        depth: 1,
        contextId: 0
      });
      expect(command).toBe('context_get -i 310 -d 1 -c 0');
    });

    test('should build context_get command with depth only', () => {
      const command = messageBuilder.buildCommand('context_get', 311, {
        depth: 2
      });
      expect(command).toBe('context_get -i 311 -d 2');
    });

    test('should build context_get command with contextId only', () => {
      const command = messageBuilder.buildCommand('context_get', 312, {
        contextId: 1
      });
      expect(command).toBe('context_get -i 312 -c 1');
    });

    test('should handle zero values for depth and contextId', () => {
      const command = messageBuilder.buildCommand('context_get', 313, {
        depth: 0,
        contextId: 0
      });
      expect(command).toBe('context_get -i 313 -d 0 -c 0');
    });
  });

  describe('Property Commands', () => {
    test('should build property_get command with all arguments', () => {
      const command = messageBuilder.buildCommand('property_get', 400, {
        name: '$variable',
        depth: 1,
        contextId: 0,
        page: 0,
        maxDataSize: 1024
      });
      expect(command).toBe('property_get -i 400 -n $variable -d 1 -c 0 -p 0 -m 1024');
    });

    test('should build property_get command with minimal arguments', () => {
      const command = messageBuilder.buildCommand('property_get', 401, {
        name: '$var'
      });
      expect(command).toBe('property_get -i 401 -n $var');
    });

    test('should build property_set command with all arguments', () => {
      const command = messageBuilder.buildCommand('property_set', 410, {
        name: '$variable',
        depth: 1,
        contextId: 0,
        type: 'string',
        value: 'new_value'
      });

      const expectedEncoded = messageBuilder._encodeData('new_value');
      expect(command).toBe(`property_set -i 410 -n $variable -d 1 -c 0 -t string -- ${expectedEncoded}`);
    });

    test('should build property_set command without optional arguments', () => {
      const command = messageBuilder.buildCommand('property_set', 411, {
        name: '$var',
        value: 'test'
      });

      const expectedEncoded = messageBuilder._encodeData('test');
      expect(command).toBe(`property_set -i 411 -n $var -- ${expectedEncoded}`);
    });

    test('should build property_get command with page argument', () => {
      const command = messageBuilder.buildCommand('property_get', 420, {
        name: '$variable',
        depth: 2,
        contextId: 1,
        page: 1
      });
      expect(command).toBe('property_get -i 420 -n $variable -d 2 -c 1 -p 1');
    });
  });

  describe('Source and Output Commands', () => {
    test('should build source command with all arguments', () => {
      const command = messageBuilder.buildCommand('source', 500, {
        filename: '/path/to/file.php',
        beginLine: 10,
        endLine: 20
      });
      expect(command).toBe('source -i 500 -f /path/to/file.php -b 10 -e 20');
    });

    test('should build source command with filename only', () => {
      const command = messageBuilder.buildCommand('source', 501, {
        filename: 'script.php'
      });
      expect(command).toBe('source -i 501 -f script.php');
    });

    test('should build source command without optional arguments', () => {
      const command = messageBuilder.buildCommand('source', 510, {
        filename: 'simple.php'
      });
      expect(command).toBe('source -i 510 -f simple.php');
    });

    test('should build eval command with expression', () => {
      const expression = '$result = 1 + 2;';
      const command = messageBuilder.buildCommand('eval', 520, {
        expression: expression
      });

      const expectedEncoded = messageBuilder._encodeData(expression);
      expect(command).toBe(`eval -i 520 -- ${expectedEncoded}`);
    });
  });

  describe('Unknown Commands and Generic Arguments', () => {
    test('should build unknown command with generic arguments', () => {
      const command = messageBuilder.buildCommand('custom_command', 600, {
        option1: 'value1',
        option2: 'value2',
        flag: true
      });
      expect(command).toBe('custom_command -i 600 -option1 value1 -option2 value2 -flag true');
    });

    test('should handle null and undefined arguments in unknown commands', () => {
      const command = messageBuilder.buildCommand('test_command', 601, {
        valid: 'value',
        nullValue: null,
        undefinedValue: undefined,
        empty: ''
      });
      expect(command).toBe('test_command -i 601 -valid value -empty ');
    });

    test('should log warning for unknown commands', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      messageBuilder.buildCommand('unknown_command', 602);

      // Logger should warn about unknown command
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Argument Escaping and Encoding', () => {
    test('should escape arguments with spaces', () => {
      const command = messageBuilder.buildCommand('feature_get', 700, {
        featureName: 'feature with spaces'
      });
      expect(command).toBe('feature_get -i 700 -n "feature with spaces"');
    });

    test('should escape arguments with quotes', () => {
      const command = messageBuilder.buildCommand('feature_get', 701, {
        featureName: 'feature"with"quotes'
      });
      expect(command).toBe('feature_get -i 701 -n "feature\\"with\\"quotes"');
    });

    test('should escape arguments with backslashes', () => {
      const command = messageBuilder.buildCommand('custom', 702, {
        path: 'C:\\path\\to\\file'
      });
      expect(command).toBe('custom -i 702 -path "C:\\\\path\\\\to\\\\file"');
    });

    test('should handle complex escaping scenarios', () => {
      const command = messageBuilder.buildCommand('test', 703, {
        complex: 'value with "quotes" and \\backslashes\\ and spaces'
      });
      expect(command).toBe('test -i 703 -complex "value with \\"quotes\\" and \\\\backslashes\\\\ and spaces"');
    });

    test('should encode data using base64 by default', () => {
      const data = 'test data with special chars: &<>"\'';
      const encoded = messageBuilder._encodeData(data);
      expect(encoded).toBe(Buffer.from(data).toString('base64'));
    });

    test('should encode data using specified encoding', () => {
      const customBuilder = new MessageBuilder({ encoding: 'urlencode' });
      const data = 'test data';
      const encoded = customBuilder._encodeData(data);
      expect(encoded).toBe(encodeURIComponent(data));
    });

    test('should handle none encoding', () => {
      const customBuilder = new MessageBuilder({ encoding: 'none' });
      const data = 'test data';
      const encoded = customBuilder._encodeData(data);
      expect(encoded).toBe(data);
    });
  });

  describe('Error Response Creation', () => {
    test('should create error response with all parameters', () => {
      const errorXml = messageBuilder.createErrorResponse(800, 'Test error message', 500);

      expect(errorXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(errorXml).toContain('<response');
      expect(errorXml).toContain('transaction_id="800"');
      expect(errorXml).toContain('code="500"');
      expect(errorXml).toContain('Test error message');
      expect(messageBuilder.stats.errorsCreated).toBe(1);
    });

    test('should create error response with default error code', () => {
      const errorXml = messageBuilder.createErrorResponse(801, 'Default error');

      expect(errorXml).toContain('transaction_id="801"');
      expect(errorXml).toContain('code="998"');
      expect(errorXml).toContain('Default error');
    });

    test('should handle error messages with special characters', () => {
      const errorXml = messageBuilder.createErrorResponse(802, 'Error with <tags> & "quotes"');

      // Messages are wrapped in CDATA, so special characters are preserved as-is
      expect(errorXml).toContain('<![CDATA[Error with <tags> & "quotes"]]>');
    });
  });

  describe('Transaction ID Extraction', () => {
    test('should extract transaction ID from command', () => {
      const command = 'status -i 123 -other args';
      const transactionId = messageBuilder.extractTransactionId(command);
      expect(transactionId).toBe(123);
    });

    test('should extract transaction ID from complex command', () => {
      const command = 'breakpoint_set -t line -f file.php -i 456 -n 10';
      const transactionId = messageBuilder.extractTransactionId(command);
      expect(transactionId).toBe(456);
    });

    test('should return null for command without transaction ID', () => {
      const command = 'status -n test';
      const transactionId = messageBuilder.extractTransactionId(command);
      expect(transactionId).toBeNull();
    });

    test('should return null for invalid command format', () => {
      const command = 'invalid-command';
      const transactionId = messageBuilder.extractTransactionId(command);
      expect(transactionId).toBeNull();
    });

    test('should handle edge cases in transaction ID extraction', () => {
      expect(messageBuilder.extractTransactionId('')).toBeNull();
      expect(messageBuilder.extractTransactionId('command -i')).toBeNull();
      expect(messageBuilder.extractTransactionId('command -i abc')).toBeNull();
      expect(messageBuilder.extractTransactionId('command -i 0')).toBe(0);
    });
  });

  describe('Command Validation', () => {
    test('should validate feature_get command', () => {
      expect(() => {
        messageBuilder.validateCommand('feature_get', { featureName: 'test' });
      }).not.toThrow();

      expect(() => {
        messageBuilder.validateCommand('feature_get', {});
      }).toThrow('feature_get requires featureName argument');
    });

    test('should validate property_get command', () => {
      expect(() => {
        messageBuilder.validateCommand('property_get', { name: '$var' });
      }).not.toThrow();

      expect(() => {
        messageBuilder.validateCommand('property_get', {});
      }).toThrow('property_get requires name argument');
    });

    test('should validate property_set command', () => {
      expect(() => {
        messageBuilder.validateCommand('property_set', { name: '$var', value: 'test' });
      }).not.toThrow();

      expect(() => {
        messageBuilder.validateCommand('property_set', { name: '$var' });
      }).toThrow('property_set requires value argument');

      expect(() => {
        messageBuilder.validateCommand('property_set', { value: 'test' });
      }).toThrow('property_set requires name argument');
    });

    test('should validate eval command', () => {
      expect(() => {
        messageBuilder.validateCommand('eval', { expression: '$x = 1;' });
      }).not.toThrow();

      expect(() => {
        messageBuilder.validateCommand('eval', {});
      }).toThrow('eval requires expression argument');
    });

    test('should validate commands that do not require arguments', () => {
      const noArgCommands = ['status', 'run', 'step_into', 'step_over', 'step_out', 'stop', 'detach'];

      noArgCommands.forEach(command => {
        expect(() => {
          messageBuilder.validateCommand(command);
        }).not.toThrow();

        expect(() => {
          messageBuilder.validateCommand(command, {});
        }).not.toThrow();
      });
    });
  });

  describe('Data Formatting', () => {
    test('should format string data', () => {
      const data = 'test string';
      const formatted = messageBuilder.formatData(data);
      expect(formatted).toBe(Buffer.from(data).toString('base64'));
    });

    test('should format object data', () => {
      const data = { key: 'value', number: 123 };
      const formatted = messageBuilder.formatData(data);
      const jsonString = JSON.stringify(data);
      expect(formatted).toBe(Buffer.from(jsonString).toString('base64'));
    });

    test('should format data with different encodings', () => {
      const data = 'test string';

      expect(messageBuilder.formatData(data, 'base64')).toBe(Buffer.from(data).toString('base64'));
      expect(messageBuilder.formatData(data, 'urlencode')).toBe(encodeURIComponent(data));
      expect(messageBuilder.formatData(data, 'none')).toBe(data);
    });

    test('should handle null and undefined data', () => {
      // null gets JSON.stringify'd to 'null', then base64 encoded
      const nullFormatted = messageBuilder.formatData(null);
      expect(nullFormatted).toBe(Buffer.from('null').toString('base64'));

      // undefined gets JSON.stringify'd to undefined (the value, not string)
      // This will likely cause an error in the actual implementation
      expect(() => messageBuilder.formatData(undefined)).toThrow();
    });
  });

  describe('Statistics and Configuration', () => {
    test('should track command building statistics', () => {
      messageBuilder.buildCommand('status', 1);
      messageBuilder.buildCommand('run', 2);
      messageBuilder.createErrorResponse(3, 'error');

      const stats = messageBuilder.getStats();
      expect(stats.commandsBuilt).toBe(2);
      expect(stats.errorsCreated).toBe(1);
    });

    test('should update configuration', () => {
      const newConfig = {
        encoding: 'urlencode',
        maxDataSize: 2048
      };

      messageBuilder.updateConfig(newConfig);
      expect(messageBuilder.encoding).toBe('urlencode');
    });

    test('should handle partial configuration updates', () => {
      const originalEncoding = messageBuilder.encoding;
      messageBuilder.updateConfig({ maxDataSize: 4096 });

      expect(messageBuilder.encoding).toBe(originalEncoding); // Should remain unchanged
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty transaction IDs', () => {
      const command = messageBuilder.buildCommand('status', '');
      expect(command).toBe('status -i ');
    });

    test('should handle very large transaction IDs', () => {
      const largeId = Number.MAX_SAFE_INTEGER;
      const command = messageBuilder.buildCommand('status', largeId);
      expect(command).toBe(`status -i ${largeId}`);
    });

    test('should handle special characters in arguments', () => {
      const command = messageBuilder.buildCommand('test', 1, {
        special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
      });
      expect(command).toContain('-special');
    });

    test('should handle unicode characters', () => {
      const command = messageBuilder.buildCommand('test', 1, {
        unicode: 'Héllo Wörld 🌍'
      });
      expect(command).toContain('Héllo Wörld 🌍');
    });

    test('should handle boolean values correctly', () => {
      const command = messageBuilder.buildCommand('test', 1, {
        enabled: true,
        disabled: false
      });
      expect(command).toContain('-enabled true');
      expect(command).toContain('-disabled false');
    });

    test('should handle number values correctly', () => {
      const command = messageBuilder.buildCommand('test', 1, {
        integer: 42,
        float: 3.14,
        zero: 0,
        negative: -5
      });
      expect(command).toContain('-integer 42');
      expect(command).toContain('-float 3.14');
      expect(command).toContain('-zero 0');
      expect(command).toContain('-negative -5');
    });
  });
});

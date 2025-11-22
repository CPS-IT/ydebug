/**
 * VariableFormatter Tests
 */

const VariableFormatter = require('../../../src/debugger/VariableFormatter');

describe('VariableFormatter', () => {
  let formatter;

  beforeEach(() => {
    formatter = new VariableFormatter({
      colors: false, // Disable colors for testing
      maxDepth: 3,
      maxStringLength: 50,
      maxArrayItems: 10
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultFormatter = new VariableFormatter();
      expect(defaultFormatter.maxDepth).toBe(3);
      expect(defaultFormatter.maxStringLength).toBe(100);
      expect(defaultFormatter.maxArrayItems).toBe(20);
      expect(defaultFormatter.colors).toBe(true);
    });

    it('should initialize with custom options', () => {
      const customFormatter = new VariableFormatter({
        maxDepth: 2,
        maxStringLength: 25,
        colors: false
      });
      expect(customFormatter.maxDepth).toBe(2);
      expect(customFormatter.maxStringLength).toBe(25);
      expect(customFormatter.colors).toBe(false);
    });
  });

  describe('formatVariables', () => {
    it('should format empty variables list', () => {
      const result = formatter.formatVariables([]);
      expect(result).toBe('No variables found');
    });

    it('should format single variable', () => {
      const variables = [{
        name: 'testVar',
        type: 'string',
        value: 'hello',
        hasChildren: false,
        properties: []
      }];

      const result = formatter.formatVariables(variables);

      expect(result).toContain('testVar (string): "hello"');
    });

    it('should format multiple variables', () => {
      const variables = [
        {
          name: 'str',
          type: 'string',
          value: 'test',
          hasChildren: false,
          properties: []
        },
        {
          name: 'num',
          type: 'int',
          value: '42',
          hasChildren: false,
          properties: []
        }
      ];

      const result = formatter.formatVariables(variables);

      expect(result).toContain('str (string): "test"');
      expect(result).toContain('num (int): 42');
    });
  });

  describe('formatVariable', () => {
    it('should format string variable', () => {
      const variable = {
        name: 'message',
        type: 'string',
        value: 'Hello World',
        size: 11,
        hasChildren: false,
        properties: []
      };

      const result = formatter.formatVariable(variable);

      expect(result).toContain('message (string): "Hello World" [11]');
    });

    it('should format integer variable', () => {
      const variable = {
        name: 'count',
        type: 'int',
        value: '100',
        hasChildren: false,
        properties: []
      };

      const result = formatter.formatVariable(variable);

      expect(result).toContain('count (int): 100');
    });

    it('should format boolean variable', () => {
      const variable = {
        name: 'isEnabled',
        type: 'bool',
        value: true,
        hasChildren: false,
        properties: []
      };

      const result = formatter.formatVariable(variable);

      expect(result).toContain('isEnabled (bool): true');
    });

    it('should format null variable', () => {
      const variable = {
        name: 'empty',
        type: 'null',
        value: null,
        hasChildren: false,
        properties: []
      };

      const result = formatter.formatVariable(variable);

      expect(result).toContain('empty (null): null');
    });

    it('should format constant variable', () => {
      const variable = {
        name: 'PI',
        type: 'float',
        value: '3.14159',
        constant: true,
        hasChildren: false,
        properties: []
      };

      const result = formatter.formatVariable(variable);

      expect(result).toContain('PI (float): 3.14159 [CONSTANT]');
    });

    it('should format array variable', () => {
      const variable = {
        name: 'items',
        type: 'array',
        value: null,
        numchildren: 3,
        hasChildren: true,
        properties: [
          {
            name: '0',
            type: 'string',
            value: 'first',
            hasChildren: false,
            properties: []
          },
          {
            name: '1',
            type: 'string',
            value: 'second',
            hasChildren: false,
            properties: []
          }
        ]
      };

      const result = formatter.formatVariable(variable);

      expect(result).toContain('items (array): Array[3]');
      expect(result).toContain('0 (string): "first"');
      expect(result).toContain('1 (string): "second"');
    });

    it('should format object variable', () => {
      const variable = {
        name: 'user',
        type: 'object',
        classname: 'User',
        numchildren: 2,
        hasChildren: true,
        properties: [
          {
            name: 'name',
            type: 'string',
            value: 'John',
            hasChildren: false,
            properties: []
          },
          {
            name: 'age',
            type: 'int',
            value: '25',
            hasChildren: false,
            properties: []
          }
        ]
      };

      const result = formatter.formatVariable(variable);

      expect(result).toContain('user (object): User[2]');
      expect(result).toContain('name (string): "John"');
      expect(result).toContain('age (int): 25');
    });

    it('should handle maximum depth limit', () => {
      // Test directly by calling formatVariable with depth > maxDepth
      const shallowFormatter = new VariableFormatter({
        colors: false,
        maxDepth: 2
      });

      const deepVariable = {
        name: 'deep',
        type: 'string',
        value: 'test',
        hasChildren: false,
        properties: []
      };

      // Call formatVariable with depth = 3 which is > maxDepth (2)
      const result = shallowFormatter.formatVariable(deepVariable, 3);

      expect(result).toContain('[Maximum depth reached]');
    });

    it('should show children count for unloaded properties', () => {
      const variable = {
        name: 'bigArray',
        type: 'array',
        numchildren: 100,
        hasChildren: true,
        properties: [] // Empty - children not loaded
      };

      const result = formatter.formatVariable(variable);

      expect(result).toContain('bigArray (array): Array[100]');
      expect(result).toContain('[100 children - not loaded]');
    });
  });

  describe('formatValue', () => {
    it('should format string values with quotes', () => {
      const variable = { type: 'string', value: 'test string' };
      const result = formatter.formatValue(variable, 0);
      expect(result).toContain('"test string"');
    });

    it('should format multiline strings', () => {
      const variable = { type: 'string', value: 'line1\nline2' };
      const result = formatter.formatValue(variable, 0);
      expect(result).toContain('[multiline]');
    });

    it('should format numeric values without quotes', () => {
      expect(formatter.formatValue({ type: 'int', value: '42' }, 0)).toBe('42');
      expect(formatter.formatValue({ type: 'float', value: '3.14' }, 0)).toBe('3.14');
    });

    it('should format boolean values', () => {
      expect(formatter.formatValue({ type: 'bool', value: true }, 0)).toBe('true');
      expect(formatter.formatValue({ type: 'bool', value: false }, 0)).toBe('false');
    });

    it('should format null values', () => {
      expect(formatter.formatValue({ type: 'null', value: null }, 0)).toBe('null');
      expect(formatter.formatValue({ type: 'string', value: null }, 0)).toBe('null');
    });

    it('should format array summaries', () => {
      const variable = { type: 'array', numchildren: 5 };
      const result = formatter.formatValue(variable, 0);
      expect(result).toBe('Array[5]');
    });

    it('should format object summaries', () => {
      const variable = { type: 'object', classname: 'User', numchildren: 3 };
      const result = formatter.formatValue(variable, 0);
      expect(result).toBe('User[3]');
    });

    it('should format resource values', () => {
      const variable = { type: 'resource', value: '123' };
      const result = formatter.formatValue(variable, 0);
      expect(result).toBe('Resource #123');
    });
  });

  describe('truncateString', () => {
    it('should not truncate short strings', () => {
      const result = formatter.truncateString('short');
      expect(result).toBe('short');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(100);
      const result = formatter.truncateString(longString);
      expect(result).toHaveLength(50); // maxStringLength is 50 in setup
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle non-string input', () => {
      expect(formatter.truncateString(null)).toBe('');
      expect(formatter.truncateString(undefined)).toBe('');
      expect(formatter.truncateString(123)).toBe('123');
    });
  });

  describe('sortVariables', () => {
    it('should sort variables by name', () => {
      const variables = [
        { name: 'zebra' },
        { name: 'apple' },
        { name: 'banana' }
      ];

      const result = formatter.sortVariables(variables);

      expect(result[0].name).toBe('apple');
      expect(result[1].name).toBe('banana');
      expect(result[2].name).toBe('zebra');
    });

    it('should sort numeric indices correctly', () => {
      const variables = [
        { name: '10' },
        { name: '2' },
        { name: '1' }
      ];

      const result = formatter.sortVariables(variables);

      expect(result[0].name).toBe('1');
      expect(result[1].name).toBe('2');
      expect(result[2].name).toBe('10');
    });

    it('should put numeric indices before string names', () => {
      const variables = [
        { name: 'zebra' },
        { name: '1' },
        { name: 'apple' },
        { name: '0' }
      ];

      const result = formatter.sortVariables(variables);

      expect(result[0].name).toBe('0');
      expect(result[1].name).toBe('1');
      expect(result[2].name).toBe('apple');
      expect(result[3].name).toBe('zebra');
    });
  });

  describe('formatAsJSON', () => {
    it('should format variables as JSON', () => {
      const variables = [
        {
          name: 'test',
          type: 'string',
          value: 'hello',
          size: 5,
          constant: false,
          hasChildren: false,
          numchildren: 0
        }
      ];

      const result = formatter.formatAsJSON(variables);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        name: 'test',
        type: 'string',
        value: 'hello',
        size: 5,
        constant: false,
        hasChildren: false,
        numChildren: 0
      });
    });

    it('should include class name for objects', () => {
      const variables = [
        {
          name: 'obj',
          type: 'object',
          classname: 'MyClass',
          value: null,
          hasChildren: true,
          numchildren: 2,
          properties: []
        }
      ];

      const result = formatter.formatAsJSON(variables);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toHaveProperty('className', 'MyClass');
    });

    it('should include nested properties', () => {
      const variables = [
        {
          name: 'parent',
          type: 'array',
          hasChildren: true,
          numchildren: 1,
          properties: [
            {
              name: 'child',
              type: 'string',
              value: 'nested',
              hasChildren: false,
              properties: []
            }
          ]
        }
      ];

      const result = formatter.formatAsJSON(variables);
      const parsed = JSON.parse(result);

      expect(parsed[0].properties).toHaveLength(1);
      expect(parsed[0].properties[0].name).toBe('child');
      expect(parsed[0].properties[0].value).toBe('nested');
    });
  });

  describe('colorize', () => {
    it('should return plain text when colors disabled', () => {
      const result = formatter.colorize('test', 'red');
      expect(result).toBe('test');
    });

    it('should add color codes when colors enabled', () => {
      const colorFormatter = new VariableFormatter({ colors: true });
      const result = colorFormatter.colorize('test', 'red');
      expect(result).toContain('\x1b[31m'); // Red color code
      expect(result).toContain('\x1b[0m');  // Reset code
      expect(result).toContain('test');
    });

    it('should handle unknown colors gracefully', () => {
      const colorFormatter = new VariableFormatter({ colors: true });
      const result = colorFormatter.colorize('test', 'unknown');
      expect(result).toContain('test');
    });
  });

  describe('static create', () => {
    it('should create formatter with custom options', () => {
      const customFormatter = VariableFormatter.create({
        maxDepth: 5,
        colors: false
      });

      expect(customFormatter).toBeInstanceOf(VariableFormatter);
      expect(customFormatter.maxDepth).toBe(5);
      expect(customFormatter.colors).toBe(false);
    });
  });
});
/**
 * ContextGetCommand Tests
 */

const ContextGetCommand = require('../../../src/debugger/commands/ContextGetCommand');
const BaseCommand = require('../../../src/debugger/commands/BaseCommand');

describe('ContextGetCommand', () => {
  let command;

  beforeEach(() => {
    command = new ContextGetCommand();
  });

  describe('constructor', () => {
    it('should create command with correct name and description', () => {
      expect(command.name).toBe('context_get');
      expect(command.description).toBe('Get variables from specified context');
    });

    it('should inherit from BaseCommand', () => {
      expect(command).toBeInstanceOf(BaseCommand);
    });
  });

  describe('buildCommand', () => {
    it('should build context_get command with default contextId and depth', () => {
      const result = command.buildCommand(123);
      expect(result).toBe('context_get -i 123 -c 0');
    });

    it('should build command with specified contextId', () => {
      const result = command.buildCommand(456, { contextId: 1 });
      expect(result).toBe('context_get -i 456 -c 1');
    });

    it('should build command with specified depth', () => {
      const result = command.buildCommand(789, { depth: 2 });
      expect(result).toBe('context_get -i 789 -c 0 -d 2');
    });

    it('should build command with both contextId and depth', () => {
      const result = command.buildCommand(101, { contextId: 2, depth: 1 });
      expect(result).toBe('context_get -i 101 -c 2 -d 1');
    });

    it('should handle contextId 0 explicitly', () => {
      const result = command.buildCommand(202, { contextId: 0, depth: 0 });
      expect(result).toBe('context_get -i 202 -c 0');
    });
  });

  describe('parseResponse', () => {
    it('should parse empty context response', () => {
      const response = {};

      const result = command.parseResponse(response);

      expect(result).toEqual({
        contextId: 0,
        variables: [],
        count: 0,
        success: true
      });
    });

    it('should parse single variable response', () => {
      const response = {
        $: { contextId: '1' },
        property: {
          $: {
            name: 'testVar',
            type: 'string',
            size: '5',
            encoding: 'base64'
          },
          _: Buffer.from('hello').toString('base64')
        }
      };

      const result = command.parseResponse(response);

      expect(result).toEqual({
        contextId: 1,
        variables: [{
          name: 'testVar',
          fullname: 'testVar',
          type: 'string',
          classname: null,
          constant: false,
          children: 0,
          size: 5,
          encoding: 'base64',
          numchildren: 0,
          value: 'hello',
          hasChildren: false,
          properties: []
        }],
        count: 1,
        success: true
      });
    });

    it('should parse multiple variables response', () => {
      const response = {
        property: [
          {
            $: {
              name: 'var1',
              type: 'int',
            },
            _: Buffer.from('42').toString('base64')
          },
          {
            $: {
              name: 'var2',
              type: 'string',
            },
            _: Buffer.from('test').toString('base64')
          }
        ]
      };

      const result = command.parseResponse(response);

      expect(result.variables).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.variables[0].name).toBe('var1');
      expect(result.variables[0].value).toBe('42');
      expect(result.variables[1].name).toBe('var2');
      expect(result.variables[1].value).toBe('test');
    });

    it('should parse variable with child properties', () => {
      const response = {
        property: {
          $: {
            name: 'testArray',
            type: 'array',
            numchildren: '2',
            children: '1'
          },
          property: [
            {
              $: {
                name: '0',
                type: 'string'
              },
              _: Buffer.from('first').toString('base64')
            },
            {
              $: {
                name: '1',
                type: 'string'
              },
              _: Buffer.from('second').toString('base64')
            }
          ]
        }
      };

      const result = command.parseResponse(response);

      expect(result.variables[0].hasChildren).toBe(true);
      expect(result.variables[0].properties).toHaveLength(2);
      expect(result.variables[0].properties[0].name).toBe('0');
      expect(result.variables[0].properties[0].value).toBe('first');
      expect(result.variables[0].properties[1].name).toBe('1');
      expect(result.variables[0].properties[1].value).toBe('second');
    });

    it('should parse variable with object class info', () => {
      const response = {
        property: {
          $: {
            name: 'testObj',
            type: 'object',
            classname: 'stdClass',
            constant: '1',
            numchildren: '1'
          }
        }
      };

      const result = command.parseResponse(response);

      expect(result.variables[0]).toMatchObject({
        name: 'testObj',
        type: 'object',
        classname: 'stdClass',
        constant: true,
        hasChildren: true,
        numchildren: 1
      });
    });

    it('should throw error for error response', () => {
      const response = {
        error: {
          message: 'Context not available'
        }
      };

      expect(() => command.parseResponse(response))
        .toThrow('Context get failed: Context not available');
    });
  });

  describe('parseValue', () => {
    it('should parse base64 encoded value', () => {
      const encoded = Buffer.from('test value').toString('base64');
      const result = command.parseValue(encoded, 'base64');
      expect(result).toBe('test value');
    });

    it('should parse none encoded value', () => {
      const result = command.parseValue('plain text', 'none');
      expect(result).toBe('plain text');
    });

    it('should parse urlencode value', () => {
      const result = command.parseValue('hello%20world', 'urlencode');
      expect(result).toBe('hello world');
    });

    it('should handle unknown encoding as base64', () => {
      const encoded = Buffer.from('fallback').toString('base64');
      const result = command.parseValue(encoded, 'unknown');
      expect(result).toBe('fallback');
    });

    it('should handle invalid base64 gracefully', () => {
      const result = command.parseValue('invalid-base64!', 'base64');
      expect(result).toBe('invalid-base64!'); // Should return raw value
    });

    it('should handle null/empty values', () => {
      expect(command.parseValue(null)).toBe(null);
      expect(command.parseValue('')).toBe(null);
      expect(command.parseValue(undefined)).toBe(null);
    });
  });

  describe('validateArgs', () => {
    it('should accept no arguments', () => {
      expect(() => command.validateArgs()).not.toThrow();
    });

    it('should accept valid contextId', () => {
      expect(() => command.validateArgs({ contextId: 0 })).not.toThrow();
      expect(() => command.validateArgs({ contextId: 1 })).not.toThrow();
      expect(() => command.validateArgs({ contextId: 2 })).not.toThrow();
    });

    it('should accept valid depth', () => {
      expect(() => command.validateArgs({ depth: 0 })).not.toThrow();
      expect(() => command.validateArgs({ depth: 5 })).not.toThrow();
    });

    it('should reject invalid contextId', () => {
      expect(() => command.validateArgs({ contextId: -1 }))
        .toThrow('contextId must be a non-negative integer');
      expect(() => command.validateArgs({ contextId: 'invalid' }))
        .toThrow('contextId must be a non-negative integer');
      expect(() => command.validateArgs({ contextId: 1.5 }))
        .toThrow('contextId must be a non-negative integer');
    });

    it('should reject invalid depth', () => {
      expect(() => command.validateArgs({ depth: -1 }))
        .toThrow('depth must be a non-negative integer');
      expect(() => command.validateArgs({ depth: 'invalid' }))
        .toThrow('depth must be a non-negative integer');
      expect(() => command.validateArgs({ depth: 2.5 }))
        .toThrow('depth must be a non-negative integer');
    });
  });

  describe('getExpectedArgs', () => {
    it('should return expected arguments schema', () => {
      const schema = command.getExpectedArgs();
      
      expect(schema).toHaveProperty('contextId');
      expect(schema).toHaveProperty('depth');
      expect(schema.contextId.type).toBe('number');
      expect(schema.depth.type).toBe('number');
      expect(schema.contextId.required).toBe(false);
      expect(schema.depth.required).toBe(false);
    });
  });
});
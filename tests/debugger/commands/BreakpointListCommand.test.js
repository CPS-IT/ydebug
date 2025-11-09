/**
 * BreakpointListCommand Tests
 */

const BreakpointListCommand = require('../../../src/debugger/commands/BreakpointListCommand');
const BaseCommand = require('../../../src/debugger/commands/BaseCommand');

describe('BreakpointListCommand', () => {
  let command;

  beforeEach(() => {
    command = new BreakpointListCommand();
  });

  describe('constructor', () => {
    it('should create command with correct name and description', () => {
      expect(command.name).toBe('breakpoint_list');
      expect(command.description).toBe('List all current breakpoints');
    });

    it('should inherit from BaseCommand', () => {
      expect(command).toBeInstanceOf(BaseCommand);
    });
  });

  describe('buildCommand', () => {
    it('should build breakpoint_list command', () => {
      const result = command.buildCommand(123);
      expect(result).toBe('breakpoint_list -i 123');
    });

    it('should ignore additional arguments', () => {
      const result = command.buildCommand(456, { ignored: 'value' });
      expect(result).toBe('breakpoint_list -i 456');
    });
  });

  describe('parseResponse', () => {
    it('should parse empty breakpoint list', () => {
      const response = {};

      const result = command.parseResponse(response);

      expect(result).toEqual({
        breakpoints: [],
        count: 0,
        success: true
      });
    });

    it('should parse single breakpoint response', () => {
      const response = {
        breakpoint: {
          $: {
            id: 'bp123',
            type: 'line',
            state: 'enabled',
            filename: '/test.php',
            lineno: '10',
            hit_count: '0'
          }
        }
      };

      const result = command.parseResponse(response);

      expect(result).toEqual({
        breakpoints: [{
          id: 'bp123',
          type: 'line',
          state: 'enabled',
          filename: '/test.php',
          lineno: 10,
          function: undefined,
          exception: undefined,
          hitValue: null,
          hitCondition: undefined,
          hitCount: 0,
          temporary: false,
          expression: undefined
        }],
        count: 1,
        success: true
      });
    });

    it('should parse multiple breakpoints response', () => {
      const response = {
        breakpoint: [
          {
            $: {
              id: 'bp123',
              type: 'line',
              filename: '/test1.php',
              lineno: '10'
            }
          },
          {
            $: {
              id: 'bp456',
              type: 'call',
              function: 'testFunction'
            }
          }
        ]
      };

      const result = command.parseResponse(response);

      expect(result.breakpoints).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.breakpoints[0].id).toBe('bp123');
      expect(result.breakpoints[1].id).toBe('bp456');
    });

    it('should parse breakpoint with expression', () => {
      const expression = '$var == "test"';
      const encodedExpression = Buffer.from(expression).toString('base64');
      
      const response = {
        breakpoint: {
          $: {
            id: 'bp789',
            type: 'conditional',
            state: 'enabled'
          },
          expression: encodedExpression
        }
      };

      const result = command.parseResponse(response);

      expect(result.breakpoints[0].expression).toBe(expression);
    });

    it('should handle invalid base64 expression', () => {
      // Mock console.warn to prevent test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const response = {
        breakpoint: {
          $: {
            id: 'bp789',
            type: 'conditional'
          },
          expression: 'invalid-base64!@#'
        }
      };

      const result = command.parseResponse(response);

      // Should keep raw value when base64 decode fails
      expect(result.breakpoints[0]).toHaveProperty('expression');
      
      consoleSpy.mockRestore();
    });

    it('should parse breakpoint with hit conditions', () => {
      const response = {
        breakpoint: {
          $: {
            id: 'bp101',
            type: 'line',
            filename: '/test.php',
            lineno: '20',
            hit_value: '5',
            hit_condition: '>=',
            hit_count: '3',
            temporary: '1'
          }
        }
      };

      const result = command.parseResponse(response);

      expect(result.breakpoints[0]).toMatchObject({
        id: 'bp101',
        hitValue: 5,
        hitCondition: '>=',
        hitCount: 3,
        temporary: true
      });
    });

    it('should use default values for missing attributes', () => {
      const response = {
        breakpoint: {
          $: {
            id: 'bp202'
          }
        }
      };

      const result = command.parseResponse(response);

      expect(result.breakpoints[0]).toMatchObject({
        id: 'bp202',
        type: undefined,
        state: 'enabled',
        hitCount: 0,
        temporary: false
      });
    });

    it('should throw error for error response', () => {
      const response = {
        error: {
          message: 'Command failed'
        }
      };

      expect(() => command.parseResponse(response))
        .toThrow('Breakpoint list failed: Command failed');
    });
  });

  describe('validateArgs', () => {
    it('should accept no arguments', () => {
      expect(() => command.validateArgs()).not.toThrow();
    });

    it('should accept empty arguments', () => {
      expect(() => command.validateArgs({})).not.toThrow();
    });

    it('should ignore any provided arguments', () => {
      expect(() => command.validateArgs({
        ignored: 'value',
        also: 'ignored'
      })).not.toThrow();
    });
  });

  describe('getExpectedArgs', () => {
    it('should return empty arguments schema', () => {
      const schema = command.getExpectedArgs();
      expect(schema).toEqual({});
    });
  });
});
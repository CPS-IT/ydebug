/**
 * BreakpointSetCommand Tests
 */

const BreakpointSetCommand = require('../../../../src/debugger/commands/BreakpointSetCommand');
const BaseCommand = require('../../../../src/debugger/commands/BaseCommand');

describe('BreakpointSetCommand', () => {
  let command;

  beforeEach(() => {
    command = new BreakpointSetCommand();
  });

  describe('constructor', () => {
    it('should create command with correct name and description', () => {
      expect(command.name).toBe('breakpoint_set');
      expect(command.description).toBe('Set a breakpoint at specified location');
    });

    it('should inherit from BaseCommand', () => {
      expect(command).toBeInstanceOf(BaseCommand);
    });
  });

  describe('buildCommand', () => {
    it('should build basic line breakpoint command', () => {
      const command = new BreakpointSetCommand();
      const result = command.buildCommand(123, {
        type: 'line',
        filename: '/path/to/file.php',
        lineno: 10
      });

      expect(result).toBe('breakpoint_set -i 123 -t line -f file:///path/to/file.php -n 10 -r 0');
    });

    it('should build command with defaults', () => {
      const command = new BreakpointSetCommand();
      const result = command.buildCommand(456, {
        filename: '/test.php',
        lineno: 5
      });

      expect(result).toBe('breakpoint_set -i 456 -t line -f file:///test.php -n 5 -r 0');
    });

    it('should build temporary breakpoint command', () => {
      const command = new BreakpointSetCommand();
      const result = command.buildCommand(789, {
        filename: '/temp.php',
        lineno: 15,
        temporary: true
      });

      expect(result).toBe('breakpoint_set -i 789 -t line -f file:///temp.php -n 15 -r 1');
    });

    it('should build disabled breakpoint command', () => {
      const command = new BreakpointSetCommand();
      const result = command.buildCommand(101, {
        filename: '/disabled.php',
        lineno: 20,
        state: 'disabled'
      });

      expect(result).toBe('breakpoint_set -i 101 -t line -f file:///disabled.php -n 20 -s disabled -r 0');
    });

    it('should build conditional breakpoint command', () => {
      const command = new BreakpointSetCommand();
      const result = command.buildCommand(202, {
        type: 'conditional',
        expression: '$var == "test"'
      });

      const expectedExpression = Buffer.from('$var == "test"').toString('base64');
      expect(result).toBe(`breakpoint_set -i 202 -t conditional -r 0 -- ${expectedExpression}`);
    });

    it('should build breakpoint with hit condition', () => {
      const command = new BreakpointSetCommand();
      const result = command.buildCommand(303, {
        filename: '/hit.php',
        lineno: 30,
        hitValue: 5,
        hitCondition: '>='
      });

      expect(result).toBe('breakpoint_set -i 303 -t line -f file:///hit.php -n 30 -r 0 -h 5 -o >=');
    });

    it('should build function call breakpoint', () => {
      const command = new BreakpointSetCommand();
      const result = command.buildCommand(404, {
        type: 'call',
        function: 'myFunction'
      });

      expect(result).toBe('breakpoint_set -i 404 -t call -m myFunction -r 0');
    });

    it('should build exception breakpoint', () => {
      const command = new BreakpointSetCommand();
      const result = command.buildCommand(505, {
        type: 'exception',
        exception: 'InvalidArgumentException'
      });

      expect(result).toBe('breakpoint_set -i 505 -t exception -x InvalidArgumentException -r 0');
    });
  });

  describe('parseResponse', () => {
    it('should parse successful breakpoint response', () => {
      const response = {
        $: {
          id: 'bp123',
          state: 'enabled'
        }
      };

      const result = command.parseResponse(response);

      expect(result).toEqual({
        breakpointId: 'bp123',
        state: 'enabled',
        success: true
      });
    });

    it('should parse response with default state', () => {
      const response = {
        $: {
          id: 'bp456'
        }
      };

      const result = command.parseResponse(response);

      expect(result).toEqual({
        breakpointId: 'bp456',
        state: 'enabled',
        success: true
      });
    });

    it('should throw error for missing breakpoint ID', () => {
      const response = {
        $: {}
      };

      expect(() => command.parseResponse(response))
        .toThrow('Invalid breakpoint response: missing breakpoint ID');
    });

    it('should throw error for error response', () => {
      const response = {
        error: {
          message: 'Invalid file path'
        }
      };

      expect(() => command.parseResponse(response))
        .toThrow('Breakpoint set failed: Invalid file path');
    });
  });

  describe('validateArgs', () => {
    it('should validate line breakpoint arguments', () => {
      expect(() => command.validateArgs({
        type: 'line',
        filename: '/test.php',
        lineno: 10
      })).not.toThrow();
    });

    it('should require filename for line breakpoints', () => {
      expect(() => command.validateArgs({
        type: 'line',
        lineno: 10
      })).toThrow('Line breakpoints require filename argument');
    });

    it('should require line number for line breakpoints', () => {
      expect(() => command.validateArgs({
        type: 'line',
        filename: '/test.php'
      })).toThrow('Line breakpoints require valid line number (lineno > 0)');
    });

    it('should require positive line number', () => {
      expect(() => command.validateArgs({
        type: 'line',
        filename: '/test.php',
        lineno: 0
      })).toThrow('Line breakpoints require valid line number (lineno > 0)');
    });

    it('should validate call breakpoint arguments', () => {
      expect(() => command.validateArgs({
        type: 'call',
        function: 'testFunction'
      })).not.toThrow();

      expect(() => command.validateArgs({
        type: 'call',
        filename: '/test.php'
      })).not.toThrow();
    });

    it('should require function or filename for call breakpoints', () => {
      expect(() => command.validateArgs({
        type: 'call'
      })).toThrow('call breakpoints require either function or filename argument');
    });

    it('should validate exception breakpoint arguments', () => {
      expect(() => command.validateArgs({
        type: 'exception',
        exception: 'Exception'
      })).not.toThrow();
    });

    it('should require exception for exception breakpoints', () => {
      expect(() => command.validateArgs({
        type: 'exception'
      })).toThrow('Exception breakpoints require exception argument');
    });

    it('should validate conditional breakpoint arguments', () => {
      expect(() => command.validateArgs({
        type: 'conditional',
        expression: '$x == 1'
      })).not.toThrow();
    });

    it('should require expression for conditional breakpoints', () => {
      expect(() => command.validateArgs({
        type: 'conditional'
      })).toThrow('conditional breakpoints require expression argument');
    });

    it('should validate hit conditions', () => {
      expect(() => command.validateArgs({
        filename: '/test.php',
        lineno: 10,
        hitValue: 5,
        hitCondition: '>='
      })).not.toThrow();
    });

    it('should require both hit value and condition', () => {
      expect(() => command.validateArgs({
        filename: '/test.php',
        lineno: 10,
        hitValue: 5
      })).toThrow('Hit conditions require both hitValue and hitCondition');
    });

    it('should validate hit condition values', () => {
      expect(() => command.validateArgs({
        filename: '/test.php',
        lineno: 10,
        hitValue: 5,
        hitCondition: 'invalid'
      })).toThrow('Invalid hit condition: invalid');
    });

    it('should validate hit value is positive number', () => {
      expect(() => command.validateArgs({
        filename: '/test.php',
        lineno: 10,
        hitValue: -1,
        hitCondition: '>='
      })).toThrow('Hit value must be a positive number');
    });

    it('should validate breakpoint state', () => {
      expect(() => command.validateArgs({
        filename: '/test.php',
        lineno: 10,
        state: 'invalid'
      })).toThrow('Invalid breakpoint state: invalid');
    });

    it('should validate breakpoint type', () => {
      expect(() => command.validateArgs({
        type: 'invalid'
      })).toThrow('Invalid breakpoint type: invalid');
    });
  });

  describe('getExpectedArgs', () => {
    it('should return expected arguments schema', () => {
      const schema = command.getExpectedArgs();
      
      expect(schema).toHaveProperty('type');
      expect(schema).toHaveProperty('filename');
      expect(schema).toHaveProperty('lineno');
      expect(schema.filename.required).toBe(true);
      expect(schema.lineno.required).toBe(true);
    });
  });
});
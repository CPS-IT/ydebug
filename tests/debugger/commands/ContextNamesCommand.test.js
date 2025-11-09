/**
 * ContextNamesCommand Tests
 */

const ContextNamesCommand = require('../../../src/debugger/commands/ContextNamesCommand');
const BaseCommand = require('../../../src/debugger/commands/BaseCommand');

describe('ContextNamesCommand', () => {
  let command;

  beforeEach(() => {
    command = new ContextNamesCommand();
  });

  describe('constructor', () => {
    it('should create command with correct name and description', () => {
      expect(command.name).toBe('context_names');
      expect(command.description).toBe('Get list of available execution contexts');
    });

    it('should inherit from BaseCommand', () => {
      expect(command).toBeInstanceOf(BaseCommand);
    });
  });

  describe('buildCommand', () => {
    it('should build context_names command with default depth', () => {
      const result = command.buildCommand(123);
      expect(result).toBe('context_names -i 123');
    });

    it('should build command with specified depth', () => {
      const result = command.buildCommand(456, { depth: 2 });
      expect(result).toBe('context_names -i 456 -d 2');
    });

    it('should handle depth 0 explicitly (no -d flag)', () => {
      const result = command.buildCommand(789, { depth: 0 });
      expect(result).toBe('context_names -i 789');
    });

    it('should ignore other arguments', () => {
      const result = command.buildCommand(101, { depth: 1, ignored: 'value' });
      expect(result).toBe('context_names -i 101 -d 1');
    });
  });

  describe('parseResponse', () => {
    it('should parse empty contexts response', () => {
      const response = {};

      const result = command.parseResponse(response);

      expect(result).toEqual({
        contexts: [],
        count: 0,
        success: true
      });
    });

    it('should parse single context response', () => {
      const response = {
        context: {
          $: {
            id: '0',
            name: 'Locals'
          }
        }
      };

      const result = command.parseResponse(response);

      expect(result).toEqual({
        contexts: [{
          id: 0,
          name: 'Locals',
          description: 'Local variables in current function scope'
        }],
        count: 1,
        success: true
      });
    });

    it('should parse multiple contexts response', () => {
      const response = {
        context: [
          {
            $: {
              id: '0',
              name: 'Locals'
            }
          },
          {
            $: {
              id: '1', 
              name: 'Superglobals'
            }
          },
          {
            $: {
              id: '2',
              name: 'User defined constants'
            }
          }
        ]
      };

      const result = command.parseResponse(response);

      expect(result.contexts).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.contexts[0]).toMatchObject({
        id: 0,
        name: 'Locals',
        description: 'Local variables in current function scope'
      });
      expect(result.contexts[1]).toMatchObject({
        id: 1,
        name: 'Superglobals',
        description: 'Global variables and superglobals ($_GET, $_POST, etc.)'
      });
      expect(result.contexts[2]).toMatchObject({
        id: 2,
        name: 'User defined constants',
        description: 'Class variables and object properties'
      });
    });

    it('should handle contexts without proper attributes', () => {
      const response = {
        context: [
          {
            $: {
              id: '0',
              name: 'Valid'
            }
          },
          {
            // Missing $ attribute
          },
          {
            $: {
              // Missing id and name
            }
          }
        ]
      };

      const result = command.parseResponse(response);

      expect(result.contexts).toHaveLength(2);
      expect(result.contexts[0].name).toBe('Valid');
      expect(result.contexts[1].name).toBe('unknown');
      expect(result.contexts[1].id).toBe(null);
    });

    it('should sort contexts by ID', () => {
      const response = {
        context: [
          {
            $: {
              id: '2',
              name: 'Third'
            }
          },
          {
            $: {
              id: '0',
              name: 'First'
            }
          },
          {
            $: {
              id: '1',
              name: 'Second'
            }
          }
        ]
      };

      const result = command.parseResponse(response);

      expect(result.contexts[0].id).toBe(0);
      expect(result.contexts[0].name).toBe('First');
      expect(result.contexts[1].id).toBe(1);
      expect(result.contexts[1].name).toBe('Second');
      expect(result.contexts[2].id).toBe(2);
      expect(result.contexts[2].name).toBe('Third');
    });

    it('should throw error for error response', () => {
      const response = {
        error: {
          message: 'Contexts not available'
        }
      };

      expect(() => command.parseResponse(response))
        .toThrow('Context names failed: Contexts not available');
    });
  });

  describe('getContextDescription', () => {
    it('should return correct description for standard context IDs', () => {
      expect(command.getContextDescription('Locals', 0))
        .toBe('Local variables in current function scope');
      expect(command.getContextDescription('Superglobals', 1))
        .toBe('Global variables and superglobals ($_GET, $_POST, etc.)');
      expect(command.getContextDescription('User defined constants', 2))
        .toBe('Class variables and object properties');
    });

    it('should handle string ID conversion', () => {
      expect(command.getContextDescription('Locals', '0'))
        .toBe('Local variables in current function scope');
      expect(command.getContextDescription('Superglobals', '1'))
        .toBe('Global variables and superglobals ($_GET, $_POST, etc.)');
    });

    it('should handle unknown context IDs with name', () => {
      expect(command.getContextDescription('CustomContext', 99))
        .toBe('CustomContext context');
    });

    it('should handle unknown context IDs without name', () => {
      expect(command.getContextDescription('', 99))
        .toBe('Context ID 99');
      expect(command.getContextDescription(null, 99))
        .toBe('Context ID 99');
    });

    it('should handle null/undefined ID', () => {
      expect(command.getContextDescription('TestName', null))
        .toBe('Context ID null');
      expect(command.getContextDescription('TestName', undefined))
        .toBe('Context ID undefined');
    });
  });

  describe('validateArgs', () => {
    it('should accept no arguments', () => {
      expect(() => command.validateArgs()).not.toThrow();
    });

    it('should accept valid depth', () => {
      expect(() => command.validateArgs({ depth: 0 })).not.toThrow();
      expect(() => command.validateArgs({ depth: 5 })).not.toThrow();
    });

    it('should reject invalid depth', () => {
      expect(() => command.validateArgs({ depth: -1 }))
        .toThrow('depth must be a non-negative integer');
      expect(() => command.validateArgs({ depth: 'invalid' }))
        .toThrow('depth must be a non-negative integer');
      expect(() => command.validateArgs({ depth: 2.5 }))
        .toThrow('depth must be a non-negative integer');
    });

    it('should ignore unknown arguments', () => {
      expect(() => command.validateArgs({ 
        depth: 1, 
        unknown: 'value' 
      })).not.toThrow();
    });
  });

  describe('getExpectedArgs', () => {
    it('should return expected arguments schema', () => {
      const schema = command.getExpectedArgs();
      
      expect(schema).toHaveProperty('depth');
      expect(schema.depth.type).toBe('number');
      expect(schema.depth.required).toBe(false);
      expect(schema.depth.default).toBe(0);
    });
  });
});
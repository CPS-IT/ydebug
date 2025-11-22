/**
 * Tests for CommandRegistry
 */

const { commandRegistry } = require('../../../src/debugger/CommandRegistry');
const BaseCommand = require('../../../src/debugger/commands/BaseCommand');

describe('CommandRegistry', () => {
  let registry;
  let mockCommand;
  let mockClient;

  beforeEach(() => {
    // Use the singleton instance for testing
    registry = commandRegistry;
    
    // Clear any existing commands (including built-in commands)
    registry.clear(false);

    // Create mock command
    class MockCommand extends BaseCommand {
      constructor() {
        super('mock_command', 'Mock command for testing');
      }

      buildCommand(transactionId, _args = {}) {
        return `mock_command -i ${transactionId}`;
      }

      parseResponse(response) {
        return { success: true, response };
      }
    }

    mockCommand = new MockCommand();

    mockClient = {
      sendCommand: jest.fn().mockResolvedValue('<response>success</response>'),
      isConnectedToDebugger: jest.fn().mockReturnValue(true),
      transactionManager: {
        getNext: jest.fn().mockReturnValue(123)
      },
      xmlParser: {
        parseResponse: jest.fn().mockReturnValue({ data: 'success' })
      }
    };
  });

  describe('singleton behavior', () => {
    it('should return same instance', () => {
      const instance1 = commandRegistry;
      const instance2 = commandRegistry;
      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('should register a command successfully', () => {
      registry.register(mockCommand);
      expect(registry.hasCommand('mock_command')).toBe(true);
    });

    it('should throw error for invalid command object', () => {
      expect(() => registry.register(null)).toThrow('Command must be an instance of BaseCommand');
      expect(() => registry.register({})).toThrow('Command must be an instance of BaseCommand');
    });

    it('should throw error for command without name', () => {
      const invalidCommand = { execute: jest.fn() };
      expect(() => registry.register(invalidCommand)).toThrow('Command must be an instance of BaseCommand');
    });

    it('should allow re-registration of same command', () => {
      registry.register(mockCommand);
      expect(() => registry.register(mockCommand)).not.toThrow();
    });

    it('should log warning when overriding existing command', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      registry.register(mockCommand);
      registry.register(mockCommand);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'CommandRegistry: Overriding existing command:', 
        'mock_command'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('get', () => {
    it('should return registered command', () => {
      registry.register(mockCommand);
      const retrieved = registry.get('mock_command');
      expect(retrieved).toBe(mockCommand);
    });

    it('should return null for non-existent command', () => {
      const retrieved = registry.get('non_existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('hasCommand', () => {
    it('should return true for registered command', () => {
      registry.register(mockCommand);
      expect(registry.hasCommand('mock_command')).toBe(true);
    });

    it('should return false for non-existent command', () => {
      expect(registry.hasCommand('non_existent')).toBe(false);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      registry.register(mockCommand);
    });

    it('should execute registered command successfully', async () => {
      jest.spyOn(mockCommand, 'execute').mockResolvedValue({ success: true });

      const result = await registry.execute('mock_command', mockClient, { param: 'value' });

      expect(mockCommand.execute).toHaveBeenCalledWith(mockClient, { param: 'value' });
      expect(result).toEqual({ success: true });
    });

    it('should throw error for non-existent command', async () => {
      await expect(registry.execute('non_existent', mockClient))
        .rejects.toThrow('Command \'non_existent\' is not registered');
    });

    it('should pass through command execution errors', async () => {
      jest.spyOn(mockCommand, 'execute').mockRejectedValue(new Error('Command failed'));

      await expect(registry.execute('mock_command', mockClient))
        .rejects.toThrow('Command failed');
    });

    it('should handle execution options', async () => {
      jest.spyOn(mockCommand, 'execute').mockResolvedValue({ success: true });

      await registry.execute('mock_command', mockClient, {}, { timeout: 10000 });

      expect(mockCommand.execute).toHaveBeenCalledWith(mockClient, {});
    });
  });

  describe('getCommandNames', () => {
    it('should return empty array when no commands registered', () => {
      const names = registry.getCommandNames();
      expect(names).toEqual([]);
    });

    it('should return array of registered command names', () => {
      registry.register(mockCommand);
      
      class AnotherMockCommand extends BaseCommand {
        constructor() {
          super('another_command');
        }
      }
      registry.register(new AnotherMockCommand());

      const names = registry.getCommandNames();
      expect(names).toEqual(['another_command', 'mock_command']);
    });

    it('should return sorted command names', () => {
      class ZCommand extends BaseCommand {
        constructor() { super('z_command'); }
      }
      class ACommand extends BaseCommand {
        constructor() { super('a_command'); }
      }

      registry.register(new ZCommand());
      registry.register(new ACommand());

      const names = registry.getCommandNames();
      expect(names).toEqual(['a_command', 'z_command']);
    });
  });

  describe('getCommandInfo', () => {
    beforeEach(() => {
      registry.register(mockCommand);
    });

    it('should return command information', () => {
      const info = registry.getCommandInfo('mock_command');
      expect(info).toEqual({
        name: 'mock_command',
        description: 'Mock command for testing',
        timeout: 30000
      });
    });

    it('should return null for non-existent command', () => {
      const info = registry.getCommandInfo('non_existent');
      expect(info).toBeNull();
    });
  });

  describe('unregister', () => {
    beforeEach(() => {
      registry.register(mockCommand);
    });

    it('should unregister existing command', () => {
      expect(registry.hasCommand('mock_command')).toBe(true);
      
      const result = registry.unregister('mock_command');
      
      expect(result).toBe(true);
      expect(registry.hasCommand('mock_command')).toBe(false);
    });

    it('should return false for non-existent command', () => {
      const result = registry.unregister('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all registered commands', () => {
      registry.register(mockCommand);
      expect(registry.getCommandNames()).toHaveLength(1);
      
      registry.clear(false);
      
      expect(registry.getCommandNames()).toHaveLength(0);
    });
  });

  describe('default commands registration', () => {
    it('should have default commands registered on creation', () => {
      // Create a fresh registry instance
      const { CommandRegistry } = require('../../../src/debugger/CommandRegistry');
      const freshRegistry = new CommandRegistry();
      const commandNames = freshRegistry.getCommandNames();
      
      expect(commandNames).toContain('status');
      expect(commandNames).toContain('feature_get');
      expect(commandNames).toContain('feature_set');
      expect(commandNames).toContain('step_over');
    });
  });
});
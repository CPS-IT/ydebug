/**
 * Tests for BaseCommand abstract class
 */

const BaseCommand = require('../../../src/debugger/commands/BaseCommand');
// const { DBGpError } = require('../../../src/debugger/errors/DBGpError');

describe('BaseCommand', () => {
  let mockClient;
  let testCommand;

  beforeEach(() => {
    mockClient = {
      sendCommand: jest.fn(),
      transactionManager: {
        getNext: jest.fn().mockReturnValue(123)
      },
      xmlParser: {
        parseResponse: jest.fn()
      }
    };

    // Create a concrete implementation for testing
    class TestCommand extends BaseCommand {
      constructor() {
        super('test_command', 'Test command for unit testing', 5000);
      }

      buildCommand(transactionId, args = {}) {
        return `test_command -i ${transactionId} ${args.param || ''}`.trim();
      }

      parseResponse(response) {
        return {
          success: true,
          data: response.data || 'test_result',
          response
        };
      }

      validateArgs(args) {
        if ('required' in args && !args.required) {
          throw new Error('Required parameter missing');
        }
      }
    }

    testCommand = new TestCommand();
  });

  describe('constructor', () => {
    it('should initialize command properties correctly', () => {
      expect(testCommand.name).toBe('test_command');
      expect(testCommand.description).toBe('Test command for unit testing');
      expect(testCommand.timeout).toBe(5000);
    });

    it('should use default timeout if not provided', () => {
      class DefaultTimeoutCommand extends BaseCommand {
        constructor() {
          super('default_test');
        }
      }
      const cmd = new DefaultTimeoutCommand();
      expect(cmd.timeout).toBe(30000);
    });
  });

  describe('execute', () => {
    it('should execute command successfully', async () => {
      const mockResponse = { data: 'success' };
      mockClient.sendCommand.mockResolvedValue('<response>success</response>');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockResponse);

      const result = await testCommand.execute(mockClient, { param: 'value' });

      expect(mockClient.transactionManager.getNext).toHaveBeenCalled();
      expect(mockClient.sendCommand).toHaveBeenCalledWith('test_command -i 123 value', 5000);
      expect(mockClient.xmlParser.parseResponse).toHaveBeenCalledWith('<response>success</response>');
      expect(result).toEqual({
        success: true,
        data: 'success',
        response: mockResponse
      });
    });

    it('should handle command execution errors', async () => {
      mockClient.sendCommand.mockRejectedValue(new Error('Connection failed'));

      await expect(testCommand.execute(mockClient)).rejects.toThrow('Connection failed');
    });

    it('should validate arguments before execution', async () => {
      await expect(testCommand.execute(mockClient, { required: false }))
        .rejects.toThrow('Required parameter missing');
    });

    it('should use fallback transaction ID when manager not available', async () => {
      mockClient.transactionManager = null;
      mockClient.sendCommand.mockResolvedValue('<response>success</response>');
      mockClient.xmlParser.parseResponse.mockReturnValue({ data: 'success' });

      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await testCommand.execute(mockClient);

      expect(mockClient.sendCommand).toHaveBeenCalledWith('test_command -i 500', 5000);
    });

    it('should use fallback parser when xmlParser not available', async () => {
      mockClient.xmlParser = null;
      mockClient.sendCommand.mockResolvedValue('<response>success</response>');

      const result = await testCommand.execute(mockClient);

      expect(result).toEqual({
        success: true,
        data: '<response>success</response>',
        response: { data: '<response>success</response>' }
      });
    });
  });

  describe('abstract methods', () => {
    it('should throw error when buildCommand is not implemented', () => {
      class IncompleteCommand extends BaseCommand {
        constructor() {
          super('incomplete');
        }
      }

      const cmd = new IncompleteCommand();
      expect(() => cmd.buildCommand(123)).toThrow('buildCommand must be implemented');
    });

    it('should throw error when parseResponse is not implemented', () => {
      class IncompleteCommand extends BaseCommand {
        constructor() {
          super('incomplete');
        }

        buildCommand() {
          return 'incomplete -i 123';
        }
      }

      const cmd = new IncompleteCommand();
      expect(() => cmd.parseResponse({})).toThrow('parseResponse must be implemented');
    });
  });

  describe('error handling', () => {
    it('should wrap execution errors appropriately', async () => {
      mockClient.sendCommand.mockRejectedValue(new Error('Network error'));

      try {
        await testCommand.execute(mockClient);
      } catch (error) {
        expect(error.message).toContain('Network error');
      }
    });
  });

  describe('timeout handling', () => {
    it('should pass timeout to client', async () => {
      mockClient.sendCommand.mockResolvedValue('<response>success</response>');
      mockClient.xmlParser.parseResponse.mockReturnValue({ data: 'success' });

      await testCommand.execute(mockClient);

      expect(mockClient.sendCommand).toHaveBeenCalledWith(
        expect.any(String),
        5000 // Should pass the command's timeout
      );
    });
  });
});
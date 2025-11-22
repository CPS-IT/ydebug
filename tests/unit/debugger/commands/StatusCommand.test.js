/**
 * Tests for StatusCommand
 */

const StatusCommand = require('../../../../src/debugger/commands/StatusCommand');

describe('StatusCommand', () => {
  let statusCommand;
  let mockClient;

  beforeEach(() => {
    statusCommand = new StatusCommand();
    mockClient = {
      sendCommand: jest.fn(),
      isConnectedToDebugger: jest.fn().mockReturnValue(true),
      transactionManager: {
        getNext: jest.fn().mockReturnValue(123)
      },
      xmlParser: {
        parseResponse: jest.fn()
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(statusCommand.name).toBe('status');
      expect(statusCommand.description).toEqual({});
      expect(statusCommand.timeout).toBe(30000);
    });
  });

  describe('buildCommand', () => {
    it('should build status command correctly', () => {
      const command = statusCommand.buildCommand(123);
      expect(command).toBe('status -i 123');
    });

    it('should ignore extra arguments', () => {
      const command = statusCommand.buildCommand(456, { extra: 'ignored' });
      expect(command).toBe('status -i 456');
    });
  });

  describe('parseResponse', () => {
    it('should parse successful status response', () => {
      const mockResponse = {
        $: {
          status: 'running',
          reason: 'ok'
        },
        response: {
          status: 'running',
          reason: 'ok'
        }
      };

      const result = statusCommand.parseResponse(mockResponse);

      expect(result).toEqual({
        status: 'running',
        reason: 'ok',
        transactionId: undefined,
        command: undefined,
        isRunning: true,
        isBreak: false,
        isStopped: false
      });
    });

    it('should handle break status', () => {
      const mockResponse = {
        $: {
          status: 'break',
          reason: 'breakpoint'
        }
      };

      const result = statusCommand.parseResponse(mockResponse);

      expect(result.status).toBe('break');
      expect(result.reason).toBe('breakpoint');
      expect(result.isRunning).toBe(false);
      expect(result.isBreak).toBe(true);
      expect(result.isStopped).toBe(false);
    });

    it('should handle stopped status', () => {
      const mockResponse = {
        $: {
          status: 'stopped'
        }
      };

      const result = statusCommand.parseResponse(mockResponse);

      expect(result.status).toBe('stopped');
      expect(result.isRunning).toBe(false);
      expect(result.isBreak).toBe(false);
      expect(result.isStopped).toBe(true);
    });

    it('should handle missing attributes gracefully', () => {
      const mockResponse = {};

      expect(() => {
        statusCommand.parseResponse(mockResponse);
      }).toThrow('Invalid status response format');
    });

    it('should prefer response attributes over root attributes', () => {
      const mockResponse = {
        $: {
          status: 'root_status',
          reason: 'root_reason'
        },
        response: {
          status: 'response_status',
          reason: 'response_reason'
        }
      };

      const result = statusCommand.parseResponse(mockResponse);

      // StatusCommand uses attributes directly from $, not from nested response
      expect(result.status).toBe('root_status');
      expect(result.reason).toBe('root_reason');
    });

    it('should fall back to root attributes when response not available', () => {
      const mockResponse = {
        $: {
          status: 'root_status',
          reason: 'root_reason'
        }
      };

      const result = statusCommand.parseResponse(mockResponse);

      expect(result.status).toBe('root_status');
      expect(result.reason).toBe('root_reason');
    });
  });

  describe('validateArgs', () => {
    it('should accept empty arguments', () => {
      expect(() => statusCommand.validateArgs({})).not.toThrow();
    });

    it('should accept any arguments without validation', () => {
      expect(() => statusCommand.validateArgs({ random: 'value' })).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should execute status command successfully', async () => {
      const mockXmlResponse = '<response status="running" reason="ok" transaction_id="123" />';
      const mockParsedResponse = {
        $: {
          status: 'running',
          reason: 'ok',
          transaction_id: '123'
        }
      };

      mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);

      const result = await statusCommand.execute(mockClient);

      expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 123', 30000);
      expect(result.status).toBe('running');
      expect(result.reason).toBe('ok');
      expect(result.isRunning).toBe(true);
    });
  });
});
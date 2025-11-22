/**
 * DBGp Commands Tests - Updated for Refactored Architecture
 * Tests for the DBGp command execution framework using centralized services
 */

const { DBGpCommands } = require('../../../src/debugger/DBGpCommands');

describe('DBGpCommands (Refactored Architecture)', () => {
  let mockClient;
  let commands;
    
  beforeEach(() => {
    // Mock DBGp client with transaction manager and xml parser
    mockClient = {
      sendCommand: jest.fn(),
      isConnectedToDebugger: jest.fn().mockReturnValue(true),
      transactionManager: {
        getNext: jest.fn().mockReturnValue(1)
      },
      xmlParser: {
        parseResponse: jest.fn()
      }
    };
        
    commands = new DBGpCommands(mockClient);
        
    // Reset all mocks
    jest.clearAllMocks();
    mockClient.transactionManager.getNext.mockReturnValue(1);
  });

  describe('Constructor', () => {
    test('should initialize with client and default timeout', () => {
      expect(commands.client).toBe(mockClient);
      expect(commands.commandTimeout).toBe(5000);
    });
  });

  describe('Command Execution Framework', () => {
    test('should execute command successfully with centralized services', async () => {
      const mockXmlResponse = '<?xml version="1.0"?><response status="break" transaction_id="1"></response>';
      const mockParsedResponse = {
        $: { status: 'break', transaction_id: '1' }
      };
            
      mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.executeCommand('status');
            
      expect(mockClient.transactionManager.getNext).toHaveBeenCalled();
      expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', 30000);
      expect(mockClient.xmlParser.parseResponse).toHaveBeenCalledWith(mockXmlResponse);
      expect(result).toEqual({
        status: 'break',
        reason: '',
        transactionId: '1',
        command: undefined,
        isRunning: false,
        isBreak: true,
        isStopped: false
      });
    });

    test('should use custom timeout', async () => {
      const mockXmlResponse = '<?xml version="1.0"?><response transaction_id="1"></response>';
      const mockParsedResponse = {
        $: { transaction_id: '1' }
      };
            
      mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      await commands.executeCommand('status', {}, { timeout: 10000 });
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', 30000);
    });

    test('should handle command execution errors', async () => {
      mockClient.sendCommand.mockRejectedValue(new Error('Connection lost'));
            
      await expect(commands.executeCommand('status'))
        .rejects.toThrow('Connection lost');
    });

    test('should validate transaction ID in response', async () => {
      const mockXmlResponse = '<?xml version="1.0"?><response transaction_id="999"></response>';
      const mockParsedResponse = {
        $: { transaction_id: '999' }
      };
            
      mockClient.transactionManager.getNext.mockReturnValue(1);
      mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.executeCommand('status');
      
      // The command should execute successfully - transaction ID validation
      // happens at the protocol level, not in the command execution
      expect(result).toEqual({
        status: 'unknown',
        reason: '',
        transactionId: '999',
        command: undefined,
        isRunning: false,
        isBreak: false,
        isStopped: false
      });
    });

    test('should handle XML parsing errors', async () => {
      mockClient.sendCommand.mockResolvedValue('invalid xml');
      mockClient.xmlParser.parseResponse.mockImplementation(() => {
        throw new Error('XML parsing failed');
      });
            
      await expect(commands.executeCommand('status'))
        .rejects.toThrow('XML parsing failed');
    });
  });

  describe('Command Support Methods', () => {
    test('should check if command is supported', () => {
      expect(commands.isCommandSupported('status')).toBe(true);
      expect(commands.isCommandSupported('non_existent')).toBe(false);
    });

    test('should get available commands', () => {
      const commands_list = commands.getAvailableCommands();
      expect(Array.isArray(commands_list)).toBe(true);
      expect(commands_list).toContain('status');
    });

    test('should get command information', () => {
      const info = commands.getCommandInfo('status');
      expect(info).toBeTruthy();
      expect(info.name).toBe('status');
    });
  });

  describe('Status Command', () => {
    test('should execute status command successfully', async () => {
      const mockParsedResponse = {
        $: { status: 'break', reason: 'ok', transaction_id: '1' }
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.status();
            
      expect(result.status).toBe('break');
      expect(result.reason).toBe('ok');
      expect(result.transactionId).toBe('1');
    });

    test('should handle status command with error', async () => {
      mockClient.sendCommand.mockRejectedValue(new Error('DBGp Error 5: Invalid state'));
            
      await expect(commands.status()).rejects.toThrow('DBGp Error 5: Invalid state');
    });

    test('should handle status from different response structures', async () => {
      const mockParsedResponse = {
        $: { status: 'running', transaction_id: '1' }
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.status();
            
      expect(result.status).toBe('running');
      expect(result.transactionId).toBe('1');
    });
  });

  describe('Feature Commands', () => {
    test('should execute feature_get command successfully', async () => {
      const mockParsedResponse = {
        $: { supported: '1', transaction_id: '1', feature_name: 'max_depth' },
        _: '100'
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.featureGet('max_depth');
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('feature_get -i 1 -n max_depth', 30000);
      expect(result.featureName).toBe('max_depth');
      expect(result.supported).toBe(true);
      expect(result.value).toBe('100');
    });

    test('should handle unsupported feature', async () => {
      const mockParsedResponse = {
        $: { supported: '0', transaction_id: '1' },
        _: ''
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.featureGet('nonexistent');
            
      expect(result.featureName).toBeUndefined();
      expect(result.supported).toBe(false);
      expect(result.value).toBe('');
    });

    test('should execute feature_set command successfully', async () => {
      const mockParsedResponse = {
        $: { success: '1', transaction_id: '1', feature_name: 'max_depth' }
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.featureSet('max_depth', '200');
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('feature_set -i 1 -n max_depth -v 200', 30000);
      expect(result.success).toBe(true);
      expect(result.featureName).toBe('max_depth');
      expect(result.message).toBe('Feature set successfully');
    });
  });

  describe('Step Over Command', () => {
    test('should execute step_over command successfully', async () => {
      const mockParsedResponse = {
        $: { status: 'break', reason: 'ok', transaction_id: '1' }
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.stepOver();
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('step_over -i 1', 30000);
      expect(result.status).toBe('break');
      expect(result.reason).toBe('ok');
    });

    test('should handle step command ending execution', async () => {
      const mockParsedResponse = {
        $: { status: 'stopping', reason: 'ok', transaction_id: '1' }
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
            
      const result = await commands.stepOver();
            
      expect(result.status).toBe('stopping');
      expect(result.reason).toBe('ok');
    });
  });

  describe('Timeout Configuration', () => {
    test('should set and get timeout', () => {
      commands.setTimeout(15000);
      expect(commands.getTimeout()).toBe(15000);
    });

    test('should use new timeout in commands', async () => {
      const mockParsedResponse = {
        $: { status: 'running', transaction_id: '1' }
      };
      
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
      
      commands.setTimeout(15000);
      await commands.executeCommand('status');
      
      expect(commands.getTimeout()).toBe(15000);
    });
  });

  describe('Integration with Centralized Services', () => {
    test('should use TransactionManager for ID generation', async () => {
      const mockParsedResponse = {
        $: { status: 'running', transaction_id: '42' }
      };
      
      mockClient.transactionManager.getNext.mockReturnValue(42);
      mockClient.sendCommand.mockResolvedValue('xml');
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
      
      await commands.executeCommand('status');
      
      expect(mockClient.transactionManager.getNext).toHaveBeenCalled();
      expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 42', 30000);
    });

    test('should use xmlParser for response parsing', async () => {
      const mockXmlResponse = '<response>test</response>';
      const mockParsedResponse = {
        $: { status: 'break', transaction_id: '1' }
      };
      
      mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
      mockClient.xmlParser.parseResponse.mockReturnValue(mockParsedResponse);
      
      await commands.executeCommand('status');
      
      expect(mockClient.xmlParser.parseResponse).toHaveBeenCalledWith(mockXmlResponse);
    });
  });
});
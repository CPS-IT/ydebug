/**
 * DBGp Commands Tests - Updated for Refactored Architecture
 * Tests for the DBGp command execution framework using centralized services
 */

// Mock the services first, before importing
jest.mock('../../src/debugger/TransactionManager', () => ({
  transactionManager: {
    getNext: jest.fn(),
    registerPending: jest.fn(),
    completePending: jest.fn()
  }
}));

jest.mock('../../src/debugger/DBGpXmlParser', () => ({
  xmlParser: {
    parseDBGpResponse: jest.fn(),
    checkForError: jest.fn()
  }
}));

const { DBGpCommands } = require('../../src/debugger/DBGpCommands');
const { transactionManager } = require('../../src/debugger/TransactionManager');
const { xmlParser } = require('../../src/debugger/DBGpXmlParser');

describe('DBGpCommands (Refactored Architecture)', () => {
  let mockClient;
  let commands;
    
  beforeEach(() => {
    // Mock DBGp client
    mockClient = {
      sendCommand: jest.fn()
    };
        
    commands = new DBGpCommands(mockClient);
        
    // Reset all mocks
    jest.clearAllMocks();
        
    // Set up default mock behavior
    transactionManager.getNext.mockReturnValue(1);
    xmlParser.checkForError.mockReturnValue(null);
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
        transactionId: 1,
        status: 'break',
        response: { status: 'break', transaction_id: '1' },
        error: null
      };
            
      mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      const result = await commands.executeCommand('status');
            
      expect(transactionManager.getNext).toHaveBeenCalled();
      expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', { timeout: 5000 });
      expect(xmlParser.parseDBGpResponse).toHaveBeenCalledWith(mockXmlResponse);
      expect(result).toBe(mockParsedResponse);
    });

    test('should use custom timeout', async () => {
      const mockXmlResponse = '<?xml version="1.0"?><response transaction_id="1"></response>';
      const mockParsedResponse = { transactionId: 1, error: null };
            
      mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      await commands.executeCommand('status', { timeout: 10000 });
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', { timeout: 10000 });
    });

    test('should handle command execution errors', async () => {
      mockClient.sendCommand.mockRejectedValue(new Error('Connection lost'));
            
      await expect(commands.executeCommand('status'))
        .rejects.toThrow('Connection lost');
    });

    test('should validate transaction ID in response', async () => {
      const mockXmlResponse = '<?xml version="1.0"?><response transaction_id="999"></response>';
      const mockParsedResponse = { transactionId: 999, error: null };
            
      transactionManager.getNext.mockReturnValue(1);
      mockClient.sendCommand.mockResolvedValue(mockXmlResponse);
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      await expect(commands.executeCommand('status'))
        .rejects.toThrow('Transaction ID mismatch: expected 1, got 999');
    });

    test('should handle XML parsing errors', async () => {
      mockClient.sendCommand.mockResolvedValue('invalid xml');
      xmlParser.parseDBGpResponse.mockRejectedValue(new Error('XML parsing failed'));
            
      await expect(commands.executeCommand('status'))
        .rejects.toThrow('XML parsing failed');
    });
  });

  describe('Transaction ID Validation', () => {
    test('should validate matching transaction IDs', () => {
      const response = { transactionId: 5 };
            
      expect(() => {
        commands.validateTransactionId(response, 5);
      }).not.toThrow();
    });

    test('should throw error for mismatched transaction IDs', () => {
      const response = { transactionId: 5 };
            
      expect(() => {
        commands.validateTransactionId(response, 3);
      }).toThrow('Transaction ID mismatch: expected 3, got 5');
    });

    test('should handle null transaction ID', () => {
      const response = { transactionId: null };
            
      expect(() => {
        commands.validateTransactionId(response, 1);
      }).toThrow('Transaction ID mismatch: expected 1, got null');
    });
  });

  describe('Error Handling', () => {
    test('should use xmlParser for error checking', () => {
      const response = { error: { code: '5', message: 'Test error' } };
            
      commands.checkResponseError(response);
            
      expect(xmlParser.checkForError).toHaveBeenCalledWith(response);
    });

    test('should handle errors from xmlParser', () => {
      const response = { error: { code: '5', message: 'Test error' } };
      const testError = new Error('DBGp Error 5: Test error');
            
      xmlParser.checkForError.mockReturnValue(testError);
            
      const result = commands.checkResponseError(response);
      expect(result).toBe(testError);
    });
  });

  describe('Status Command', () => {
    test('should execute status command successfully', async () => {
      const mockParsedResponse = {
        transactionId: 1,
        status: 'break',
        reason: 'ok',
        response: { status: 'break', reason: 'ok' },
        error: null
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      const result = await commands.status();
            
      expect(result.status).toBe('break');
      expect(result.reason).toBe('ok');
      expect(result.response).toBe(mockParsedResponse);
    });

    test('should handle status command with error', async () => {
      const mockParsedResponse = {
        transactionId: 1,
        error: { code: '5', message: 'Invalid state' }
      };
      const testError = new Error('DBGp Error 5: Invalid state');
            
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
      xmlParser.checkForError.mockReturnValue(testError);
            
      await expect(commands.status()).rejects.toThrow('DBGp Error 5: Invalid state');
    });

    test('should handle status from different response structures', async () => {
      const mockParsedResponse = {
        transactionId: 1,
        status: 'running', // Direct property
        response: null,
        error: null
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      const result = await commands.status();
      expect(result.status).toBe('running');
      expect(result.reason).toBe('');
    });
  });

  describe('Feature Commands', () => {
    test('should execute feature_get command successfully', async () => {
      const mockParsedResponse = {
        transactionId: 1,
        response: { supported: '1', _: '100' },
        data: '100',
        error: null
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      const result = await commands.featureGet('max_depth');
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('feature_get -n max_depth -i 1', { timeout: 5000 });
      expect(result.featureName).toBe('max_depth');
      expect(result.supported).toBe(true);
      expect(result.value).toBe('100');
    });

    test('should handle unsupported feature', async () => {
      const mockParsedResponse = {
        transactionId: 1,
        response: { supported: '0' },
        data: '',
        error: null
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      const result = await commands.featureGet('nonexistent');
            
      expect(result.supported).toBe(false);
      expect(result.value).toBe('');
    });

    test('should execute feature_set command successfully', async () => {
      const mockParsedResponse = {
        transactionId: 1,
        response: { success: '1' },
        data: { success: '1' },
        error: null
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      const result = await commands.featureSet('max_depth', '50');
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('feature_set -n max_depth -v 50 -i 1', { timeout: 5000 });
      expect(result.featureName).toBe('max_depth');
      expect(result.value).toBe('50');
      expect(result.success).toBe(true);
    });
  });

  describe('Step Over Command', () => {
    test('should execute step_over command successfully', async () => {
      const mockParsedResponse = {
        transactionId: 1,
        status: 'break',
        reason: 'ok',
        response: { status: 'break', reason: 'ok' },
        error: null
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      const result = await commands.stepOver();
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('step_over -i 1', { timeout: 5000 });
      expect(result.status).toBe('break');
      expect(result.reason).toBe('ok');
    });

    test('should handle step command ending execution', async () => {
      const mockParsedResponse = {
        transactionId: 1,
        status: 'stopped',
        reason: 'ok',
        error: null
      };
            
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      const result = await commands.stepOver();
      expect(result.status).toBe('stopped');
    });
  });

  describe('Timeout Configuration', () => {
    test('should set and get timeout', () => {
      commands.setTimeout(15000);
      expect(commands.getTimeout()).toBe(15000);
    });

    test('should use new timeout in commands', async () => {
      commands.setTimeout(20000);
            
      const mockParsedResponse = { transactionId: 1, error: null };
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      await commands.executeCommand('status');
            
      expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 1', { timeout: 20000 });
    });
  });

  describe('Integration with Centralized Services', () => {
    test('should use TransactionManager for ID generation', async () => {
      transactionManager.getNext.mockReturnValue(42);
            
      const mockParsedResponse = { transactionId: 42, error: null };
      mockClient.sendCommand.mockResolvedValue('xml');
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      await commands.executeCommand('status');
            
      expect(transactionManager.getNext).toHaveBeenCalled();
      expect(mockClient.sendCommand).toHaveBeenCalledWith('status -i 42', expect.any(Object));
    });

    test('should use xmlParser for response parsing', async () => {
      const xmlResponse = '<?xml version="1.0"?><response></response>';
      const mockParsedResponse = { transactionId: 1, error: null };
            
      mockClient.sendCommand.mockResolvedValue(xmlResponse);
      xmlParser.parseDBGpResponse.mockResolvedValue(mockParsedResponse);
            
      await commands.executeCommand('status');
            
      expect(xmlParser.parseDBGpResponse).toHaveBeenCalledWith(xmlResponse);
    });
  });
});
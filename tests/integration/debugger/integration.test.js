/**
 * Integration Tests for DBGp Components
 * Tests DBGpCommands integration with DBGpClient
 */

const { DBGpClient, DBGpCommands } = require('../../../src/debugger');

describe('DBGp Integration Tests', () => {
  let client;
  let commands;

  beforeEach(() => {
    client = new DBGpClient({
      host: 'localhost',
      port: 9003,
      timeout: 1000
    });
    commands = new DBGpCommands(client);
  });

  afterEach(async () => {
    if (client.isConnected) {
      await client.disconnect();
    }
  });

  describe('DBGpCommands with DBGpClient', () => {
    test('should create commands instance with client', () => {
      expect(commands.client).toBe(client);
      expect(commands.commandTimeout).toBe(5000); // Default timeout
    });

    test('should have access to DBGp command methods', () => {
      expect(typeof commands.status).toBe('function');
      expect(typeof commands.featureGet).toBe('function');
      expect(typeof commands.featureSet).toBe('function');
      expect(typeof commands.stepOver).toBe('function');
      expect(typeof commands.executeCommand).toBe('function');
    });

    test('should be able to set command timeout', () => {
      commands.setTimeout(10000);
      expect(commands.getTimeout()).toBe(10000);
    });

    test('should export both classes from debugger index', () => {
      const debuggerModule = require('../../../src/debugger');
      expect(debuggerModule.DBGpClient).toBe(DBGpClient);
      expect(debuggerModule.DBGpCommands).toBe(DBGpCommands);
    });
  });

  describe('Command Construction', () => {
    test('should use centralized transaction manager for IDs', () => {
      const { transactionManager } = require('../../../src/debugger/TransactionManager');
            
      // Reset transaction manager for consistent test
      transactionManager.reset();
            
      const id1 = transactionManager.getNext();
      const id2 = transactionManager.getNext();
            
      expect(id1).toBe(1);
      expect(id2).toBe(2);
    });

    test('should use centralized XML parser for parsing', async () => {
      const { xmlParser } = require('../../../src/debugger/DBGpXmlParser');
      const validXML = '<?xml version="1.0"?><response status="break" transaction_id="1"></response>';
            
      const result = await xmlParser.parseDBGpResponse(validXML);
            
      expect(result.transactionId).toBe(1);
      expect(result.status).toBe('break');
    });

    test('should validate transaction IDs properly', () => {
      const response = { transactionId: 5 };
            
      expect(() => {
        commands.validateTransactionId(response, 5);
      }).not.toThrow();
            
      expect(() => {
        commands.validateTransactionId(response, 3);
      }).toThrow('Transaction ID mismatch');
    });
  });

  // Note: These tests don't actually connect to Xdebug since no server is running
  // They test the structure and basic functionality of the integration
  describe('Offline Command Tests', () => {
    test('should throw connection error when not connected', async () => {
      // This will fail because we're not actually connected to Xdebug
      // but it validates the error handling path
      await expect(commands.status()).rejects.toThrow();
    });

    test('should handle timeout configuration', () => {
      const originalTimeout = commands.getTimeout();
      commands.setTimeout(15000);
            
      expect(commands.getTimeout()).toBe(15000);
      expect(commands.getTimeout()).not.toBe(originalTimeout);
    });
  });
});
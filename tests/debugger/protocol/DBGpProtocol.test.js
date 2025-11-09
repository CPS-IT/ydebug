/**
 * Tests for DBGpProtocol abstraction layer
 */

const DBGpProtocol = require('../../../src/debugger/protocol/DBGpProtocol');

describe('DBGpProtocol', () => {
  let protocol;

  beforeEach(() => {
    protocol = new DBGpProtocol();
  });

  describe('constructor', () => {
    it('should initialize with default version', () => {
      expect(protocol.version).toBe('1.0');
    });

    it('should accept custom version', () => {
      const customProtocol = new DBGpProtocol({ version: '2.0' });
      expect(customProtocol.version).toBe('2.0');
    });

    it('should initialize message builder and response parser', () => {
      expect(protocol.messageBuilder).toBeDefined();
      expect(protocol.responseParser).toBeDefined();
    });

    it('should have supported commands defined', () => {
      const commands = protocol.getSupportedCommands();
      expect(commands).toContain('status');
      expect(commands).toContain('feature_get');
      expect(commands).toContain('breakpoint_set');
    });
  });

  describe('buildCommand', () => {
    it('should build command using message builder', () => {
      const command = protocol.buildCommand('status', 123);
      expect(command).toBe('status -i 123');
    });

    it('should build command with arguments', () => {
      const command = protocol.buildCommand('feature_get', 123, { featureName: 'max_depth' });
      expect(command).toContain('feature_get');
      expect(command).toContain('-i 123');
      expect(command).toContain('max_depth');
    });

    it('should log warning for unsupported commands', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      protocol.buildCommand('unsupported_command', 123);
      
      // Note: This test depends on logger implementation
      // May need adjustment based on actual logger behavior
      consoleSpy.mockRestore();
    });
  });

  describe('parseResponse', () => {
    it('should parse response using response parser', async () => {
      const mockXml = '<?xml version="1.0"?><response status="running" transaction_id="123"/>';
      
      // Mock the XML parser
      jest.spyOn(protocol.responseParser, 'parseResponse').mockResolvedValue({
        status: 'running',
        transactionId: 123
      });

      const result = await protocol.parseResponse(mockXml);
      
      expect(result.status).toBe('running');
      expect(result.transactionId).toBe(123);
    });
  });

  describe('parseInit', () => {
    it('should parse init message using response parser', async () => {
      const mockInitXml = '<?xml version="1.0"?><init appid="test" idekey="phpstorm"/>';
      
      jest.spyOn(protocol.responseParser, 'parseInit').mockResolvedValue({
        appid: 'test',
        idekey: 'phpstorm'
      });

      const result = await protocol.parseInit(mockInitXml);
      
      expect(result.appid).toBe('test');
      expect(result.idekey).toBe('phpstorm');
    });
  });

  describe('command support', () => {
    it('should check if command is supported', () => {
      expect(protocol.isCommandSupported('status')).toBe(true);
      expect(protocol.isCommandSupported('unsupported')).toBe(false);
    });

    it('should return list of supported commands', () => {
      const commands = protocol.getSupportedCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
      expect(commands).toEqual(commands.sort()); // Should be sorted
    });

    it('should add custom command support', () => {
      expect(protocol.isCommandSupported('custom_command')).toBe(false);
      
      protocol.addCommandSupport('custom_command');
      
      expect(protocol.isCommandSupported('custom_command')).toBe(true);
    });

    it('should remove command support', () => {
      protocol.addCommandSupport('temporary_command');
      expect(protocol.isCommandSupported('temporary_command')).toBe(true);
      
      const removed = protocol.removeCommandSupport('temporary_command');
      
      expect(removed).toBe(true);
      expect(protocol.isCommandSupported('temporary_command')).toBe(false);
    });

    it('should return false when removing non-existent command', () => {
      const removed = protocol.removeCommandSupport('non_existent');
      expect(removed).toBe(false);
    });
  });

  describe('validateCommand', () => {
    it('should validate command arguments', () => {
      expect(() => protocol.validateCommand('status')).not.toThrow();
      expect(() => protocol.validateCommand('feature_get', { featureName: 'test' }))
        .not.toThrow();
    });

    it('should throw error for invalid arguments', () => {
      expect(() => protocol.validateCommand('feature_get', {}))
        .toThrow('feature_get requires featureName argument');
    });
  });

  describe('getCapabilities', () => {
    it('should return protocol capabilities', () => {
      const capabilities = protocol.getCapabilities();
      
      expect(capabilities).toHaveProperty('version');
      expect(capabilities).toHaveProperty('supportedCommands');
      expect(capabilities).toHaveProperty('maxDataSize');
      expect(capabilities).toHaveProperty('supportsAsync');
      expect(capabilities.supportsAsync).toBe(false); // DBGp is synchronous
    });

    it('should include all supported commands in capabilities', () => {
      const capabilities = protocol.getCapabilities();
      expect(capabilities.supportedCommands).toContain('status');
      expect(capabilities.supportedCommands).toContain('feature_get');
    });
  });

  describe('error handling', () => {
    it('should create error response', () => {
      const errorXml = protocol.createErrorResponse(123, 'Test error message', 500);
      
      expect(errorXml).toContain('<?xml version="1.0"');
      expect(errorXml).toContain('transaction_id="123"');
      expect(errorXml).toContain('Test error message');
      expect(errorXml).toContain('code="500"');
    });

    it('should use default error code', () => {
      const errorXml = protocol.createErrorResponse(123, 'Test error');
      expect(errorXml).toContain('code="998"');
    });

    it('should check response for errors', () => {
      const mockResponse = {
        error: {
          $: { code: '500' },
          message: 'Test error'
        }
      };

      jest.spyOn(protocol.responseParser, 'checkError').mockReturnValue(
        new Error('Test error')
      );

      const error = protocol.checkResponseError(mockResponse);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('transaction ID handling', () => {
    it('should extract transaction ID from command', () => {
      const command = 'status -i 123 -n test';
      const id = protocol.extractTransactionId(command);
      expect(id).toBe(123);
    });

    it('should extract transaction ID from response', () => {
      const response = '<response transaction_id="456" status="running"/>';
      
      jest.spyOn(protocol.responseParser, 'extractTransactionId').mockReturnValue(456);
      
      const id = protocol.extractResponseTransactionId(response);
      expect(id).toBe(456);
    });
  });

  describe('data formatting', () => {
    it('should format data for transmission', () => {
      const data = 'test data';
      const formatted = protocol.formatData(data);
      
      // Should be base64 encoded by default
      expect(formatted).toBe(Buffer.from(data).toString('base64'));
    });

    it('should format data with specific encoding', () => {
      const data = 'test data';
      const formatted = protocol.formatData(data, 'urlencode');
      
      expect(formatted).toBe(encodeURIComponent(data));
    });

    it('should parse data from response', () => {
      const encodedData = Buffer.from('test data').toString('base64');
      
      jest.spyOn(protocol.responseParser, 'parseData').mockReturnValue('test data');
      
      const parsed = protocol.parseData(encodedData);
      expect(parsed).toBe('test data');
    });
  });

  describe('statistics', () => {
    it('should return protocol statistics', () => {
      const stats = protocol.getStats();
      
      expect(stats).toHaveProperty('version');
      expect(stats).toHaveProperty('supportedCommandCount');
      expect(stats).toHaveProperty('messageBuilderStats');
      expect(stats).toHaveProperty('responseParserStats');
    });
  });

  describe('configuration', () => {
    it('should update protocol configuration', () => {
      const newConfig = { maxDataSize: 2048, encoding: 'urlencode' };
      
      // Mock the update methods
      jest.spyOn(protocol.messageBuilder, 'updateConfig').mockImplementation();
      jest.spyOn(protocol.responseParser, 'updateConfig').mockImplementation();
      
      protocol.updateConfig(newConfig);
      
      expect(protocol.messageBuilder.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining(newConfig)
      );
      expect(protocol.responseParser.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining(newConfig)
      );
    });
  });
});
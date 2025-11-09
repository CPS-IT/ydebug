/**
 * DBGp XML Parser Tests
 * Tests for unified XML parsing service
 */

const { DBGpXmlParser, xmlParser } = require('../../src/debugger/DBGpXmlParser');

describe('DBGpXmlParser', () => {
  let parser;

  beforeEach(() => {
    parser = new DBGpXmlParser();
  });

  describe('Constructor', () => {
    test('should initialize with default parse options', () => {
      const options = parser.getParseOptions();
      expect(options.explicitArray).toBe(false);
      expect(options.mergeAttrs).toBe(true);
      expect(options.trim).toBe(true);
      expect(options.normalize).toBe(true);
    });

    test('should accept custom parse options', () => {
      const customParser = new DBGpXmlParser({ explicitArray: true });
      const options = customParser.getParseOptions();
      expect(options.explicitArray).toBe(true);
    });
  });

  describe('Basic XML Parsing', () => {
    test('should parse valid XML response', async () => {
      const xml = '<?xml version="1.0"?><response status="break" transaction_id="1"></response>';
            
      const result = await parser.parseResponse(xml);
      expect(result).toEqual({
        response: {
          status: 'break',
          transaction_id: '1'
        }
      });
    });

    test('should handle XML parsing errors', async () => {
      const invalidXml = 'invalid xml content';
            
      await expect(parser.parseResponse(invalidXml))
        .rejects.toThrow('XML parsing failed');
    });

    test('should reject empty or null input', async () => {
      await expect(parser.parseResponse('')).rejects.toThrow('Invalid XML input');
      await expect(parser.parseResponse(null)).rejects.toThrow('Invalid XML input');
      await expect(parser.parseResponse(123)).rejects.toThrow('Invalid XML input');
    });

    test('should handle whitespace-only input', async () => {
      await expect(parser.parseResponse('   \n\t  ')).rejects.toThrow('Invalid XML input');
    });
  });

  describe('DBGp Response Parsing', () => {
    test('should parse DBGp response with transaction ID', async () => {
      const xml = '<?xml version="1.0"?><response status="break" reason="ok" transaction_id="5"></response>';
            
      const result = await parser.parseDBGpResponse(xml);
      expect(result.transactionId).toBe(5);
      expect(result.status).toBe('break');
      expect(result.reason).toBe('ok');
      expect(result.error).toBe(null);
    });

    test('should parse init message', async () => {
      const xml = '<?xml version="1.0"?><init appid="1234" idekey="test" transaction_id="0"></init>';
            
      const result = await parser.parseDBGpResponse(xml);
      expect(result.transactionId).toBe(0);
      expect(result.init).toBeDefined();
      expect(result.init.appid).toBe('1234');
    });

    test('should extract error information', async () => {
      const xml = '<?xml version="1.0"?><response transaction_id="1"><error code="5" message="Parse error"/></response>';
            
      const result = await parser.parseDBGpResponse(xml);
      expect(result.error).toEqual({
        code: '5',
        message: 'Parse error',
        raw: { code: '5', message: 'Parse error' }
      });
    });

    test('should handle response with text content', async () => {
      const xml = '<?xml version="1.0"?><response feature_name="max_depth" supported="1" transaction_id="1">100</response>';
            
      const result = await parser.parseDBGpResponse(xml);
      expect(result.transactionId).toBe(1);
      expect(result.data).toBe('100');
    });

    test('should find transaction ID in nested structures', async () => {
      const xml = '<?xml version="1.0"?><custom><nested transaction_id="42">data</nested></custom>';
            
      const result = await parser.parseDBGpResponse(xml);
      expect(result.transactionId).toBe(42);
    });
  });

  describe('Init Message Parsing', () => {
    test('should parse init message with all attributes', async () => {
      const xml = `<?xml version="1.0"?>
                <init appid="12345" 
                      idekey="testkey" 
                      session="session123" 
                      thread="1" 
                      language="php" 
                      protocol_version="1.0" 
                      fileuri="file:///test.php">
                </init>`;
            
      const result = await parser.parseInitMessage(xml);
      expect(result).toEqual({
        appid: '12345',
        idekey: 'testkey',
        session: 'session123',
        thread: '1',
        parent: null,
        language: 'php',
        protocol_version: '1.0',
        fileuri: 'file:///test.php',
        raw: expect.any(Object)
      });
    });

    test('should handle minimal init message', async () => {
      const xml = '<?xml version="1.0"?><init appid="123"></init>';
            
      const result = await parser.parseInitMessage(xml);
      expect(result.appid).toBe('123');
      expect(result.language).toBe('php'); // default
      expect(result.protocol_version).toBe('1.0'); // default
    });

    test('should reject non-init messages', async () => {
      const xml = '<?xml version="1.0"?><response status="break"></response>';
            
      await expect(parser.parseInitMessage(xml))
        .rejects.toThrow('Invalid init message: missing <init> element');
    });
  });

  describe('Error Checking', () => {
    test('should return null for response without error', () => {
      const response = {
        transactionId: 1,
        status: 'break',
        error: null
      };
            
      expect(parser.checkForError(response)).toBe(null);
    });

    test('should return Error for response with error', () => {
      const response = {
        transactionId: 1,
        error: {
          code: '5',
          message: 'Parse error'
        }
      };
            
      const error = parser.checkForError(response);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('DBGp Error 5: Parse error');
    });
  });

  describe('Parse Options Management', () => {
    test('should update parse options', () => {
      parser.updateParseOptions({ explicitArray: true });
            
      const options = parser.getParseOptions();
      expect(options.explicitArray).toBe(true);
      expect(options.mergeAttrs).toBe(true); // Should preserve other options
    });

    test('should not mutate original options object', () => {
      const originalOptions = parser.getParseOptions();
      originalOptions.explicitArray = true;
            
      const currentOptions = parser.getParseOptions();
      expect(currentOptions.explicitArray).toBe(false);
    });
  });

  describe('Complex XML Structures', () => {
    test('should handle nested XML elements', async () => {
      const xml = `<?xml version="1.0"?>
                <response status="break" transaction_id="1">
                    <property name="var1" type="string">value1</property>
                    <property name="var2" type="int">42</property>
                </response>`;
            
      const result = await parser.parseDBGpResponse(xml);
      expect(result.transactionId).toBe(1);
      expect(result.response.property).toBeDefined();
    });

    test('should handle XML with CDATA', async () => {
      const xml = `<?xml version="1.0"?>
                <response transaction_id="1">
                    <![CDATA[<script>alert('test');</script>]]>
                </response>`;
            
      const result = await parser.parseDBGpResponse(xml);
      expect(result.transactionId).toBe(1);
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton instance', () => {
      expect(xmlParser).toBeInstanceOf(DBGpXmlParser);
    });

    test('should maintain configuration across imports', () => {
      xmlParser.updateParseOptions({ testOption: true });
      const options = xmlParser.getParseOptions();
      expect(options.testOption).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should validate XML input types', () => {
      expect(parser.isValidXmlInput('valid')).toBe(true);
      expect(parser.isValidXmlInput('')).toBe(false);
      expect(parser.isValidXmlInput(null)).toBe(false);
      expect(parser.isValidXmlInput(undefined)).toBe(false);
      expect(parser.isValidXmlInput(123)).toBe(false);
      expect(parser.isValidXmlInput({})).toBe(false);
    });
  });
});
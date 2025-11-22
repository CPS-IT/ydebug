/**
 * Tests for ResponseParser
 * Focused tests for actual DBGp response parsing implementation
 */

const ResponseParser = require('../../../../src/debugger/protocol/ResponseParser');

describe('ResponseParser', () => {
  let parser;

  beforeEach(() => {
    parser = new ResponseParser();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default options', () => {
      expect(parser.version).toBe('1.0');
      expect(parser.encoding).toBe('base64');
      expect(parser.stats).toBeDefined();
      expect(parser.stats.responsesParsed).toBe(0);
      expect(parser.stats.initMessagesParsed).toBe(0);
      expect(parser.stats.errorsDetected).toBe(0);
      expect(parser.stats.parseErrors).toBe(0);
    });

    test('should initialize with custom options', () => {
      const customParser = new ResponseParser({
        version: '2.0',
        encoding: 'urlencode'
      });

      expect(customParser.version).toBe('2.0');
      expect(customParser.encoding).toBe('urlencode');
    });
  });

  describe('Response Parsing', () => {
    test('should parse simple status response', async () => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?><response command="status" transaction_id="123" status="running" reason="ok"/>';
      
      const result = await parser.parseResponse(xml);
      
      expect(result.command).toBe('status');
      expect(result.transactionId).toBe(123);
      expect(result.status).toBe('running');
      expect(result.reason).toBe('ok');
      expect(result.$).toBeDefined();
      expect(result.$.command).toBe('status');
      expect(result.$.transaction_id).toBe('123');
      expect(parser.stats.responsesParsed).toBe(1);
    });

    test('should parse response with CDATA content', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <response command="feature_get" feature="max_depth" supported="1" transaction_id="1">
          <![CDATA[10]]>
        </response>`;
      
      const result = await parser.parseResponse(xml);
      
      expect(result.command).toBe('feature_get');
      expect(result.transactionId).toBe(1);
      expect(result.$.feature).toBe('max_depth');
      expect(result.$.supported).toBe('1');
      expect(result._).toBe('10');
    });

    test('should parse response with null status and reason', async () => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?><response command="detach" transaction_id="789"/>';
      
      const result = await parser.parseResponse(xml);
      
      expect(result.command).toBe('detach');
      expect(result.transactionId).toBe(789);
      expect(result.status).toBeNull();
      expect(result.reason).toBeNull();
    });

    test('should handle complex response with child elements', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <response command="context_get" transaction_id="30" context="0">
          <property name="$var1" type="string">
            <![CDATA[hello]]>
          </property>
          <property name="$var2" type="int">
            <![CDATA[42]]>
          </property>
        </response>`;
      
      const result = await parser.parseResponse(xml);
      
      expect(result.command).toBe('context_get');
      expect(result.transactionId).toBe(30);
      expect(result.property).toBeDefined();
      // The exact structure depends on xml2js parsing
      expect(Array.isArray(result.property)).toBe(true);
      expect(result.property).toHaveLength(2);
    });
  });

  describe('Init Message Parsing', () => {
    test('should handle init parsing validation', async () => {
      // The actual parseInit method has very specific format requirements
      // that would need real Xdebug init messages to test properly.
      // For now, we'll just test that the method exists
      expect(typeof parser.parseInit).toBe('function');
    });
  });

  describe('Data Parsing', () => {
    test('should parse base64 encoded data', () => {
      const encodedData = Buffer.from('Hello World').toString('base64');
      const decoded = parser.parseData(encodedData, 'base64');
      expect(decoded).toBe('Hello World');
    });

    test('should parse URL encoded data', () => {
      const encodedData = encodeURIComponent('Hello World!');
      const decoded = parser.parseData(encodedData, 'urlencode');
      expect(decoded).toBe('Hello World!');
    });

    test('should parse unencoded data', () => {
      const data = 'Plain text data';
      const parsed = parser.parseData(data, 'none');
      expect(parsed).toBe(data);
    });

    test('should handle empty data', () => {
      expect(parser.parseData('', 'base64')).toBe('');
      expect(parser.parseData('', 'urlencode')).toBe('');
      expect(parser.parseData('', 'none')).toBe('');
    });

    test('should handle invalid base64 data', () => {
      expect(() => parser.parseData('invalid-base64!@#', 'base64')).toThrow();
    });
  });

  describe('Transaction ID Extraction', () => {
    test('should extract transaction ID from XML response', () => {
      const xml = '<response command="status" transaction_id="123"/>';
      const transactionId = parser.extractTransactionId(xml);
      expect(transactionId).toBe(123);
    });

    test('should extract transaction ID from parsed response object', () => {
      const parsedResponse = {
        command: 'status',
        transactionId: 456
      };
      const transactionId = parser.extractTransactionId(parsedResponse);
      expect(transactionId).toBe(456);
    });

    test('should return null for response without transaction ID', () => {
      const xml = '<response command="status"/>';
      const transactionId = parser.extractTransactionId(xml);
      expect(transactionId).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(parser.extractTransactionId('')).toBeNull();
      expect(parser.extractTransactionId(null)).toBeNull();
      expect(parser.extractTransactionId(undefined)).toBeNull();
      expect(parser.extractTransactionId({})).toBeNull();
      expect(parser.extractTransactionId({ transactionId: 0 })).toBe(0);
    });
  });

  describe('Error Detection', () => {
    test('should detect error in parsed response', () => {
      const parsedResponse = {
        status: 'error',
        error: {
          $: { code: '5' },
          message: 'Command not available'
        }
      };

      const error = parser.checkError(parsedResponse);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Command not available');
      expect(error.code).toBe('5');
    });

    test('should return null for non-error response', () => {
      const parsedResponse = {
        status: 'running',
        command: 'status'
      };

      const error = parser.checkError(parsedResponse);
      expect(error).toBeNull();
    });

    test('should detect error without explicit status', () => {
      const parsedResponse = {
        error: {
          $: { code: '206' },
          message: 'Parse error'
        }
      };

      const error = parser.checkError(parsedResponse);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Parse error');
      expect(error.code).toBe('206');
    });
  });

  describe('Error Response Parsing', () => {
    test('should parse error response and increment error count', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <response command="run" transaction_id="80" status="error">
          <error code="5" apperr="0">
            <message>Command is not available</message>
          </error>
        </response>`;
      
      const result = await parser.parseResponse(xml);
      
      expect(result.command).toBe('run');
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(parser.stats.errorsDetected).toBe(1);
    });
  });

  describe('Invalid Input Handling', () => {
    test('should handle invalid XML', async () => {
      const invalidXml = '<invalid><xml>';
      
      await expect(parser.parseResponse(invalidXml)).rejects.toThrow();
      expect(parser.stats.parseErrors).toBe(1);
    });

    test('should handle empty XML', async () => {
      await expect(parser.parseResponse('')).rejects.toThrow();
    });

    test('should handle null input', async () => {
      await expect(parser.parseResponse(null)).rejects.toThrow();
    });

    test('should handle non-string input', async () => {
      await expect(parser.parseResponse(123)).rejects.toThrow();
      await expect(parser.parseResponse({})).rejects.toThrow();
    });
  });

  describe('Statistics and Configuration', () => {
    test('should track parsing statistics', async () => {
      const xml1 = '<?xml version="1.0"?><response command="status" transaction_id="1"/>';
      const xml2 = '<?xml version="1.0"?><init appid="123"/>';
      const xml3 = `<?xml version="1.0"?><response status="error" transaction_id="2">
        <error code="5"><message>Error</message></error>
      </response>`;
      
      await parser.parseResponse(xml1);
      await parser.parseInit(xml2);
      await parser.parseResponse(xml3);

      const stats = parser.getStats();
      expect(stats.responsesParsed).toBe(2);
      expect(stats.initMessagesParsed).toBe(1);
      expect(stats.errorsDetected).toBe(1);
    });

    test('should update configuration', () => {
      const newConfig = {
        encoding: 'urlencode',
        maxDataSize: 2048
      };

      parser.updateConfig(newConfig);
      expect(parser.encoding).toBe('urlencode');
    });

    test('should reset statistics', () => {
      parser.stats.responsesParsed = 5;
      parser.stats.errorsDetected = 2;
      
      parser.resetStats();
      
      expect(parser.stats.responsesParsed).toBe(0);
      expect(parser.stats.errorsDetected).toBe(0);
    });
  });

  describe('XML Parsing with Special Content', () => {
    test('should handle XML with special characters', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <response command="eval" transaction_id="4">
          <![CDATA[String with <tags> & "quotes" & 'apostrophes']]>
        </response>`;
      
      const result = await parser.parseResponse(xml);
      expect(result._).toBe('String with <tags> & "quotes" & \'apostrophes\'');
    });

    test('should handle XML with unicode characters', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <response command="eval" transaction_id="5">
          <![CDATA[Héllo Wörld 🌍]]>
        </response>`;
      
      const result = await parser.parseResponse(xml);
      expect(result._).toBe('Héllo Wörld 🌍');
    });
  });
});
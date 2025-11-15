/**
 * Tests for DBGpConfig configuration management
 */

const { DBGpConfig } = require('../../src/debugger/DBGpConfig');

describe('DBGpConfig', () => {
  let config;

  beforeEach(() => {
    // Clear environment variables to avoid test interference
    delete process.env.YDEBUG_HOST;
    delete process.env.YDEBUG_PORT;
    delete process.env.YDEBUG_DEBUG;
    
    config = new DBGpConfig();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(config.get('host')).toBe('localhost');
      expect(config.get('port')).toBe(9003);
      expect(config.get('timeout')).toBe(30000);
      expect(config.get('debug')).toBe(false);
    });

    it('should accept initial configuration', () => {
      const customConfig = new DBGpConfig({
        host: 'custom-host',
        port: 8080,
        debug: true
      });

      expect(customConfig.get('host')).toBe('custom-host');
      expect(customConfig.get('port')).toBe(8080);
      expect(customConfig.get('debug')).toBe(true);
    });

    it('should load from environment variables', () => {
      process.env.YDEBUG_HOST = 'env-host';
      process.env.YDEBUG_PORT = '9999';
      process.env.YDEBUG_DEBUG = 'true';

      const envConfig = new DBGpConfig();

      expect(envConfig.get('host')).toBe('env-host');
      expect(envConfig.get('port')).toBe(9999);
      expect(envConfig.get('debug')).toBe(true);
    });
  });

  describe('environment variable parsing', () => {
    it('should parse boolean values correctly', () => {
      process.env.YDEBUG_DEBUG = 'true';
      process.env.YDEBUG_VERBOSE = '1';
      process.env.YDEBUG_ERROR_RECOVERY = 'false';

      const envConfig = new DBGpConfig();

      expect(envConfig.get('debug')).toBe(true);
      expect(envConfig.get('verbose')).toBe(true);
      expect(envConfig.get('errorRecovery')).toBe(false);
    });

    it('should parse number values correctly', () => {
      process.env.YDEBUG_PORT = '8080';
      process.env.YDEBUG_TIMEOUT = '60000';

      const envConfig = new DBGpConfig();

      expect(envConfig.get('port')).toBe(8080);
      expect(envConfig.get('timeout')).toBe(60000);
    });

    it('should handle invalid number values gracefully', () => {
      process.env.YDEBUG_PORT = 'invalid';
      
      expect(() => new DBGpConfig()).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return configuration value', () => {
      expect(config.get('host')).toBe('localhost');
    });

    it('should return default value for unknown key', () => {
      expect(config.get('unknown', 'default')).toBe('default');
    });

    it('should return undefined for unknown key without default', () => {
      expect(config.get('unknown')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set configuration value', () => {
      config.set('host', 'new-host');
      expect(config.get('host')).toBe('new-host');
    });

    it('should validate configuration on set', () => {
      expect(() => config.set('port', -1)).toThrow();
      expect(() => config.set('host', '')).toThrow();
    });

    it('should restore old value if validation fails', () => {
      const originalPort = config.get('port');
      
      try {
        config.set('port', -1);
      } catch {
        // Expected to throw
      }
      
      expect(config.get('port')).toBe(originalPort);
    });
  });

  describe('update', () => {
    it('should update multiple values', () => {
      config.update({
        host: 'updated-host',
        port: 8080,
        debug: true
      });

      expect(config.get('host')).toBe('updated-host');
      expect(config.get('port')).toBe(8080);
      expect(config.get('debug')).toBe(true);
    });

    it('should validate all values before applying', () => {
      const originalHost = config.get('host');
      const originalPort = config.get('port');

      expect(() => config.update({
        host: 'valid-host',
        port: -1 // Invalid
      })).toThrow();

      // Should not have applied any changes
      expect(config.get('host')).toBe(originalHost);
      expect(config.get('port')).toBe(originalPort);
    });
  });

  describe('validation', () => {
    it('should validate port range', () => {
      expect(() => config.set('port', 0)).toThrow();
      expect(() => config.set('port', 65536)).toThrow();
      expect(() => config.set('port', 8080)).not.toThrow();
    });

    it('should validate timeout values', () => {
      expect(() => config.set('timeout', 50)).toThrow(); // Too low
      expect(() => config.set('timeout', 1000)).not.toThrow();
    });

    it('should validate host value', () => {
      expect(() => config.set('host', '')).toThrow();
      expect(() => config.set('host', '   ')).toThrow();
      expect(() => config.set('host', 'valid-host')).not.toThrow();
    });

    it('should validate number types', () => {
      expect(() => config.set('port', 'not-a-number')).toThrow();
      expect(() => config.set('maxRetries', 11)).toThrow(); // Too high
    });
  });

  describe('getComponentConfig', () => {
    it('should return connection configuration', () => {
      const connectionConfig = config.getComponentConfig('connection');
      
      expect(connectionConfig).toEqual({
        host: 'localhost',
        port: 9003,
        timeout: 10000,
        initTimeout: 5000
      });
    });

    it('should return command configuration', () => {
      const commandConfig = config.getComponentConfig('command');
      
      expect(commandConfig).toHaveProperty('timeout');
      expect(commandConfig).toHaveProperty('responseTimeout');
      expect(commandConfig).toHaveProperty('maxRetries');
    });

    it('should return protocol configuration', () => {
      const protocolConfig = config.getComponentConfig('protocol');
      
      expect(protocolConfig).toHaveProperty('version');
      expect(protocolConfig).toHaveProperty('maxDataSize');
    });

    it('should return error configuration', () => {
      const errorConfig = config.getComponentConfig('error');
      
      expect(errorConfig).toHaveProperty('recovery');
      expect(errorConfig).toHaveProperty('logErrors');
    });

    it('should throw error for unknown component', () => {
      expect(() => config.getComponentConfig('unknown'))
        .toThrow('Unknown component: unknown');
    });
  });

  describe('reset', () => {
    it('should reset to default values', () => {
      config.set('host', 'changed-host');
      config.set('debug', true);
      
      config.reset();
      
      expect(config.get('host')).toBe('localhost');
      expect(config.get('debug')).toBe(false);
    });

    it('should accept new initial config on reset', () => {
      config.reset({ host: 'reset-host', port: 7777 });
      
      expect(config.get('host')).toBe('reset-host');
      expect(config.get('port')).toBe(7777);
    });
  });

  describe('toJSON', () => {
    it('should return serializable object', () => {
      const json = config.toJSON();
      
      expect(json).toHaveProperty('config');
      expect(json).toHaveProperty('envPrefix');
      expect(json).toHaveProperty('timestamp');
      expect(json.envPrefix).toBe('YDEBUG_');
    });
  });

  describe('fromJSON', () => {
    it('should create config from JSON', () => {
      const json = {
        config: {
          host: 'json-host',
          port: 9999,
          debug: true
        }
      };
      
      const newConfig = DBGpConfig.fromJSON(json);
      
      expect(newConfig.get('host')).toBe('json-host');
      expect(newConfig.get('port')).toBe(9999);
      expect(newConfig.get('debug')).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return copy of all configuration', () => {
      const all = config.getAll();
      
      expect(all.host).toBe('localhost');
      expect(all.port).toBe(9003);
      
      // Should be a copy, not reference
      all.host = 'modified';
      expect(config.get('host')).toBe('localhost');
    });
  });
});
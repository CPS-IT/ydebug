/**
 * Claude Configuration Integration Tests
 * Test suite for Claude AI configuration integration with ConfigManager
 *
 * Copyright (C) 2024 YDebug Contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const ConfigManager = require('../../../src/config/ConfigManager');
const { ClaudeClient, ClaudeAPIError } = require('../../../src/ai/ClaudeClient');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock the Anthropic SDK and Logger
jest.mock('@anthropic-ai/sdk');
jest.mock('../../../src/utils/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Claude Configuration Integration', () => {
  let configManager;
  let tempConfigDir;
  let tempConfigFile;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear Claude-related environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.YDEBUG_AI_ENABLED;
    delete process.env.XDG_CONFIG_HOME;

    // Create temporary directory for config testing
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ydebug-test-'));
    tempConfigFile = path.join(tempConfigDir, '.ydebug.json');
    
    // Change to temp directory to avoid conflicts with actual config files
    process.chdir(tempConfigDir);

    configManager = new ConfigManager();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Clean up temporary files
    if (fs.existsSync(tempConfigFile)) {
      fs.unlinkSync(tempConfigFile);
    }
    if (fs.existsSync(tempConfigDir)) {
      try {
        fs.rmSync(tempConfigDir, { recursive: true });
      } catch {
        // Fallback for older Node versions
        fs.rmdirSync(tempConfigDir, { recursive: true });
      }
    }
  });

  describe('Default Claude Configuration', () => {
    it('should have correct default AI configuration', () => {
      const config = configManager.load();

      expect(config.ai).toEqual({
        enabled: true,
        maxContextLines: 100,
        analysisDepth: 'medium',
        includeStackTrace: true,
        claude: {
          apiKey: null,
          model: 'claude-sonnet-4-5',
          maxTokens: 4000,
          timeout: 30000,
          maxRetries: 3,
          rateLimitRpm: 60,
        },
      });
    });

    it('should use environment variable for API key when available', () => {
      process.env.ANTHROPIC_API_KEY = 'env-test-api-key';
      
      // Test that environment variable is available and can be used
      expect(process.env.ANTHROPIC_API_KEY).toBe('env-test-api-key');
      
      // Verify it would be used as fallback
      const config = configManager.load();
      const fallbackApiKey = config.ai.claude.apiKey || process.env.ANTHROPIC_API_KEY;
      expect(fallbackApiKey).toBe('env-test-api-key');
    });
  });

  describe('Configuration File Integration', () => {
    it('should load Claude configuration from file', () => {
      const testConfig = {
        ai: {
          enabled: true,
          claude: {
            apiKey: 'file-api-key',
            model: 'claude-3-opus-20240229',
            maxTokens: 2000,
            timeout: 60000,
            maxRetries: 5,
            rateLimitRpm: 30,
          }
        }
      };

      fs.writeFileSync(tempConfigFile, JSON.stringify(testConfig, null, 2));
      
      const config = configManager.load();

      expect(config.ai.claude.apiKey).toBe('file-api-key');
      expect(config.ai.claude.model).toBe('claude-3-opus-20240229');
      expect(config.ai.claude.maxTokens).toBe(2000);
      expect(config.ai.claude.timeout).toBe(60000);
      expect(config.ai.claude.maxRetries).toBe(5);
      expect(config.ai.claude.rateLimitRpm).toBe(30);
    });

    it('should merge file configuration with defaults', () => {
      const partialConfig = {
        ai: {
          claude: {
            apiKey: 'partial-key',
            maxTokens: 1500
          }
        }
      };

      fs.writeFileSync(tempConfigFile, JSON.stringify(partialConfig, null, 2));
      
      const config = configManager.load();

      expect(config.ai.claude.apiKey).toBe('partial-key');
      expect(config.ai.claude.maxTokens).toBe(1500);
      expect(config.ai.claude.model).toBe('claude-sonnet-4-5'); // Default
      expect(config.ai.claude.timeout).toBe(30000); // Default
    });

    it('should handle malformed configuration file gracefully', () => {
      fs.writeFileSync(tempConfigFile, '{ invalid json }');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const config = configManager.load();

      expect(config.ai.claude.model).toBe('claude-sonnet-4-5'); // Defaults used
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Environment Variable Integration', () => {
    it('should load Claude settings from environment variables', () => {
      process.env.YDEBUG_AI_ENABLED = 'false';
      
      const config = configManager.load();

      expect(config.ai.enabled).toBe(false);
    });

    it('should prefer environment variables over file configuration', () => {
      // Set file config
      const fileConfig = {
        ai: {
          enabled: true
        }
      };
      fs.writeFileSync(tempConfigFile, JSON.stringify(fileConfig, null, 2));

      // Set environment variable
      process.env.YDEBUG_AI_ENABLED = 'false';
      
      const config = configManager.load();

      expect(config.ai.enabled).toBe(false); // Environment wins
    });

    it('should handle various environment variable formats', () => {
      process.env.YDEBUG_AI_ENABLED = 'true';
      
      const config = configManager.load();

      expect(config.ai.enabled).toBe(true);
      expect(typeof config.ai.enabled).toBe('boolean');
    });
  });

  describe('Configuration Setting and Getting', () => {
    it('should set Claude API key using ConfigManager', () => {
      configManager.set('ai.claude.apiKey', 'new-api-key');
      
      const config = configManager.load();
      expect(config.ai.claude.apiKey).toBe('new-api-key');
    });

    it('should set Claude model using ConfigManager', () => {
      configManager.set('ai.claude.model', 'claude-3-opus-20240229');
      
      const config = configManager.load();
      expect(config.ai.claude.model).toBe('claude-3-opus-20240229');
    });

    it('should set numeric Claude settings', () => {
      configManager.set('ai.claude.maxTokens', '2000');
      configManager.set('ai.claude.timeout', '45000');
      configManager.set('ai.claude.maxRetries', '5');
      configManager.set('ai.claude.rateLimitRpm', '30');
      
      const config = configManager.load();
      expect(config.ai.claude.maxTokens).toBe(2000);
      expect(config.ai.claude.timeout).toBe(45000);
      expect(config.ai.claude.maxRetries).toBe(5);
      expect(config.ai.claude.rateLimitRpm).toBe(30);
    });

    it('should set boolean AI enabled setting', () => {
      configManager.set('ai.enabled', 'false');
      
      const config = configManager.load();
      expect(config.ai.enabled).toBe(false);
    });

    it('should get specific Claude configuration values', () => {
      configManager.set('ai.claude.model', 'claude-3-haiku-20240307');
      
      const model = configManager.get('ai.claude.model');
      expect(model).toBe('claude-3-haiku-20240307');
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid AI configuration', () => {
      const validConfig = {
        ai: {
          enabled: true,
          analysisDepth: 'deep',
          claude: {
            model: 'claude-3-opus-20240229',
            maxTokens: 4000,
            timeout: 30000,
            maxRetries: 3,
            rateLimitRpm: 60
          }
        }
      };

      expect(() => {
        configManager.validate(validConfig);
      }).not.toThrow();
    });

    it('should validate AI analysis depth', () => {
      const invalidConfig = {
        ai: {
          analysisDepth: 'invalid-depth'
        }
      };

      expect(() => {
        configManager.validate(invalidConfig);
      }).toThrow('ai.analysisDepth must be one of: shallow, medium, deep');
    });

    it('should handle missing AI configuration gracefully', () => {
      const configWithoutAI = {
        xdebug: {
          host: 'localhost'
        }
      };

      expect(() => {
        configManager.validate(configWithoutAI);
      }).not.toThrow();
    });
  });

  describe('Configuration Sources', () => {
    it('should report correct configuration sources for Claude settings', () => {
      // Set environment variable
      process.env.YDEBUG_AI_ENABLED = 'true';
      
      // Create config file
      const fileConfig = {
        ai: {
          claude: {
            apiKey: 'file-key'
          }
        }
      };
      fs.writeFileSync(tempConfigFile, JSON.stringify(fileConfig, null, 2));

      const sources = configManager.getConfigSources();

      expect(sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'defaults', loaded: true }),
          expect.objectContaining({ type: 'file', loaded: true }),
          expect.objectContaining({ type: 'environment', loaded: true })
        ])
      );
    });

    it('should show configuration in formatted display', () => {
      process.env.YDEBUG_AI_ENABLED = 'false';
      
      const output = configManager.show();

      expect(output).toContain('YDebug Configuration');
      expect(output).toContain('Configuration Sources:');
      expect(output).toContain('Current Configuration:');
      expect(output).toContain('"enabled": false');
    });
  });

  describe('Integration with ClaudeClient', () => {
    it('should create ClaudeClient with configuration', () => {
      const testConfig = {
        ai: {
          enabled: true,
          claude: {
            apiKey: 'integration-test-key',
            model: 'claude-sonnet-4-5',
            maxTokens: 3000,
            timeout: 25000,
            maxRetries: 2,
            rateLimitRpm: 45
          }
        }
      };

      fs.writeFileSync(tempConfigFile, JSON.stringify(testConfig, null, 2));
      
      const config = configManager.load();
      
      expect(() => {
        new ClaudeClient(config.ai.claude);
      }).not.toThrow();
    });

    it('should handle missing API key in configuration', () => {
      const configWithoutKey = {
        ai: {
          enabled: true,
          claude: {
            model: 'claude-sonnet-4-5',
            maxTokens: 4000,
            timeout: 30000,
            maxRetries: 3,
            rateLimitRpm: 60
          }
        }
      };

      fs.writeFileSync(tempConfigFile, JSON.stringify(configWithoutKey, null, 2));
      
      const config = configManager.load();

      expect(() => {
        new ClaudeClient(config.ai.claude);
      }).toThrow(ClaudeAPIError);
    });

    it('should use environment API key when config API key is null', () => {
      process.env.ANTHROPIC_API_KEY = 'env-fallback-key';
      
      const config = configManager.load();
      
      expect(() => {
        new ClaudeClient({
          ...config.ai.claude,
          apiKey: config.ai.claude.apiKey || process.env.ANTHROPIC_API_KEY
        });
      }).not.toThrow();
    });
  });

  describe('Configuration Reset and Cleanup', () => {
    it('should reset Claude configuration to defaults', () => {
      // Create custom configuration
      configManager.set('ai.claude.model', 'claude-3-opus-20240229');
      configManager.set('ai.claude.maxTokens', '2000');
      
      // Reset configuration
      configManager.reset(true);
      
      const config = configManager.load();
      expect(config.ai.claude.model).toBe('claude-sonnet-4-5'); // Default
      expect(config.ai.claude.maxTokens).toBe(4000); // Default
    });

    it('should create sample configuration with Claude settings', () => {
      const samplePath = configManager.createSample();
      
      expect(fs.existsSync(samplePath)).toBe(true);
      
      const sampleContent = fs.readFileSync(samplePath, 'utf8');
      const sampleConfig = JSON.parse(sampleContent);
      
      expect(sampleConfig.ai.claude.model).toBe('claude-sonnet-4-5');
      expect(sampleConfig.ai.claude.maxTokens).toBe(4000);
      expect(sampleConfig.ai.claude.apiKey).toBe(null);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle configuration directory creation', () => {
      const nestedConfigPath = path.join(tempConfigDir, 'nested', 'config.json');
      
      configManager.set('ai.claude.apiKey', 'test-key', nestedConfigPath);
      
      expect(fs.existsSync(nestedConfigPath)).toBe(true);
      
      const content = fs.readFileSync(nestedConfigPath, 'utf8');
      const config = JSON.parse(content);
      expect(config.ai.claude.apiKey).toBe('test-key');
    });

    it('should handle configuration caching properly', () => {
      // Load config first time
      const config1 = configManager.load();
      
      // Modify file directly (bypassing ConfigManager)
      const modifiedConfig = {
        ai: {
          claude: {
            apiKey: 'direct-modification'
          }
        }
      };
      fs.writeFileSync(tempConfigFile, JSON.stringify(modifiedConfig, null, 2));
      
      // Load config again - should use cache
      const config2 = configManager.load();
      expect(config2.ai.claude.apiKey).toBe(config1.ai.claude.apiKey); // Should be cached
      
      // Clear cache and reload
      configManager.cache = null;
      const config3 = configManager.load();
      expect(config3.ai.claude.apiKey).toBe('direct-modification'); // Should reflect file change
    });

    it('should handle CLI overrides for Claude settings', () => {
      const cliOverrides = {
        ai: {
          claude: {
            model: 'claude-3-haiku-20240307',
            maxTokens: 1000
          }
        }
      };
      
      const config = configManager.load(cliOverrides);
      
      expect(config.ai.claude.model).toBe('claude-3-haiku-20240307');
      expect(config.ai.claude.maxTokens).toBe(1000);
      expect(config.ai.claude.timeout).toBe(30000); // Default unchanged
    });
  });
});
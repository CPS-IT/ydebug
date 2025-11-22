/**
 * AI Command Tests
 * Comprehensive test suite for the AI CLI command
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

// Mock the dependencies before importing
jest.mock('../../../../src/ai/ClaudeClient', () => ({
  ClaudeClient: jest.fn(),
  ClaudeAPIError: class ClaudeAPIError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = 'ClaudeAPIError';
      this.code = options.code || 'CLAUDE_API_ERROR';
      this.status = options.status;
      this.retryable = options.retryable || false;
      this.timestamp = new Date().toISOString();
    }
  }
}));

jest.mock('../../../../src/config/ConfigManager', () => {
  return jest.fn();
});

const AICommand = require('../../../../src/cli/commands/ai');
const { ClaudeClient, ClaudeAPIError } = require('../../../../src/ai/ClaudeClient');
const ConfigManager = require('../../../../src/config/ConfigManager');

describe('AICommand', () => {
  let aiCommand;
  let mockConfigManager;
  let mockClaudeClient;
  let consoleSpy;
  let consoleErrorSpy;
  let processExitSpy;

  // Default mock config
  const mockConfig = {
    ai: {
      enabled: true,
      claude: {
        apiKey: 'test-api-key',
        model: 'claude-sonnet-4-5',
        maxTokens: 4000,
        timeout: 30000,
        maxRetries: 3,
        rateLimitRpm: 60
      }
    }
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.DEBUG;

    // Setup console spies
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();

    // Setup mock ConfigManager
    mockConfigManager = {
      load: jest.fn().mockReturnValue(mockConfig)
    };
    ConfigManager.mockImplementation(() => mockConfigManager);

    // Setup mock ClaudeClient
    mockClaudeClient = {
      initialize: jest.fn().mockResolvedValue(),
      getStatus: jest.fn().mockReturnValue({
        initialized: true,
        hasApiKey: true,
        canMakeRequest: true,
        currentRequests: 0,
        rateLimitRpm: 60,
        nextAvailableTime: 0
      }),
      sendMessage: jest.fn().mockResolvedValue({
        content: [{ text: 'Claude API test successful' }]
      }),
      shutdown: jest.fn().mockResolvedValue()
    };
    ClaudeClient.mockImplementation(() => mockClaudeClient);

    // Create command instance
    aiCommand = new AICommand();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Constructor', () => {
    it('should create AICommand instance with ConfigManager', () => {
      expect(aiCommand).toBeInstanceOf(AICommand);
      expect(ConfigManager).toHaveBeenCalled();
    });
  });

  describe('Execute Method', () => {
    it('should run test connection when test option is provided', async () => {
      const options = { test: true };

      await aiCommand.execute(options);

      expect(mockConfigManager.load).toHaveBeenCalled();
      expect(ClaudeClient).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        model: 'claude-sonnet-4-5',
        maxTokens: 4000,
        timeout: 30000,
        maxRetries: 3,
        rateLimitRpm: 60
      });
      expect(mockClaudeClient.initialize).toHaveBeenCalled();
    });

    it('should show help when no options are provided', async () => {
      const options = {};

      await aiCommand.execute(options);

      expect(consoleSpy).toHaveBeenCalledWith('YDebug AI Commands:');
      expect(consoleSpy).toHaveBeenCalledWith('Usage:');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      jest.spyOn(aiCommand, 'testConnection').mockRejectedValue(error);

      await aiCommand.execute({ test: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Test error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Test Connection', () => {
    it('should test connection successfully', async () => {
      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Testing Claude API connection...');
      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', 'Claude API connection test successful!');
      expect(mockClaudeClient.initialize).toHaveBeenCalled();
      expect(mockClaudeClient.getStatus).toHaveBeenCalled();
      expect(mockClaudeClient.shutdown).toHaveBeenCalled();
    });

    it('should display configuration information', async () => {
      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Model: claude-sonnet-4-5');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Max Tokens: 4000');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Timeout: 30000ms');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Rate Limit: 60 requests/minute');
    });

    it('should display client status', async () => {
      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Client Status:');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  Initialized: true');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  Has API Key: true');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  Can Make Request: true');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  Current Requests: 0/60');
    });

    it('should show next available time when rate limited', async () => {
      mockClaudeClient.getStatus.mockReturnValue({
        initialized: true,
        hasApiKey: true,
        canMakeRequest: false,
        currentRequests: 60,
        rateLimitRpm: 60,
        nextAvailableTime: 30000
      });

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  Next Available: 30s');
    });

    it('should send test message when message option is provided', async () => {
      const options = { test: true, message: true };

      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Sending test message...');
      expect(mockClaudeClient.sendMessage).toHaveBeenCalledWith([
        { role: 'user', content: 'Please respond with "Claude API test successful" to confirm communication.' }
      ]);
      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', 'Claude Response: Claude API test successful');
    });

    it('should handle empty response from Claude API', async () => {
      mockClaudeClient.sendMessage.mockResolvedValue({
        content: []
      });

      const options = { test: true, message: true };

      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[WARNING]', 'Received empty response from Claude API');
    });

    it('should handle response without text content', async () => {
      mockClaudeClient.sendMessage.mockResolvedValue({
        content: [{ type: 'image' }]
      });

      const options = { test: true, message: true };

      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', 'Claude Response: No text content');
    });

    it('should use environment variable for API key when config is empty', async () => {
      process.env.ANTHROPIC_API_KEY = 'env-api-key';
      
      const configWithoutApiKey = {
        ai: {
          enabled: true,
          claude: {
            apiKey: null,
            model: 'claude-sonnet-4-5',
            maxTokens: 4000,
            timeout: 30000,
            maxRetries: 3,
            rateLimitRpm: 60
          }
        }
      };
      
      mockConfigManager.load.mockReturnValue(configWithoutApiKey);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(ClaudeClient).toHaveBeenCalledWith({
        apiKey: 'env-api-key',
        model: 'claude-sonnet-4-5',
        maxTokens: 4000,
        timeout: 30000,
        maxRetries: 3,
        rateLimitRpm: 60
      });
    });
  });

  describe('AI Disabled Scenarios', () => {
    it('should warn when AI is disabled in configuration', async () => {
      const disabledConfig = {
        ai: {
          enabled: false,
          claude: mockConfig.ai.claude
        }
      };
      mockConfigManager.load.mockReturnValue(disabledConfig);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[WARNING]', 'AI integration is disabled in configuration');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'To enable: ydebug config-set ai.enabled true');
      expect(ClaudeClient).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle ClaudeAPIError with missing API key', async () => {
      const error = new ClaudeAPIError('API key is required', { code: 'MISSING_API_KEY' });
      mockClaudeClient.initialize.mockRejectedValue(error);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Claude API Error (MISSING_API_KEY): API key is required');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'To set your API key:');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  1. Set environment variable: export ANTHROPIC_API_KEY=your-key-here');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  2. Or use config: ydebug config-set ai.claude.apiKey your-key-here');
    });

    it('should handle ClaudeAPIError with unauthorized error', async () => {
      const error = new ClaudeAPIError('Unauthorized', { code: 'UNAUTHORIZED' });
      mockClaudeClient.initialize.mockRejectedValue(error);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Claude API Error (UNAUTHORIZED): Unauthorized');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'API key validation failed. Please check:');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  1. API key is correct and active');
    });

    it('should handle ClaudeAPIError with forbidden error', async () => {
      const error = new ClaudeAPIError('Forbidden', { code: 'FORBIDDEN' });
      mockClaudeClient.initialize.mockRejectedValue(error);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Claude API Error (FORBIDDEN): Forbidden');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'API key validation failed. Please check:');
    });

    it('should handle ClaudeAPIError with rate limited error', async () => {
      const error = new ClaudeAPIError('Rate limit exceeded', { code: 'RATE_LIMITED' });
      mockClaudeClient.initialize.mockRejectedValue(error);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Claude API Error (RATE_LIMITED): Rate limit exceeded');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Rate limit exceeded. Please:');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', '  2. Consider reducing ai.claude.rateLimitRpm in config');
    });

    it('should handle generic errors', async () => {
      const error = new Error('Generic error');
      mockClaudeClient.initialize.mockRejectedValue(error);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Connection test failed: Generic error');
    });

    it('should show stack trace in verbose mode', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test';
      mockClaudeClient.initialize.mockRejectedValue(error);

      const options = { test: true, verbose: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });

    it('should show stack trace when DEBUG environment variable is set', async () => {
      process.env.DEBUG = '1';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test';
      mockClaudeClient.initialize.mockRejectedValue(error);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });
  });

  describe('Show Help', () => {
    it('should display help information correctly', () => {
      aiCommand.showHelp();

      expect(consoleSpy).toHaveBeenCalledWith('YDebug AI Commands:');
      expect(consoleSpy).toHaveBeenCalledWith('');
      expect(consoleSpy).toHaveBeenCalledWith('Usage:');
      expect(consoleSpy).toHaveBeenCalledWith('  ydebug ai test [options]  Test Claude API connection');
      expect(consoleSpy).toHaveBeenCalledWith('');
      expect(consoleSpy).toHaveBeenCalledWith('Options:');
      expect(consoleSpy).toHaveBeenCalledWith('  --message                Send a test message to Claude');
      expect(consoleSpy).toHaveBeenCalledWith('  --verbose                Show detailed error information');
      expect(consoleSpy).toHaveBeenCalledWith('');
      expect(consoleSpy).toHaveBeenCalledWith('Examples:');
      expect(consoleSpy).toHaveBeenCalledWith('  ydebug ai test');
      expect(consoleSpy).toHaveBeenCalledWith('  ydebug ai test --message');
      expect(consoleSpy).toHaveBeenCalledWith('  ydebug ai test --verbose');
      expect(consoleSpy).toHaveBeenCalledWith('');
      expect(consoleSpy).toHaveBeenCalledWith('Configuration:');
      expect(consoleSpy).toHaveBeenCalledWith('  Set API key: ydebug config-set ai.claude.apiKey YOUR_KEY');
      expect(consoleSpy).toHaveBeenCalledWith('  Enable AI:   ydebug config-set ai.enabled true');
      expect(consoleSpy).toHaveBeenCalledWith('  View config: ydebug config --show');
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle missing config gracefully', async () => {
      mockConfigManager.load.mockReturnValue({});

      const options = { test: true };

      await aiCommand.testConnection(options);
      
      // Should handle missing config by using environment or throwing error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle initialization timeout', async () => {
      const timeoutError = new ClaudeAPIError('Timeout during initialization', { 
        code: 'INIT_FAILED',
        retryable: true 
      });
      mockClaudeClient.initialize.mockRejectedValue(timeoutError);

      const options = { test: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Claude API Error (INIT_FAILED): Timeout during initialization');
    });

    it('should handle network errors during message sending', async () => {
      const networkError = new ClaudeAPIError('Network error', { 
        code: 'NETWORK_ERROR',
        retryable: true 
      });
      mockClaudeClient.sendMessage.mockRejectedValue(networkError);

      const options = { test: true, message: true };

      await aiCommand.testConnection(options);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Claude API Error (NETWORK_ERROR): Network error');
    });

    it('should handle shutdown errors gracefully', async () => {
      mockClaudeClient.shutdown.mockRejectedValue(new Error('Shutdown error'));

      const options = { test: true };

      // Should not throw despite shutdown error
      await aiCommand.testConnection(options);

      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS]', 'Claude API connection test successful!');
    });
  });
});
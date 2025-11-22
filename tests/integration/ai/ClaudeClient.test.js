/**
 * ClaudeClient Tests
 * Comprehensive test suite for the Claude API client
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

// Mock the Anthropic SDK before importing the client
const mockMessages = {
  create: jest.fn(),
};

const mockAnthropicInstance = {
  messages: mockMessages,
};

const MockAnthropic = jest.fn(() => mockAnthropicInstance);

jest.mock('@anthropic-ai/sdk', () => MockAnthropic);

// Mock the logger
jest.mock('../../../src/utils/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

const { ClaudeClient, ClaudeAPIError } = require('../../../src/ai/ClaudeClient');
const { logger } = require('../../../src/utils/Logger');

describe('ClaudeClient', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockMessages.create.mockClear();
    MockAnthropic.mockClear();
    
    // Reset environment variables
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('Constructor and Configuration', () => {
    it('should create client with default configuration', () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key-12345';
      
      const client = new ClaudeClient();
      
      expect(client.config).toEqual({
        apiKey: 'test-api-key-12345',
        model: 'claude-sonnet-4-5',
        maxTokens: 4000,
        timeout: 30000,
        maxRetries: 3,
        rateLimitRpm: 60,
      });
      expect(client.initialized).toBe(false);
    });

    it('should create client with custom configuration', () => {
      const customConfig = {
        apiKey: 'custom-api-key',
        model: 'claude-3-opus-20240229',
        maxTokens: 2000,
        timeout: 15000,
        maxRetries: 5,
        rateLimitRpm: 30,
      };
      
      const client = new ClaudeClient(customConfig);
      
      expect(client.config).toEqual(customConfig);
    });

    it('should merge custom config with defaults', () => {
      const customConfig = {
        apiKey: 'custom-api-key',
        maxTokens: 2000,
      };
      
      const client = new ClaudeClient(customConfig);
      
      expect(client.config.apiKey).toBe('custom-api-key');
      expect(client.config.maxTokens).toBe(2000);
      expect(client.config.model).toBe('claude-sonnet-4-5');
      expect(client.config.timeout).toBe(30000);
    });

    it('should prefer config apiKey over environment variable', () => {
      process.env.ANTHROPIC_API_KEY = 'env-api-key';
      
      const client = new ClaudeClient({ apiKey: 'config-api-key' });
      
      expect(client.config.apiKey).toBe('config-api-key');
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error when API key is missing', () => {
      expect(() => {
        new ClaudeClient();
      }).toThrow(ClaudeAPIError);
      
      expect(() => {
        new ClaudeClient();
      }).toThrow('API key is required');
    });

    it('should throw error when API key is too short', () => {
      expect(() => {
        new ClaudeClient({ apiKey: 'short' });
      }).toThrow(ClaudeAPIError);
      
      expect(() => {
        new ClaudeClient({ apiKey: 'short' });
      }).toThrow('API key appears to be invalid (too short)');
    });

    it('should accept valid API key', () => {
      expect(() => {
        new ClaudeClient({ apiKey: 'valid-api-key-12345' });
      }).not.toThrow();
    });
  });

  describe('Client Initialization', () => {
    let client;

    beforeEach(() => {
      client = new ClaudeClient({ apiKey: 'test-api-key-12345' });
    });

    it('should initialize client successfully', async () => {
      mockMessages.create.mockResolvedValue({
        content: [{ text: 'test response' }]
      });

      await client.initialize();

      expect(MockAnthropic).toHaveBeenCalledWith({
        apiKey: 'test-api-key-12345',
        timeout: 30000
      });
      expect(client.initialized).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Claude API client initialized successfully');
    });

    it('should not reinitialize if already initialized', async () => {
      mockMessages.create.mockResolvedValue({
        content: [{ text: 'test response' }]
      });

      await client.initialize();
      const anthropicCallCount = MockAnthropic.mock.calls.length;
      
      await client.initialize();
      
      expect(MockAnthropic.mock.calls.length).toBe(anthropicCallCount);
    });

    it('should throw ClaudeAPIError on initialization failure', async () => {
      const error = new Error('Network error');
      mockMessages.create.mockRejectedValue(error);

      await expect(client.initialize()).rejects.toThrow(ClaudeAPIError);
      await expect(client.initialize()).rejects.toThrow('Client initialization failed');
      
      expect(client.initialized).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Failed to initialize Claude API client:', expect.stringContaining('Network error'));
    });
  });

  describe('Connection Testing', () => {
    let client;

    beforeEach(() => {
      client = new ClaudeClient({ apiKey: 'test-api-key-12345' });
      client.client = mockAnthropicInstance;
    });

    it('should test connection successfully', async () => {
      mockMessages.create.mockResolvedValue({
        content: [{ text: 'test response' }]
      });

      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockMessages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test connection' }]
      });
      expect(logger.debug).toHaveBeenCalledWith('Claude API connection test successful');
    });

    it('should handle invalid response format', async () => {
      mockMessages.create.mockResolvedValue({ invalid: 'response' });

      await expect(client.testConnection()).rejects.toThrow(ClaudeAPIError);
      await expect(client.testConnection()).rejects.toThrow('Connection test failed');
    });

    it('should handle 401 unauthorized error', async () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      mockMessages.create.mockRejectedValue(error);

      await expect(client.testConnection()).rejects.toThrow(ClaudeAPIError);
      
      const thrownError = await client.testConnection().catch(err => err);
      expect(thrownError.code).toBe('UNAUTHORIZED');
      expect(thrownError.retryable).toBe(false);
      expect(thrownError.status).toBe(401);
    });

    it('should handle 403 forbidden error', async () => {
      const error = new Error('Forbidden');
      error.status = 403;
      mockMessages.create.mockRejectedValue(error);

      await expect(client.testConnection()).rejects.toThrow(ClaudeAPIError);
      
      const thrownError = await client.testConnection().catch(err => err);
      expect(thrownError.code).toBe('FORBIDDEN');
      expect(thrownError.retryable).toBe(false);
    });

    it('should handle 429 rate limit error', async () => {
      const error = new Error('Rate limited');
      error.status = 429;
      mockMessages.create.mockRejectedValue(error);

      await expect(client.testConnection()).rejects.toThrow(ClaudeAPIError);
      
      const thrownError = await client.testConnection().catch(err => err);
      expect(thrownError.code).toBe('RATE_LIMITED');
      expect(thrownError.retryable).toBe(true);
    });

    it('should handle 5xx server error', async () => {
      const error = new Error('Server error');
      error.status = 500;
      mockMessages.create.mockRejectedValue(error);

      await expect(client.testConnection()).rejects.toThrow(ClaudeAPIError);
      
      const thrownError = await client.testConnection().catch(err => err);
      expect(thrownError.code).toBe('SERVER_ERROR');
      expect(thrownError.retryable).toBe(true);
    });
  });

  describe('Message Sending', () => {
    let client;

    beforeEach(() => {
      client = new ClaudeClient({ apiKey: 'test-api-key-12345' });
      client.initialized = true;
      client.client = mockAnthropicInstance;
    });

    it('should send message successfully', async () => {
      const mockResponse = {
        content: [{ text: 'Hello, I am Claude!' }]
      };
      mockMessages.create.mockResolvedValue(mockResponse);

      const response = await client.sendMessage('Hello Claude');

      expect(response).toEqual(mockResponse);
      expect(mockMessages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: 'Hello Claude' }]
      });
    });

    it('should handle message array format', async () => {
      const mockResponse = { content: [{ text: 'Response' }] };
      mockMessages.create.mockResolvedValue(mockResponse);

      const messages = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Follow up' }
      ];

      await client.sendMessage(messages);

      expect(mockMessages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: messages
      });
    });

    it('should initialize client if not initialized', async () => {
      client.initialized = false;
      client.client = null;
      const mockResponse = { content: [{ text: 'Response' }] };
      
      // Mock the initialize method
      const originalInitialize = client.initialize;
      client.initialize = jest.fn().mockImplementation(async () => {
        client.initialized = true;
        client.client = mockAnthropicInstance;
        return originalInitialize.call(client);
      });
      
      mockMessages.create.mockResolvedValue(mockResponse);

      await client.sendMessage('Hello');

      expect(client.initialize).toHaveBeenCalled();
    });

    it('should respect rate limiting', async () => {
      // Fill up the rate limiter
      client.rateLimiter.requests = Array(60).fill(Date.now());

      await expect(client.sendMessage('Hello')).rejects.toThrow(ClaudeAPIError);
      await expect(client.sendMessage('Hello')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle custom options', async () => {
      const mockResponse = { content: [{ text: 'Response' }] };
      mockMessages.create.mockResolvedValue(mockResponse);

      const options = {
        model: 'claude-3-opus-20240229',
        maxTokens: 1000,
        temperature: 0.5
      };

      await client.sendMessage('Hello', options);

      expect(mockMessages.create).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        temperature: 0.5,
        messages: [{ role: 'user', content: 'Hello' }]
      });
    });

    it('should retry on retryable errors', async () => {
      const error = new Error('Temporary error');
      error.status = 500;
      
      mockMessages.create
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ content: [{ text: 'Success' }] });

      const response = await client.sendMessage('Hello');

      expect(response).toEqual({ content: [{ text: 'Success' }] });
      expect(mockMessages.create).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      mockMessages.create.mockRejectedValue(error);

      await expect(client.sendMessage('Hello')).rejects.toThrow(ClaudeAPIError);
      expect(mockMessages.create).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Server error');
      error.status = 500;
      mockMessages.create.mockRejectedValue(error);

      await expect(client.sendMessage('Hello')).rejects.toThrow(ClaudeAPIError);
      await expect(client.sendMessage('Hello')).rejects.toThrow('Request failed after 3 attempts');
      // Each call to sendMessage makes 3 attempts, so 2 calls = 6 total attempts
      expect(mockMessages.create).toHaveBeenCalledTimes(6);
    });

    it('should handle invalid response format', async () => {
      mockMessages.create.mockResolvedValue({ invalid: 'format' });

      await expect(client.sendMessage('Hello')).rejects.toThrow(ClaudeAPIError);
    });
  });

  describe('Client Status', () => {
    let client;

    beforeEach(() => {
      client = new ClaudeClient({ apiKey: 'test-api-key-12345' });
    });

    it('should return correct status when uninitialized', () => {
      const status = client.getStatus();

      expect(status).toEqual({
        initialized: false,
        model: 'claude-sonnet-4-5',
        hasApiKey: true,
        rateLimitRpm: 60,
        currentRequests: 0,
        canMakeRequest: true,
        nextAvailableTime: 0
      });
    });

    it('should return correct status when initialized', () => {
      client.initialized = true;

      const status = client.getStatus();

      expect(status.initialized).toBe(true);
    });

    it('should reflect rate limiting status', () => {
      // Add some requests
      client.rateLimiter.recordRequest();
      client.rateLimiter.recordRequest();

      const status = client.getStatus();

      expect(status.currentRequests).toBe(2);
      expect(status.canMakeRequest).toBe(true);
    });

    it('should show when rate limited', () => {
      // Fill up the rate limiter
      client.rateLimiter.requests = Array(60).fill(Date.now());

      const status = client.getStatus();

      expect(status.canMakeRequest).toBe(false);
      expect(status.nextAvailableTime).toBeGreaterThan(0);
    });
  });

  describe('Client Shutdown', () => {
    let client;

    beforeEach(() => {
      client = new ClaudeClient({ apiKey: 'test-api-key-12345' });
      client.initialized = true;
      client.client = mockAnthropicInstance;
    });

    it('should shutdown client properly', async () => {
      await client.shutdown();

      expect(client.initialized).toBe(false);
      expect(client.client).toBe(null);
      expect(logger.debug).toHaveBeenCalledWith('Shutting down Claude API client...');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let client;

    beforeEach(() => {
      client = new ClaudeClient({ apiKey: 'test-api-key-12345' });
    });

    it('should handle empty string messages', async () => {
      client.initialized = true;
      client.client = mockAnthropicInstance;
      mockMessages.create.mockResolvedValue({ content: [{ text: 'Response' }] });

      await client.sendMessage('');

      expect(mockMessages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: '' }]
      });
    });

    it('should handle null messages gracefully', async () => {
      client.initialized = true;
      client.client = mockAnthropicInstance;
      mockMessages.create.mockResolvedValue({ content: [{ text: 'Response' }] });

      await client.sendMessage(null);

      expect(mockMessages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: null }]
      });
    });

    it('should handle network timeouts during initialization', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      timeoutError.code = 'ETIMEDOUT';
      mockMessages.create.mockRejectedValue(timeoutError);

      await expect(client.initialize()).rejects.toThrow(ClaudeAPIError);
      expect(client.initialized).toBe(false);
    });

    it('should handle malformed API responses', async () => {
      client.initialized = true;
      client.client = mockAnthropicInstance;
      mockMessages.create.mockResolvedValue(null);

      await expect(client.sendMessage('Hello')).rejects.toThrow(ClaudeAPIError);
    });

    it('should handle API responses without content array', async () => {
      client.initialized = true;
      client.client = mockAnthropicInstance;
      mockMessages.create.mockResolvedValue({ content: null });

      await expect(client.sendMessage('Hello')).rejects.toThrow(ClaudeAPIError);
    });
  });
});
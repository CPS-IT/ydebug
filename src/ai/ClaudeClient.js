/**
 * Claude Code API Client
 * 
 * Handles integration with Anthropic's Claude API for AI agent debugging capabilities.
 * Provides secure API key management, rate limiting, and error handling.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { logger } = require('../utils/Logger');

/**
 * Error class for Claude API related errors
 */
class ClaudeAPIError extends Error {
  constructor(message, options = {}) {
    // Handle undefined message by converting to string
    const errorMessage = message === undefined ? 'undefined' : message;
    super(errorMessage);
    this.name = 'ClaudeAPIError';
    
    // Handle null options by using empty object as fallback
    const opts = options || {};
    this.code = opts.code || 'CLAUDE_API_ERROR';
    this.status = opts.status;
    this.retryable = opts.retryable || false;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Simple rate limiter for API requests
 */
class RateLimiter {
  constructor(requestsPerMinute = 60) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }
    
  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
        
    // Remove old requests
    this.requests = this.requests.filter(timestamp => timestamp > oneMinuteAgo);
        
    return this.requests.length < this.requestsPerMinute;
  }
    
  recordRequest() {
    this.requests.push(Date.now());
  }
    
  getNextAvailableTime() {
    if (this.canMakeRequest()) return 0;
    
    if (this.requests.length === 0) return 0;
        
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, (oldestRequest + 60000) - Date.now());
  }
}

/**
 * Claude Code API Client
 */
class ClaudeClient {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      model: config.model || 'claude-sonnet-4-5',
      maxTokens: config.maxTokens || 4000,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      rateLimitRpm: config.rateLimitRpm || 60,
      ...config
    };
        
    this.logger = logger;
    this.rateLimiter = new RateLimiter(this.config.rateLimitRpm);
    this.client = null;
    this.initialized = false;
        
    // Validate configuration
    this.validateConfig();
  }
    
  /**
     * Validate client configuration
     */
  validateConfig() {
    if (!this.config.apiKey) {
      throw new ClaudeAPIError(
        'API key is required. Set ANTHROPIC_API_KEY environment variable or provide in config.',
        { code: 'MISSING_API_KEY', retryable: false }
      );
    }
        
    if (this.config.apiKey.length < 10) {
      throw new ClaudeAPIError(
        'API key appears to be invalid (too short)',
        { code: 'INVALID_API_KEY', retryable: false }
      );
    }
  }
    
  /**
     * Initialize the Claude client
     */
  async initialize() {
    if (this.initialized) {
      return;
    }
        
    try {
      this.logger.debug('Initializing Claude API client...');
            
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        timeout: this.config.timeout
      });
            
      // Test connection with a minimal request
      await this.testConnection();
            
      this.initialized = true;
      this.logger.info('Claude API client initialized successfully');
            
    } catch (error) {
      this.logger.error('Failed to initialize Claude API client:', error.message);
      throw new ClaudeAPIError(
        `Client initialization failed: ${error.message}`,
        { 
          code: 'INIT_FAILED', 
          retryable: true,
          originalError: error 
        }
      );
    }
  }
    
  /**
     * Test API connection with a minimal request
     */
  async testConnection() {
    try {
      this.logger.debug('Testing Claude API connection...');
            
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Test connection' }
        ]
      });
            
      if (!response || !response.content) {
        throw new Error('Invalid response format');
      }
            
      this.logger.debug('Claude API connection test successful');
      return true;
            
    } catch (error) {
      this.logger.error('Claude API connection test failed:', error.message);
            
      // Parse API error details
      let errorCode = 'CONNECTION_FAILED';
      let retryable = true;
      let status = null;
            
      if (error.status) {
        status = error.status;
        if (status === 401) {
          errorCode = 'UNAUTHORIZED';
          retryable = false;
        } else if (status === 403) {
          errorCode = 'FORBIDDEN';
          retryable = false;
        } else if (status === 429) {
          errorCode = 'RATE_LIMITED';
          retryable = true;
        } else if (status >= 500) {
          errorCode = 'SERVER_ERROR';
          retryable = true;
        }
      }
            
      throw new ClaudeAPIError(
        `Connection test failed: ${error.message}`,
        { 
          code: errorCode, 
          status: status,
          retryable: retryable,
          originalError: error 
        }
      );
    }
  }
    
  /**
     * Send a message to Claude with retry logic and rate limiting
     */
  async sendMessage(messages, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
        
    // Rate limiting check
    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getNextAvailableTime();
      throw new ClaudeAPIError(
        `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`,
        { 
          code: 'RATE_LIMITED', 
          retryable: true,
          waitTime: waitTime
        }
      );
    }
        
    const requestOptions = {
      model: options.model || this.config.model,
      max_tokens: options.maxTokens || this.config.maxTokens,
      messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }]
    };

    // Add other options except maxTokens (which is already converted to max_tokens)
    // eslint-disable-next-line no-unused-vars
    const { maxTokens, model, ...otherOptions } = options;
    Object.assign(requestOptions, otherOptions);
        
    let lastError;
    let attempt = 0;
        
    while (attempt < this.config.maxRetries) {
      try {
        this.logger.debug(`Claude API request attempt ${attempt + 1}/${this.config.maxRetries}`);
                
        // Record request for rate limiting
        this.rateLimiter.recordRequest();
                
        const response = await this.client.messages.create(requestOptions);
                
        if (!response || !response.content) {
          throw new Error('Invalid response format');
        }
                
        this.logger.debug('Claude API request successful');
        return response;
                
      } catch (error) {
        lastError = error;
        attempt++;
                
        this.logger.warn(`Claude API request attempt ${attempt} failed:`, error.message);
                
        // Check if error is retryable
        let retryable = true;
        if (error.status === 401 || error.status === 403) {
          retryable = false;
        }
                
        if (!retryable || attempt >= this.config.maxRetries) {
          break;
        }
                
        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        this.logger.debug(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
        
    // All retries failed
    throw new ClaudeAPIError(
      `Request failed after ${this.config.maxRetries} attempts: ${lastError.message}`,
      { 
        code: 'REQUEST_FAILED', 
        retryable: false,
        originalError: lastError 
      }
    );
  }
    
  /**
     * Get client status information
     */
  getStatus() {
    return {
      initialized: this.initialized,
      model: this.config.model,
      hasApiKey: !!this.config.apiKey,
      rateLimitRpm: this.config.rateLimitRpm,
      currentRequests: this.rateLimiter.requests.length,
      canMakeRequest: this.rateLimiter.canMakeRequest(),
      nextAvailableTime: this.rateLimiter.getNextAvailableTime()
    };
  }
    
  /**
     * Shutdown the client
     */
  async shutdown() {
    this.logger.debug('Shutting down Claude API client...');
    this.initialized = false;
    this.client = null;
  }
}

module.exports = {
  ClaudeClient,
  ClaudeAPIError
};
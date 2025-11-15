/**
 * AI Command
 * Handles Claude API testing and integration commands
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

const BaseCommand = require('./base');
const { ClaudeClient, ClaudeAPIError } = require('../../ai/ClaudeClient');
const ConfigManager = require('../../config/ConfigManager');

/**
 * AI Command Class
 */
class AICommand extends BaseCommand {
  constructor() {
    super();
    this.configManager = new ConfigManager();
  }

  /**
   * Execute AI command
   * @param {Object} options - Command options
   */
  async execute(options) {
    try {
      if (options.test) {
        await this.testConnection(options);
      } else {
        this.showHelp();
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Test Claude API connection
   * @param {Object} options - Command options
   */
  async testConnection(options) {
    this.info('Testing Claude API connection...');

    if (options.verbose) {
      this.info('');
      this.info('=== Verbose Mode Active ===');
      this.info(`Verbose flag detected: ${options.verbose}`);
      this.info(`Message flag detected: ${options.message}`);
      this.info('Loading configuration...');
    }

    try {
      // Load configuration
      const config = this.configManager.load();
      
      if (options.verbose) {
        this.info('');
        this.info('=== Verbose Mode: Configuration Details ===');
        this.info(`AI Enabled: ${config.ai.enabled}`);
        this.info(`API Key Source: ${config.ai.claude.apiKey ? 'config file' : process.env.ANTHROPIC_API_KEY ? 'environment variable' : 'not set'}`);
        this.info(`Configuration File: ${this.configManager.configPath || 'using defaults'}`);
      }
      
      // Check if AI is enabled
      if (!config.ai.enabled) {
        this.warn('AI integration is disabled in configuration');
        this.info('To enable: ydebug config-set ai.enabled true');
        if (options.verbose) {
          this.info('');
          this.info('=== Verbose Mode: AI Disabled Debug ===');
          this.info('Current configuration shows ai.enabled = false');
          this.info('This prevents Claude API initialization and testing');
          this.info('Enable AI integration to proceed with connection testing');
        }
        return;
      }

      // Initialize Claude client with configuration
      const clientConfig = {
        apiKey: config.ai.claude.apiKey || process.env.ANTHROPIC_API_KEY,
        model: config.ai.claude.model,
        maxTokens: config.ai.claude.maxTokens,
        timeout: config.ai.claude.timeout,
        maxRetries: config.ai.claude.maxRetries,
        rateLimitRpm: config.ai.claude.rateLimitRpm
      };

      if (options.verbose) {
        this.info('');
        this.info('=== Verbose Mode: Client Configuration ===');
        this.info(`API Key: ${clientConfig.apiKey ? '[PRESENT]' : '[MISSING]'}`);
        this.info(`Model: ${clientConfig.model}`);
        this.info(`Max Tokens: ${clientConfig.maxTokens}`);
        this.info(`Timeout: ${clientConfig.timeout}ms`);
        this.info(`Max Retries: ${clientConfig.maxRetries}`);
        this.info(`Rate Limit: ${clientConfig.rateLimitRpm} requests/minute`);
        this.info('');
        
        if (!clientConfig.apiKey) {
          this.info('=== Verbose Mode: API Key Missing Debug ===');
          this.info('No API key found in configuration or environment');
          this.info('Client initialization will fail with MISSING_API_KEY error');
          this.info('This is expected behavior when API key is not configured');
          this.info('');
        }
      }

      const client = new ClaudeClient(clientConfig);

      // Show configuration info (always shown)
      this.info(`Model: ${clientConfig.model}`);
      this.info(`Max Tokens: ${clientConfig.maxTokens}`);
      this.info(`Timeout: ${clientConfig.timeout}ms`);
      this.info(`Rate Limit: ${clientConfig.rateLimitRpm} requests/minute`);
      this.info('');

      // Test connection
      await client.initialize();

      // Get client status
      const status = client.getStatus();
      
      this.success('Claude API connection test successful!');
      this.info('');
      this.info('Client Status:');
      this.info(`  Initialized: ${status.initialized}`);
      this.info(`  Has API Key: ${status.hasApiKey}`);
      this.info(`  Can Make Request: ${status.canMakeRequest}`);
      this.info(`  Current Requests: ${status.currentRequests}/${status.rateLimitRpm}`);
      
      if (status.nextAvailableTime > 0) {
        this.info(`  Next Available: ${Math.ceil(status.nextAvailableTime / 1000)}s`);
      }

      if (options.verbose) {
        this.info('');
        this.info('=== Verbose Mode: Additional Status ===');
        this.info(`  Model in Use: ${status.model}`);
        this.info('  Rate Limit Window: 60 seconds');
        this.info(`  Current Time: ${new Date().toISOString()}`);
        this.info('  Connection Test: Passed');
      }

      // Optional: Send a test message if requested
      if (options.message) {
        this.info('');
        this.info('Sending test message...');
        
        if (options.verbose) {
          this.info('=== Verbose Mode: Message Details ===');
          this.info('Test Message: "Please respond with \'Claude API test successful\' to confirm communication."');
          this.info('Message Role: user');
          this.info('Expected Response: Confirmation message from Claude');
        }
        
        const startTime = Date.now();
        const response = await client.sendMessage([
          { role: 'user', content: 'Please respond with "Claude API test successful" to confirm communication.' }
        ]);
        const endTime = Date.now();
        
        if (response && response.content && response.content.length > 0) {
          const responseText = response.content[0].text || 'No text content';
          this.success(`Claude Response: ${responseText}`);
          
          if (options.verbose) {
            this.info('');
            this.info('=== Verbose Mode: Response Details ===');
            this.info(`Response Time: ${endTime - startTime}ms`);
            this.info(`Response Length: ${responseText.length} characters`);
            this.info(`Response Type: ${response.content[0].type || 'text'}`);
            this.info(`API Model Used: ${response.model || 'unknown'}`);
            if (response.usage) {
              this.info(`Tokens Used: ${response.usage.input_tokens || 0} input, ${response.usage.output_tokens || 0} output`);
            }
          }
        } else {
          this.warn('Received empty response from Claude API');
          
          if (options.verbose) {
            this.info('');
            this.info('=== Verbose Mode: Empty Response Debug ===');
            this.info(`Response Object: ${JSON.stringify(response, null, 2)}`);
          }
        }
      }

      await client.shutdown();

    } catch (error) {
      if (error instanceof ClaudeAPIError) {
        this.error(`Claude API Error (${error.code}): ${error.message}`);
        
        // Provide helpful suggestions based on error type
        if (error.code === 'MISSING_API_KEY') {
          this.info('');
          this.info('To set your API key:');
          this.info('  1. Set environment variable: export ANTHROPIC_API_KEY=your-key-here');
          this.info('  2. Or use config: ydebug config-set ai.claude.apiKey your-key-here');
        } else if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
          this.info('');
          this.info('API key validation failed. Please check:');
          this.info('  1. API key is correct and active');
          this.info('  2. Account has sufficient permissions');
          this.info('  3. Account is not suspended or restricted');
        } else if (error.code === 'RATE_LIMITED') {
          this.info('');
          this.info('Rate limit exceeded. Please:');
          this.info('  1. Wait before trying again');
          this.info('  2. Consider reducing ai.claude.rateLimitRpm in config');
        }
      } else {
        this.error(`Connection test failed: ${error.message}`);
      }
      
      if (options.verbose || process.env.DEBUG) {
        console.error(error.stack);
      }
    }
  }

  /**
   * Show AI command help
   */
  showHelp() {
    console.log('YDebug AI Commands:');
    console.log('');
    console.log('Usage:');
    console.log('  ydebug ai test [options]  Test Claude API connection');
    console.log('');
    console.log('Options:');
    console.log('  --message                Send a test message to Claude');
    console.log('  --verbose                Show detailed error information');
    console.log('');
    console.log('Examples:');
    console.log('  ydebug ai test');
    console.log('  ydebug ai test --message');
    console.log('  ydebug ai test --verbose');
    console.log('  ydebug ai test --message --verbose');
    console.log('');
    console.log('Configuration:');
    console.log('  Set API key: ydebug config-set ai.claude.apiKey YOUR_KEY');
    console.log('  Enable AI:   ydebug config-set ai.enabled true');
    console.log('  View config: ydebug config --show');
  }
}

module.exports = AICommand;
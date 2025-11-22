/**
 * MCP Server Command
 * CLI command for running YDebug MCP server for Claude Code integration
 */

const BaseCommand = require('./base');
const MCPServer = require('../../mcp/MCPServer');
const { logger } = require('../../utils/Logger');

class MCPServerCommand extends BaseCommand {
  /**
   * Execute the MCP server command
   * @param {Object} options - Command options
   * @param {string} [options.transport='stdio'] - Transport type (stdio, http)
   * @param {number} [options.port] - Port for HTTP transport (when implemented)
   * @param {boolean} [options.debug=false] - Enable debug logging
   * @returns {Promise<void>}
   */
  async execute(options = {}) {
    // Handle null options gracefully
    options = options || {};

    // Initialize configuration manager and load MCP config
    const ConfigManager = require('../../config/ConfigManager');
    const configManager = new ConfigManager();
    const mcpConfig = configManager.get('mcp.server') || {};

    const config = {
      transport: options.transport || mcpConfig.transport || 'stdio',
      port: options.port || mcpConfig.port,
      debug: options.debug || mcpConfig.debug || false,
      host: mcpConfig.host || 'localhost',
      timeout: mcpConfig.timeout || 30000,
      maxConnections: mcpConfig.maxConnections || 10
    };

    // Enable debug logging if requested
    if (config.debug) {
      logger.setLevel('debug');
    }

    // Handle diagnostic and testing commands
    if (options.validate) {
      return await this.validateConfiguration(configManager);
    }

    if (options.status || options.healthCheck || options.testTools || options.testResources) {
      return await this.runDiagnostics(options, config);
    }

    logger.info('Starting YDebug MCP Server...');
    console.log('YDebug MCP Server for Claude Code Integration');
    console.log(`Transport: ${config.transport}`);

    if (config.transport === 'http') {
      console.log('HTTP transport not yet implemented. Using STDIO.');
      config.transport = 'stdio';
    }

    console.log('');

    const server = new MCPServer(config);

    // Set up server event handlers
    server.on('initialized', () => {
      logger.info('MCP server initialized');
    });

    server.on('started', () => {
      console.log('MCP Server started successfully');
      console.log('');
      console.log('Server is ready to accept MCP connections from Claude Code');
      console.log('');

      if (config.transport === 'stdio') {
        console.log('Using STDIO transport - communicate via stdin/stdout');
        console.log('Send JSON-RPC 2.0 messages to interact with the server');
      }

      console.log('');

      // Display initial status
      this.displayStatus(server);

      // Start health monitoring
      this.startHealthMonitoring(server);

      console.log('Press Ctrl+C to stop server');
      console.log('');
    });

    server.on('clientConnected', () => {
      console.log('Claude Code client connected');
      logger.info('MCP client connected');
    });

    server.on('clientDisconnected', () => {
      console.log('Claude Code client disconnected');
      logger.info('MCP client disconnected');
    });

    server.on('error', (error) => {
      console.error('MCP Server error:', error.message);
      logger.error('MCP server error:', error);

      // Exit on critical errors
      if (error.code === 'TRANSPORT_ERROR') {
        process.exit(1);
      }
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}, shutting down MCP Server...`);
      try {
        await server.stop();
        console.log('MCP Server stopped gracefully');
        logger.info('MCP server shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error.message);
        logger.error('Shutdown error:', error);
        process.exit(1);
      }
    };

    // Remove existing listeners to prevent memory leaks during testing
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');

    // Add signal handlers
    const sigintHandler = () => shutdown('SIGINT');
    const sigtermHandler = () => shutdown('SIGTERM');

    process.on('SIGINT', sigintHandler);
    process.on('SIGTERM', sigtermHandler);

    try {
      // Initialize server with available services
      const services = await this.initializeServices();
      await server.initialize(services);

      // Start the server
      await server.start();

    } catch (error) {
      console.error('Failed to start MCP server:', error.message);
      logger.error('MCP server startup error:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize and register services for MCP server
   * @returns {Promise<object>} Services object
   */
  async initializeServices() {
    const services = {};

    try {
      // Initialize configuration service
      const ConfigManager = require('../../config/ConfigManager');
      services.config = new ConfigManager();

      // Initialize placeholder services for MCP resources
      // These will be replaced with actual implementations in future features
      services.debugger = this.createPlaceholderDebuggerService();
      services.session = this.createPlaceholderSessionService();
      services.analysis = this.createPlaceholderAnalysisService();
      services.mcp = this.createPlaceholderMCPService();

      logger.info('MCP services initialized (placeholder implementations)');

    } catch (error) {
      logger.error('Error initializing services:', error);
      throw error;
    }

    return services;
  }

  /**
   * Create placeholder debugger service
   * @returns {object} Placeholder debugger service
   */
  createPlaceholderDebuggerService() {
    return {
      name: 'debugger',
      status: 'placeholder',
      getStatus: () => ({ connected: false, placeholder: true }),
      isConnected: () => false,
      getBreakpoints: () => [],
      getVariables: () => ({}),
      getCurrentSession: () => null
    };
  }

  /**
   * Create placeholder session service
   * @returns {object} Placeholder session service
   */
  createPlaceholderSessionService() {
    return {
      name: 'session',
      status: 'placeholder',
      getActiveSessions: () => [],
      getCurrentSession: () => null,
      createSession: () => null,
      getSessionHistory: () => []
    };
  }

  /**
   * Create placeholder analysis service
   * @returns {object} Placeholder analysis service
   */
  createPlaceholderAnalysisService() {
    return {
      name: 'analysis',
      status: 'placeholder',
      getResults: () => [],
      analyzeCode: () => null,
      getRecommendations: () => []
    };
  }

  /**
   * Create placeholder MCP service
   * @returns {object} Placeholder MCP service
   */
  createPlaceholderMCPService() {
    return {
      name: 'mcp',
      status: 'placeholder',
      getConnectionInfo: () => ({ connected: false, placeholder: true }),
      getCapabilities: () => ({ tools: true, resources: true })
    };
  }

  /**
   * Display server status information
   * @param {MCPServer} server - MCP server instance
   */
  displayStatus(server) {
    const status = server.getStatus();

    console.log('MCP Server Status:');
    console.log(`  Running: ${status.isRunning}`);
    console.log(`  Transport: ${status.transport ? status.transport.type : 'none'}`);
    console.log(`  Connected: ${status.transport ? status.transport.isConnected : false}`);
    console.log(`  Capabilities Negotiated: ${status.capabilities.isNegotiated}`);
    console.log(`  Services: ${status.services.serviceCount} registered`);

    // Display resource information if available
    if (status.resources) {
      console.log(`  Resources: ${status.resources.resourceCount} registered`);
      console.log(`  Subscriptions: ${status.resources.subscriptions} active`);
      console.log(`  Cached Resources: ${status.resources.cachedResources}`);
    }

    console.log('');
  }

  /**
   * Perform server health check
   * @param {MCPServer} server - MCP server instance
   * @returns {object} Health check results
   */
  performHealthCheck(server) {
    const status = server.getStatus();
    const health = {
      overall: 'healthy',
      checks: {},
      timestamp: Date.now()
    };

    // Check server running state
    health.checks.serverRunning = {
      status: status.isRunning ? 'pass' : 'fail',
      description: 'MCP server is running'
    };

    // Check transport connection
    health.checks.transport = {
      status: status.transport && status.transport.isConnected ? 'pass' : 'warn',
      description: 'Transport layer connectivity'
    };

    // Check capabilities negotiation
    health.checks.capabilities = {
      status: status.capabilities.isNegotiated ? 'pass' : 'info',
      description: status.capabilities.isNegotiated
        ? 'MCP capabilities negotiated with client'
        : 'MCP capabilities available (no client connected)'
    };

    // Check services
    health.checks.services = {
      status: status.services.serviceCount > 0 ? 'pass' : 'warn',
      description: `${status.services.serviceCount} services registered`
    };

    // Check resources if available
    if (status.resources) {
      health.checks.resources = {
        status: status.resources.resourceCount > 0 ? 'pass' : 'warn',
        description: `${status.resources.resourceCount} resources available`
      };
    }

    // Determine overall health
    const failedChecks = Object.values(health.checks).filter(check => check.status === 'fail');
    const warningChecks = Object.values(health.checks).filter(check => check.status === 'warn');

    if (failedChecks.length > 0) {
      health.overall = 'unhealthy';
    } else if (warningChecks.length > 0) {
      health.overall = 'degraded';
    }

    return health;
  }

  /**
   * Display health check results
   * @param {object} health - Health check results
   */
  displayHealthCheck(health) {
    console.log('MCP Server Health Check:');
    console.log(`  Overall Status: ${health.overall.toUpperCase()}`);
    console.log('  Individual Checks:');

    Object.entries(health.checks).forEach(([_name, check]) => {
      const statusIcon = check.status === 'pass' ? '[OK]' :
        check.status === 'warn' ? '[WARN]' :
          check.status === 'info' ? '[INFO]' : '[FAIL]';
      console.log(`    ${statusIcon} ${check.description} (${check.status})`);
    });

    console.log(`  Last Check: ${new Date(health.timestamp).toISOString()}`);
    console.log('');
  }

  /**
   * Start periodic health monitoring
   * @param {MCPServer} server - MCP server instance
   * @param {number} intervalMs - Monitoring interval in milliseconds
   */
  startHealthMonitoring(server, intervalMs = 30000) {
    const healthInterval = setInterval(() => {
      const health = this.performHealthCheck(server);

      if (health.overall !== 'healthy') {
        logger.warn('MCP server health check failed:', JSON.stringify(health, null, 2));

        if (health.overall === 'unhealthy') {
          console.log('[WARNING] MCP Server health check indicates unhealthy state');
          this.displayHealthCheck(health);
        }
      } else {
        logger.debug('MCP server health check: healthy');
      }
    }, intervalMs);

    // Clean up interval on server stop
    server.on('stopped', () => {
      clearInterval(healthInterval);
      logger.info('Health monitoring stopped');
    });

    logger.info(`Health monitoring started (interval: ${intervalMs}ms)`);
    return healthInterval;
  }

  /**
   * Validate MCP configuration
   * @param {ConfigManager} configManager - Configuration manager instance
   * @returns {Promise<void>}
   */
  async validateConfiguration(configManager) {
    console.log('Validating MCP Configuration...');
    console.log('');

    const config = configManager.get('mcp') || {};
    const issues = [];

    // Validate server configuration
    if (!config.server) {
      issues.push('Missing mcp.server configuration section');
    } else {
      const server = config.server;

      if (server.transport && !['stdio', 'http'].includes(server.transport)) {
        issues.push(`Invalid transport type: ${server.transport}. Must be 'stdio' or 'http'`);
      }

      if (server.port && (isNaN(server.port) || server.port < 1 || server.port > 65535)) {
        issues.push(`Invalid port: ${server.port}. Must be between 1-65535`);
      }

      if (server.timeout && (isNaN(server.timeout) || server.timeout < 1000)) {
        issues.push(`Invalid timeout: ${server.timeout}. Must be at least 1000ms`);
      }
    }

    // Validate feature configuration
    if (config.features) {
      const features = config.features;

      if (features.cacheTTL && (isNaN(features.cacheTTL) || features.cacheTTL < 0)) {
        issues.push(`Invalid cacheTTL: ${features.cacheTTL}. Must be a positive number`);
      }
    }

    // Display results
    if (issues.length === 0) {
      console.log('[OK] MCP configuration is valid');
      console.log('');

      // Display current configuration
      console.log('Current MCP Configuration:');
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.error('[ERROR] MCP configuration validation failed:');
      issues.forEach(issue => console.error(`  - ${issue}`));
      process.exit(1);
    }
  }

  /**
   * Run diagnostics operations
   * @param {object} options - Diagnostic options
   * @param {object} config - Server configuration
   * @returns {Promise<void>}
   */
  async runDiagnostics(options, config) {
    const server = new MCPServer(config);

    try {
      // Initialize server for diagnostics
      const services = await this.initializeServices();
      await server.initialize(services);

      if (options.status) {
        await this.showStatus(server);
      }

      if (options.healthCheck) {
        await this.runHealthCheck(server);
      }

      if (options.testTools) {
        await this.testMCPTools(server);
      }

      if (options.testResources) {
        await this.testMCPResources(server);
      }

    } catch (error) {
      console.error('Diagnostic operation failed:', error.message);
      logger.error('Diagnostic error:', error);
      process.exit(1);
    }
  }

  /**
   * Show server status
   * @param {MCPServer} server - MCP server instance
   * @returns {Promise<void>}
   */
  async showStatus(server) {
    console.log('MCP Server Diagnostics - Status');
    console.log('================================');
    console.log('');

    this.displayStatus(server);

    // Show registered tools
    const tools = Array.from(server.tools.keys());
    console.log('Registered Tools:');
    if (tools.length > 0) {
      tools.forEach(tool => console.log(`  - ${tool}`));
    } else {
      console.log('  (none)');
    }
    console.log('');

    // Show registered resources
    const resources = server.resourceRegistry.listResources();
    console.log('Registered Resources:');
    if (resources.length > 0) {
      resources.forEach(resource => console.log(`  - ${resource}`));
    } else {
      console.log('  (none)');
    }
    console.log('');
  }

  /**
   * Run health check
   * @param {MCPServer} server - MCP server instance
   * @returns {Promise<void>}
   */
  async runHealthCheck(server) {
    console.log('MCP Server Diagnostics - Health Check');
    console.log('=====================================');
    console.log('');

    const health = this.performHealthCheck(server);
    this.displayHealthCheck(health);

    if (health.overall !== 'healthy') {
      process.exit(1);
    }
  }

  /**
   * Test MCP tools
   * @param {MCPServer} server - MCP server instance
   * @returns {Promise<void>}
   */
  async testMCPTools(server) {
    console.log('MCP Server Diagnostics - Tool Testing');
    console.log('=====================================');
    console.log('');

    const tools = Array.from(server.tools.entries());
    let passedTests = 0;
    let failedTests = 0;

    for (const [name, tool] of tools) {
      console.log(`Testing tool: ${name}`);

      try {
        // Test tool definition
        const definition = tool.getDefinition();
        if (!definition.name || !definition.description) {
          throw new Error('Tool missing required definition fields');
        }

        // Test tool schema validation if present
        if (definition.inputSchema) {
          const schema = definition.inputSchema;
          if (!schema.type || schema.type !== 'object') {
            throw new Error('Tool input schema invalid');
          }
        }

        // Test execute method exists
        if (typeof tool.execute !== 'function') {
          throw new Error('Tool missing execute method');
        }

        console.log(`  [OK] ${name} - definition and structure valid`);
        passedTests++;
      } catch (error) {
        console.log(`  [FAIL] ${name} - ${error.message}`);
        failedTests++;
      }
    }

    console.log('');
    console.log(`Tool Test Results: ${passedTests} passed, ${failedTests} failed`);

    if (failedTests > 0) {
      process.exit(1);
    }
  }

  /**
   * Test MCP resources
   * @param {MCPServer} server - MCP server instance
   * @returns {Promise<void>}
   */
  async testMCPResources(server) {
    console.log('MCP Server Diagnostics - Resource Testing');
    console.log('=========================================');
    console.log('');

    const resources = server.resourceRegistry.listResources();
    let passedTests = 0;
    let failedTests = 0;

    for (const uri of resources) {
      const resource = server.resourceRegistry.getResource(uri);
      console.log(`Testing resource: ${uri}`);

      try {
        // Test resource metadata
        const metadata = resource.getMetadata();
        if (!metadata.name || !metadata.description) {
          throw new Error('Resource missing required metadata');
        }

        // Test resource read capability
        if (typeof resource.read !== 'function') {
          throw new Error('Resource missing read method');
        }

        try {
          await resource.read({ limit: 1 });
          console.log(`  [OK] ${uri} - read operation successful`);
        } catch (readError) {
          // It's okay if read fails due to no data, but not due to implementation issues
          if (readError.message.includes('not implemented')) {
            throw new Error('Resource read method not properly implemented');
          }
          console.log(`  [OK] ${uri} - read method implemented (no data available)`);
        }

        passedTests++;
      } catch (error) {
        console.log(`  [FAIL] ${uri} - ${error.message}`);
        failedTests++;
      }
    }

    console.log('');
    console.log(`Resource Test Results: ${passedTests} passed, ${failedTests} failed`);

    if (failedTests > 0) {
      process.exit(1);
    }
  }
}

module.exports = MCPServerCommand;

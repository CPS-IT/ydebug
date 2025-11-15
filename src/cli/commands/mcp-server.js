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

    const config = {
      transport: options.transport || 'stdio',
      port: options.port,
      debug: options.debug || false
    };

    // Enable debug logging if requested
    if (config.debug) {
      logger.setLevel('debug');
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

    // Note: Service initialization will be expanded in future features
    // For now, we're just setting up the foundation
    
    try {
      // Initialize configuration service
      const ConfigManager = require('../../config/ConfigManager');
      const configManager = new ConfigManager();
      services.config = configManager;

      logger.info('Basic services initialized for MCP server');
      
      // Future services to be added in other features:
      // - DBGp debugging services (Feature 028)  
      // - Analysis services (Feature 030)
      // - Session management (Feature 028)
      
    } catch (error) {
      logger.error('Error initializing services:', error);
      throw error;
    }

    return services;
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
    console.log('');
  }
}

module.exports = MCPServerCommand;
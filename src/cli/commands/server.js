/**
 * Server Command
 * CLI command for running YDebug in server mode
 */

const BaseCommand = require('./base');
const DBGpServer = require('../../debugger/DBGpServer');
const VariableFormatter = require('../../debugger/VariableFormatter');
const { logger } = require('../../utils/Logger');

class ServerCommand extends BaseCommand {
  /**
     * Execute the server command
     * @param {Object} options - Command options
     * @param {string} [options.host='localhost'] - Server host
     * @param {number} [options.port=9003] - Server port  
     * @param {number} [options.maxConnections=10] - Maximum concurrent connections
     * @param {number} [options.sessionTimeout=300000] - Session timeout in ms
     * @param {string} [options.breakpointFile] - PHP file for automatic breakpoint
     * @param {number} [options.breakpointLine] - Line number for automatic breakpoint
     * @param {boolean} [options.json=false] - Output variables in JSON format
     * @param {boolean} [options.noColors=false] - Disable colored output
     * @param {boolean} [options.autoInspect=true] - Auto-inspect variables at breakpoints
     * @returns {Promise<void>}
     */
  async execute(options = {}) {
    // Handle null options gracefully
    options = options || {};
        
    const config = {
      host: options.host || 'localhost',
      port: options.port || 9003,
      maxConnections: options.maxConnections || 10,
      sessionTimeout: options.sessionTimeout || 300000
    };

    logger.info('Starting YDebug Server Mode...');
    console.log(`Starting YDebug Server on ${config.host}:${config.port}`);
    console.log(`Max connections: ${config.maxConnections}`);
    console.log(`Session timeout: ${config.sessionTimeout}ms`);
    console.log('');

    const server = new DBGpServer(config);
    const formatter = new VariableFormatter({
      outputFormat: options.json ? 'json' : 'terminal',
      colors: !options.noColors,
      maxDepth: 3,
      maxLength: 200
    });

    // Set up server event handlers
    server.on('listening', (address) => {
      console.log(`YDebug Server listening on ${address.address}:${address.port}`);
      console.log('');
      console.log('Ready for Xdebug connections...');
      console.log('');
      console.log('To test, run your PHP script with:');
      console.log('   XDEBUG_TRIGGER=1 php your-script.php');
      console.log('');
      console.log('Press Ctrl+C to stop server');
      console.log('');
    });

    server.on('sessionInitialized', async (sessionId, sessionData) => {
      console.log(`Session ${sessionId} connected`);
      console.log(`   Language: ${sessionData.language}`);
      console.log(`   Protocol: ${sessionData.protocol_version}`);
      console.log(`   File: ${sessionData.fileuri}`);
      console.log('');

      try {
        // Set automatic breakpoint if specified
        if (options.breakpointFile && options.breakpointLine) {
          await this.setAutomaticBreakpoint(server, sessionId, options.breakpointFile, options.breakpointLine);
        } else {
          // No explicit breakpoint - start execution to trigger any xdebug_break() calls
          const session = server.getSession(sessionId);
          if (session) {
            console.log(`Starting script execution for session ${sessionId}`);
            await session.run();
          }
        }
      } catch (error) {
        logger.error(`Error initializing session ${sessionId}:`, error);
      }
    });

    server.on('breakpoint', async (sessionId, breakpointData) => {
      console.log(`Session ${sessionId} paused at breakpoint`);
      console.log(`   File: ${breakpointData.filename}`);
      console.log(`   Line: ${breakpointData.lineno}`);
      console.log('');

      // Auto-inspect variables if enabled
      if (options.autoInspect !== false) {
        await this.inspectVariables(server, sessionId, formatter);
      }

      // Continue execution after a brief pause
      setTimeout(async () => {
        try {
          const session = server.getSession(sessionId);
          if (session) {
            console.log(`Continuing execution for session ${sessionId}`);
            await session.run();
          }
        } catch (error) {
          logger.error(`Error continuing session ${sessionId}:`, error);
        }
      }, 2000);
    });

    server.on('variables', (sessionId, contextId, variables) => {
      console.log(`Variables received for session ${sessionId}, context ${contextId}:`);
            
      if (variables && variables.length > 0) {
        const output = formatter.formatVariables(variables);
        console.log(output);
      } else {
        console.log('   No variables found in this context');
      }
      console.log('');
    });

    server.on('sessionClosed', (sessionId, reason) => {
      console.log(`Session ${sessionId} disconnected: ${reason}`);
      console.log('');
    });

    server.on('sessionError', (sessionId, error) => {
      console.error(`Session ${sessionId} error:`, error.message);
      logger.error(`Session ${sessionId} error:`, error);
    });

    server.on('error', (error) => {
      console.error('Server error:', error.message);
      logger.error('Server error:', error);
            
      if (error.code === 'PORT_IN_USE') {
        console.log('');
        console.log('To resolve this issue:');
        console.log('   1. Stop PhpStorm debugger or other debugging tools');
        console.log('   2. Use a different port: --port 9004');
        console.log('   3. Find what\'s using the port: lsof -i :9003');
      }
            
      process.exit(1);
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}, shutting down YDebug Server...`);
      try {
        await server.shutdown();
        console.log('YDebug Server stopped gracefully');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error.message);
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
      await server.start();
    } catch (error) {
      console.error('Failed to start server:', error.message);
      logger.error('Server startup error:', error);
      process.exit(1);
    }
  }

  /**
     * Set automatic breakpoint for testing
     * @param {DBGpServer} server 
     * @param {string} sessionId 
     * @param {string} filename 
     * @param {number} lineno 
     */
  async setAutomaticBreakpoint(server, sessionId, filename, lineno) {
    try {
      const session = server.getSession(sessionId);
      if (session) {
        console.log(`Setting automatic breakpoint at ${filename}:${lineno}`);
        await session.setBreakpoint(filename, lineno);
        console.log('Breakpoint set successfully');
                
        // Continue execution to the breakpoint
        setTimeout(async () => {
          try {
            console.log('Continuing to breakpoint...');
            await session.run();
          } catch (error) {
            logger.error('Error running to breakpoint:', error);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to set automatic breakpoint:', error.message);
      logger.error('Breakpoint error:', error);
    }
  }

  /**
     * Inspect variables for a session
     * @param {DBGpServer} server 
     * @param {string} sessionId 
     * @param {VariableFormatter} formatter 
     */
  async inspectVariables(server, sessionId, formatter) {
    try {
      const session = server.getSession(sessionId);
      if (session) {
        console.log(`Inspecting variables for session ${sessionId}...`);
                
        // Get local variables (context 0)
        const variables = await session.getContextVariables(0);
                
        if (variables && variables.length > 0) {
          const output = formatter.formatVariables(variables);
          console.log('Local Variables:');
          console.log(output);
        } else {
          console.log('No local variables found');
        }
        console.log('');
                
      }
    } catch (error) {
      console.error('Failed to inspect variables:', error.message);
      logger.error('Variable inspection error:', error);
    }
  }

  /**
     * Get status information
     * @param {DBGpServer} server 
     */
  displayStatus(server) {
    const status = server.getStatus();
    console.log('Server Status:');
    console.log(`   Running: ${status.isRunning}`);
    console.log(`   Address: ${status.host}:${status.port}`);
    console.log(`   Active Sessions: ${status.activeSessions}`);
    console.log(`   Max Connections: ${status.maxConnections}`);
    console.log('');
  }
}

module.exports = ServerCommand;
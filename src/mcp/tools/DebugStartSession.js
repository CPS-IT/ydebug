/**
 * DebugStartSession MCP Tool
 * Starts a debugging session by connecting to an active Xdebug session
 */

const BaseMCPTool = require('./BaseMCPTool');
const DBGpClient = require('../../debugger/DBGpClient');
const DBGpCommands = require('../../debugger/DBGpCommands');
const TOOL_DESCRIPTIONS = require('./descriptions');

class DebugStartSession extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_start_session',
      description: TOOL_DESCRIPTIONS.DEBUG_START_SESSION,
      inputSchema: {
        type: 'object',
        properties: {
          host: {
            type: 'string',
            description: 'Xdebug host (default: localhost)',
            default: 'localhost'
          },
          port: {
            type: 'integer',
            description: 'Xdebug port (default: 9003)',
            default: 9003,
            minimum: 1,
            maximum: 65535
          },
          timeout: {
            type: 'integer',
            description: 'Connection timeout in milliseconds (default: 10000)',
            default: 10000,
            minimum: 1000,
            maximum: 60000
          }
        }
      }
    };
  }

  async execute(params) {
    const { host = 'localhost', port = 9003, timeout = 10000 } = params;

    try {
      this.logger.info('Starting debugging session', { host, port, timeout });

      // Create DBGp client connection
      const client = new DBGpClient({ 
        host, 
        port, 
        timeout 
      });

      // Connect to Xdebug
      await client.connect();

      // Create command interface
      const commands = new DBGpCommands(client);

      // Get initial status
      const status = await commands.status();
      
      // Store session data in service registry for other tools
      const sessionId = `session_${Date.now()}`;
      this.services.register('activeSession', {
        sessionId,
        client,
        commands,
        host,
        port,
        startTime: new Date().toISOString(),
        status: status.status
      });

      this.logger.info('Debugging session started successfully', { 
        sessionId, 
        status: status.status 
      });

      return this.formatResponse({
        sessionId,
        status: status.status,
        host,
        port,
        startTime: new Date().toISOString(),
        message: 'Debugging session started successfully'
      });

    } catch (error) {
      this.logger.error('Failed to start debugging session', error);
      return this.formatErrorResponse(error, `Failed to start debugging session: ${error.message}`);
    }
  }
}

module.exports = DebugStartSession;
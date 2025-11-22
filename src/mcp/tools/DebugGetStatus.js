/**
 * DebugGetStatus MCP Tool
 * Gets the current execution status and position in the debugging session
 */

const BaseMCPTool = require('./BaseMCPTool');
const TOOL_DESCRIPTIONS = require('./descriptions');

class DebugGetStatus extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_get_status',
      description: TOOL_DESCRIPTIONS.DEBUG_GET_STATUS,
      inputSchema: {
        type: 'object',
        properties: {
          includeSessionInfo: {
            type: 'boolean',
            description: 'Include session metadata in response',
            default: false
          }
        }
      }
    };
  }

  async execute(params) {
    try {
      // Get the active session
      const activeSession = this.services.get('activeSession');
      
      if (!activeSession) {
        return this.formatErrorResponse(
          new Error('No debugging session is active')
        );
      }

      const { commands, sessionId, host, port, startTime } = activeSession;
      const { includeSessionInfo = false } = params;

      this.logger.info('Getting debug status', { includeSessionInfo });

      // Get current status from debugger
      const status = await commands.status();

      this.logger.info('Retrieved debug status', { 
        status: status.status,
        filename: status.filename,
        lineno: status.lineno
      });

      const response = {
        status: status.status,
        filename: status.filename || null,
        lineno: status.lineno || null,
        reason: status.reason || null,
        message: status.message || `Debugger is ${status.status}`
      };

      // Add session info if requested
      if (includeSessionInfo) {
        response.sessionInfo = {
          sessionId,
          host,
          port,
          startTime,
          uptime: Date.now() - new Date(startTime).getTime()
        };
      }

      return this.formatResponse(response);

    } catch (error) {
      this.logger.error('Failed to get debug status', error);
      return this.formatErrorResponse(error, 'Failed to get debug status');
    }
  }
}

module.exports = DebugGetStatus;
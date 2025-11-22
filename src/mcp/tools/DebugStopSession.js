/**
 * DebugStopSession MCP Tool
 * Stops the active debugging session
 */

const BaseMCPTool = require('./BaseMCPTool');
const TOOL_DESCRIPTIONS = require('./descriptions');

class DebugStopSession extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_stop_session',
      description: TOOL_DESCRIPTIONS.DEBUG_STOP_SESSION,
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID to stop (optional - will stop active session if not provided)'
          }
        }
      }
    };
  }

  async execute(params) {
    try {
      // Get the active session from service registry
      const activeSession = this.services.get('activeSession');
      
      if (!activeSession) {
        return this.formatErrorResponse(
          new Error('No active session found'), 
          'No debugging session is currently active'
        );
      }

      const { sessionId: activeSessionId, client, commands } = activeSession;
      const { sessionId = activeSessionId } = params;

      // Verify session ID matches if provided
      if (sessionId && sessionId !== activeSessionId) {
        return this.formatErrorResponse(
          new Error('Session ID mismatch'), 
          `Session ID ${sessionId} does not match active session ${activeSessionId}`
        );
      }

      this.logger.info('Stopping debugging session', { sessionId: activeSessionId });

      try {
        // Try to get final status before disconnecting
        const finalStatus = await commands.status();
        this.logger.debug('Final session status', finalStatus);
      } catch (error) {
        this.logger.warn('Could not get final status before disconnect', error);
      }

      // Disconnect the client
      if (client && client.isConnected()) {
        await client.disconnect();
      }

      // Remove session from service registry
      this.services.unregister('activeSession');

      this.logger.info('Debugging session stopped successfully', { 
        sessionId: activeSessionId 
      });

      return this.formatResponse({
        sessionId: activeSessionId,
        status: 'stopped',
        endTime: new Date().toISOString(),
        message: 'Debugging session stopped successfully'
      });

    } catch (error) {
      this.logger.error('Failed to stop debugging session', error);
      return this.formatErrorResponse(error, 'Failed to stop debugging session');
    }
  }
}

module.exports = DebugStopSession;
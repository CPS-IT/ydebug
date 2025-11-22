/**
 * DebugRemoveBreakpoint MCP Tool
 * Removes a breakpoint from the debugging session
 */

const BaseMCPTool = require('./BaseMCPTool');
const TOOL_DESCRIPTIONS = require('./descriptions');

class DebugRemoveBreakpoint extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_remove_breakpoint',
      description: TOOL_DESCRIPTIONS.DEBUG_REMOVE_BREAKPOINT,
      inputSchema: {
        type: 'object',
        properties: {
          breakpointId: {
            type: 'string',
            description: 'Breakpoint ID to remove (either this OR filename+lineno is required)'
          },
          filename: {
            type: 'string',
            description: 'Filename for breakpoint removal (alternative to breakpointId, requires lineno)'
          },
          lineno: {
            type: 'integer',
            description: 'Line number for breakpoint removal (required with filename)',
            minimum: 1
          }
        },
        additionalProperties: false
      }
    };
  }

  async execute(params) {
    try {
      // Get the active session
      const activeSession = this.services.get('activeSession');
      
      if (!activeSession) {
        return this.formatErrorResponse(
          new Error('No active session'), 
          'No debugging session is active. Please start a session first.'
        );
      }

      const { commands } = activeSession;
      const { breakpointId, filename, lineno } = params;

      let targetBreakpointId = breakpointId;

      // If no breakpoint ID provided, find it by filename and line number
      if (!targetBreakpointId && filename && lineno) {
        this.logger.info('Finding breakpoint by location', { filename, lineno });
        
        const breakpoints = await commands.listBreakpoints();
        const targetBreakpoint = breakpoints.find(bp => 
          bp.filename === filename && bp.lineno === lineno
        );

        if (!targetBreakpoint) {
          return this.formatErrorResponse(
            new Error('Breakpoint not found'),
            `No breakpoint found at ${filename}:${lineno}`
          );
        }

        targetBreakpointId = targetBreakpoint.id;
      }

      if (!targetBreakpointId) {
        return this.formatErrorResponse(
          new Error('Invalid parameters'),
          'Either breakpointId or filename+lineno must be provided'
        );
      }

      this.logger.info('Removing breakpoint', { breakpointId: targetBreakpointId });

      // Remove breakpoint using DBGp protocol
      // Note: We'll use the executeCommand method directly since there might not be a specific removeBreakpoint method
      await commands.executeCommand('breakpoint_remove', { d: targetBreakpointId });

      this.logger.info('Breakpoint removed successfully', { breakpointId: targetBreakpointId });

      return this.formatResponse({
        breakpointId: targetBreakpointId,
        removed: true,
        ...(filename && lineno && { filename, lineno }),
        message: `Breakpoint ${targetBreakpointId} removed successfully`
      });

    } catch (error) {
      this.logger.error('Failed to remove breakpoint', error);
      return this.formatErrorResponse(error, 'Failed to remove breakpoint');
    }
  }
}

module.exports = DebugRemoveBreakpoint;
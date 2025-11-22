/**
 * DebugSetBreakpoint MCP Tool
 * Sets a breakpoint in the debugging session
 */

const BaseMCPTool = require('./BaseMCPTool');
const TOOL_DESCRIPTIONS = require('./descriptions');

class DebugSetBreakpoint extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_set_breakpoint',
      description: TOOL_DESCRIPTIONS.DEBUG_SET_BREAKPOINT,
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Path to the file where breakpoint should be set'
          },
          lineno: {
            type: 'integer',
            description: 'Line number where breakpoint should be set',
            minimum: 1
          },
          type: {
            type: 'string',
            description: 'Breakpoint type',
            enum: ['line', 'call', 'return', 'exception', 'conditional', 'watch'],
            default: 'line'
          },
          state: {
            type: 'string',
            description: 'Breakpoint state',
            enum: ['enabled', 'disabled'],
            default: 'enabled'
          },
          temporary: {
            type: 'boolean',
            description: 'Whether breakpoint is temporary (removed after first hit)',
            default: false
          },
          expression: {
            type: 'string',
            description: 'Conditional expression for conditional breakpoints'
          }
        },
        required: ['filename', 'lineno']
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
      const { 
        filename, 
        lineno, 
        type = 'line',
        state = 'enabled',
        temporary = false,
        expression 
      } = params;

      this.logger.info('Setting breakpoint', { filename, lineno, type, state, temporary });

      // Set breakpoint using existing DBGpCommands
      const options = {
        type,
        state,
        temporary,
        ...(expression && { expression })
      };

      const result = await commands.setBreakpoint(filename, lineno, options);

      this.logger.info('Breakpoint set successfully', { 
        breakpointId: result.id,
        filename, 
        lineno 
      });

      return this.formatResponse({
        breakpointId: result.id,
        filename,
        lineno,
        type,
        state,
        temporary,
        ...(expression && { expression }),
        message: `Breakpoint set at ${filename}:${lineno}`
      });

    } catch (error) {
      this.logger.error('Failed to set breakpoint', error);
      return this.formatErrorResponse(error, `Failed to set breakpoint: ${error.message}`);
    }
  }
}

module.exports = DebugSetBreakpoint;
/**
 * DebugListBreakpoints MCP Tool
 * Lists all breakpoints in the debugging session
 */

const BaseMCPTool = require('./BaseMCPTool');
const TOOL_DESCRIPTIONS = require('./descriptions');

class DebugListBreakpoints extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_list_breakpoints',
      description: TOOL_DESCRIPTIONS.DEBUG_LIST_BREAKPOINTS,
      inputSchema: {
        type: 'object',
        properties: {
          includeDisabled: {
            type: 'boolean',
            description: 'Include disabled breakpoints in the list',
            default: true
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
          new Error('No active session'), 
          'No debugging session is active. Please start a session first.'
        );
      }

      const { commands } = activeSession;
      const { includeDisabled = true } = params;

      this.logger.info('Listing breakpoints', { includeDisabled });

      // Get breakpoints using existing DBGpCommands
      const breakpoints = await commands.listBreakpoints();

      // Filter breakpoints if requested
      let filteredBreakpoints = breakpoints;
      if (!includeDisabled) {
        filteredBreakpoints = breakpoints.filter(bp => bp.state === 'enabled');
      }

      // Format breakpoint data for MCP response
      const formattedBreakpoints = filteredBreakpoints.map(bp => ({
        id: bp.id,
        type: bp.type,
        filename: bp.filename,
        lineno: bp.lineno,
        state: bp.state,
        temporary: bp.temporary || false,
        ...(bp.expression && { expression: bp.expression }),
        ...(bp.hit_count !== undefined && { hitCount: bp.hit_count }),
        ...(bp.hit_value !== undefined && { hitValue: bp.hit_value })
      }));

      this.logger.info('Retrieved breakpoints', { 
        total: breakpoints.length,
        filtered: formattedBreakpoints.length,
        includeDisabled
      });

      return this.formatResponse({
        breakpoints: formattedBreakpoints,
        total: formattedBreakpoints.length,
        includeDisabled,
        message: `Found ${formattedBreakpoints.length} breakpoint${formattedBreakpoints.length !== 1 ? 's' : ''}`
      });

    } catch (error) {
      this.logger.error('Failed to list breakpoints', error);
      return this.formatErrorResponse(error, 'Failed to list breakpoints');
    }
  }
}

module.exports = DebugListBreakpoints;
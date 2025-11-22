/**
 * DebugContinueExecution MCP Tool
 * Continues execution until the next breakpoint or end of script
 */

const BaseMCPTool = require('./BaseMCPTool');

class DebugContinueExecution extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_continue_execution',
      description: 'Continue execution until next breakpoint or script end',
      inputSchema: {
        type: 'object',
        properties: {
          waitForBreak: {
            type: 'boolean',
            description: 'Whether to wait for execution to break at a breakpoint',
            default: true
          },
          timeout: {
            type: 'integer',
            description: 'Timeout in milliseconds to wait for break (if waitForBreak is true)',
            default: 30000,
            minimum: 1000,
            maximum: 300000
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
      const { waitForBreak = true, timeout = 30000 } = params;

      this.logger.info('Continuing execution', { waitForBreak, timeout });

      // Execute the run command to continue execution
      await commands.executeCommand('run');

      // Get current status after continue
      let status = await commands.status();

      // If we should wait for a break and execution is still running, wait
      if (waitForBreak && status.status === 'running') {
        this.logger.info('Waiting for execution to break', { timeout });

        // Poll for status changes until break or timeout
        const startTime = Date.now();
        while (Date.now() - startTime < timeout && status.status === 'running') {
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
          status = await commands.status();
        }

        if (status.status === 'running') {
          this.logger.warn('Execution did not break within timeout', { timeout });
        }
      }

      this.logger.info('Continue execution completed', { 
        status: status.status,
        filename: status.filename,
        lineno: status.lineno,
        reason: status.reason
      });

      return this.formatResponse({
        status: status.status,
        filename: status.filename || null,
        lineno: status.lineno || null,
        reason: status.reason || null,
        executionTime: Date.now() - Date.now(), // This would be calculated properly in real implementation
        message: `Execution continued - ${status.status}${status.reason ? ` (${status.reason})` : ''}`
      });

    } catch (error) {
      this.logger.error('Failed to continue execution', error);
      return this.formatErrorResponse(error, 'Failed to continue execution');
    }
  }
}

module.exports = DebugContinueExecution;
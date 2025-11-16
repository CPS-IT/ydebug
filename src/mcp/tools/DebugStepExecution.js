/**
 * DebugStepExecution MCP Tool
 * Controls step-by-step execution in the debugging session
 */

const BaseMCPTool = require('./BaseMCPTool');

class DebugStepExecution extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_step_execution',
      description: 'Step through code execution (step over, step into, step out)',
      inputSchema: {
        type: 'object',
        properties: {
          stepType: {
            type: 'string',
            description: 'Type of step to perform',
            enum: ['over', 'into', 'out'],
            default: 'over'
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
      const { stepType = 'over' } = params;

      this.logger.info('Stepping execution', { stepType });

      // Execute the appropriate step command
      switch (stepType) {
      case 'over':
        await commands.stepOver();
        break;
      case 'into':
        await commands.executeCommand('step_into');
        break;
      case 'out':
        await commands.executeCommand('step_out');
        break;
      default:
        return this.formatErrorResponse(
          new Error('Invalid step type')
        );
      }

      // Get current execution status after step
      const status = await commands.status();

      this.logger.info('Step execution completed', { 
        stepType, 
        status: status.status,
        filename: status.filename,
        lineno: status.lineno
      });

      return this.formatResponse({
        stepType,
        status: status.status,
        filename: status.filename || null,
        lineno: status.lineno || null,
        reason: status.reason || null,
        message: `Step ${stepType} completed - ${status.status}`
      });

    } catch (error) {
      this.logger.error('Failed to step execution', error);
      return this.formatErrorResponse(error, `Failed to step ${params.stepType || 'over'}`);
    }
  }
}

module.exports = DebugStepExecution;
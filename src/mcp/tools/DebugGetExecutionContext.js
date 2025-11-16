/**
 * DebugGetExecutionContext MCP Tool
 * Gets comprehensive execution context information including status, stack, and environment
 */

const BaseMCPTool = require('./BaseMCPTool');

class DebugGetExecutionContext extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_get_execution_context',
      description: 'Get comprehensive execution context including status, stack, and environment',
      inputSchema: {
        type: 'object',
        properties: {
          includeStack: {
            type: 'boolean',
            description: 'Include call stack information',
            default: true
          },
          includeBreakpoints: {
            type: 'boolean',
            description: 'Include current breakpoint information',
            default: true
          },
          includeFeatures: {
            type: 'boolean',
            description: 'Include debugger features and capabilities',
            default: false
          },
          stackDepth: {
            type: 'integer',
            description: 'Maximum stack depth to include',
            default: 5,
            minimum: 1,
            maximum: 20
          }
        }
      }
    };
  }

  async execute(params) {
    const { 
      includeStack = true,
      includeBreakpoints = true,
      includeFeatures = false,
      stackDepth = 5
    } = params;

    try {
      // Get the active session
      const activeSession = this.services.get('activeSession');
      
      if (!activeSession) {
        return this.formatErrorResponse(
          new Error('No debugging session is active')
        );
      }

      const { commands, sessionId, host, port, startTime } = activeSession;

      this.logger.info('Getting execution context', { 
        includeStack,
        includeBreakpoints,
        includeFeatures,
        stackDepth 
      });

      const context = {
        session: {
          sessionId,
          host,
          port,
          startTime,
          uptime: Date.now() - new Date(startTime).getTime()
        }
      };

      // Get current execution status
      try {
        const status = await commands.status();
        context.execution = {
          status: status.status || 'unknown',
          filename: status.filename || null,
          lineno: status.lineno || null,
          reason: status.reason || null,
          message: status.message || null
        };
      } catch (error) {
        this.logger.warn('Failed to get execution status', error);
        context.execution = {
          status: 'unknown',
          error: error.message
        };
      }

      // Get stack trace if requested
      if (includeStack) {
        try {
          const stackResult = await commands.execute('stack_get');
          const stackData = stackResult.stack || stackResult;
          context.callStack = this.formatCallStack(stackData, stackDepth);
        } catch (error) {
          this.logger.warn('Failed to get call stack', error);
          context.callStack = {
            error: error.message,
            frames: []
          };
        }
      }

      // Get breakpoints if requested
      if (includeBreakpoints) {
        try {
          const breakpoints = await commands.listBreakpoints();
          context.breakpoints = {
            total: breakpoints.breakpoints ? breakpoints.breakpoints.length : 0,
            active: breakpoints.breakpoints ? 
              breakpoints.breakpoints.filter(bp => bp.enabled !== false).length : 0,
            breakpoints: breakpoints.breakpoints || []
          };
        } catch (error) {
          this.logger.warn('Failed to get breakpoints', error);
          context.breakpoints = {
            error: error.message,
            total: 0,
            active: 0,
            breakpoints: []
          };
        }
      }

      // Get debugger features if requested
      if (includeFeatures) {
        context.features = await this.getDebuggerFeatures(commands);
      }

      // Get available contexts for current frame
      try {
        const contextNames = await commands.getContextNames(0);
        context.availableContexts = contextNames.contexts || [];
      } catch (error) {
        this.logger.warn('Failed to get available contexts', error);
        context.availableContexts = [];
      }

      this.logger.info('Execution context retrieved successfully', {
        hasStack: !!context.callStack,
        hasBreakpoints: !!context.breakpoints,
        hasFeatures: !!context.features,
        contextCount: context.availableContexts.length
      });

      return this.formatResponse({
        executionContext: context,
        metadata: {
          retrievalTime: new Date().toISOString(),
          includeStack,
          includeBreakpoints,
          includeFeatures,
          stackDepth
        }
      });

    } catch (error) {
      this.logger.error('Failed to get execution context', error);
      return this.formatErrorResponse(error, 'Failed to get execution context');
    }
  }

  /**
   * Format call stack for context
   * @param {Array|Object} stackData - Raw stack data
   * @param {number} maxDepth - Maximum depth
   * @returns {Object} Formatted call stack
   */
  formatCallStack(stackData, maxDepth) {
    let frames = Array.isArray(stackData) ? stackData : (stackData.frames || []);
    
    if (frames.length > maxDepth) {
      frames = frames.slice(0, maxDepth);
    }

    return {
      totalFrames: frames.length,
      currentFrame: frames.find(f => f.level === 0) || null,
      frames: frames.map(frame => ({
        level: frame.level || 0,
        filename: frame.filename || null,
        lineno: frame.lineno || null,
        function: frame.where || frame.function || null,
        class: frame.class || null,
        type: frame.type || 'function'
      }))
    };
  }

  /**
   * Get debugger features and capabilities
   * @param {Object} commands - Commands object
   * @returns {Promise<Object>} Features information
   */
  async getDebuggerFeatures(commands) {
    const features = {
      supported: {},
      errors: []
    };

    const featureList = [
      'language_supports_threads',
      'language_name',
      'language_version',
      'encoding',
      'protocol_version',
      'supports_async',
      'data_encoding',
      'breakpoint_languages',
      'multiple_sessions'
    ];

    for (const feature of featureList) {
      try {
        const result = await commands.featureGet(feature);
        features.supported[feature] = result.feature || result.value || result;
      } catch (error) {
        features.errors.push({
          feature,
          error: error.message
        });
      }
    }

    return features;
  }
}

module.exports = DebugGetExecutionContext;
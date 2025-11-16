/**
 * DebugGetStackTrace MCP Tool
 * Gets the current call stack and execution trace
 */

const BaseMCPTool = require('./BaseMCPTool');

class DebugGetStackTrace extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_get_stack_trace',
      description: 'Get current call stack and execution trace',
      inputSchema: {
        type: 'object',
        properties: {
          includeArguments: {
            type: 'boolean',
            description: 'Include function/method arguments in stack frames',
            default: true
          },
          maxDepth: {
            type: 'integer',
            description: 'Maximum stack depth to retrieve',
            default: 20,
            minimum: 1,
            maximum: 100
          },
          includeContext: {
            type: 'boolean',
            description: 'Include context information for each frame',
            default: false
          }
        }
      }
    };
  }

  async execute(params) {
    const { 
      includeArguments = true, 
      maxDepth = 20,
      includeContext = false 
    } = params;

    try {
      // Get the active session
      const activeSession = this.services.get('activeSession');
      
      if (!activeSession) {
        return this.formatErrorResponse(
          new Error('No debugging session is active')
        );
      }

      const { commands } = activeSession;

      this.logger.info('Getting stack trace', { 
        includeArguments, 
        maxDepth,
        includeContext 
      });

      // Get stack trace using stack_get command
      let stackData;
      try {
        const result = await commands.execute('stack_get');
        stackData = result.stack || result;
      } catch (error) {
        this.logger.error('Failed to get stack trace', error);
        return this.formatErrorResponse(
          error,
          `Failed to get stack trace: ${error.message}`
        );
      }

      if (!stackData) {
        return this.formatErrorResponse(
          new Error('No stack trace available'),
          'No stack trace data returned from debugger'
        );
      }

      // Format the stack trace
      const formattedStack = await this.formatStackTrace(
        stackData, 
        maxDepth, 
        includeArguments, 
        includeContext, 
        commands
      );

      this.logger.info('Stack trace retrieved successfully', { 
        frameCount: formattedStack.length,
        maxDepth,
        includeArguments
      });

      return this.formatResponse({
        stackTrace: formattedStack,
        metadata: {
          totalFrames: formattedStack.length,
          includeArguments,
          includeContext,
          maxDepth,
          retrievalTime: new Date().toISOString(),
          currentFrame: formattedStack.find(frame => frame.level === 0) || null
        }
      });

    } catch (error) {
      this.logger.error('Failed to get stack trace', error);
      return this.formatErrorResponse(error, 'Failed to get stack trace');
    }
  }

  /**
   * Format stack trace data
   * @param {Array|Object} stackData - Raw stack data
   * @param {number} maxDepth - Maximum depth
   * @param {boolean} includeArguments - Include arguments
   * @param {boolean} includeContext - Include context info
   * @param {Object} commands - Commands object for additional queries
   * @returns {Promise<Array>} Formatted stack frames
   */
  async formatStackTrace(stackData, maxDepth, includeArguments, includeContext, commands) {
    let frames = Array.isArray(stackData) ? stackData : (stackData.frames || []);
    
    // Limit depth
    if (frames.length > maxDepth) {
      frames = frames.slice(0, maxDepth);
    }

    const formattedFrames = [];

    for (const frame of frames) {
      const formattedFrame = {
        level: frame.level || 0,
        type: frame.type || 'unknown',
        filename: frame.filename || null,
        lineno: frame.lineno || null,
        function: frame.where || frame.function || null,
        class: frame.class || null,
        method: frame.method || null
      };

      // Add arguments if requested
      if (includeArguments && frame.arguments) {
        formattedFrame.arguments = this.formatArguments(frame.arguments);
      }

      // Add context if requested
      if (includeContext) {
        try {
          const contextInfo = await this.getFrameContext(frame.level || 0, commands);
          formattedFrame.context = contextInfo;
        } catch (error) {
          this.logger.warn(`Failed to get context for frame ${frame.level}`, error);
          formattedFrame.context = null;
        }
      }

      formattedFrames.push(formattedFrame);
    }

    return formattedFrames;
  }

  /**
   * Format function/method arguments
   * @param {Array} arguments - Raw arguments
   * @returns {Array} Formatted arguments
   */
  formatArguments(argumentsArray) {
    if (!Array.isArray(argumentsArray)) return [];

    return argumentsArray.map((arg, index) => ({
      position: index,
      name: arg.name || `arg${index}`,
      type: arg.type || 'unknown',
      value: this.formatArgumentValue(arg)
    }));
  }

  /**
   * Format a single argument value
   * @param {Object} arg - Argument object
   * @returns {*} Formatted value
   */
  formatArgumentValue(arg) {
    switch (arg.type) {
    case 'null':
      return null;
    case 'bool':
      return arg.value === '1' || arg.value === 'true';
    case 'int':
      return parseInt(arg.value, 10) || 0;
    case 'float':
      return parseFloat(arg.value) || 0.0;
    case 'string': {
      const stringValue = arg.value || '';
      if (stringValue.length > 100) {
        return stringValue.substring(0, 100) + '...';
      }
      return stringValue;
    }
    case 'array':
    case 'object':
      return {
        __type: arg.type,
        __size: arg.size || 'unknown',
        __summary: `[${arg.type}] (${arg.size || 'unknown'} items)`
      };
    case 'resource':
      return {
        __type: 'resource',
        __value: arg.value || 'resource'
      };
    default:
      return arg.value || `[${arg.type}]`;
    }
  }

  /**
   * Get context information for a stack frame
   * @param {number} level - Stack frame level
   * @param {Object} commands - Commands object
   * @returns {Promise<Object>} Context information
   */
  async getFrameContext(level, commands) {
    try {
      const contextNames = await commands.getContextNames(level);
      return {
        availableContexts: contextNames.contexts || [],
        stackLevel: level
      };
    } catch (error) {
      return {
        error: error.message,
        stackLevel: level
      };
    }
  }
}

module.exports = DebugGetStackTrace;
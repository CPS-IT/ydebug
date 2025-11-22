/**
 * DebugEvaluateExpression MCP Tool
 * Evaluates PHP expressions in the current debugging context
 */

const BaseMCPTool = require('./BaseMCPTool');

class DebugEvaluateExpression extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_evaluate_expression',
      description: 'Evaluate a PHP expression in the current debugging context',
      inputSchema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'PHP expression to evaluate (e.g., "$var + 1", "count($array)")',
            minLength: 1
          },
          contextId: {
            type: 'integer',
            description: 'Context ID for evaluation (0=local, 1=global, 2=class)',
            default: 0,
            minimum: 0,
            maximum: 10
          },
          stackDepth: {
            type: 'integer',
            description: 'Stack frame depth (0 = current frame)',
            default: 0,
            minimum: 0,
            maximum: 10
          },
          maxLength: {
            type: 'integer',
            description: 'Maximum length of result value',
            default: 1000,
            minimum: 10,
            maximum: 10000
          }
        },
        required: ['expression']
      }
    };
  }

  async execute(params) {
    const { 
      expression, 
      contextId = 0, 
      stackDepth = 0, 
      maxLength = 1000 
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

      this.logger.info('Evaluating expression', { 
        expression, 
        contextId, 
        stackDepth,
        maxLength 
      });

      // Evaluate the expression using eval command
      let result;
      try {
        const evalResult = await commands.execute('eval', {
          data: expression,
          c: contextId,
          d: stackDepth
        });
        result = evalResult ? (evalResult.property || evalResult) : null;
      } catch (error) {
        this.logger.error(`Failed to evaluate expression: ${expression}`, error);
        return this.formatErrorResponse(
          error,
          `Failed to evaluate expression: ${error.message}`
        );
      }

      if (!result) {
        return this.formatErrorResponse(
          new Error('Evaluation failed'),
          `Expression evaluation returned no result: ${expression}`
        );
      }

      // Format the evaluation result
      const formattedResult = this.formatEvaluationResult(result, maxLength);

      this.logger.info('Expression evaluated successfully', { 
        expression,
        resultType: formattedResult.type,
        hasError: formattedResult.hasError
      });

      return this.formatResponse({
        expression,
        contextId,
        stackDepth,
        result: formattedResult,
        metadata: {
          evaluationTime: new Date().toISOString(),
          maxLength,
          truncated: formattedResult.truncated || false
        }
      });

    } catch (error) {
      this.logger.error('Failed to evaluate expression', error);
      return this.formatErrorResponse(error, 'Failed to evaluate expression');
    }
  }

  /**
   * Format evaluation result for MCP response
   * @param {Object} result - Raw evaluation result
   * @param {number} maxLength - Maximum length for values
   * @returns {Object} Formatted result
   */
  formatEvaluationResult(result, maxLength) {
    const formatted = {
      type: result.type || 'unknown',
      value: this.formatValue(result, maxLength),
      hasError: result.error || false,
      errorMessage: result.error ? result.message || 'Unknown error' : null,
      encoding: result.encoding || null,
      size: result.size || null,
      truncated: false
    };

    return formatted;
  }

  /**
   * Format a value with length control
   * @param {Object} result - Result object
   * @param {number} maxLength - Maximum length
   * @returns {*} Formatted value
   */
  formatValue(result, maxLength) {
    // Handle errors
    if (result.error) {
      return {
        __error: true,
        __message: result.message || 'Evaluation error',
        __code: result.code || 'EVAL_ERROR'
      };
    }

    // Handle different types
    switch (result.type) {
    case 'null':
      return null;
    case 'bool':
      return result.value === '1' || result.value === 'true';
    case 'int':
      return parseInt(result.value, 10) || 0;
    case 'float':
      return parseFloat(result.value) || 0.0;
    case 'string': {
      const stringValue = result.value || '';
      if (stringValue.length > maxLength) {
        return {
          __truncated: true,
          __originalLength: stringValue.length,
          __value: stringValue.substring(0, maxLength) + '...'
        };
      }
      return stringValue;
    }
    case 'array':
    case 'object':
      if (result.hasChildren) {
        return {
          __type: result.type,
          __size: result.size || 'unknown',
          __summary: `[${result.type}] (${result.size || 'unknown'} items)`,
          __className: result.className || null,
          __note: 'Use debug_inspect_object to explore contents'
        };
      }
      return {
        __type: result.type,
        __empty: true,
        __summary: `Empty ${result.type}`
      };
    case 'resource':
      return {
        __type: 'resource',
        __value: result.value || 'resource',
        __resourceType: result.resourceType || 'unknown'
      };
    default: {
      const defaultValue = result.value || `[${result.type}]`;
      if (typeof defaultValue === 'string' && defaultValue.length > maxLength) {
        return {
          __truncated: true,
          __originalLength: defaultValue.length,
          __value: defaultValue.substring(0, maxLength) + '...'
        };
      }
      return defaultValue;
    }
    }
  }
}

module.exports = DebugEvaluateExpression;
/**
 * DebugInspectScope MCP Tool
 * Inspects a specific variable scope context with detailed information
 */

const BaseMCPTool = require('./BaseMCPTool');

class DebugInspectScope extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_inspect_scope',
      description: 'Inspect a specific variable scope context with available contexts',
      inputSchema: {
        type: 'object',
        properties: {
          contextId: {
            type: 'integer',
            description: 'Context ID to inspect (0=local, 1=global, 2=class)',
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
          includeMetadata: {
            type: 'boolean',
            description: 'Include context metadata and available contexts',
            default: true
          },
          maxDepth: {
            type: 'integer',
            description: 'Maximum depth for nested objects/arrays',
            default: 3,
            minimum: 0,
            maximum: 5
          }
        }
      }
    };
  }

  async execute(params) {
    const { 
      contextId = 0, 
      stackDepth = 0, 
      includeMetadata = true,
      maxDepth = 3 
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

      this.logger.info('Inspecting scope context', { 
        contextId, 
        stackDepth, 
        includeMetadata,
        maxDepth 
      });

      const response = {
        contextId,
        stackDepth,
        variables: [],
        metadata: null
      };

      // Get available contexts if metadata is requested
      if (includeMetadata) {
        try {
          const contextNames = await commands.getContextNames(stackDepth);
          response.metadata = {
            availableContexts: this.formatContextNames(contextNames),
            currentContextId: contextId,
            stackDepth,
            maxDepth,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          this.logger.warn('Failed to get context names', error);
          response.metadata = {
            availableContexts: [],
            currentContextId: contextId,
            stackDepth,
            maxDepth,
            timestamp: new Date().toISOString(),
            warning: 'Could not retrieve available contexts'
          };
        }
      }

      // Get the specific context variables
      try {
        const contextData = await commands.getContext(contextId, stackDepth);
        if (contextData && contextData.variables) {
          response.variables = this.formatVariables(contextData.variables, maxDepth);
          response.contextInfo = {
            name: this.getContextName(contextId),
            id: contextId,
            variableCount: contextData.variables.length
          };
        } else {
          this.logger.warn(`No variables found for context ${contextId} at depth ${stackDepth}`);
          response.variables = [];
          response.contextInfo = {
            name: this.getContextName(contextId),
            id: contextId,
            variableCount: 0,
            warning: 'No variables available in this context'
          };
        }
      } catch (error) {
        this.logger.error(`Failed to get context ${contextId}`, error);
        response.variables = [];
        response.contextInfo = {
          name: this.getContextName(contextId),
          id: contextId,
          variableCount: 0,
          error: error.message
        };
      }

      this.logger.info('Scope context inspected successfully', { 
        contextId,
        stackDepth,
        variableCount: response.variables.length
      });

      return this.formatResponse(response);

    } catch (error) {
      this.logger.error('Failed to inspect scope context', error);
      return this.formatErrorResponse(error, 'Failed to inspect scope context');
    }
  }

  /**
   * Format context names response
   * @param {Object} contextNames - Context names response
   * @returns {Array} Formatted context names
   */
  formatContextNames(contextNames) {
    if (!contextNames || !contextNames.contexts) return [];

    return contextNames.contexts.map(context => ({
      id: context.id || 0,
      name: context.name || 'unknown',
      description: this.getContextDescription(context.id || 0)
    }));
  }

  /**
   * Format variables for MCP response
   * @param {Array} variables - Variables array
   * @param {number} maxDepth - Maximum depth for formatting
   * @returns {Array} Formatted variables
   */
  formatVariables(variables, maxDepth) {
    if (!Array.isArray(variables)) return [];

    return variables.map(variable => ({
      name: variable.name || 'unknown',
      type: variable.type || 'unknown',
      value: this.formatVariableValue(variable, maxDepth, 0),
      fullName: variable.fullName || variable.name,
      size: variable.size || null,
      hasChildren: variable.hasChildren || false,
      visibility: variable.facet || 'public',
      address: variable.address || null,
      key: variable.key || variable.name
    }));
  }

  /**
   * Format a single variable value
   * @param {Object} variable - Variable object
   * @param {number} maxDepth - Maximum depth
   * @param {number} currentDepth - Current depth
   * @returns {*} Formatted value
   */
  formatVariableValue(variable, maxDepth, currentDepth) {
    // Handle different variable types
    switch (variable.type) {
    case 'null':
      return null;
    case 'bool':
      return variable.value === '1' || variable.value === 'true';
    case 'int':
      return parseInt(variable.value, 10) || 0;
    case 'float':
      return parseFloat(variable.value) || 0.0;
    case 'string':
      return variable.value || '';
    case 'array':
    case 'object':
      // Check if we can expand this level (children would be at currentDepth + 1)
      if (variable.children && (currentDepth + 1) < maxDepth) {
        return this.formatChildren(variable.children, maxDepth, currentDepth + 1);
      }
      return {
        __type: variable.type,
        __size: variable.size || 'unknown',
        __summary: variable.hasChildren && (currentDepth + 1) >= maxDepth
          ? `[${variable.type}] (${variable.size || 'unknown'} items) - depth limit reached`
          : `[${variable.type}] (${variable.size || 'unknown'} items)`
      };
    case 'resource':
      return {
        __type: 'resource',
        __value: variable.value || 'resource',
        __summary: `[resource] ${variable.value || 'unknown'}`
      };
    default:
      return variable.value || `[${variable.type}]`;
    }
  }

  /**
   * Format child variables
   * @param {Array} children - Child variables
   * @param {number} maxDepth - Maximum depth
   * @param {number} currentDepth - Current depth
   * @returns {Object} Formatted children
   */
  formatChildren(children, maxDepth, currentDepth) {
    if (!Array.isArray(children)) return {};

    const formatted = {};
    
    for (const child of children) {
      const key = child.name || child.key || 'unknown';
      formatted[key] = this.formatVariableValue(child, maxDepth, currentDepth);
    }

    return formatted;
  }

  /**
   * Get human-readable context name
   * @param {number} contextId - Context ID
   * @returns {string} Context name
   */
  getContextName(contextId) {
    const contextNames = {
      0: 'Local',
      1: 'Global', 
      2: 'Class',
      3: 'Super Global'
    };
    return contextNames[contextId] || `Context ${contextId}`;
  }

  /**
   * Get context description
   * @param {number} contextId - Context ID
   * @returns {string} Context description
   */
  getContextDescription(contextId) {
    const descriptions = {
      0: 'Local function/method variables',
      1: 'Global scope variables',
      2: 'Class instance variables',
      3: 'PHP superglobal variables'
    };
    return descriptions[contextId] || `Custom context ${contextId}`;
  }
}

module.exports = DebugInspectScope;
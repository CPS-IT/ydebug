/**
 * DebugInspectVariables MCP Tool
 * Inspects variables at the current execution point
 */

const BaseMCPTool = require('./BaseMCPTool');

class DebugInspectVariables extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_inspect_variables',
      description: 'Inspect variables at the current execution point',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            description: 'Variable scope to inspect',
            enum: ['local', 'global', 'class', 'all'],
            default: 'local'
          },
          stackDepth: {
            type: 'integer',
            description: 'Stack frame depth (0 = current frame)',
            default: 0,
            minimum: 0,
            maximum: 10
          },
          includePrivate: {
            type: 'boolean',
            description: 'Include private and protected variables',
            default: true
          },
          maxDepth: {
            type: 'integer',
            description: 'Maximum depth for nested objects/arrays',
            default: 2,
            minimum: 0,
            maximum: 5
          }
        }
      }
    };
  }

  async execute(params) {
    const { 
      scope = 'local', 
      stackDepth = 0, 
      includePrivate = true,
      maxDepth = 2 
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

      this.logger.info('Inspecting variables', { 
        scope, 
        stackDepth, 
        includePrivate,
        maxDepth 
      });

      let variables = {};

      // Get variables based on requested scope
      if (scope === 'local' || scope === 'all') {
        try {
          const localVars = await commands.getLocalVariables(stackDepth);
          variables.local = localVars.variables || [];
        } catch (error) {
          this.logger.warn('Failed to get local variables', error);
          variables.local = [];
        }
      }

      if (scope === 'global' || scope === 'all') {
        try {
          const globalVars = await commands.getGlobalVariables(stackDepth);
          variables.global = globalVars.variables || [];
        } catch (error) {
          this.logger.warn('Failed to get global variables', error);
          variables.global = [];
        }
      }

      if (scope === 'class' || scope === 'all') {
        try {
          const classVars = await commands.getClassVariables(stackDepth);
          variables.class = classVars.variables || [];
        } catch (error) {
          this.logger.warn('Failed to get class variables', error);
          variables.class = [];
        }
      }

      // Filter variables if needed
      if (!includePrivate) {
        variables = this.filterPrivateVariables(variables);
      }

      // Format variables for MCP response
      const formattedVariables = this.formatVariables(variables, maxDepth);

      this.logger.info('Variables inspected successfully', { 
        scope,
        stackDepth,
        variableCount: this.countVariables(formattedVariables)
      });

      return this.formatResponse({
        scope,
        stackDepth,
        variables: formattedVariables,
        metadata: {
          includePrivate,
          maxDepth,
          totalVariables: this.countVariables(formattedVariables),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Failed to inspect variables', error);
      return this.formatErrorResponse(error, 'Failed to inspect variables');
    }
  }

  /**
   * Filter out private and protected variables
   * @param {Object} variables - Variables object
   * @returns {Object} Filtered variables
   */
  filterPrivateVariables(variables) {
    const filtered = {};
    
    for (const [scope, vars] of Object.entries(variables)) {
      if (!Array.isArray(vars)) continue;
      
      filtered[scope] = vars.filter(variable => {
        const name = variable.name || '';
        // Filter out variables that start with underscore (private convention)
        return !name.startsWith('_');
      });
    }

    return filtered;
  }

  /**
   * Format variables for MCP response
   * @param {Object} variables - Variables object
   * @param {number} maxDepth - Maximum depth for formatting
   * @returns {Object} Formatted variables
   */
  formatVariables(variables, maxDepth) {
    const formatted = {};

    for (const [scope, vars] of Object.entries(variables)) {
      if (!Array.isArray(vars)) continue;

      formatted[scope] = vars.map(variable => ({
        name: variable.name || 'unknown',
        type: variable.type || 'unknown',
        value: this.formatVariableValue(variable, maxDepth, 0),
        fullName: variable.fullName || variable.name,
        size: variable.size || null,
        hasChildren: variable.hasChildren || false,
        visibility: variable.facet || 'public'
      }));
    }

    return formatted;
  }

  /**
   * Format a single variable value
   * @param {Object} variable - Variable object
   * @param {number} maxDepth - Maximum depth
   * @param {number} currentDepth - Current depth
   * @returns {*} Formatted value
   */
  formatVariableValue(variable, maxDepth, currentDepth) {
    if (currentDepth >= maxDepth && variable.hasChildren) {
      return `[${variable.type}] (${variable.size || 'unknown'} items) - depth limit reached`;
    }

    // Handle different variable types
    switch (variable.type) {
    case 'null':
      return null;
    case 'bool':
      return variable.value === '1' || variable.value === 'true';
    case 'int':
      return parseInt(variable.value, 10);
    case 'float':
      return parseFloat(variable.value);
    case 'string':
      return variable.value || '';
    case 'array':
    case 'object':
      if (variable.children && currentDepth < maxDepth) {
        return this.formatChildren(variable.children, maxDepth, currentDepth + 1);
      }
      return `[${variable.type}] (${variable.size || 'unknown'} items)`;
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
   * Count total variables across all scopes
   * @param {Object} variables - Variables object
   * @returns {number} Total variable count
   */
  countVariables(variables) {
    let count = 0;
    
    for (const vars of Object.values(variables)) {
      if (Array.isArray(vars)) {
        count += vars.length;
      }
    }

    return count;
  }
}

module.exports = DebugInspectVariables;
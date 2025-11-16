/**
 * Base MCP Tool Class
 * Provides common functionality for all MCP tools
 */

const { logger } = require('../../utils/Logger');

class BaseMCPTool {
  constructor(serviceRegistry) {
    if (!serviceRegistry) {
      throw new Error('ServiceRegistry is required for MCP tools');
    }
    
    this.services = serviceRegistry;
    this.logger = logger;
  }

  /**
   * Get tool definition for MCP tools/list response
   * Must be implemented by subclasses
   * @returns {object} Tool definition
   */
  getDefinition() {
    throw new Error('getDefinition() must be implemented by subclass');
  }

  /**
   * Execute the tool
   * Must be implemented by subclasses
   * @param {object} params - Tool parameters
   * @returns {Promise<*>} Tool result
   */
  async execute(_params) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Validate tool parameters against schema
   * @param {object} params - Parameters to validate
   * @param {object} schema - JSON schema for validation
   * @returns {object} Validation result with valid boolean and errors array
   */
  validateParameters(params, schema = undefined) {
    // Simple parameter validation - could be enhanced with JSON schema library
    const errors = [];
    
    // If schema is explicitly null, skip validation
    if (schema === null) {
      return { valid: true };
    }
    
    // If no schema provided (undefined), use the tool's input schema
    if (schema === undefined) {
      schema = this.getDefinition().inputSchema;
    }

    if (schema && schema.required) {
      for (const requiredParam of schema.required) {
        if (!(requiredParam in params)) {
          errors.push(`Missing required parameter: ${requiredParam}`);
        }
      }
    }

    if (schema && schema.properties) {
      for (const [paramName, paramSchema] of Object.entries(schema.properties)) {
        if (paramName in params) {
          const paramValue = params[paramName];
          
          // Type validation
          if (paramSchema.type) {
            let actualType = Array.isArray(paramValue) ? 'array' : typeof paramValue;
            
            // Handle integer type (which is a JSON Schema concept, not a JavaScript type)
            if (paramSchema.type === 'integer' && typeof paramValue === 'number' && Number.isInteger(paramValue)) {
              actualType = 'integer';
            }
            
            if (actualType !== paramSchema.type) {
              errors.push(`Parameter ${paramName} must be of type ${paramSchema.type}, got ${actualType}`);
            }
          }

          // Range validation for numbers
          if (typeof paramValue === 'number') {
            if (paramSchema.minimum !== undefined && paramValue < paramSchema.minimum) {
              errors.push(`Parameter ${paramName} must be at least ${paramSchema.minimum}`);
            }
            if (paramSchema.maximum !== undefined && paramValue > paramSchema.maximum) {
              errors.push(`Parameter ${paramName} must be at most ${paramSchema.maximum}`);
            }
          }

          // Enum validation
          if (paramSchema.enum && !paramSchema.enum.includes(paramValue)) {
            errors.push(`Parameter ${paramName} must be one of: ${paramSchema.enum.join(', ')}`);
          }
          
          // Nested object validation
          if (paramSchema.type === 'object' && paramSchema.properties && typeof paramValue === 'object' && paramValue !== null) {
            // Check required properties in nested object
            if (paramSchema.required) {
              for (const requiredNestedParam of paramSchema.required) {
                if (!(requiredNestedParam in paramValue)) {
                  errors.push(`Missing required parameter: ${requiredNestedParam}`);
                }
              }
            }
            
            // Recursively validate nested properties
            for (const [nestedParamName, nestedParamSchema] of Object.entries(paramSchema.properties)) {
              if (nestedParamName in paramValue) {
                const nestedParamValue = paramValue[nestedParamName];
                
                // Type validation for nested properties
                if (nestedParamSchema.type) {
                  let nestedActualType = Array.isArray(nestedParamValue) ? 'array' : typeof nestedParamValue;
                  
                  if (nestedParamSchema.type === 'integer' && typeof nestedParamValue === 'number' && Number.isInteger(nestedParamValue)) {
                    nestedActualType = 'integer';
                  }
                  
                  if (nestedActualType !== nestedParamSchema.type) {
                    errors.push(`Parameter ${paramName}.${nestedParamName} must be of type ${nestedParamSchema.type}, got ${nestedActualType}`);
                  }
                }
                
                // Range validation for nested numbers
                if (typeof nestedParamValue === 'number') {
                  if (nestedParamSchema.minimum !== undefined && nestedParamValue < nestedParamSchema.minimum) {
                    errors.push(`Parameter ${paramName}.${nestedParamName} must be at least ${nestedParamSchema.minimum}`);
                  }
                  if (nestedParamSchema.maximum !== undefined && nestedParamValue > nestedParamSchema.maximum) {
                    errors.push(`Parameter ${paramName}.${nestedParamName} must be at most ${nestedParamSchema.maximum}`);
                  }
                }
                
                // Enum validation for nested properties
                if (nestedParamSchema.enum && !nestedParamSchema.enum.includes(nestedParamValue)) {
                  errors.push(`Parameter ${paramName}.${nestedParamName} must be one of: ${nestedParamSchema.enum.join(', ')}`);
                }
              }
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Format response for MCP protocol
   * @param {*} data - Raw response data
   * @param {string} [format='default'] - Response format
   * @returns {object} Formatted MCP response
   */
  formatResponse(data, format = 'default') {
    // Standard MCP tool response format
    const response = {
      content: [],
      isError: false,
      isSuccess: true
    };

    if (data === null || data === undefined) {
      response.content.push({
        type: 'text',
        text: 'No data available'
      });
      return response;
    }

    switch (format) {
    case 'json':
      try {
        response.content.push({
          type: 'text',
          text: JSON.stringify(data, null, 2)
        });
      } catch {
        // Handle circular references gracefully
        response.content.push({
          type: 'text',
          text: '[Object with circular references - cannot serialize to JSON]'
        });
      }
      break;

    case 'text':
      response.content.push({
        type: 'text',
        text: typeof data === 'string' ? data : String(data)
      });
      break;

    case 'default':
    default:
      if (typeof data === 'string') {
        response.content.push({
          type: 'text',
          text: data
        });
      } else {
        try {
          response.content.push({
            type: 'text',
            text: JSON.stringify(data, null, 2)
          });
        } catch {
          // Handle circular references gracefully
          response.content.push({
            type: 'text',
            text: '[Object with circular references - cannot serialize to JSON]'
          });
        }
      }
      break;
    }

    return response;
  }

  /**
   * Format error response for MCP protocol
   * @param {Error|string} error - Error object or message
   * @param {string} [customMessage] - Custom error message to display instead of error.message
   * @returns {object} Formatted MCP error response
   */
  formatErrorResponse(error, customMessage = null) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const displayMessage = customMessage || errorMessage;

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${displayMessage}`
        }
      ],
      isError: true,
      isSuccess: false,
      _meta: {
        error: errorMessage,
        stack: errorStack
      }
    };
  }

  /**
   * Get service from registry with error handling
   * @param {string} serviceName - Name of service to retrieve
   * @returns {*} Service instance
   * @throws {Error} If service not found
   */
  getService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Required service '${serviceName}' not available`);
    }
    return service;
  }

  /**
   * Log tool execution
   * @param {string} action - Action being performed
   * @param {object} [context] - Additional context
   */
  logExecution(action, context = {}) {
    this.logger.debug(`MCP Tool ${this.constructor.name}: ${action}`, context);
  }

  /**
   * Common parameter validation for debugging tools
   * @param {object} params - Parameters to validate
   * @returns {object} Validation result
   */
  validateDebugParameters(params) {
    const errors = [];

    // Session ID validation (will be common for many debugging tools)
    if ('sessionId' in params && typeof params.sessionId !== 'string') {
      errors.push('sessionId must be a string');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Create tool schema for parameter validation
   * @param {object} properties - Schema properties
   * @param {string[]} [required] - Required parameter names
   * @returns {object} JSON schema object
   */
  static createSchema(properties, required = []) {
    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false
    };
  }
}

module.exports = BaseMCPTool;
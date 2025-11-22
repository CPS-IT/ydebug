/**
 * DebugInspectObject MCP Tool
 * Inspects a specific object or variable by its full name
 */

const BaseMCPTool = require('./BaseMCPTool');
const TOOL_DESCRIPTIONS = require('./descriptions');

class DebugInspectObject extends BaseMCPTool {
  getDefinition() {
    return {
      name: 'debug_inspect_object',
      description: TOOL_DESCRIPTIONS.DEBUG_INSPECT_OBJECT,
      inputSchema: {
        type: 'object',
        properties: {
          fullName: {
            type: 'string',
            description: 'Full variable name (e.g., $obj->property, $array[0])',
            minLength: 1
          },
          contextId: {
            type: 'integer',
            description: 'Context ID where variable exists (0=local, 1=global, 2=class)',
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
          maxDepth: {
            type: 'integer',
            description: 'Maximum depth for nested inspection',
            default: 3,
            minimum: 0,
            maximum: 10
          }
        },
        required: ['fullName']
      }
    };
  }

  async execute(params) {
    const { 
      fullName, 
      contextId = 0, 
      stackDepth = 0, 
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

      this.logger.info('Inspecting object', { 
        fullName, 
        contextId, 
        stackDepth, 
        maxDepth 
      });

      // Get the property value using property_get command
      let objectData;
      try {
        const result = await commands.execute('property_get', {
          n: fullName,
          d: stackDepth,
          c: contextId
        });
        objectData = result ? (result.property || result) : null;
      } catch (error) {
        this.logger.error(`Failed to get property ${fullName}`, error);
        return this.formatErrorResponse(
          error,
          `Failed to inspect object: ${fullName}`
        );
      }

      if (!objectData) {
        return this.formatErrorResponse(
          new Error('Object not found'),
          `Object ${fullName} not found in the current context`
        );
      }

      // Format the object data
      const formattedObject = this.formatObject(objectData, maxDepth);

      this.logger.info('Object inspected successfully', { 
        fullName,
        type: formattedObject.type,
        hasChildren: formattedObject.hasChildren
      });

      return this.formatResponse({
        fullName,
        contextId,
        stackDepth,
        maxDepth,
        object: formattedObject,
        metadata: {
          inspectionTime: new Date().toISOString(),
          requestedDepth: maxDepth,
          actualDepth: this.calculateActualDepth(formattedObject.value)
        }
      });

    } catch (error) {
      this.logger.error('Failed to inspect object', error);
      return this.formatErrorResponse(error, 'Failed to inspect object');
    }
  }

  /**
   * Format object data for MCP response
   * @param {Object} objectData - Raw object data from debugger
   * @param {number} maxDepth - Maximum depth for formatting
   * @returns {Object} Formatted object
   */
  formatObject(objectData, maxDepth) {
    return {
      name: objectData.name || 'unknown',
      type: objectData.type || 'unknown',
      value: this.formatValue(objectData, maxDepth, 0),
      fullName: objectData.fullName || objectData.name,
      size: objectData.size || null,
      hasChildren: objectData.hasChildren || false,
      visibility: objectData.facet || 'public',
      address: objectData.address || null,
      encoding: objectData.encoding || null,
      className: objectData.className || null
    };
  }

  /**
   * Format a value with depth control
   * @param {Object} data - Data object
   * @param {number} maxDepth - Maximum depth
   * @param {number} currentDepth - Current depth
   * @returns {*} Formatted value
   */
  formatValue(data, maxDepth, currentDepth) {
    // Handle primitive types
    switch (data.type) {
    case 'null':
      return null;
    case 'bool':
      return data.value === '1' || data.value === 'true';
    case 'int':
      return parseInt(data.value, 10) || 0;
    case 'float':
      return parseFloat(data.value) || 0.0;
    case 'string':
      return data.value || '';
    case 'resource':
      return {
        __type: 'resource',
        __value: data.value || 'resource',
        __resourceType: data.resourceType || 'unknown'
      };
    case 'array':
    case 'object':
      if (currentDepth >= maxDepth) {
        return {
          __type: data.type,
          __size: data.size || 'unknown',
          __summary: `[${data.type}] (${data.size || 'unknown'} items) - depth limit reached`,
          __className: data.className || null
        };
      }

      if (data.children && Array.isArray(data.children)) {
        const formatted = {};
        for (const child of data.children) {
          const key = child.name || child.key || 'unknown';
          formatted[key] = this.formatValue(child, maxDepth, currentDepth + 1);
        }
        return formatted;
      }

      return {
        __type: data.type,
        __size: data.size || 'unknown',
        __summary: `[${data.type}] (${data.size || 'unknown'} items)`,
        __className: data.className || null
      };
    default:
      return data.value || `[${data.type}]`;
    }
  }

  /**
   * Calculate actual depth of formatted object
   * @param {*} value - Formatted value
   * @param {number} currentDepth - Current depth
   * @returns {number} Actual depth
   */
  calculateActualDepth(value, currentDepth = 0) {
    if (typeof value !== 'object' || value === null) {
      return currentDepth;
    }

    if (value.__type) {
      return currentDepth; // This is a depth-limited object
    }

    let maxChildDepth = currentDepth;
    for (const childValue of Object.values(value)) {
      const childDepth = this.calculateActualDepth(childValue, currentDepth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return maxChildDepth;
  }
}

module.exports = DebugInspectObject;
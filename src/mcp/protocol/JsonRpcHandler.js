/**
 * JSON-RPC 2.0 Protocol Handler
 * Implements JSON-RPC 2.0 specification for MCP protocol
 */

const { logger } = require('../../utils/Logger');

class JsonRpcHandler {
  constructor() {
    this.logger = logger;
  }

  /**
   * Create a JSON-RPC 2.0 request
   * @param {string} method - RPC method name
   * @param {*} params - Method parameters
   * @param {string|number} [id] - Request ID (omit for notifications)
   * @returns {object} JSON-RPC request object
   */
  createRequest(method, params = null, id = null) {
    const request = {
      jsonrpc: '2.0',
      method
    };

    if (params !== null) {
      request.params = params;
    }

    if (id !== null) {
      request.id = id;
    }

    return request;
  }

  /**
   * Create a JSON-RPC 2.0 notification
   * @param {string} method - RPC method name
   * @param {*} params - Method parameters
   * @returns {object} JSON-RPC notification object
   */
  createNotification(method, params = null) {
    const notification = {
      jsonrpc: '2.0',
      method
    };

    if (params !== null) {
      notification.params = params;
    }

    return notification;
  }

  /**
   * Create a JSON-RPC 2.0 success response
   * @param {*} result - Method result
   * @param {string|number} id - Request ID
   * @returns {object} JSON-RPC response object
   */
  createSuccessResponse(result, id) {
    return {
      jsonrpc: '2.0',
      result,
      id
    };
  }

  /**
   * Create a JSON-RPC 2.0 error response
   * @param {number} code - Error code
   * @param {string} message - Error message
   * @param {*} [data] - Additional error data
   * @param {string|number} id - Request ID
   * @returns {object} JSON-RPC error response object
   */
  createErrorResponse(code, message, data = null, id = null) {
    const response = {
      jsonrpc: '2.0',
      error: {
        code,
        message
      },
      id
    };

    if (data !== null) {
      response.error.data = data;
    }

    return response;
  }

  /**
   * Validate JSON-RPC 2.0 message format
   * @param {*} message - Message to validate
   * @returns {object} Validation result { valid: boolean, error?: string }
   */
  validateMessage(message) {
    // Check if message is an object (and not an array or null)
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return { valid: false, error: 'Message must be an object' };
    }

    // Check JSON-RPC version
    if (message.jsonrpc === undefined) {
      return { valid: false, error: 'Missing jsonrpc field' };
    }
    if (message.jsonrpc !== '2.0') {
      return { valid: false, error: 'Invalid jsonrpc version' };
    }

    // Check if it's a request, response, or notification
    if (message.method !== undefined) {
      // It's a request or notification
      if (typeof message.method !== 'string') {
        return { valid: false, error: 'Method must be a string' };
      }

      // Validate ID for requests (notifications don't have ID)
      if (message.id !== undefined) {
        if (typeof message.id !== 'string' && typeof message.id !== 'number' && message.id !== null) {
          return { valid: false, error: 'ID must be string, number, or null' };
        }
      }

      return { valid: true };
    } else if (message.result !== undefined || message.error !== undefined) {
      // It's a response
      if (message.result !== undefined && message.error !== undefined) {
        return { valid: false, error: 'Response cannot have both result and error fields' };
      }

      // Validate error format
      if (message.error !== undefined) {
        if (typeof message.error !== 'object' || !message.error || Array.isArray(message.error)) {
          return { valid: false, error: 'Error must be an object' };
        }
        if (typeof message.error.code !== 'number') {
          return { valid: false, error: 'Error code must be a number' };
        }
        if (typeof message.error.message !== 'string') {
          return { valid: false, error: 'Error message must be a string' };
        }
      }

      // Response must have ID (except for error responses to notifications)
      if (message.id === undefined && message.error === undefined) {
        return { valid: false, error: 'Response must have an ID' };
      }

      return { valid: true };
    } else {
      // Message has neither method nor result/error
      // If it has ID, it's likely intended as a response
      if (message.id !== undefined) {
        return { valid: false, error: 'Response must have result or error field' };
      } else {
        return { valid: false, error: 'Request must have method field' };
      }
    }
  }

  /**
   * Parse JSON-RPC message from string
   * @param {string} data - JSON string
   * @returns {object} Parse result { success: boolean, message?: object, error?: string }
   */
  parseMessage(data) {
    // Handle empty strings
    if (data === '') {
      return {
        success: false,
        error: 'Empty message'
      };
    }

    // Handle other falsy inputs that aren't valid JSON strings
    if (data === null || data === undefined || typeof data !== 'string') {
      return {
        success: false,
        error: 'Invalid JSON: input must be a string'
      };
    }

    try {
      const message = JSON.parse(data);
      const validation = this.validateMessage(message);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      return {
        success: true,
        message
      };
    } catch (error) {
      return {
        success: false,
        error: `Invalid JSON: ${error.message}`
      };
    }
  }

  /**
   * Serialize JSON-RPC message to string
   * @param {object} message - JSON-RPC message object
   * @returns {string} Serialized message
   */
  serializeMessage(message) {
    return JSON.stringify(message);
  }

  /**
   * Check if message is a request (has method and id)
   * @param {object} message - JSON-RPC message
   * @returns {boolean}
   */
  isRequest(message) {
    if (!message || typeof message !== 'object') return false;
    return message.method !== undefined && 'id' in message;
  }

  /**
   * Check if message is a notification (has method but no id)
   * @param {object} message - JSON-RPC message
   * @returns {boolean}
   */
  isNotification(message) {
    if (!message || typeof message !== 'object') return false;
    return message.method !== undefined && !('id' in message);
  }

  /**
   * Check if message is a response (has result or error)
   * @param {object} message - JSON-RPC message
   * @returns {boolean}
   */
  isResponse(message) {
    if (!message || typeof message !== 'object') return false;
    return message.result !== undefined || message.error !== undefined;
  }

  /**
   * Check if message is an error response (has error field)
   * @param {object} message - JSON-RPC message
   * @returns {boolean}
   */
  isErrorResponse(message) {
    if (!message || typeof message !== 'object') return false;
    return message.error !== undefined;
  }

  /**
   * Standard JSON-RPC error codes
   */
  static get ErrorCodes() {
    return {
      PARSE_ERROR: -32700,
      INVALID_REQUEST: -32600,
      METHOD_NOT_FOUND: -32601,
      INVALID_PARAMS: -32602,
      INTERNAL_ERROR: -32603,
      // Custom error codes (implementation defined)
      SERVER_ERROR_START: -32099,
      SERVER_ERROR_END: -32000
    };
  }
}

module.exports = JsonRpcHandler;

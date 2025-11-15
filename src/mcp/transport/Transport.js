/**
 * Abstract Transport Base Class
 * Defines interface for MCP transport implementations
 */

const EventEmitter = require('events');

class Transport extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
  }

  /**
   * Start the transport
   * @returns {Promise<void>}
   */
  async start() {
    throw new Error('start() must be implemented by subclass');
  }

  /**
   * Stop the transport
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error('stop() must be implemented by subclass');
  }

  /**
   * Send a message
   * @param {string} message - JSON-RPC message to send
   * @returns {Promise<void>}
   */
  async send(_message) {
    throw new Error('send() must be implemented by subclass');
  }

  /**
   * Get transport status
   * @returns {object}
   */
  getStatus() {
    return {
      type: this.constructor.name,
      isConnected: this.isConnected
    };
  }
}

module.exports = Transport;